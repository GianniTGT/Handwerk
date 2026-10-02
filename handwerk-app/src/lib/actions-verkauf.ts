"use server";

// Server actions për Mahnwesen dhe Gutschriften (kreditnota).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { sendeDokument } from "./email";
import { mahnungPdf } from "./pdf-mahnung";
import { MAHNSTUFEN, naechsteMahnstufe, offenerBetrag } from "./mahnwesen";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BetriebKurz = { id: string; name: string; email: string };

// Ngre shkallën e mahnimit dhe dërgon pismin me email (simuluar pa SMTP) kur ka adresë
async function mahneEine(
  betrieb: BetriebKurz,
  rechnungId: string,
  stufe: 1 | 2 | 3
): Promise<"gesendet" | "ohne-email" | "fehler"> {
  await db.rechnung.update({
    where: { id: rechnungId },
    data: { mahnstufe: stufe, letzteMahnungAm: new Date() },
  });
  const pdf = await mahnungPdf(rechnungId, betrieb.id);
  if (!pdf) return "fehler";
  if (!EMAIL_RE.test(pdf.empfaengerEmail)) return "ohne-email";
  const titel = MAHNSTUFEN[stufe];
  const r = await sendeDokument({
    an: pdf.empfaengerEmail,
    antwortAn: betrieb.email,
    absenderName: betrieb.name,
    betreff: `${titel} — ${pdf.dateiname.replace(/\.pdf$/, "")}`,
    text: `Guten Tag\n\nIm Anhang finden Sie unsere ${titel}. Die QR-Rechnung zur Zahlung befindet sich auf der letzten Seite.\n\nFreundliche Grüsse\n${betrieb.name}`,
    anhang: { dateiname: pdf.dateiname, buffer: pdf.buffer },
  });
  return r.ok ? "gesendet" : "fehler";
}

export async function mahneRechnung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const rechnung = await db.rechnung.findFirst({
    where: { id: String(formData.get("rechnungId")), betriebId: betrieb.id },
  });
  if (!rechnung) throw new Error("Rechnung nicht gefunden");
  // Manuell: shkalla e radhës edhe para afatit të plotë (si «einzeln mahnen» te bexio)
  if (rechnung.status !== "VERSENDET" || rechnung.mahnstufe >= 3) redirect("/mahnwesen?fehler=nicht-mahnbar");
  const stufe = (rechnung.mahnstufe + 1) as 1 | 2 | 3;
  const ergebnis = await mahneEine(betrieb, rechnung.id, stufe);
  revalidatePath("/mahnwesen");
  revalidatePath("/rechnungen");
  redirect(`/mahnwesen?gemahnt=1&versand=${ergebnis}`);
}

// Mahnlauf: të gjitha faturat që u erdhi koha për shkallën e radhës
export async function mahnlauf() {
  const { betrieb } = await sitzungErforderlich();
  const kandidaten = await db.rechnung.findMany({
    where: { betriebId: betrieb.id, status: "VERSENDET", mahnstufe: { lt: 3 } },
  });
  let n = 0;
  let ohneEmail = 0;
  for (const r of kandidaten) {
    const stufe = naechsteMahnstufe(r, betrieb);
    if (!stufe) continue;
    const ergebnis = await mahneEine(betrieb, r.id, stufe);
    n++;
    if (ergebnis === "ohne-email") ohneEmail++;
  }
  revalidatePath("/mahnwesen");
  revalidatePath("/rechnungen");
  redirect(`/mahnwesen?lauf=${n}&ohneEmail=${ohneEmail}`);
}

export async function createGutschrift(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  const rechnungId = String(formData.get("rechnungId"));
  const rechnung = await db.rechnung.findFirst({
    where: { id: rechnungId, betriebId: betrieb.id },
    include: { gutschriften: true },
  });
  if (!rechnung) throw new Error("Rechnung nicht gefunden");

  // Shuma bruto e kreditnotës: e plotë (e hapur) ose e pjesshme
  const offen = offenerBetrag(rechnung);
  const eingabe = parseFloat(String(formData.get("betragBrutto") ?? "").replace(",", "."));
  const brutto = Number.isFinite(eingabe) && eingabe > 0 ? eingabe : offen;
  if (brutto <= 0 || brutto > rechnung.totalBrutto) redirect(`/rechnungen?fehler=gutschrift-betrag`);
  const netto = Math.round((brutto / (1 + rechnung.mwstSatz / 100)) * 100) / 100;

  const letzte = await db.gutschrift.findFirst({
    where: { betriebId: betrieb.id },
    orderBy: { nummer: "desc" },
  });
  const g = await db.gutschrift.create({
    data: {
      betriebId: betrieb.id,
      rechnungId,
      nummer: (letzte?.nummer ?? 20260000) + 1,
      grund: String(formData.get("grund") ?? "").trim(),
      totalNetto: netto,
      mwstSatz: rechnung.mwstSatz,
      totalBrutto: brutto,
    },
  });
  // Nëse faturat është e mbuluar plotësisht nga kreditnotat → konsiderohet e mbyllur
  const rest = offenerBetrag({
    totalBrutto: rechnung.totalBrutto,
    gutschriften: [...rechnung.gutschriften, g],
  });
  if (rest <= 0) {
    await db.rechnung.update({ where: { id: rechnungId }, data: { status: "BEZAHLT" } });
  }
  revalidatePath("/rechnungen");
  revalidatePath("/gutschriften");
  redirect("/gutschriften?gespeichert=1");
}

export async function deleteGutschrift(formData: FormData) {
  const { betrieb } = await sitzungErforderlich();
  await db.gutschrift.deleteMany({ where: { id: String(formData.get("id")), betriebId: betrieb.id } });
  revalidatePath("/gutschriften");
  revalidatePath("/rechnungen");
}
