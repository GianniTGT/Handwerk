"use server";

// Datenübernahme (bexio, Excel, andere Programme): Der Browser hat die CSV bereits gelesen und die Spalten zugeordnet,
// hier kommen fertige Datensätze in Paketen an. Pro Paket max. 200 Zeilen (CHUNK), damit die Anfrage klein bleibt.

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { parseZahl } from "./csv";
import { CHUNK } from "./import-felder";

export type ImportZeile = Record<string, string>;
export type ImportErgebnis = { neu: number; aktualisiert: number; uebersprungen: number; fehler: string[] };
export type Duplikate = "ueberspringen" | "aktualisieren";

const leer: ImportErgebnis = { neu: 0, aktualisiert: 0, uebersprungen: 0, fehler: [] };
const t = (z: ImportZeile, k: string) => String(z[k] ?? "").trim();

// bexio «Kontaktart»: Firma/Privat, teils auch 1/2 (API) oder englisch
function kontaktTyp(wert: string, vorname: string, name: string): "FIRMA" | "PRIVAT" {
  const w = wert.toLowerCase();
  if (/priv|person|natürlich|natuerlich|^2$|individual/.test(w)) return "PRIVAT";
  if (/firm|comp|org|jur|^1$|unternehmen|gesch/.test(w)) return "FIRMA";
  // ohne Angabe: Vorname vorhanden und kein Firmenkürzel im Namen → Privatperson
  return vorname && !/\b(AG|GmbH|SA|Sàrl|Sagl|KlG|Genossenschaft|Verein|Stiftung|Inc|Ltd)\b/i.test(name) ? "PRIVAT" : "FIRMA";
}

function sprache(wert: string): string {
  const w = wert.toLowerCase();
  if (/^fr|franz|french/.test(w)) return "FR";
  if (/^it|ital/.test(w)) return "IT";
  if (/^en|engl/.test(w)) return "EN";
  return "DE";
}

export async function importiereKontakte(zeilen: ImportZeile[], duplikate: Duplikate): Promise<ImportErgebnis> {
  const { betrieb } = await sitzungErforderlich("KONTAKTE");
  const paket = zeilen.slice(0, CHUNK);
  const erg: ImportErgebnis = { ...leer, fehler: [] };

  const vorhandene = await db.kunde.findMany({
    where: { betriebId: betrieb.id },
    select: { id: true, name: true, plz: true, kontaktNr: true },
  });
  const nachNr = new Map(vorhandene.filter((k) => k.kontaktNr != null).map((k) => [k.kontaktNr as number, k.id]));
  const nachName = new Map(vorhandene.map((k) => [`${k.name.toLowerCase()}|${k.plz}`, k.id]));
  let naechsteNr = Math.max(0, ...vorhandene.map((k) => k.kontaktNr ?? 0)) + 1;
  // bexio «Ansprechpartner» = unser Mitarbeiter → per Name zuordnen
  const team = await db.mitarbeiter.findMany({ where: { betriebId: betrieb.id }, select: { id: true, name: true } });
  const teamNachName = new Map(team.map((m) => [m.name.toLowerCase().replace(/\s+/g, " "), m.id]));

  for (const [i, z] of paket.entries()) {
    const vorname = t(z, "vorname");
    const firmenname = t(z, "firmenname");
    const name1 = t(z, "name");
    const nachnameExplizit = t(z, "nachname");
    const typ = kontaktTyp(t(z, "typ"), vorname, firmenname || name1);
    // bexio: Name 1 = Firma oder Nachname, Name 2 = Vorname; im Serienbrief-Export steht die Firma zusätzlich in «Firmenname»
    const nachname = typ === "PRIVAT" ? nachnameExplizit || name1 : "";
    const name = typ === "PRIVAT" ? `${vorname} ${nachname}`.trim() : firmenname || name1 || `${vorname} ${nachnameExplizit}`.trim();
    if (!name) {
      erg.uebersprungen++;
      erg.fehler.push(`Zeile ${i + 1}: kein Name`);
      continue;
    }
    const nrRoh = parseInt(t(z, "kontaktNr").replace(/\D/g, ""));
    const kontaktNr = Number.isFinite(nrRoh) && nrRoh > 0 ? nrRoh : null;
    const uid = t(z, "uid");
    // bexio «Adresse» kann mehrzeilig sein: erste Zeile Strasse, Rest als Adresszusatz
    const [strasse, ...adressRest] = t(z, "strasse").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const anzahlRoh = parseInt(t(z, "anzahlMitarbeiter").replace(/\D/g, ""));
    const ansprech = t(z, "ansprechpartner").toLowerCase().replace(/\s+/g, " ");
    const daten = {
      typ,
      name,
      vorname: typ === "PRIVAT" ? vorname : "",
      nachname,
      anrede: typ === "PRIVAT" ? t(z, "anrede") : "",
      zusatz: typ === "FIRMA" ? t(z, "zusatz") : "",
      strasse: strasse ?? "",
      adresszusatz: t(z, "adresszusatz") || adressRest.join(", "),
      korrespondenzweg: /post|brief/i.test(t(z, "korrespondenzweg")) ? "POST" : "MAIL",
      anzahlMitarbeiter: Number.isFinite(anzahlRoh) && anzahlRoh > 0 ? anzahlRoh : null,
      ansprechpartnerId: (ansprech && teamNachName.get(ansprech)) || null,
      plz: t(z, "plz"),
      ort: t(z, "ort"),
      land: t(z, "land") || "Schweiz",
      email: t(z, "email"),
      email2: t(z, "email2"),
      telefon: t(z, "telefon"),
      telefon2: t(z, "telefon2"),
      mobile: t(z, "mobile"),
      website: t(z, "website"),
      kategorie: t(z, "kategorie"),
      branche: t(z, "branche"),
      sprache: sprache(t(z, "sprache")),
      bemerkung: t(z, "bemerkung"),
      mwstNr: t(z, "mwstNr") || (uid ? `${uid} MWST` : ""),
      uid,
      handelsregisterNr: t(z, "handelsregisterNr"),
    };

    const bestehendId = (kontaktNr !== null && nachNr.get(kontaktNr)) || nachName.get(`${name.toLowerCase()}|${daten.plz}`);
    if (bestehendId) {
      if (duplikate === "aktualisieren") {
        // Nur gefüllte Felder überschreiben, Leeres aus der Datei löscht nichts
        const nurGefuellt = Object.fromEntries(
          Object.entries(daten).filter(([, v]) => v !== "" && v !== null && v !== "Schweiz" && v !== "DE" && v !== "MAIL")
        );
        await db.kunde.update({ where: { id: bestehendId }, data: nurGefuellt });
        erg.aktualisiert++;
      } else {
        erg.uebersprungen++;
      }
      continue;
    }
    const nr = kontaktNr !== null && !nachNr.has(kontaktNr) ? kontaktNr : naechsteNr++;
    while (nachNr.has(naechsteNr)) naechsteNr++;
    const k = await db.kunde.create({ data: { ...daten, betriebId: betrieb.id, kontaktNr: nr } });
    nachNr.set(nr, k.id);
    nachName.set(`${name.toLowerCase()}|${daten.plz}`, k.id);
    erg.neu++;
  }
  revalidatePath("/kunden");
  return erg;
}

export async function importiereArtikel(zeilen: ImportZeile[], duplikate: Duplikate): Promise<ImportErgebnis> {
  const { betrieb } = await sitzungErforderlich("PRODUKTE");
  const paket = zeilen.slice(0, CHUNK);
  const erg: ImportErgebnis = { ...leer, fehler: [] };

  const vorhandene = await db.artikel.findMany({ where: { betriebId: betrieb.id }, select: { id: true, artikelNr: true, bezeichnung: true } });
  const nachNr = new Map(vorhandene.filter((a) => a.artikelNr).map((a) => [a.artikelNr.toLowerCase(), a.id]));
  const nachBez = new Map(vorhandene.map((a) => [a.bezeichnung.toLowerCase(), a.id]));

  for (const [i, z] of paket.entries()) {
    const bezeichnung = t(z, "bezeichnung");
    if (!bezeichnung) {
      erg.uebersprungen++;
      erg.fehler.push(`Zeile ${i + 1}: keine Bezeichnung`);
      continue;
    }
    const artikelNr = t(z, "artikelNr");
    const ek = parseZahl(t(z, "einkaufspreis"));
    const vk = parseZahl(t(z, "preis"));
    const mwstRoh = parseZahl(t(z, "mwstSatz"));
    const daten = {
      artikelNr,
      bezeichnung,
      gruppe: t(z, "gruppe"),
      einheit: t(z, "einheit") || "Stk.",
      art: /dienst|service|leistung|stunde|arbeit/i.test(t(z, "art")) ? "DIENSTLEISTUNG" : "WARE",
      einkaufspreis: ek > 0 ? ek : 0,
      preis: ek > 0 ? ek : vk,
      zuschlagProzent: ek > 0 && vk > 0 ? Math.round((vk / ek - 1) * 10000) / 100 : 0,
      mwstSatz: [0, 2.6, 3.8, 8.1, 7.7, 2.5].includes(mwstRoh) ? mwstRoh : 8.1,
    };
    const bestehendId = (artikelNr && nachNr.get(artikelNr.toLowerCase())) || (!artikelNr && nachBez.get(bezeichnung.toLowerCase()));
    if (bestehendId) {
      if (duplikate === "aktualisieren") {
        await db.artikel.update({ where: { id: bestehendId }, data: daten });
        erg.aktualisiert++;
      } else erg.uebersprungen++;
      continue;
    }
    const a = await db.artikel.create({ data: { ...daten, betriebId: betrieb.id } });
    if (artikelNr) nachNr.set(artikelNr.toLowerCase(), a.id);
    nachBez.set(bezeichnung.toLowerCase(), a.id);
    erg.neu++;
  }
  revalidatePath("/artikel");
  return erg;
}
