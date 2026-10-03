// Import von einer Firmen-Webseite: Startseite plus Impressum/Kontakt lesen und daraus Firma, Adresse,
// Telefon, E-Mail, UID/MWST-Nr. vorschlagen. Rein serverseitig, nur öffentliche Hosts (kein Zugriff ins eigene Netz).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type WebseiteTreffer = {
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  telefon: string;
  email: string;
  website: string;
  uid: string;
  mwstNr: string;
  quellen: string[]; // gelesene Seiten (für die Anzeige)
};

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 7000;

export function normalisiereUrl(eingabe: string): URL | null {
  let t = eingabe.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = "https://" + t;
  try {
    const u = new URL(t);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

// Private und lokale Adressen sperren (SSRF-Schutz)
function privateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("::ffff:");
}

export async function hostErlaubt(host: string): Promise<boolean> {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;
  if (isIP(h)) return !privateIp(h);
  try {
    const adressen = await lookup(h, { all: true });
    return adressen.length > 0 && adressen.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

async function holeSeite(url: URL): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Handwerk-by-TIFF/1.0; +https://tiff-software.ch)", Accept: "text/html,*/*;q=0.5", "Accept-Language": "de-CH,de;q=0.9" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const typ = res.headers.get("content-type") ?? "";
  if (!/html|xml|text/i.test(typ)) throw new Error("kein HTML");
  // Nur die ersten 1.5 MB lesen
  const reader = res.body.getReader();
  const teile: Uint8Array[] = [];
  let gelesen = 0;
  while (gelesen < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    teile.push(value);
    gelesen += value.byteLength;
  }
  void reader.cancel().catch(() => {});
  return Buffer.concat(teile).toString("utf8");
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#039": "'", "#160": " " };
const entschluesseln = (t: string) =>
  t.replace(/&(amp|lt|gt|quot|apos|nbsp|#39|#039|#160);/g, (_, e) => ENT[e] ?? "").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

// HTML → Text mit Zeilenumbrüchen an Blockgrenzen
function alsText(html: string): string {
  return entschluesseln(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|td|th|h\d|address|section|article|header|footer|dd|dt)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

type JsonLd = Record<string, unknown>;
function jsonLdOrganisation(html: string): JsonLd | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(m[1].trim());
      const kandidaten: JsonLd[] = [];
      const sammle = (x: unknown) => {
        if (Array.isArray(x)) x.forEach(sammle);
        else if (x && typeof x === "object") {
          const o = x as JsonLd;
          kandidaten.push(o);
          if (o["@graph"]) sammle(o["@graph"]);
          if (o.publisher) sammle(o.publisher);
        }
      };
      sammle(d);
      const org = kandidaten.find((o) => {
        const t = String(o["@type"] ?? "");
        return /Organization|LocalBusiness|Store|Corporation|Plumber|HVACBusiness|HomeAndConstructionBusiness|Electrician|GeneralContractor/i.test(t);
      });
      if (org) return org;
    } catch {
      /* ungültiges JSON-LD ignorieren */
    }
  }
  return null;
}

// Schweizer Nummer einheitlich als «044 925 61 11» ausgeben
const telefonAus = (t: string) => {
  const m = t.replace(/\(0\)/g, "").match(/(?:\+41|0041|0)\s?\d{2}[\s./-]?\d{3}[\s./-]?\d{2}[\s./-]?\d{2}/);
  if (!m) return "";
  let z = m[0].replace(/\D/g, "");
  if (z.startsWith("0041")) z = "0" + z.slice(4);
  else if (z.startsWith("41") && z.length === 11) z = "0" + z.slice(2);
  return z.length === 10 ? `${z.slice(0, 3)} ${z.slice(3, 6)} ${z.slice(6, 8)} ${z.slice(8)}` : m[0].trim();
};

const emailAus = (html: string, text: string) => {
  const alle = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>\\}\]]+)/gi)) alle.add(entschluesseln(m[1]).toLowerCase());
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) alle.add(m[0].toLowerCase());
  const liste = [...alle].filter(
    (e) => /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(e) && !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(e) && !/noreply|no-reply|example\.|sentry|wixpress/i.test(e)
  );
  return liste.find((e) => /^(info|kontakt|contact|office|mail|hello|hallo|admin)@/.test(e)) ?? liste[0] ?? "";
};

function adresseAus(text: string): { strasse: string; plz: string; ort: string } {
  // Strasse mit typischer Endung + Nummer, dann PLZ Ort (ggf. auf der nächsten Zeile)
  const streng =
    /([A-ZÄÖÜ][\wäöüéèàçâêîôû'’.\- ]{1,40}?(?:strasse|straße|str\.|weg|gasse|platz|allee|ring|rain|halde|matte|hof|quai|promenade|rue|route|chemin|avenue|via)\s*\d{1,4}\s?[a-zA-Z]?)[\s,]*(?:CH[- ])?(\d{4})\s+([A-ZÄÖÜ][\wäöüéèàçâêîôû'’.\- ]{1,30}?)(?=\s*(?:\n|,|·|\||Schweiz|Switzerland|Suisse|Tel|Telefon|Phone|$))/m;
  const locker = /([A-ZÄÖÜ][^\n,;|]{2,40}?\s\d{1,4}\s?[a-zA-Z]?)[\s,]*(?:CH[- ])?(\d{4})\s+([A-ZÄÖÜ][^\n,;|0-9]{1,30}?)(?=\s*(?:\n|,|·|\||Schweiz|Switzerland|Suisse|Tel|Telefon|Phone|$))/m;
  const m = text.match(streng) ?? text.match(locker);
  if (!m) return { strasse: "", plz: "", ort: "" };
  return { strasse: m[1].trim(), plz: m[2], ort: m[3].trim() };
}

const uidAus = (text: string) => {
  const m = text.match(/CHE[-\s]?(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})/i);
  return m ? `CHE-${m[1]}.${m[2]}.${m[3]}` : "";
};

function nameAus(html: string, org: JsonLd | null): string {
  const ld = org && typeof org.name === "string" ? org.name : "";
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1];
  const titel = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const roh = ld || og || titel || "";
  // «Firma AG – Startseite» → «Firma AG»
  return entschluesseln(roh)
    .split(/\s[|–—-]\s|\s[·•]\s/)[0]
    .replace(/\b(Home|Startseite|Willkommen)\b/gi, "")
    .trim()
    .slice(0, 120);
}

function lies(html: string, url: URL): Partial<WebseiteTreffer> {
  const text = alsText(html);
  const org = jsonLdOrganisation(html);
  const adr = (org?.address ?? null) as JsonLd | null;
  const ldAdresse = adr && typeof adr === "object" ? { strasse: String(adr.streetAddress ?? ""), plz: String(adr.postalCode ?? ""), ort: String(adr.addressLocality ?? "") } : null;
  const regexAdresse = adresseAus(text);
  const tel = html.match(/href=["']tel:([^"']+)/i)?.[1];
  return {
    name: nameAus(html, org),
    strasse: ldAdresse?.strasse || regexAdresse.strasse,
    plz: (ldAdresse?.plz || regexAdresse.plz).replace(/\D/g, "").slice(0, 4),
    ort: ldAdresse?.ort || regexAdresse.ort,
    telefon: telefonAus(String(org?.telephone ?? "")) || (tel ? telefonAus(decodeURIComponent(tel)) : "") || telefonAus(text.match(/(?:Tel(?:efon)?\.?|Phone|Fon)\s*:?\s*([+\d][\d\s().\/-]{8,})/i)?.[1] ?? "") || telefonAus(text),
    email: (typeof org?.email === "string" ? org.email.replace(/^mailto:/, "") : "") || emailAus(html, text),
    uid: (typeof org?.vatID === "string" ? uidAus(org.vatID) : "") || uidAus(text),
    website: `${url.protocol}//${url.host}`,
  };
}

// Unterseiten, die typischerweise Adresse und UID tragen
function unterseiten(html: string, basis: URL): URL[] {
  const out: URL[] = [];
  for (const m of html.matchAll(/href=["']([^"'#?]+)/gi)) {
    if (!/impressum|imprint|kontakt|contact|ueber-uns|uber-uns|about|legal|rechtliches/i.test(m[1])) continue;
    try {
      const u = new URL(entschluesseln(m[1]), basis);
      if (u.host !== basis.host || !/^https?:$/.test(u.protocol)) continue;
      u.hash = "";
      if (!out.some((x) => x.href === u.href)) out.push(u);
    } catch {
      /* ungültiger Link */
    }
    if (out.length >= 3) break;
  }
  // Impressum zuerst (dort stehen UID und Adresse am zuverlässigsten)
  return out.sort((a, b) => Number(/kontakt|contact/i.test(a.pathname)) - Number(/kontakt|contact/i.test(b.pathname)) + Number(!/impressum|imprint/i.test(a.pathname)) - Number(!/impressum|imprint/i.test(b.pathname)));
}

export async function importVonWebseite(eingabe: string): Promise<WebseiteTreffer> {
  const start = normalisiereUrl(eingabe);
  if (!start) throw new Error("ungueltige-url");
  if (!(await hostErlaubt(start.hostname))) throw new Error("host-gesperrt");

  const ergebnis: WebseiteTreffer = { name: "", strasse: "", plz: "", ort: "", telefon: "", email: "", website: "", uid: "", mwstNr: "", quellen: [] };
  const uebernimm = (t: Partial<WebseiteTreffer>) => {
    for (const k of ["name", "strasse", "plz", "ort", "telefon", "email", "website", "uid"] as const) {
      if (!ergebnis[k] && t[k]) ergebnis[k] = t[k]!;
    }
  };

  const startHtml = await holeSeite(start);
  ergebnis.quellen.push(start.href);
  const startDaten = lies(startHtml, start);
  // Unterseiten zuerst für Adresse/UID, Startseite für Name/Website
  ergebnis.name = startDaten.name ?? "";
  ergebnis.website = startDaten.website ?? "";
  for (const u of unterseiten(startHtml, start)) {
    try {
      const html = await holeSeite(u);
      ergebnis.quellen.push(u.href);
      const d = lies(html, u);
      uebernimm({ ...d, name: "" }); // Firmenname bleibt von der Startseite, ausser dort fehlt er
      if (!ergebnis.name && d.name) ergebnis.name = d.name;
    } catch {
      /* Unterseite nicht lesbar — weiter */
    }
    if (ergebnis.strasse && ergebnis.plz && ergebnis.telefon && ergebnis.email && ergebnis.uid) break;
  }
  uebernimm(startDaten);
  if (ergebnis.uid) ergebnis.mwstNr = `${ergebnis.uid} MWST`;
  return ergebnis;
}
