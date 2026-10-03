// Eksporti i listave në CSV (hapet drejt në Excel): ; si ndarës, UTF-8 me BOM, datë dd.mm.yyyy
import { db } from "./db";
import { faelligDatum } from "./faellig";
import { offenerBetrag } from "./mahnwesen";
import { einkaufsPreis, marge, verkaufsPreis } from "./preise";
import { bestellungNr, gutschriftNr, offerteNr, projektNr, rechnungNr, lieferscheinNr } from "./nrtext";
import type { Bereich } from "./rechte";

type Zelle = string | number | boolean | Date | null | undefined;

const tag = (d: Date | null | undefined) => (d ? d.toLocaleDateString("de-CH") : "");

function zelle(z: Zelle): string {
  let t: string;
  if (z === null || z === undefined) t = "";
  else if (z instanceof Date) t = tag(z);
  else if (typeof z === "boolean") t = z ? "ja" : "nein";
  else if (typeof z === "number") t = (Math.round(z * 100) / 100).toFixed(2);
  else t = z;
  // Mbrojtje nga formula-injection në Excel (vlera që fillojnë me = + - @)
  if (typeof z === "string" && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function alsCsv(kopf: string[], zeilen: Zelle[][]): string {
  return "﻿" + [kopf, ...zeilen].map((z) => z.map(zelle).join(";")).join("\r\n") + "\r\n";
}

export const EXPORT_TYPEN: Record<string, { label: string; bereich: Bereich | null; mitZeitraum: boolean }> = {
  kontakte: { label: "Kontakte", bereich: "KONTAKTE", mitZeitraum: false },
  offerten: { label: "Offerten", bereich: "VERKAUF", mitZeitraum: true },
  auftraege: { label: "Aufträge", bereich: "AUFTRAEGE", mitZeitraum: true },
  lieferscheine: { label: "Lieferscheine", bereich: "AUFTRAEGE", mitZeitraum: true },
  rechnungen: { label: "Rechnungen", bereich: "VERKAUF", mitZeitraum: true },
  gutschriften: { label: "Gutschriften", bereich: "VERKAUF", mitZeitraum: true },
  projekte: { label: "Projekte", bereich: "PROJEKTE", mitZeitraum: false },
  zeiten: { label: "Zeiterfassung", bereich: "PROJEKTE", mitZeitraum: true },
  artikel: { label: "Produkte / Artikel", bereich: "PRODUKTE", mitZeitraum: false },
  ausgaben: { label: "Ausgaben", bereich: "EINKAUF", mitZeitraum: true },
  bestellungen: { label: "Bestellungen (mit Positionen)", bereich: "EINKAUF", mitZeitraum: true },
  zahlungen: { label: "Banking-Zahlungen", bereich: "FINANZEN", mitZeitraum: true },
  aufgaben: { label: "Aufgaben", bereich: null, mitZeitraum: true },
};

export async function exportiere(
  typ: string,
  betriebId: string,
  von?: Date,
  bis?: Date
): Promise<{ dateiname: string; csv: string } | null> {
  // bis = fundi i ditës (përfshirë)
  const bisEnde = bis ? new Date(bis.getFullYear(), bis.getMonth(), bis.getDate() + 1) : undefined;
  const zeitraum = (feld: string) =>
    von || bisEnde ? { [feld]: { ...(von ? { gte: von } : {}), ...(bisEnde ? { lt: bisEnde } : {}) } } : {};
  const heute = new Date().toISOString().slice(0, 10);
  const datei = (n: string) => `${n}-${heute}.csv`;

  switch (typ) {
    case "kontakte": {
      const k = await db.kunde.findMany({ where: { betriebId }, orderBy: { name: "asc" } });
      return {
        dateiname: datei("Kontakte"),
        csv: alsCsv(
          ["Typ", "Name", "Kategorie", "Strasse", "PLZ", "Ort", "Telefon", "Mobile", "E-Mail", "Website", "Archiviert", "Bemerkung"],
          k.map((x) => [x.typ === "PRIVAT" ? "Privat" : "Firma", x.name, x.kategorie, x.strasse, x.plz, x.ort, x.telefon, x.mobile, x.email, x.website, x.archiviert, x.bemerkung])
        ),
      };
    }
    case "offerten": {
      const o = await db.offerte.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { kunde: true, gruppen: { include: { positionen: true } } },
        orderBy: { datum: "desc" },
      });
      return {
        dateiname: datei("Offerten"),
        csv: alsCsv(
          ["Nummer", "Datum", "Gültig bis", "Kunde", "Titel", "Status", "Total netto"],
          o.map((x) => [offerteNr(x), x.datum, x.gueltigBis, x.kunde.name, x.titel, x.status, x.gruppen.flatMap((g) => g.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0)])
        ),
      };
    }
    case "auftraege": {
      const a = await db.auftrag.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { kunde: true, objekt: true },
        orderBy: { nummer: "desc" },
      });
      return {
        dateiname: datei("Auftraege"),
        csv: alsCsv(
          ["Nummer", "Datum", "Kunde", "Objekt", "Titel", "Status"],
          a.map((x) => [String(x.nummer), x.datum, x.kunde.name, x.objekt?.bezeichnung ?? "", x.titel, x.status])
        ),
      };
    }
    case "lieferscheine": {
      const l = await db.lieferschein.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { auftrag: { include: { kunde: true } }, positionen: true },
        orderBy: { datum: "desc" },
      });
      return {
        dateiname: datei("Lieferscheine"),
        csv: alsCsv(
          ["Nummer", "Datum", "Kunde", "Auftrag", "Status", "Position", "Menge", "Einheit"],
          l.flatMap((x) => x.positionen.map((p) => [lieferscheinNr(x), x.datum, x.auftrag.kunde.name, String(x.auftrag.nummer), x.status, p.bezeichnung, p.menge, p.einheit]))
        ),
      };
    }
    case "rechnungen": {
      const r = await db.rechnung.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { auftrag: { include: { kunde: true } }, gutschriften: true, betrieb: true },
        orderBy: { datum: "desc" },
      });
      return {
        dateiname: datei("Rechnungen"),
        csv: alsCsv(
          ["Nummer", "Art", "Datum", "Fällig", "Kunde", "Auftrag", "Status", "Netto", "MwSt %", "Brutto", "Gutschriften", "Offen", "Mahnstufe"],
          r.map((x) => [
            rechnungNr(x),
            x.art === "TEIL" ? "Teilrechnung" : "Rechnung",
            x.datum,
            faelligDatum(x, x.betrieb.zahlungsfristTage),
            x.auftrag.kunde.name,
            String(x.auftrag.nummer),
            x.status,
            x.totalNetto,
            x.mwstSatz,
            x.totalBrutto,
            x.gutschriften.reduce((s, g) => s + g.totalBrutto, 0),
            x.status === "BEZAHLT" ? 0 : offenerBetrag(x),
            String(x.mahnstufe),
          ])
        ),
      };
    }
    case "gutschriften": {
      const g = await db.gutschrift.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { rechnung: { include: { auftrag: { include: { kunde: true } } } } },
        orderBy: { datum: "desc" },
      });
      return {
        dateiname: datei("Gutschriften"),
        csv: alsCsv(
          ["Nummer", "Datum", "Zu Rechnung", "Kunde", "Grund", "Netto", "Brutto"],
          g.map((x) => [gutschriftNr(x), x.datum, rechnungNr(x.rechnung), x.rechnung.auftrag.kunde.name, x.grund, x.totalNetto, x.totalBrutto])
        ),
      };
    }
    case "projekte": {
      const p = await db.projekt.findMany({
        where: { betriebId },
        include: { kunde: true, zeiten: { select: { minuten: true } } },
        orderBy: { nummer: "desc" },
      });
      return {
        dateiname: datei("Projekte"),
        csv: alsCsv(
          ["Nummer", "Name", "Kunde", "Status", "Substatus", "Start", "Ende", "Stunden"],
          p.map((x) => [projektNr(x), x.name, x.kunde?.name ?? "", x.status, x.substatus, x.start, x.ende, x.zeiten.reduce((s, z) => s + z.minuten, 0) / 60])
        ),
      };
    }
    case "zeiten": {
      const z = await db.zeiteintrag.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { mitarbeiter: true, projekt: true, auftrag: true, kunde: true },
        orderBy: { datum: "desc" },
      });
      return {
        dateiname: datei("Zeiten"),
        csv: alsCsv(
          ["Datum", "Mitarbeiter", "Tätigkeit", "Stunden", "Abrechenbar", "Stundensatz", "Betrag", "Status", "Projekt", "Auftrag", "Kunde", "Bemerkung"],
          z.map((x) => [x.datum, x.mitarbeiter.name, x.taetigkeit, x.minuten / 60, x.abrechenbar, x.stundensatz, x.abrechenbar ? (x.minuten / 60) * x.stundensatz : 0, x.status, x.projekt ? projektNr(x.projekt) : "", x.auftrag ? String(x.auftrag.nummer) : "", x.kunde?.name ?? "", x.bemerkung])
        ),
      };
    }
    case "artikel": {
      const [a, konditionen] = await Promise.all([
        db.artikel.findMany({ where: { betriebId }, include: { lieferant: true }, orderBy: { bezeichnung: "asc" } }),
        db.kondition.findMany({ where: { betriebId } }),
      ]);
      return {
        dateiname: datei("Artikel"),
        csv: alsCsv(
          ["Art-Nr", "Bezeichnung", "Lieferant", "Art", "Gruppe", "Einheit", "EK", "Zuschlag %", "VK", "Marge %", "MwSt %"],
          a.map((x) => {
            const ek = einkaufsPreis(x, konditionen);
            const vk = verkaufsPreis(x, konditionen);
            return [x.artikelNr, x.bezeichnung, x.lieferant?.name ?? "", x.art === "WARE" ? "Ware" : "Dienstleistung", x.gruppe, x.einheit, ek, x.zuschlagProzent, vk, marge(ek, vk), x.mwstSatz];
          })
        ),
      };
    }
    case "ausgaben": {
      const a = await db.ausgabe.findMany({ where: { betriebId, ...zeitraum("datum") }, orderBy: { datum: "desc" } });
      return {
        dateiname: datei("Ausgaben"),
        csv: alsCsv(
          ["Datum", "Lieferant", "Beschreibung", "Kategorie", "Fällig", "Brutto", "MwSt %", "Netto", "Status"],
          a.map((x) => [x.datum, x.lieferant, x.beschreibung, x.kategorie, x.faelligAm, x.betragBrutto, x.mwstSatz, x.betragBrutto / (1 + x.mwstSatz / 100), x.status])
        ),
      };
    }
    case "bestellungen": {
      const b = await db.bestellung.findMany({
        where: { betriebId, ...zeitraum("datum") },
        include: { lieferant: true, positionen: true },
        orderBy: { datum: "desc" },
      });
      return {
        dateiname: datei("Bestellungen"),
        csv: alsCsv(
          ["Nummer", "Datum", "Lieferant", "Status", "Art-Nr", "Position", "Menge", "Einheit", "EK", "Total"],
          b.flatMap((x) => x.positionen.map((p) => [bestellungNr(x), x.datum, x.lieferant.name, x.status, p.artikelNr, p.bezeichnung, p.menge, p.einheit, p.preis, p.menge * p.preis]))
        ),
      };
    }
    case "zahlungen": {
      const z = await db.zahlung.findMany({ where: { betriebId, ...zeitraum("datum") }, orderBy: { datum: "desc" } });
      return {
        dateiname: datei("Zahlungen"),
        csv: alsCsv(
          ["Datum", "Text", "Referenz", "Betrag", "Rechnung zugeordnet"],
          z.map((x) => [x.datum, x.text, x.referenz, x.betrag, !!x.rechnungId])
        ),
      };
    }
    case "aufgaben": {
      const a = await db.aufgabe.findMany({
        where: { betriebId, ...zeitraum("erstellt") },
        include: { zugewiesenAn: true },
        orderBy: { erstellt: "desc" },
      });
      return {
        dateiname: datei("Aufgaben"),
        csv: alsCsv(
          ["Erstellt", "Titel", "Kategorie", "Zuständig", "Fällig", "Status", "Erledigt am", "Notiz"],
          a.map((x) => [x.erstellt, x.titel, x.kategorie, x.zugewiesenAn?.name ?? "", x.faelligAm, x.status, x.erledigtAm, x.beschreibung])
        ),
      };
    }
    default:
      return null;
  }
}
