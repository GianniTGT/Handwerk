"use server";

// Server actions për Kontakte: fusha të plota (Typ, Kategorie…), Kontaktpersonen, arkivim, import CSV.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";

const s = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function kundeDaten(formData: FormData) {
  return {
    name: s(formData, "name"),
    typ: s(formData, "typ") === "PRIVAT" ? "PRIVAT" : "FIRMA",
    kategorie: s(formData, "kategorie"),
    strasse: s(formData, "strasse"),
    plz: s(formData, "plz"),
    ort: s(formData, "ort"),
    telefon: s(formData, "telefon"),
    mobile: s(formData, "mobile"),
    email: s(formData, "email"),
    website: s(formData, "website"),
    bemerkung: s(formData, "bemerkung"),
  };
}

export async function saveKunde(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const daten = kundeDaten(formData);
  if (!daten.name) redirect("/kunden?fehler=name");
  const id = s(formData, "kundeId");
  if (id) {
    await db.kunde.updateMany({ where: { id, betriebId: betrieb.id }, data: daten });
    revalidatePath(`/kunden/${id}`);
    redirect(`/kunden/${id}?gespeichert=1`);
  }
  const k = await db.kunde.create({ data: { ...daten, betriebId: betrieb.id } });
  revalidatePath("/kunden");
  redirect(`/kunden/${k.id}`);
}

export async function archiviereKunde(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const id = s(formData, "kundeId");
  await db.kunde.updateMany({
    where: { id, betriebId: betrieb.id },
    data: { archiviert: s(formData, "archiviert") === "1" },
  });
  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);
}

export async function createKontaktperson(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const kundeId = s(formData, "kundeId");
  if (!(await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } }))) {
    throw new Error("Kunde nicht gefunden");
  }
  const name = s(formData, "name");
  if (name) {
    await db.kontaktperson.create({
      data: {
        kundeId,
        name,
        funktion: s(formData, "funktion"),
        email: s(formData, "email"),
        telefon: s(formData, "telefon"),
        mobile: s(formData, "mobile"),
      },
    });
  }
  revalidatePath(`/kunden/${kundeId}`);
}

export async function deleteKontaktperson(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const kp = await db.kontaktperson.findFirst({
    where: { id: s(formData, "id"), kunde: { betriebId: betrieb.id } },
  });
  if (kp) {
    await db.kontaktperson.delete({ where: { id: kp.id } });
    revalidatePath(`/kunden/${kp.kundeId}`);
  }
}

// ---------- CSV-Import ----------

const ALIASE: Record<string, string[]> = {
  name: ["name", "firma", "kunde", "kontakt", "firmenname", "bezeichnung"],
  strasse: ["strasse", "adresse", "str"],
  plz: ["plz", "postleitzahl", "zip"],
  ort: ["ort", "stadt", "city"],
  telefon: ["telefon", "tel", "phone", "telefonfestnetz"],
  mobile: ["mobile", "mobil", "natel", "handy"],
  email: ["email", "mail", "emailadresse"],
  website: ["website", "web", "homepage", "url"],
  kategorie: ["kategorie", "gruppe", "category"],
  typ: ["typ", "art", "type"],
};

const norm = (t: string) => t.toLowerCase().replace(/[^a-zäöü]/g, "");

function felder(zeile: string, trenner: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (inQ && zeile[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === trenner && !inQ) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export async function importKundenCsv(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const datei = formData.get("datei");
  if (!(datei instanceof File) || datei.size === 0) redirect("/kunden?import=fehler&grund=datei");
  if (datei.size > 5 * 1024 * 1024) redirect("/kunden?import=fehler&grund=gross");

  const zeilen = (await datei.text()).replace(/^﻿/, "").split(/\r?\n/).filter((z) => z.trim());
  if (zeilen.length < 2) redirect("/kunden?import=fehler&grund=leer");
  const trenner = (zeilen[0].match(/;/g)?.length ?? 0) >= (zeilen[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const kopf = felder(zeilen[0], trenner).map(norm);
  const spalte: Record<string, number> = {};
  for (const [feld, aliase] of Object.entries(ALIASE)) {
    const i = kopf.findIndex((k) => aliase.includes(k));
    if (i >= 0) spalte[feld] = i;
  }
  if (spalte.name === undefined) redirect("/kunden?import=fehler&grund=name");

  const vorhanden = new Set(
    (await db.kunde.findMany({ where: { betriebId: betrieb.id }, select: { name: true, plz: true } })).map(
      (k) => `${k.name.toLowerCase()}|${k.plz}`
    )
  );
  let neu = 0;
  let uebersprungen = 0;
  for (const zeile of zeilen.slice(1)) {
    const f = felder(zeile, trenner);
    const wert = (n: string) => (spalte[n] !== undefined ? (f[spalte[n]] ?? "") : "");
    const name = wert("name");
    if (!name) {
      uebersprungen++;
      continue;
    }
    const key = `${name.toLowerCase()}|${wert("plz")}`;
    if (vorhanden.has(key)) {
      uebersprungen++; // dublikatë (emër + PLZ) nuk shtohen dy herë
      continue;
    }
    vorhanden.add(key);
    await db.kunde.create({
      data: {
        betriebId: betrieb.id,
        name,
        strasse: wert("strasse"),
        plz: wert("plz"),
        ort: wert("ort"),
        telefon: wert("telefon"),
        mobile: wert("mobile"),
        email: wert("email"),
        website: wert("website"),
        kategorie: wert("kategorie"),
        typ: /priv/i.test(wert("typ")) ? "PRIVAT" : "FIRMA",
      },
    });
    neu++;
  }
  revalidatePath("/kunden");
  redirect(`/kunden?import=ok&neu=${neu}&uebersprungen=${uebersprungen}`);
}
