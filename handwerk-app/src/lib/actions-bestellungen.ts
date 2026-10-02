"use server";

// Server actions për Bestellungen (porosi te furnitori).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { einkaufsPreis } from "./preise";
import { vergibNummer } from "./nummern";

async function eigeneBestellung(id: string, betriebId: string) {
  const b = await db.bestellung.findFirst({ where: { id, betriebId } });
  if (!b) throw new Error("Bestellung nicht gefunden");
  return b;
}

export async function createBestellung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const lieferantId = String(formData.get("lieferantId") ?? "");
  const lieferant = await db.lieferant.findFirst({ where: { id: lieferantId, betriebId: betrieb.id } });
  if (!lieferant) redirect("/bestellungen?fehler=lieferant");
  const nr = await vergibNummer(betrieb.id, "BESTELLUNG");
  const b = await db.bestellung.create({
    data: {
      betriebId: betrieb.id,
      lieferantId,
      ...nr,
      bemerkung: String(formData.get("bemerkung") ?? "").trim(),
    },
  });
  revalidatePath("/bestellungen");
  redirect(`/bestellungen/${b.id}`);
}

export async function addBestellPosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const bestellungId = String(formData.get("bestellungId"));
  const b = await eigeneBestellung(bestellungId, betrieb.id);
  if (b.status !== "ENTWURF") redirect(`/bestellungen/${bestellungId}?fehler=gesperrt`);

  const menge = parseFloat(String(formData.get("menge") ?? "1").replace(",", ".")) || 1;
  const artikelId = String(formData.get("artikelId") ?? "");
  if (artikelId) {
    // Pozicion nga katalogu: çmimi = EK (neto pas rabatit)
    const artikel = await db.artikel.findFirst({ where: { id: artikelId, betriebId: betrieb.id } });
    if (!artikel) throw new Error("Artikel nicht gefunden");
    const konditionen = await db.kondition.findMany({ where: { betriebId: betrieb.id } });
    await db.bestellPosition.create({
      data: {
        bestellungId,
        artikelNr: artikel.artikelNr,
        bezeichnung: artikel.bezeichnung,
        einheit: artikel.einheit,
        menge,
        preis: einkaufsPreis(artikel, konditionen),
      },
    });
  } else {
    const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
    if (!bezeichnung) redirect(`/bestellungen/${bestellungId}?fehler=bezeichnung`);
    await db.bestellPosition.create({
      data: {
        bestellungId,
        artikelNr: String(formData.get("artikelNr") ?? "").trim(),
        bezeichnung,
        einheit: String(formData.get("einheit") ?? "").trim() || "Stk.",
        menge,
        preis: parseFloat(String(formData.get("preis") ?? "").replace(",", ".")) || 0,
      },
    });
  }
  revalidatePath(`/bestellungen/${bestellungId}`);
}

export async function deleteBestellPosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const pos = await db.bestellPosition.findFirst({
    where: { id: String(formData.get("id")), bestellung: { betriebId: betrieb.id, status: "ENTWURF" } },
  });
  if (pos) {
    await db.bestellPosition.delete({ where: { id: pos.id } });
    revalidatePath(`/bestellungen/${pos.bestellungId}`);
  }
}

export async function setBestellStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const id = String(formData.get("id"));
  await eigeneBestellung(id, betrieb.id);
  const status = String(formData.get("status"));
  if (!["ENTWURF", "BESTELLT", "GELIEFERT"].includes(status)) return;
  await db.bestellung.update({ where: { id }, data: { status } });
  revalidatePath(`/bestellungen/${id}`);
  revalidatePath("/bestellungen");
}

export async function deleteBestellung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const id = String(formData.get("id"));
  const b = await eigeneBestellung(id, betrieb.id);
  if (b.status !== "ENTWURF") redirect(`/bestellungen/${id}?fehler=gesperrt`);
  await db.bestellung.delete({ where: { id } });
  revalidatePath("/bestellungen");
  redirect("/bestellungen");
}
