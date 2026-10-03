"use server";

// TIFF-Administration: neue Kunden-Betriebe anlegen (ersetzt die offene Registrierung)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashPasswort, sitzungErforderlich } from "./auth";
import { istTiffAdmin } from "./registrierung";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createKundenBetrieb(formData: FormData) {
  const { mitarbeiter } = await sitzungErforderlich();
  if (!istTiffAdmin(mitarbeiter.email)) redirect("/kein-zugriff");

  const firma = String(formData.get("firmenname") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  if (!firma || !name || !EMAIL_RE.test(email) || passwort.length < 8) redirect("/admin/betriebe?fehler=eingabe");
  if (await db.mitarbeiter.findUnique({ where: { email } })) redirect("/admin/betriebe?fehler=email");

  const betrieb = await db.betrieb.create({ data: { name: firma } });
  await db.mitarbeiter.create({
    data: { betriebId: betrieb.id, name, email, rolle: "CHEF", passwortHash: await hashPasswort(passwort), passwortAendern: true },
  });
  // Der Administrator kann sofort in den neuen Betrieb wechseln (Support)
  await db.betriebZugang.create({ data: { mitarbeiterId: mitarbeiter.id, betriebId: betrieb.id } });
  revalidatePath("/admin/betriebe");
  redirect(`/admin/betriebe?angelegt=${encodeURIComponent(firma)}`);
}
