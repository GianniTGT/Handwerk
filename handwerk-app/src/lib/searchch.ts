// Import von Search.ch (tel.search.ch API): Adressdaten für neue Kontakte vorschlagen.
// Ohne API-Schlüssel liefert Search.ch nur Textblöcke (Name, Adresse, PLZ Ort, Telefon) — daraus werden die Felder gelesen.
// Mit SEARCHCH_API_KEY (kostenlos bei Search.ch) kommen strukturierte Felder (E-Mail, Website, Branche …) dazu.

export type SearchChTreffer = {
  typ: "FIRMA" | "PRIVAT";
  name: string; // Firma bzw. «Vorname Nachname»
  vorname: string;
  nachname: string;
  zusatz: string;
  strasse: string;
  plz: string;
  ort: string;
  kanton: string;
  telefon: string;
  email: string;
  website: string;
  branche: string;
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };
const entschluesseln = (t: string) => t.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m).trim();

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? entschluesseln(m[1]) : "";
};
const extra = (xml: string, typ: string) => {
  const m = xml.match(new RegExp(`<tel:extra[^>]*type="${typ}"[^>]*>([\\s\\S]*?)</tel:extra>`));
  return m ? entschluesseln(m[1]) : "";
};

// Telefonzeile bereinigen: «*0848 845 400 CHF 0.08/min» → «0848 845 400»
const telefonAus = (zeile: string) => {
  const m = zeile.replace(/^\*+/, "").match(/^\+?[\d][\d\s/.-]{6,}/);
  return m ? m[0].trim() : "";
};

export function parseSearchChAtom(xml: string, max = 10): SearchChTreffer[] {
  const out: SearchChTreffer[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    if (out.length >= max) break;
    const e = m[1];
    const titel = tag(e, "title");
    const zeilen = tag(e, "content").split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
    if (!titel) continue;

    // Textblock: Name, [Zusatz/Branche …], Strasse, «PLZ Ort KT», Telefon
    const plzIdx = zeilen.findIndex((z) => /^\d{4}\s+\S/.test(z));
    let strasse = "";
    let plz = "";
    let ort = "";
    let kanton = "";
    let telefon = "";
    let zwischen: string[] = [];
    if (plzIdx > 0) {
      const mm = zeilen[plzIdx].match(/^(\d{4})\s+(.+?)(?:\s+([A-Z]{2}))?$/);
      plz = mm?.[1] ?? "";
      ort = mm?.[2] ?? "";
      kanton = mm?.[3] ?? "";
      strasse = zeilen[plzIdx - 1] !== zeilen[0] ? zeilen[plzIdx - 1] : "";
      zwischen = zeilen.slice(1, strasse ? plzIdx - 1 : plzIdx);
      telefon = telefonAus(zeilen[plzIdx + 1] ?? "");
    }

    // Strukturierte Felder (nur mit API-Schlüssel vorhanden) haben Vorrang
    const sName = tag(e, "tel:name");
    const sVor = tag(e, "tel:firstname");
    const sStrasse = [tag(e, "tel:street"), tag(e, "tel:streetno")].filter(Boolean).join(" ");
    const sType = tag(e, "tel:type");

    // Person erkennen: «Nachname, Vorname (-Geburtsname)» bzw. Typ «Person»
    const istPerson = sType ? /person/i.test(sType) : /^[^,]+,\s*\S/.test(titel);
    let vorname = "";
    let nachname = "";
    let name = titel;
    if (istPerson) {
      const person = titel.replace(/\s*\([^)]*\)/g, "");
      const [nach, vor = ""] = person.split(",").map((x) => x.trim());
      nachname = sName || nach;
      // «Anna und Bernhard» → ersten Vornamen übernehmen
      vorname = sVor || vor.split(/\s+und\s+/i)[0];
      name = `${vorname} ${nachname}`.trim();
    } else if (sName) {
      name = sName;
    }

    out.push({
      typ: istPerson ? "PRIVAT" : "FIRMA",
      name,
      vorname,
      nachname,
      zusatz: istPerson ? "" : zwischen.filter((z) => !/^\*?\d/.test(z)).join(", "),
      strasse: sStrasse || strasse,
      plz: tag(e, "tel:zip") || plz,
      ort: tag(e, "tel:city") || ort,
      kanton: tag(e, "tel:canton") || kanton,
      telefon: telefonAus(tag(e, "tel:phone")) || telefon,
      email: extra(e, "email"),
      website: extra(e, "website"),
      branche: tag(e, "tel:occupation"),
    });
  }
  return out;
}

export async function sucheSearchCh(was: string, wo: string): Promise<SearchChTreffer[]> {
  const url = new URL("https://tel.search.ch/api/");
  url.searchParams.set("was", was);
  if (wo) url.searchParams.set("wo", wo);
  url.searchParams.set("maxnum", "10");
  url.searchParams.set("lang", "de");
  if (process.env.SEARCHCH_API_KEY) url.searchParams.set("key", process.env.SEARCHCH_API_KEY);

  const res = await fetch(url, {
    headers: { "User-Agent": "Handwerk-by-TIFF/1.0", Accept: "application/atom+xml" },
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Search.ch antwortet mit ${res.status}`);
  return parseSearchChAtom(await res.text());
}
