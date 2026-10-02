"use server";

// Server actions për Benutzerverwaltung: përdorues, role, të drejta, fjalëkalim, çaktivizim.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashPasswort, sitzungErforderlich } from "./auth";
import { ALLE_BEREICHE, ROLLEN, rechteAlsText, wirksameRechte, type Bereich } from "./rechte";

const BASIS = "/einstellungen/benutzer";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rolleOk = (r: string) => ROLLEN.some((x) => x.wert === r);

// Sa administratorë aktivë (me të drejtën BENUTZER) mbeten në firmë pas një ndryshimi
async function adminsPas(betriebId: string, ersetze: { id: string; rolle: string; rechte: string; aktiv: boolean }) {
  const alle = await db.mitarbeiter.findMany({ where: { betriebId } });
  return alle
    .map((m) => (m.id === ersetze.id ? { ...m, ...ersetze } : m))
    .filter((m) => m.aktiv && wirksameRechte(m).includes("BENUTZER")).length;
}

export async function createBenutzer(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("BENUTZER");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  const rolle = String(formData.get("rolle") ?? "");
  if (!name || !EMAIL_RE.test(email) || passwort.length < 8 || !rolleOk(rolle)) redirect(`${BASIS}?fehler=eingabe`);
  if (await db.mitarbeiter.findUnique({ where: { email } })) redirect(`${BASIS}?fehler=email`);
  await db.mitarbeiter.create({
    data: { betriebId: betrieb.id, name, email, rolle, passwortHash: await hashPasswort(passwort) },
  });
  revalidatePath(BASIS);
  redirect(`${BASIS}?gespeichert=1`);
}

export async function updateBenutzer(formData: FormData) {
  const { betrieb, mitarbeiter: ich } = await sitzungErforderlich("BENUTZER");
  const id = String(formData.get("id"));
  const ziel = await db.mitarbeiter.findFirst({ where: { id, betriebId: betrieb.id } });
  if (!ziel) redirect(`${BASIS}?fehler=nicht-gefunden`);

  const rolle = String(formData.get("rolle") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !rolleOk(rolle)) redirect(`${BASIS}?fehler=eingabe`);

  const eigeneRechte = formData.get("rolleStandard") !== "1";
  const gewaehlt = ALLE_BEREICHE.filter((b: Bereich) => formData.get(`recht_${b}`) === "1");
  const rechte = eigeneRechte ? rechteAlsText(rolle, gewaehlt) : "";
  const aktiv = formData.get("aktiv") === "1";

  // Mbrojtje: jo vetë-çaktivizim dhe gjithmonë të paktën një administrator aktiv
  if (ziel.id === ich.id && !aktiv) redirect(`${BASIS}?fehler=selbst`);
  if ((await adminsPas(betrieb.id, { id: ziel.id, rolle, rechte, aktiv })) < 1) redirect(`${BASIS}?fehler=letzter-admin`);

  await db.mitarbeiter.update({ where: { id }, data: { name, rolle, rechte, aktiv } });
  // I çaktivizuar → seancat shuhen menjëherë
  if (!aktiv) await db.sitzung.deleteMany({ where: { mitarbeiterId: id } });
  revalidatePath(BASIS);
  redirect(`${BASIS}?gespeichert=1`);
}

export async function setBenutzerPasswort(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("BENUTZER");
  const id = String(formData.get("id"));
  const passwort = String(formData.get("passwort") ?? "");
  if (passwort.length < 8) redirect(`${BASIS}?fehler=passwort`);
  const ziel = await db.mitarbeiter.findFirst({ where: { id, betriebId: betrieb.id } });
  if (!ziel) redirect(`${BASIS}?fehler=nicht-gefunden`);
  await db.mitarbeiter.update({ where: { id }, data: { passwortHash: await hashPasswort(passwort) } });
  await db.sitzung.deleteMany({ where: { mitarbeiterId: id } }); // dil nga të gjitha pajisjet
  revalidatePath(BASIS);
  redirect(`${BASIS}?gespeichert=1`);
}
