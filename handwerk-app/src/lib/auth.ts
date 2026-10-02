import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { bereichFuerPfad, darf, type Bereich } from "./rechte";

const COOKIE_NAME = "sitzung";
const SITZUNG_TAGE = 30;

export async function hashPasswort(passwort: string) {
  return bcrypt.hash(passwort, 10);
}

export async function pruefePasswort(passwort: string, hash: string) {
  if (!hash) return false;
  return bcrypt.compare(passwort, hash);
}

export async function erstelleSitzung(mitarbeiterId: string) {
  const token = randomBytes(32).toString("hex");
  const gueltigBis = new Date(Date.now() + SITZUNG_TAGE * 24 * 60 * 60 * 1000);
  await db.sitzung.create({ data: { token, mitarbeiterId, gueltigBis } });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Vihet në "1" pas vendosjes prapa TLS (Caddy) në prod
    secure: process.env.COOKIE_SECURE === "1",
    maxAge: SITZUNG_TAGE * 24 * 60 * 60,
  });
}

export async function leseSitzung() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sitzung = await db.sitzung.findUnique({
    where: { token },
    include: {
      mitarbeiter: { include: { betrieb: true, zugaenge: { include: { betrieb: true } } } },
    },
  });
  if (!sitzung || sitzung.gueltigBis < new Date() || !sitzung.mitarbeiter.aktiv) return null;

  // Firma aktive: Betrieb-i vetë ose një nga qasjet shtesë (dropdown si te bexio)
  const eigener = sitzung.mitarbeiter.betrieb;
  const betriebe = [eigener, ...sitzung.mitarbeiter.zugaenge.map((z) => z.betrieb)];
  const aktiver = betriebe.find((b) => b.id === sitzung.aktiverBetriebId) ?? eigener;
  return { ...sitzung, aktiverBetrieb: aktiver, betriebe };
}

// Përdoret në çdo faqe/action të mbrojtur: kthen mitarbeiter + betrieb ose ridrejton në /login
// Përdoret në çdo faqe/action të mbrojtur: kthen mitarbeiter + betrieb ose ridrejton.
// Kontrollon të drejtat: sipas rrugës aktuale (x-pathname nga middleware, vlen edhe për
// server actions) dhe, opsionalisht, sipas një zone të kërkuar shprehimisht.
export async function sitzungErforderlich(bereich?: Bereich) {
  const sitzung = await leseSitzung();
  if (!sitzung) redirect("/login");
  const m = sitzung.mitarbeiter;
  const pfadBereich = bereichFuerPfad((await headers()).get("x-pathname") ?? "");
  if (pfadBereich && !darf(m, pfadBereich)) redirect("/kein-zugriff");
  if (bereich && !darf(m, bereich)) redirect("/kein-zugriff");
  return { mitarbeiter: m, betrieb: sitzung.aktiverBetrieb };
}

export async function beendeSitzung() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await db.sitzung.deleteMany({ where: { token } });
  jar.delete(COOKIE_NAME);
}
