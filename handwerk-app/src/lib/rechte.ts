// Benutzerrechte: zona (Bereich) → kush mund t'i përdorë. Pa DB, pa server — përdoret edhe nga sidebar.

export const BEREICHE = {
  KONTAKTE: "Kontakte",
  AUFTRAEGE: "Aufträge, Rapporte & Wartung",
  VERKAUF: "Offerten, Rechnungen, Gutschriften, Mahnwesen",
  PROJEKTE: "Projekte & Zeiterfassung",
  PRODUKTE: "Produkte & Lieferanten",
  EINKAUF: "Ausgaben, Bestellungen, Posteingang",
  FINANZEN: "Banking & Buchhaltung",
  EINSTELLUNGEN: "Einstellungen (Firma, Nummern, Mailvorlagen)",
  BENUTZER: "Benutzer & Rechte verwalten",
} as const;

export type Bereich = keyof typeof BEREICHE;
export const ALLE_BEREICHE = Object.keys(BEREICHE) as Bereich[];

export const ROLLEN = [
  { wert: "CHEF", label: "Chef" },
  { wert: "BUERO", label: "Büro" },
  { wert: "MONTEUR", label: "Monteur" },
] as const;

// Të drejtat standarde sipas rolles
export function standardRechte(rolle: string): Bereich[] {
  if (rolle === "CHEF") return [...ALLE_BEREICHE];
  if (rolle === "BUERO") {
    return ALLE_BEREICHE.filter((b) => b !== "BENUTZER");
  }
  return ["KONTAKTE", "AUFTRAEGE", "PROJEKTE"]; // MONTEUR dhe çdo rol i panjohur: minimumi
}

type MitRechten = { rolle: string; rechte: string };

// Bosh = standardi i rolles; përndryshe lista e saktë (vetëm zona të njohura)
export function wirksameRechte(m: MitRechten): Bereich[] {
  if (!m.rechte.trim()) return standardRechte(m.rolle);
  return m.rechte
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is Bereich => r in BEREICHE);
}

export const darf = (m: MitRechten, bereich: Bereich) => wirksameRechte(m).includes(bereich);

// Cila zonë mbron një rrugë; null = e hapur për çdo përdorues të kyçur
export function bereichFuerPfad(pfad: string): Bereich | null {
  const p = pfad.split("?")[0];
  const ist = (...pres: string[]) => pres.some((pre) => p === pre || p.startsWith(pre + "/"));
  if (ist("/einstellungen/benutzer")) return "BENUTZER";
  if (ist("/einstellungen")) return "EINSTELLUNGEN";
  if (ist("/kunden")) return "KONTAKTE";
  if (ist("/auftraege", "/wartung", "/lieferscheine", "/api/fotos", "/api/lieferscheine")) return "AUFTRAEGE";
  if (ist("/offerten", "/rechnungen", "/gutschriften", "/mahnwesen", "/wiederkehrend", "/api/offerten", "/api/rechnungen", "/api/mahnungen", "/api/gutschriften")) {
    return "VERKAUF";
  }
  if (ist("/projekte", "/zeiten")) return "PROJEKTE";
  if (ist("/artikel")) return "PRODUKTE";
  if (ist("/ausgaben", "/bestellungen", "/posteingang", "/api/belege", "/api/bestellungen")) return "EINKAUF";
  if (ist("/banking", "/buchhaltung")) return "FINANZEN";
  return null;
}

// Lista e brendshme për ruajtje: bosh nëse përputhet me standardin e rolles
export function rechteAlsText(rolle: string, gewaehlt: Bereich[]): string {
  const std = standardRechte(rolle);
  const gleich = std.length === gewaehlt.length && std.every((b) => gewaehlt.includes(b));
  return gleich ? "" : ALLE_BEREICHE.filter((b) => gewaehlt.includes(b)).join(",");
}
