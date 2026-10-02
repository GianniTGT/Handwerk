"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  beendeSitzung,
  erstelleSitzung,
  hashPasswort,
  pruefePasswort,
  sitzungErforderlich,
} from "./auth";

// ---------- Auth ----------

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  const mitarbeiter = await db.mitarbeiter.findUnique({ where: { email } });
  if (!mitarbeiter || !(await pruefePasswort(passwort, mitarbeiter.passwortHash))) {
    redirect("/login?fehler=1");
  }
  await erstelleSitzung(mitarbeiter.id);
  redirect("/");
}

export async function logout() {
  await beendeSitzung();
  redirect("/login");
}

export async function registriereBetrieb(formData: FormData) {
  const firmenname = String(formData.get("firmenname") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  if (!firmenname || !name || !email || passwort.length < 8) {
    redirect("/registrieren?fehler=eingabe");
  }
  const vorhanden = await db.mitarbeiter.findUnique({ where: { email } });
  if (vorhanden) redirect("/registrieren?fehler=email");

  const betrieb = await db.betrieb.create({ data: { name: firmenname } });
  const chef = await db.mitarbeiter.create({
    data: {
      betriebId: betrieb.id,
      name,
      email,
      rolle: "CHEF",
      passwortHash: await hashPasswort(passwort),
    },
  });
  await erstelleSitzung(chef.id);
  redirect("/");
}

// ---------- Kunden & Objekte ----------

export async function createKunde(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
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
  const { betrieb } = await sitzungErforderlich();
  const kundeId = String(formData.get("kundeId"));
  const kunde = await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } });
  if (!kunde) throw new Error("Kunde nicht gefunden");
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

// ---------- Aufträge & Rapporte ----------

export async function createAuftrag(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const kundeId = String(formData.get("kundeId"));
  const kunde = await db.kunde.findFirst({ where: { id: kundeId, betriebId: betrieb.id } });
  if (!kunde) throw new Error("Kunde nicht gefunden");

  const objektId = String(formData.get("objektId") ?? "");
  if (objektId) {
    const objekt = await db.objekt.findFirst({
      where: { id: objektId, kunde: { betriebId: betrieb.id } },
    });
    if (!objekt) throw new Error("Objekt nicht gefunden");
  }

  const letzter = await db.auftrag.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  const auftrag = await db.auftrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId,
      objektId: objektId || null,
      nummer: (letzter?.nummer ?? 1000) + 1,
      titel: String(formData.get("titel") ?? "").trim(),
      beschreibung: String(formData.get("beschreibung") ?? ""),
    },
  });
  redirect(`/auftraege/${auftrag.id}`);
}

async function eigenerAuftrag(auftragId: string, betriebId: string) {
  const auftrag = await db.auftrag.findFirst({ where: { id: auftragId, betriebId } });
  if (!auftrag) throw new Error("Auftrag nicht gefunden");
  return auftrag;
}

async function rapportFuerAuftrag(auftragId: string) {
  const vorhanden = await db.rapport.findFirst({ where: { auftragId } });
  if (vorhanden) return vorhanden;
  return db.rapport.create({ data: { auftragId } });
}

export async function addRapportPosition(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);
  const rapport = await rapportFuerAuftrag(auftragId);

  const artikelId = String(formData.get("artikelId") ?? "");
  let bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  let einheit = String(formData.get("einheit") ?? "Std.");
  let ansatz = Number(formData.get("ansatz") ?? 0);
  if (artikelId) {
    const artikel = await db.artikel.findFirst({
      where: { id: artikelId, betriebId: betrieb.id },
    });
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
  const { betrieb } = await sitzungErforderlich();
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);
  await db.rapportPosition.deleteMany({
    where: { id: String(formData.get("positionId")), rapport: { auftragId } },
  });
  revalidatePath(`/auftraege/${auftragId}`);
}

export async function saveUnterschrift(auftragId: string, dataUrl: string) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  await eigenerAuftrag(auftragId, betrieb.id);
  if (!dataUrl.startsWith("data:image/png;base64,") || dataUrl.length > 500_000) {
    throw new Error("Ungültige Unterschrift");
  }
  const rapport = await rapportFuerAuftrag(auftragId);
  await db.rapport.update({
    where: { id: rapport.id },
    data: { unterschrift: dataUrl, mitarbeiterId: mitarbeiter.id },
  });
  await db.auftrag.update({ where: { id: auftragId }, data: { status: "ERLEDIGT" } });
  revalidatePath(`/auftraege/${auftragId}`);
}

// ---------- Rechnungen ----------

export async function createRechnung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const auftragId = String(formData.get("auftragId"));
  await eigenerAuftrag(auftragId, betrieb.id);

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
  const { betrieb } = await sitzungErforderlich();
  await db.rechnung.updateMany({
    where: { id: String(formData.get("rechnungId")), betriebId: betrieb.id },
    data: { status: String(formData.get("status")) },
  });
  revalidatePath("/rechnungen");
}
