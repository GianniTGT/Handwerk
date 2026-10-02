// Parser i thjeshtë CSV për listat e çmimeve të furnitorëve.
// Pranon ; ose , si ndarës, kokat e kolonave në gjermanisht me variante të
// zakonshme, numra zviceranë (1'234.50) dhe presje dhjetore gjermane (68,25).

export type ArtikelZeile = {
  artikelNr: string;
  bezeichnung: string;
  einheit: string;
  bruttoPreis: number;
  rabattgruppe: string;
};

const KOPF_ALIASE: Record<keyof ArtikelZeile, string[]> = {
  artikelNr: ["artikelnr", "artnr", "artikelnummer", "artikel", "nr", "nummer"],
  bezeichnung: ["bezeichnung", "beschreibung", "text", "name", "artikeltext"],
  einheit: ["einheit", "me", "mengeneinheit", "einh"],
  bruttoPreis: ["bruttopreis", "brutto", "preis", "vk", "listenpreis", "einzelpreis"],
  rabattgruppe: ["rabattgruppe", "rg", "warengruppe", "wg", "rabattgrp"],
};

function normalisiere(s: string) {
  return s.toLowerCase().replace(/[^a-zäöü]/g, "");
}

export function parseZahl(s: string): number {
  const bereinigt = s.replace(/['\s]/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(bereinigt);
  return Number.isFinite(n) ? n : 0;
}

function spalte(zeile: string, trenner: string): string[] {
  // CSV me mbështetje thonjëzash — por `"` brenda një fushe të pa-thonjëzuar
  // është karakter i zakonshëm (shenja e inç-it: 1", 3/4" — e përhershme në SHK!)
  const felder: string[] = [];
  let aktuell = "";
  let inAnfz = false;
  let feldAnfang = true;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"' && feldAnfang && !inAnfz) {
      inAnfz = true; // thonjëza hapëse vetëm në fillim të fushës
      feldAnfang = false;
    } else if (c === '"' && inAnfz) {
      if (zeile[i + 1] === '"') {
        aktuell += '"';
        i++;
      } else inAnfz = false;
    } else if (c === trenner && !inAnfz) {
      felder.push(aktuell);
      aktuell = "";
      feldAnfang = true;
    } else {
      aktuell += c;
      feldAnfang = false;
    }
  }
  felder.push(aktuell);
  return felder.map((f) => f.trim());
}

export function parseArtikelCsv(text: string): { zeilen: ArtikelZeile[]; fehler: string[] } {
  const fehler: string[] = [];
  const zeilenRoh = text
    .replace(/^﻿/, "") // BOM nga Excel
    .split(/\r?\n/)
    .filter((z) => z.trim().length > 0);
  if (zeilenRoh.length < 2) return { zeilen: [], fehler: ["Datei leer oder ohne Datenzeilen."] };
  if (zeilenRoh.length > 20001) return { zeilen: [], fehler: ["Max. 20'000 Zeilen pro Import."] };

  const kopfZeile = zeilenRoh[0];
  const trenner = (kopfZeile.match(/;/g)?.length ?? 0) >= (kopfZeile.match(/,/g)?.length ?? 0) ? ";" : ",";
  const kopf = spalte(kopfZeile, trenner).map(normalisiere);

  const index: Partial<Record<keyof ArtikelZeile, number>> = {};
  for (const feld of Object.keys(KOPF_ALIASE) as (keyof ArtikelZeile)[]) {
    for (const alias of KOPF_ALIASE[feld]) {
      const i = kopf.indexOf(alias);
      if (i >= 0 && !(feld in index)) {
        index[feld] = i;
        break;
      }
    }
  }
  if (index.bezeichnung === undefined) {
    return {
      zeilen: [],
      fehler: [
        `Spalte «Bezeichnung» nicht gefunden. Gefundene Spalten: ${spalte(kopfZeile, trenner).join(", ")}`,
      ],
    };
  }

  const zeilen: ArtikelZeile[] = [];
  for (let i = 1; i < zeilenRoh.length; i++) {
    const felder = spalte(zeilenRoh[i], trenner);
    const bezeichnung = felder[index.bezeichnung] ?? "";
    if (!bezeichnung.trim()) {
      fehler.push(`Zeile ${i + 1}: keine Bezeichnung — übersprungen.`);
      continue;
    }
    zeilen.push({
      artikelNr: index.artikelNr !== undefined ? (felder[index.artikelNr] ?? "").trim() : "",
      bezeichnung: bezeichnung.trim(),
      einheit: index.einheit !== undefined ? (felder[index.einheit] ?? "Stk.").trim() || "Stk." : "Stk.",
      bruttoPreis: index.bruttoPreis !== undefined ? parseZahl(felder[index.bruttoPreis] ?? "0") : 0,
      rabattgruppe: index.rabattgruppe !== undefined ? (felder[index.rabattgruppe] ?? "").trim() : "",
    });
  }
  return { zeilen, fehler };
}
