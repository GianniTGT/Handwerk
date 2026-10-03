// Datenübernahme aus bexio, Excel oder anderen Programmen: Zielfelder, Spalten-Erkennung und CSV-Parser.
// Wird im Browser (Assistent) und auf dem Server (Import) verwendet — keine Abhängigkeiten.

export type ImportTyp = "kontakte" | "artikel";

export type FeldDef = {
  key: string;
  label: string;
  aliase: string[]; // normalisierte Spaltennamen (klein, ohne Sonderzeichen), die automatisch zugeordnet werden
  pflicht?: boolean;
  hinweis?: string;
};

// Spaltenname vergleichbar machen: «E-Mail (geschäftlich)» → «emailgeschaeftlich»
export const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");

export const FELDER: Record<ImportTyp, FeldDef[]> = {
  kontakte: [
    { key: "kontaktNr", label: "Kontakt-Nr.", aliase: ["kontaktnr", "nr", "nummer", "kundennr", "kundennummer", "kontaktnummer", "contactnr", "number", "debitorennr"] },
    { key: "typ", label: "Kontaktart (Firma/Privat)", aliase: ["typ", "kontaktart", "kontakttyp", "art", "contacttype", "contacttypeid", "kontaktyp"] },
    {
      key: "name",
      label: "Firma / Name 1",
      pflicht: true,
      hinweis: "Bei bexio «Name 1»: Firma oder Nachname",
      aliase: ["name1", "name", "firma", "name1firma", "firmaname", "kontakt", "company", "unternehmen", "kunde", "bezeichnung", "organisation"],
    },
    { key: "firmenname", label: "Firmenname (bexio Serienbrief)", hinweis: "Falls vorhanden, hat er Vorrang vor Name 1", aliase: ["firmenname", "firmenbezeichnung"] },
    { key: "vorname", label: "Vorname / Name 2", hinweis: "Bei bexio «Name 2»", aliase: ["name2", "vorname", "firstname", "name2vorname"] },
    { key: "nachname", label: "Nachname", aliase: ["nachname", "lastname", "familienname", "surname"] },
    { key: "zusatz", label: "Firmennamen-Zusatz", aliase: ["zusatz", "firmennamenzusatz", "namenszusatz", "name3", "namezusatz"] },
    { key: "anrede", label: "Anrede", aliase: ["anrede", "salutation", "titel"] },
    { key: "strasse", label: "Strasse und Nr.", aliase: ["strasse", "adresse", "address", "strasseundnr", "street", "strassenr", "adresszeile1"] },
    { key: "adresszusatz", label: "Adresszusatz / Postfach", aliase: ["adresszusatz", "postfach", "addressline2", "zusatzadresse", "adresszeile2", "pobox"] },
    { key: "plz", label: "PLZ", pflicht: false, aliase: ["plz", "postleitzahl", "postcode", "zip", "zipcode", "npa"] },
    { key: "ort", label: "Ort", aliase: ["ort", "stadt", "city", "wohnort", "localite"] },
    { key: "land", label: "Land", aliase: ["land", "country", "staat"] },
    { key: "email", label: "E-Mail", aliase: ["email", "emailadresse", "mail", "emailgeschaeftlich", "emailadress"] },
    { key: "email2", label: "E-Mail 2", aliase: ["email2", "mail2", "mailsecond", "zweiteemail", "emailprivat"] },
    { key: "telefon", label: "Telefon", aliase: ["telefon", "telefonfix", "telefonfestnetz", "tel", "phone", "phonefixed", "festnetz", "telefon1", "telefongeschaeftlich", "telefonnummer"] },
    { key: "telefon2", label: "Telefon 2", aliase: ["telefon2", "phonefixedsecond", "telefonfix2", "telefonprivat", "fax"] },
    { key: "mobile", label: "Mobile", aliase: ["mobile", "mobil", "telefonmobil", "natel", "handy", "phonemobile", "mobiltelefon"] },
    { key: "website", label: "Website", aliase: ["website", "webseite", "web", "homepage", "url", "internet"] },
    { key: "kategorie", label: "Kategorie", aliase: ["kategorie", "kontaktgruppe", "kontaktgruppen", "gruppe", "category", "kundengruppe", "kategorien"] },
    { key: "branche", label: "Branche", aliase: ["branche", "industry", "sektor"] },
    { key: "sprache", label: "Sprache", aliase: ["sprache", "language", "korrespondenzsprache"] },
    { key: "korrespondenzweg", label: "Korrespondenzweg (Mail/Post)", aliase: ["korrespondenzweg", "versandart", "korrespondenz"] },
    { key: "ansprechpartner", label: "Betreut von (Name unseres Mitarbeiters)", hinweis: "Bei bexio «Ansprechpartner» — wird per Name zugeordnet", aliase: ["ansprechpartner", "betreutvon", "zustaendig", "verantwortlich", "besitzer", "owner"] },
    { key: "anzahlMitarbeiter", label: "Anzahl Mitarbeitende", aliase: ["anzahlmitarbeiter", "anzahlmitarbeitende", "mitarbeiter", "employees"] },
    { key: "bemerkung", label: "Bemerkungen", aliase: ["bemerkung", "bemerkungen", "notiz", "notizen", "remarks", "kommentar", "notes"] },
    { key: "mwstNr", label: "MWST-Nr.", aliase: ["mwstnr", "mwstnummer", "mehrwertsteuernummer", "vatnr", "mwst", "vat"] },
    { key: "uid", label: "UID", aliase: ["uid", "uidnummer", "uidnr", "unternehmensidentifikationsnummer", "umsatzsteueridentifikationsnummer", "ustid"] },
    { key: "handelsregisterNr", label: "Handelsregister-Nr.", aliase: ["handelsregisternr", "handelsregisternummer", "hrnr", "handelsregister"] },
  ],
  artikel: [
    { key: "artikelNr", label: "Art-Nr. / Produktcode", aliase: ["artikelnr", "artnr", "artikelnummer", "produktnr", "produktcode", "code", "nummer", "nr", "intercode", "artikelcode", "produktnummer", "artikelcode"] },
    { key: "bezeichnung", label: "Bezeichnung", pflicht: true, aliase: ["bezeichnung", "name", "produktname", "artikelname", "titel", "text", "artikel", "produkt", "artikeltext", "produktbezeichnung"] },
    { key: "gruppe", label: "Gruppe", aliase: ["gruppe", "produktgruppe", "artikelgruppe", "kategorie", "warengruppe", "artikelkategorie"] },
    { key: "einheit", label: "Einheit", aliase: ["einheit", "mengeneinheit", "me", "unit", "einh"] },
    { key: "art", label: "Art (Ware/Dienstleistung)", aliase: ["art", "typ", "produktart", "type", "artikeltyp", "artikelart"] },
    { key: "einkaufspreis", label: "Einkaufspreis (EK)", aliase: ["einkaufspreis", "ek", "ekpreis", "purchaseprice", "einkauf", "einstandspreis", "einkaufswert"] },
    { key: "preis", label: "Verkaufspreis (VK)", aliase: ["verkaufspreis", "vk", "preis", "vkpreis", "salesprice", "preisexklmwst", "nettopreis", "listenpreis", "einzelpreis", "preisexkl", "verkaufspreisexklmwst"] },
    { key: "mwstSatz", label: "MwSt %", aliase: ["mwst", "mwstsatz", "steuersatz", "taxrate", "mehrwertsteuer", "mwstprozent"] },
  ],
};

// Automatische Zuordnung: pro Zielfeld die erste Spalte, deren normalisierter Name einem Alias entspricht
export function erkenneZuordnung(kopf: string[], typ: ImportTyp): Record<string, number> {
  const normKopf = kopf.map(norm);
  const belegt = new Set<number>();
  const out: Record<string, number> = {};
  for (const f of FELDER[typ]) {
    for (const alias of f.aliase) {
      const i = normKopf.findIndex((k, idx) => k === alias && !belegt.has(idx));
      if (i >= 0) {
        out[f.key] = i;
        belegt.add(i);
        break;
      }
    }
  }
  return out;
}

// Zellwert bereinigen: bexio/Excel setzen vor Nummern und Adressen ein Apostroph als Textmarker («'000003», «'Holenackerstrasse 27»)
export const bereinige = (w: unknown) =>
  String(w ?? "")
    .replace(/^'+/, "")
    .trim();

// CSV lesen: Trennzeichen ; , oder Tab automatisch, Anführungszeichen mit "" als Escape, Zeilenumbrüche in Feldern
export function parseCsv(text: string): { kopf: string[]; zeilen: string[][] } {
  const t = text.replace(/^﻿/, "");
  const ersteZeile = t.split(/\r?\n/, 1)[0] ?? "";
  const zaehle = (c: string) => ersteZeile.split(c).length - 1;
  const trenner = zaehle("\t") > zaehle(";") && zaehle("\t") > zaehle(",") ? "\t" : zaehle(";") >= zaehle(",") ? ";" : ",";

  const zeilen: string[][] = [];
  let feld = "";
  let zeile: string[] = [];
  let inAnf = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inAnf) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          feld += '"';
          i++;
        } else inAnf = false;
      } else feld += c;
    } else if (c === '"' && feld === "") {
      inAnf = true;
    } else if (c === trenner) {
      zeile.push(feld);
      feld = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      zeile.push(feld);
      feld = "";
      if (zeile.some((x) => x.trim() !== "")) zeilen.push(zeile.map(bereinige));
      zeile = [];
    } else feld += c;
  }
  zeile.push(feld);
  if (zeile.some((x) => x.trim() !== "")) zeilen.push(zeile.map(bereinige));
  const [kopf = [], ...daten] = zeilen;
  return { kopf, zeilen: daten };
}

export const MAX_ZEILEN = 20000;
export const CHUNK = 200;
