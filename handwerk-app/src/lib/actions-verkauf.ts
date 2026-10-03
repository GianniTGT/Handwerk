"use server";

// Server actions për Mahnwesen dhe Gutschriften (kreditnota).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { sendeDokument } from "./email";
import { vergibNummer } from "./nummern";
import { mahnungPdf } from "./pdf-mahnung";
import { naechsteMahnstufe, offenerBetrag } from "./mahnwesen";
import { ladeVorlagen, fuelle } from "./mailvorlagen";
import { rechnungNr } from "./nrtext";
import { faelligDatum } from "./faellig";
import { chf } from "./format";

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
  const [rechnung, vorlagen, betriebVoll] = await Promise.all([
    db.rechnung.findUniqueOrThrow({
      where: { id: rechnungId },
      include: { auftrag: { include: { kunde: true } }, gutschriften: true },
    }),
    ladeVorlagen(betrieb.id),
    db.betrieb.findUniqueOrThrow({ where: { id: betrieb.id } }),
  ]);
  const vorlage = vorlagen[`MAHNUNG${stufe}` as "MAHNUNG1" | "MAHNUNG2" | "MAHNUNG3"];
  const werte = {
    KUNDE: rechnung.auftrag.kunde.name,
    NUMMER: rechnungNr(rechnung),
    TITEL: rechnung.auftrag.titel,
    BETRAG: chf(offenerBetrag(rechnung)),
    FAELLIG: faelligDatum(rechnung, betriebVoll.zahlungsfristTage).toLocaleDateString("de-CH"),
    FIRMA: betrieb.name,
  };
  const r = await sendeDokument({
    an: pdf.empfaengerEmail,
    antwortAn: betrieb.email,
    absenderName: betrieb.name,
    betreff: fuelle(vorlage.betreff, werte),
    text: fuelle(vorlage.text, werte),
    anhang: { dateiname: pdf.dateiname, buffer: pdf.buffer },
  });
  return r.ok ? "gesendet" : "fehler";
}

export async function mahneRechnung(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
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
  const { betrieb } = await sitzungErforderlich("VERKAUF");
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
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const rechnungId = String(formData.get("rechnungId"));
  // Rücksprungziel bei Fehlern: eigene Erfassungsseite oder Rechnungsliste
  const zurueck = String(formData.get("zurueck") ?? "") === "/gutschriften/neu" ? "/gutschriften/neu" : "/rechnungen";
  if (!rechnungId) redirect(`${zurueck}?fehler=rechnung`);
  const rechnung = await db.rechnung.findFirst({
    where: { id: rechnungId, betriebId: betrieb.id },
    include: { gutschriften: true },
  });
  if (!rechnung) throw new Error("Rechnung nicht gefunden");

  // Shuma bruto e kreditnotës: e plotë (e hapur) ose e pjesshme
  const offen = offenerBetrag(rechnung);
  const eingabe = parseFloat(String(formData.get("betragBrutto") ?? "").replace(",", "."));
  const brutto = Number.isFinite(eingabe) && eingabe > 0 ? eingabe : offen;
  if (rechnung.status === "ENTWURF") redirect(`${zurueck}?fehler=gutschrift-entwurf&rechnung=${rechnungId}`);
  // Gjithsej kreditnotat nuk mund ta kalojnë shumën e faturës (tolerancë 5 Rp.)
  const bereitsGutgeschrieben = rechnung.gutschriften.reduce((s, g) => s + g.totalBrutto, 0);
  if (brutto <= 0 || bereitsGutgeschrieben + brutto > rechnung.totalBrutto + 0.05) {
    redirect(`${zurueck}?fehler=gutschrift-betrag&rechnung=${rechnungId}`);
  }
  const netto = Math.round((brutto / (1 + rechnung.mwstSatz / 100)) * 100) / 100;

  const nr = await vergibNummer(betrieb.id, "GUTSCHRIFT");
  const g = await db.gutschrift.create({
    data: {
      betriebId: betrieb.id,
      rechnungId,
      ...nr,
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
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  await db.gutschrift.deleteMany({ where: { id: String(formData.get("id")), betriebId: betrieb.id } });
  revalidatePath("/gutschriften");
  revalidatePath("/rechnungen");
}
