"use server";

// Server actions për Aufgaben (detyra të ekipit)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";

const leer = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export async function createAufgabe(formData: FormData) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const titel = String(formData.get("titel") ?? "").trim();
  if (!titel) redirect("/aufgaben/neu?fehler=titel");

  // Lidhjet dhe i caktuari duhet të jenë të firmës aktive
  const zuId = leer(formData.get("zugewiesenAnId")) ?? mitarbeiter.id;
  const kundeId = leer(formData.get("kundeId"));
  const projektId = leer(formData.get("projektId"));
  const [ma, kunde, projekt] = await Promise.all([
    db.mitarbeiter.findFirst({ where: { id: zuId, betriebId: betrieb.id, aktiv: true } }),
    kundeId ? db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } }) : null,
    projektId ? db.projekt.findFirst({ where: { id: projektId, betriebId: betrieb.id } }) : null,
  ]);
  if (!ma || (kundeId && !kunde) || (projektId && !projekt)) redirect("/aufgaben/neu?fehler=zuordnung");

  const faellig = leer(formData.get("faelligAm"));
  const faelligDatum = faellig ? new Date(faellig) : null;
  await db.aufgabe.create({
    data: {
      betriebId: betrieb.id,
      titel,
      beschreibung: String(formData.get("beschreibung") ?? "").trim(),
      kategorie: String(formData.get("kategorie") ?? "").trim(),
      faelligAm: faelligDatum && !Number.isNaN(faelligDatum.getTime()) ? faelligDatum : null,
      zugewiesenAnId: ma.id,
      kundeId,
      projektId,
    },
  });
  revalidatePath("/aufgaben");
  redirect("/aufgaben?gespeichert=1");
}

export async function setAufgabeStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const erledigt = String(formData.get("status")) === "ERLEDIGT";
  await db.aufgabe.updateMany({
    where: { id: String(formData.get("id")), betriebId: betrieb.id },
    data: { status: erledigt ? "ERLEDIGT" : "OFFEN", erledigtAm: erledigt ? new Date() : null },
  });
  revalidatePath("/aufgaben");
  revalidatePath("/");
}

// Veprim në grup: të përzgjedhurat si të kryera ose fshirje
export async function aufgabenBulk(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const ids = formData.getAll("id").map(String);
  if (ids.length === 0) redirect("/aufgaben");
  const where = { id: { in: ids }, betriebId: betrieb.id };
  if (String(formData.get("aktion")) === "loeschen") {
    await db.aufgabe.deleteMany({ where });
  } else {
    await db.aufgabe.updateMany({ where, data: { status: "ERLEDIGT", erledigtAm: new Date() } });
  }
  revalidatePath("/aufgaben");
  revalidatePath("/");
  redirect("/aufgaben");
}

export async function deleteAufgabe(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.aufgabe.deleteMany({ where: { id: String(formData.get("id")), betriebId: betrieb.id } });
  revalidatePath("/aufgaben");
  revalidatePath("/");
}
