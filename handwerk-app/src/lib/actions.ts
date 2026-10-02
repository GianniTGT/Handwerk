"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, aktuellerBetrieb } from "./db";

export async function createKunde(formData: FormData) {
  const betrieb = await aktuellerBetrieb();
  await db.kunde.create({
    data: {
      betriebId: betrieb.id,
      name: String(formData.get("name") ?? "").trim(),
      strasse: String(formData.get("strasse") ?? ""),
      plz: String(formData.get("plz") ?? ""),
      ort: String(formData.get("ort") ?? ""),
      telefon: String(formData.get("telefon") ?? ""),
      email: String(formData.get("email") ?? ""),
    },
  });
  revalidatePath("/kunden");
}

export async function createObjekt(formData: FormData) {
  const kundeId = String(formData.get("kundeId"));
  await db.objekt.create({
    data: {
      kundeId,
      bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
      strasse: String(formData.get("strasse") ?? ""),
      plz: String(formData.get("plz") ?? ""),
      ort: String(formData.get("ort") ?? ""),
      bemerkung: String(formData.get("bemerkung") ?? ""),
    },
  });
  revalidatePath(`/kunden/${kundeId}`);
}

export async function createAuftrag(formData: FormData) {
  const betrieb = await aktuellerBetrieb();
  const letzter = await db.auftrag.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  const objektId = String(formData.get("objektId") ?? "");
  const auftrag = await db.auftrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId: String(formData.get("kundeId")),
      objektId: objektId || null,
      nummer: (letzter?.nummer ?? 1000) + 1,
      titel: String(formData.get("titel") ?? "").trim(),
      beschreibung: String(formData.get("beschreibung") ?? ""),
    },
  });
  redirect(`/auftraege/${auftrag.id}`);
}

async function rapportFuerAuftrag(auftragId: string) {
  const vorhanden = await db.rapport.findFirst({ where: { auftragId } });
  if (vorhanden) return vorhanden;
  return db.rapport.create({ data: { auftragId } });
}

export async function addRapportPosition(formData: FormData) {
  const auftragId = String(formData.get("auftragId"));
  const rapport = await rapportFuerAuftrag(auftragId);

  // Zgjedhja nga katalogu i artikujve plotëson emrin/çmimin automatikisht
  const artikelId = String(formData.get("artikelId") ?? "");
  let bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  let einheit = String(formData.get("einheit") ?? "Std.");
  let ansatz = Number(formData.get("ansatz") ?? 0);
  if (artikelId) {
    const artikel = await db.artikel.findUnique({ where: { id: artikelId } });
    if (artikel) {
      bezeichnung = bezeichnung || artikel.bezeichnung;
      einheit = artikel.einheit;
      ansatz = ansatz || artikel.preis;
    }
  }

  await db.rapportPosition.create({
    data: {
      rapportId: rapport.id,
      typ: String(formData.get("typ") ?? "ARBEIT"),
      bezeichnung,
      menge: Number(formData.get("menge") ?? 1),
      einheit,
      ansatz,
    },
  });
  await db.auftrag.update({ where: { id: auftragId }, data: { status: "IN_ARBEIT" } });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function deleteRapportPosition(formData: FormData) {
  const auftragId = String(formData.get("auftragId"));
  await db.rapportPosition.delete({ where: { id: String(formData.get("positionId")) } });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function saveUnterschrift(auftragId: string, dataUrl: string) {
  const rapport = await rapportFuerAuftrag(auftragId);
  await db.rapport.update({ where: { id: rapport.id }, data: { unterschrift: dataUrl } });
  await db.auftrag.update({ where: { id: auftragId }, data: { status: "ERLEDIGT" } });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function createRechnung(formData: FormData) {
  const betrieb = await aktuellerBetrieb();
  const auftragId = String(formData.get("auftragId"));

  const vorhanden = await db.rechnung.findUnique({ where: { auftragId } });
  if (vorhanden) redirect(`/rechnungen`);

  const positionen = await db.rapportPosition.findMany({
    where: { rapport: { auftragId } },
  });
  const totalNetto = positionen.reduce((sum, p) => sum + p.menge * p.ansatz, 0);
  const mwstSatz = 8.1;
  const totalBrutto = Math.round(totalNetto * (1 + mwstSatz / 100) * 20) / 20; // rrumbullakim 5 rappen

  const letzte = await db.rechnung.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });

  await db.rechnung.create({
    data: {
      betriebId: betrieb.id,
      auftragId,
      nummer: (letzte?.nummer ?? 20260000) + 1,
      totalNetto,
      mwstSatz,
      totalBrutto,
    },
  });
  await db.auftrag.update({ where: { id: auftragId }, data: { status: "VERRECHNET" } });
  redirect(`/rechnungen`);
}

export async function setRechnungStatus(formData: FormData) {
  await db.rechnung.update({
    where: { id: String(formData.get("rechnungId")) },
    data: { status: String(formData.get("status")) },
  });
  revalidatePath("/rechnungen");
}
