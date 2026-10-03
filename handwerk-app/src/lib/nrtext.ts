// Shfaqja e numrave të dokumenteve (pa DB): numri i formatuar nga Nummernkreis, ose formati i vjetër

export type NrTyp = "OFFERTE" | "RECHNUNG" | "GUTSCHRIFT" | "BESTELLUNG" | "PROJEKT" | "LIEFERSCHEIN";

export const NR_STANDARD: Record<NrTyp, { label: string; format: string; laenge: number; start: number }> = {
  OFFERTE: { label: "Offerte", format: "AN-{JJJJ}-{NR}", laenge: 4, start: 1 },
  RECHNUNG: { label: "Rechnung", format: "RE-{NR}", laenge: 1, start: 20260001 },
  GUTSCHRIFT: { label: "Gutschrift", format: "GS-{NR}", laenge: 1, start: 20260001 },
  BESTELLUNG: { label: "Bestellung", format: "BE-{NR}", laenge: 1, start: 1 },
  PROJEKT: { label: "Projekt", format: "P-{NR}", laenge: 1, start: 1 },
  LIEFERSCHEIN: { label: "Lieferschein", format: "LS-{NR}", laenge: 1, start: 1 },
};

// {JJJJ} → 2026, {JJ} → 26, {NR} → numri me zero para deri te gjatësia minimale
export function formatNr(format: string, nr: number, laenge: number, datum = new Date()): string {
  return format
    .replace(/\{JJJJ\}/g, String(datum.getFullYear()))
    .replace(/\{JJ\}/g, String(datum.getFullYear()).slice(-2))
    .replace(/\{NR\}/g, String(nr).padStart(Math.max(1, laenge), "0"));
}

type MitNr = { nummer: number; nummerText?: string };

export const rechnungNr = (r: MitNr) => r.nummerText || `RE-${r.nummer}`;
export const gutschriftNr = (g: MitNr) => g.nummerText || `GS-${g.nummer}`;
export const bestellungNr = (b: MitNr) => b.nummerText || `BE-${b.nummer}`;
export const lieferscheinNr = (l: MitNr) => l.nummerText || `LS-${l.nummer}`;
export const projektNr = (p: MitNr) => p.nummerText || `P-${p.nummer}`;
export const offerteNr = (o: MitNr & { datum: Date }) =>
  o.nummerText || `AN-${o.datum.getFullYear()}-${String(o.nummer).padStart(4, "0")}`;

// Emër skedari i sigurt nga një numër dokumenti (format i lirë, p.sh. me "/")
export const dateiTeil = (nr: string) => nr.replace(/[^A-Za-z0-9._-]+/g, "-");
