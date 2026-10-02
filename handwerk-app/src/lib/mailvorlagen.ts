// Shabllone email-i (si te bexio: Rechnung, Angebot, Mahnstufen) me placeholder-ë
import { db } from "./db";

export type MailTyp = "OFFERTE" | "RECHNUNG" | "MAHNUNG1" | "MAHNUNG2" | "MAHNUNG3";

export const MAIL_TYPEN: { typ: MailTyp; label: string }[] = [
  { typ: "OFFERTE", label: "Offerte" },
  { typ: "RECHNUNG", label: "Rechnung" },
  { typ: "MAHNUNG1", label: "Zahlungserinnerung" },
  { typ: "MAHNUNG2", label: "1. Mahnung" },
  { typ: "MAHNUNG3", label: "2. Mahnung" },
];

export const PLATZHALTER = ["{KUNDE}", "{NUMMER}", "{TITEL}", "{BETRAG}", "{FAELLIG}", "{FIRMA}"];

export const MAIL_STANDARD: Record<MailTyp, { betreff: string; text: string }> = {
  OFFERTE: {
    betreff: "Offerte {NUMMER} — {FIRMA}",
    text: "Guten Tag {KUNDE}\n\nIm Anhang finden Sie unsere Offerte {NUMMER}. Bei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nFreundliche Grüsse\n{FIRMA}",
  },
  RECHNUNG: {
    betreff: "Rechnung {NUMMER} — {FIRMA}",
    text: "Guten Tag {KUNDE}\n\nIm Anhang finden Sie unsere Rechnung {NUMMER}. Die QR-Rechnung für die Zahlung befindet sich auf der letzten Seite.\n\nVielen Dank für Ihren Auftrag.\n\nFreundliche Grüsse\n{FIRMA}",
  },
  MAHNUNG1: {
    betreff: "Zahlungserinnerung {NUMMER} — {FIRMA}",
    text: "Guten Tag {KUNDE}\n\nIm Anhang finden Sie unsere Zahlungserinnerung zur Rechnung {NUMMER} (offen: CHF {BETRAG}, fällig seit {FAELLIG}). Die QR-Rechnung befindet sich auf der letzten Seite.\n\nFalls Sie bereits bezahlt haben, betrachten Sie diese Nachricht bitte als gegenstandslos.\n\nFreundliche Grüsse\n{FIRMA}",
  },
  MAHNUNG2: {
    betreff: "1. Mahnung {NUMMER} — {FIRMA}",
    text: "Guten Tag {KUNDE}\n\nLeider konnten wir zu Rechnung {NUMMER} noch keinen Zahlungseingang feststellen (offen: CHF {BETRAG}). Im Anhang finden Sie die 1. Mahnung mit QR-Rechnung.\n\nFreundliche Grüsse\n{FIRMA}",
  },
  MAHNUNG3: {
    betreff: "2. Mahnung {NUMMER} — {FIRMA}",
    text: "Guten Tag {KUNDE}\n\nTrotz Mahnung ist die Rechnung {NUMMER} weiterhin offen (CHF {BETRAG}). Bitte überweisen Sie den Betrag umgehend; im Anhang finden Sie die 2. Mahnung mit QR-Rechnung.\n\nFreundliche Grüsse\n{FIRMA}",
  },
};

export type MailVorlagen = Record<MailTyp, { betreff: string; text: string }>;

// Shabllonet e firmës; ato që mungojnë mbushen me standardin
export async function ladeVorlagen(betriebId: string): Promise<MailVorlagen> {
  const gespeichert = await db.mailVorlage.findMany({ where: { betriebId } });
  const out = { ...MAIL_STANDARD } as MailVorlagen;
  for (const v of gespeichert) {
    if (v.typ in out) out[v.typ as MailTyp] = { betreff: v.betreff, text: v.text };
  }
  return out;
}

export function fuelle(vorlage: string, werte: Partial<Record<"KUNDE" | "NUMMER" | "TITEL" | "BETRAG" | "FAELLIG" | "FIRMA", string>>) {
  return vorlage.replace(/\{(KUNDE|NUMMER|TITEL|BETRAG|FAELLIG|FIRMA)\}/g, (_, k: keyof typeof werte) => werte[k] ?? "");
}
