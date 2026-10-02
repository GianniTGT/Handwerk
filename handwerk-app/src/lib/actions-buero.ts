"use server";

// Server actions për modulet e zyrës: Ausgaben, Banking, Posteingang.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { parseZahl } from "./csv";
import { sitzungErforderlich } from "./auth";

const datumOderHeute = (wert: FormDataEntryValue | null) => {
  const d = wert ? new Date(String(wert)) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

// ---------- Ausgaben ----------

export async function createAusgabe(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim();
  const betrag = parseFloat(String(formData.get("betragBrutto") ?? "").replace(",", "."));
  if (!beschreibung || !Number.isFinite(betrag) || betrag <= 0) {
    redirect("/ausgaben?fehler=eingabe");
  }
  const faellig = String(formData.get("faelligAm") ?? "");
  await db.ausgabe.create({
    data: {
      betriebId: betrieb.id,
      lieferant: String(formData.get("lieferant") ?? "").trim(),
      beschreibung,
      kategorie: String(formData.get("kategorie") ?? "Material"),
      datum: datumOderHeute(formData.get("datum")),
      faelligAm: faellig ? datumOderHeute(faellig) : null,
      betragBrutto: betrag,
      mwstSatz: parseFloat(String(formData.get("mwstSatz") ?? "8.1")) || 0,
    },
  });
  // Nëse vjen nga Posteingang: shëno dokumentin si të përpunuar
  const belegId = String(formData.get("belegId") ?? "");
  if (belegId) {
    await db.beleg.updateMany({
      where: { id: belegId, betriebId: betrieb.id },
      data: { status: "ERLEDIGT" },
    });
    revalidatePath("/posteingang");
  }
  revalidatePath("/ausgaben");
  redirect("/ausgaben?gespeichert=1");
}

export async function setAusgabeStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.ausgabe.updateMany({
    where: { id: String(formData.get("id")), betriebId: betrieb.id },
    data: { status: String(formData.get("status")) === "BEZAHLT" ? "BEZAHLT" : "OFFEN" },
  });
  revalidatePath("/ausgaben");
}

export async function deleteAusgabe(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.ausgabe.deleteMany({ where: { id: String(formData.get("id")), betriebId: betrieb.id } });
  revalidatePath("/ausgaben");
}

// ---------- Banking ----------

// Lidh një lëvizje me faturë/shpenzim të hapur me shumë identike (±1 Rp.)
async function zuordneZahlung(betriebId: string, zahlungId: string, betrag: number) {
  if (betrag > 0) {
    const r = await db.rechnung.findFirst({
      where: {
        betriebId,
        status: { not: "BEZAHLT" },
        totalBrutto: { gte: betrag - 0.01, lte: betrag + 0.01 },
      },
      orderBy: { nummer: "asc" },
    });
    if (r) {
      await db.rechnung.update({ where: { id: r.id }, data: { status: "BEZAHLT" } });
      await db.zahlung.update({ where: { id: zahlungId }, data: { rechnungId: r.id } });
    }
  } else if (betrag < 0) {
    const a = await db.ausgabe.findFirst({
      where: {
        betriebId,
        status: "OFFEN",
        betragBrutto: { gte: -betrag - 0.01, lte: -betrag + 0.01 },
      },
      orderBy: { datum: "asc" },
    });
    if (a) await db.ausgabe.update({ where: { id: a.id }, data: { status: "BEZAHLT" } });
  }
}

function revalidiereBanking() {
  revalidatePath("/banking");
  revalidatePath("/rechnungen");
  revalidatePath("/ausgaben");
}

export async function createZahlung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const vorzeichen = String(formData.get("art")) === "aus" ? -1 : 1;
  const betrag = parseFloat(String(formData.get("betrag") ?? "").replace(",", "."));
  if (!Number.isFinite(betrag) || betrag <= 0) redirect("/banking?fehler=eingabe");
  const z = await db.zahlung.create({
    data: {
      betriebId: betrieb.id,
      datum: datumOderHeute(formData.get("datum")),
      text: String(formData.get("text") ?? "").trim(),
      referenz: String(formData.get("referenz") ?? "").trim(),
      betrag: vorzeichen * betrag,
    },
  });
  await zuordneZahlung(betrieb.id, z.id, z.betrag);
  revalidiereBanking();
  redirect("/banking?gespeichert=1");
}

// CSV e bankës: Datum;Text;Betrag[;Referenz] — datë dd.mm.yyyy ose yyyy-mm-dd
export async function importZahlungenCsv(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const datei = formData.get("datei");
  if (!(datei instanceof File) || datei.size === 0) redirect("/banking?fehler=datei");
  if (datei.size > 2 * 1024 * 1024) redirect("/banking?fehler=gross");
  const zeilen = (await datei.text()).split(/\r?\n/).filter((z) => z.trim());
  let n = 0;
  for (const zeile of zeilen) {
    const trenner = zeile.includes(";") ? ";" : ",";
    const [d, text = "", b = "", ref = ""] = zeile
      .split(trenner)
      .map((s) => s.trim().replace(/^"|"$/g, ""));
    const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    const datum = m
      ? new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`)
      : new Date(d);
    const betrag = parseZahl(b);
    if (Number.isNaN(datum.getTime()) || !betrag) continue; // koka / rreshta të pavlefshëm
    const z = await db.zahlung.create({
      data: { betriebId: betrieb.id, datum, text, referenz: ref, betrag },
    });
    await zuordneZahlung(betrieb.id, z.id, betrag);
    n++;
  }
  revalidiereBanking();
  redirect(`/banking?importiert=${n}`);
}

export async function deleteZahlung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.zahlung.deleteMany({ where: { id: String(formData.get("id")), betriebId: betrieb.id } });
  revalidatePath("/banking");
}

// ---------- Posteingang ----------

export async function uploadBeleg(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const datei = formData.get("datei");
  if (!(datei instanceof File) || datei.size === 0) redirect("/posteingang?fehler=datei");
  if (datei.size > 3 * 1024 * 1024) redirect("/posteingang?fehler=gross");
  if (!["application/pdf", "image/jpeg", "image/png"].includes(datei.type)) {
    redirect("/posteingang?fehler=format");
  }
  const bytes = Buffer.from(await datei.arrayBuffer());
  await db.beleg.create({
    data: {
      betriebId: betrieb.id,
      titel: String(formData.get("titel") ?? "").trim() || datei.name,
      dateiname: datei.name,
      mimeTyp: datei.type,
      daten: `data:${datei.type};base64,${bytes.toString("base64")}`,
    },
  });
  revalidatePath("/posteingang");
  redirect("/posteingang?gespeichert=1");
}

export async function setBelegStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.beleg.updateMany({
    where: { id: String(formData.get("id")), betriebId: betrieb.id },
    data: { status: String(formData.get("status")) === "ERLEDIGT" ? "ERLEDIGT" : "NEU" },
  });
  revalidatePath("/posteingang");
}

export async function deleteBeleg(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.beleg.deleteMany({ where: { id: String(formData.get("id")), betriebId: betrieb.id } });
  revalidatePath("/posteingang");
}
