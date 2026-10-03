"use server";

// Passwort vergessen: Link per E-Mail (60 Minuten gültig, einmalig). Keine Auskunft, ob ein Konto existiert.

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashPasswort } from "./auth";
import { sendeNachricht } from "./email";
import { clientIp, registriereFehlversuch, schluessel, sperreMinuten } from "./loginsperre";

const GUELTIG_MIN = 60;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

// Basis-URL für den Link: APP_URL (Pflicht in Produktion, gegen Host-Header-Manipulation); lokal Fallback auf den Host
async function basisUrl(): Promise<string | null> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return null;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

export async function fordereResetAn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Begrenzung: pro E-Mail und Adresse nur wenige Anforderungen pro Zeitfenster (Mail-Flut)
  const ip = await clientIp();
  const keys = schluessel(`reset:${email}`, ip);
  if ((await sperreMinuten([keys.mail, keys.ip])) > 0) redirect("/passwort-vergessen?gesendet=1");
  await registriereFehlversuch(`reset:${email}`, ip);

  const m = email ? await db.mitarbeiter.findUnique({ where: { email } }) : null;
  if (m && m.aktiv && m.email) {
    const basis = await basisUrl();
    if (basis) {
      const token = randomBytes(32).toString("hex");
      await db.passwortReset.deleteMany({
        where: { OR: [{ mitarbeiterId: m.id }, { gueltigBis: { lt: new Date() } }] },
      });
      await db.passwortReset.create({
        data: {
          mitarbeiterId: m.id,
          tokenHash: sha(token),
          gueltigBis: new Date(Date.now() + GUELTIG_MIN * 60 * 1000),
        },
      });
      const link = `${basis}/passwort-zuruecksetzen/${token}`;
      const r = await sendeNachricht({
        an: m.email,
        absenderName: "Handwerk by TIFF",
        betreff: "Passwort zurücksetzen",
        text: `Guten Tag ${m.name}\n\nSie haben das Zurücksetzen Ihres Passworts angefordert. Über diesen Link können Sie ein neues Passwort wählen (gültig ${GUELTIG_MIN} Minuten, einmal verwendbar):\n\n${link}\n\nHaben Sie das nicht angefordert, ignorieren Sie diese Nachricht — Ihr Passwort bleibt unverändert.\n\nHandwerk by TIFF Software Solutions`,
      });
      // Lokal ohne SMTP wird nichts versendet: Link in der Server-Konsole ausgeben (nie in Produktion)
      if (r.simuliert && process.env.NODE_ENV !== "production") {
        console.log(`[Passwort-Reset, simuliert] ${m.email}: ${link}`);
      }
    }
  }
  // Immer dieselbe Antwort — keine Information, ob die Adresse existiert
  redirect("/passwort-vergessen?gesendet=1");
}

export async function setzePasswortZurueck(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const neu = String(formData.get("neu") ?? "");
  const wiederholung = String(formData.get("wiederholung") ?? "");
  const pfad = `/passwort-zuruecksetzen/${encodeURIComponent(token)}`;

  const reset = await db.passwortReset.findUnique({
    where: { tokenHash: sha(token) },
    include: { mitarbeiter: true },
  });
  if (!reset || reset.gueltigBis < new Date() || !reset.mitarbeiter.aktiv) redirect("/passwort-vergessen?abgelaufen=1");
  if (neu.length < 8) redirect(`${pfad}?fehler=kurz`);
  if (neu !== wiederholung) redirect(`${pfad}?fehler=wiederholung`);
  if (reset.mitarbeiter.email && neu.toLowerCase() === reset.mitarbeiter.email.toLowerCase()) {
    redirect(`${pfad}?fehler=email`);
  }

  await db.mitarbeiter.update({
    where: { id: reset.mitarbeiterId },
    data: { passwortHash: await hashPasswort(neu), passwortAendern: false },
  });
  await db.passwortReset.deleteMany({ where: { mitarbeiterId: reset.mitarbeiterId } });
  await db.sitzung.deleteMany({ where: { mitarbeiterId: reset.mitarbeiterId } }); // alle Geräte abmelden
  await db.loginVersuch.deleteMany({
    where: { schluessel: `mail:${(reset.mitarbeiter.email ?? "").toLowerCase()}` },
  });
  redirect("/login?zurueckgesetzt=1");
}
