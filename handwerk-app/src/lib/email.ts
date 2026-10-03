// E-Mail-dërgimi i dokumenteve (oferta/fatura me PDF bashkëngjitur).
// Konfigurohet me variablat SMTP_* në .env; pa to punon në modalitet simulimi
// (email-i nuk dërgohet realisht — e dobishme për zhvillim/test).
import nodemailer from "nodemailer";

export function emailKonfiguriert() {
  return Boolean(process.env.SMTP_HOST);
}

function transport() {
  if (!emailKonfiguriert()) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
}

export async function sendeDokument(args: {
  an: string;
  antwortAn: string; // email-i i firmës (Reply-To), që klienti t'i përgjigjet firmës
  absenderName: string;
  betreff: string;
  text: string;
  anhang: { dateiname: string; buffer: Buffer };
}): Promise<{ ok: boolean; simuliert: boolean; fehler?: string }> {
  try {
    await transport().sendMail({
      from: process.env.SMTP_FROM
        ? `"${args.absenderName}" <${process.env.SMTP_FROM}>`
        : `"${args.absenderName}" <noreply@localhost>`,
      replyTo: args.antwortAn || undefined,
      to: args.an,
      subject: args.betreff,
      text: args.text,
      attachments: [{ filename: args.anhang.dateiname, content: args.anhang.buffer }],
    });
    return { ok: true, simuliert: !emailKonfiguriert() };
  } catch (e) {
    return { ok: false, simuliert: false, fehler: e instanceof Error ? e.message : "Unbekannt" };
  }
}

// Einfache Textnachricht ohne Anhang (z.B. Passwort-Reset). Ohne SMTP: Simulation.
export async function sendeNachricht(args: {
  an: string;
  absenderName: string;
  betreff: string;
  text: string;
}): Promise<{ ok: boolean; simuliert: boolean }> {
  try {
    await transport().sendMail({
      from: process.env.SMTP_FROM
        ? `"${args.absenderName}" <${process.env.SMTP_FROM}>`
        : `"${args.absenderName}" <noreply@localhost>`,
      to: args.an,
      subject: args.betreff,
      text: args.text,
    });
    return { ok: true, simuliert: !emailKonfiguriert() };
  } catch {
    return { ok: false, simuliert: false };
  }
}
