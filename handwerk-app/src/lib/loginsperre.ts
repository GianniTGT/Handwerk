// Anmeldesperre: pas shumë gabimeve (sipas email-it dhe sipas IP-së) bllokohet hyrja përkohësisht
import { headers } from "next/headers";
import { db } from "./db";

const FENSTER_MIN = 15; // dritarja e numërimit të gabimeve
const SPERRE_MIN = 15; // kohëzgjatja e bllokimit
const MAX_MAIL = 5;
const MAX_IP = 20;
const MIN = 60 * 1000;

export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || h.get("x-real-ip") || "unbekannt";
}

export function schluessel(email: string, ip: string) {
  return { mail: `mail:${email.slice(0, 200)}`, ip: `ip:${ip.slice(0, 80)}` };
}

// Kthen minutat e mbetura të bllokimit (0 = jo e bllokuar)
export async function sperreMinuten(keys: string[]): Promise<number> {
  const jetzt = Date.now();
  const zeilen = await db.loginVersuch.findMany({ where: { schluessel: { in: keys } } });
  let max = 0;
  for (const z of zeilen) {
    if (z.gesperrtBis && z.gesperrtBis.getTime() > jetzt) {
      max = Math.max(max, Math.ceil((z.gesperrtBis.getTime() - jetzt) / MIN));
    }
  }
  return max;
}

async function zaehleFehler(key: string, limit: number) {
  const jetzt = new Date();
  const alt = await db.loginVersuch.findUnique({ where: { schluessel: key } });
  const frisch = !alt || jetzt.getTime() - alt.fensterStart.getTime() > FENSTER_MIN * MIN;
  const fehler = frisch ? 1 : alt.fehler + 1;
  const sperren = fehler >= limit;
  await db.loginVersuch.upsert({
    where: { schluessel: key },
    create: { schluessel: key, fehler, gesperrtBis: sperren ? new Date(jetzt.getTime() + SPERRE_MIN * MIN) : null },
    update: {
      fehler: sperren ? 0 : fehler, // pas bllokimit numëruesi fillon nga e para
      fensterStart: frisch || sperren ? jetzt : alt.fensterStart,
      gesperrtBis: sperren ? new Date(jetzt.getTime() + SPERRE_MIN * MIN) : (alt?.gesperrtBis ?? null),
    },
  });
}

export async function registriereFehlversuch(email: string, ip: string) {
  const k = schluessel(email, ip);
  await Promise.all([zaehleFehler(k.mail, MAX_MAIL), zaehleFehler(k.ip, MAX_IP)]);
}

// Hyrje e suksesshme: numëruesi i këtij email-i zerohet
export async function loescheFehlversuche(email: string) {
  await db.loginVersuch.deleteMany({ where: { schluessel: `mail:${email.slice(0, 200)}` } });
}
