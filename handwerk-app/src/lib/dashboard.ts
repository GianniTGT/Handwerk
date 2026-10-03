// Dashboard-Layout pro Benutzer (wie «Dashboard bearbeiten» bei bexio):
// zwei Spalten mit verschiebbaren Widgets, jedes Widget lässt sich ein-/ausblenden.
import type { Bereich } from "./rechte";

export const WIDGETS = [
  { id: "kennzahlen", titel: "Kennzahlen" },
  { id: "ersteSchritte", titel: "Erste Schritte" },
  { id: "schnell", titel: "Schnelleinstellungen" },
  { id: "aufgaben", titel: "Meine Aufgaben" },
  { id: "liquiditaet", titel: "Flüssige Mittel Eingänge und Ausgänge" },
  { id: "debitoren", titel: "Offene Rechnungen (Debitoren)" },
  { id: "kreditoren", titel: "Offene Lieferantenrechnungen (Kreditoren)" },
] as const;

export type WidgetId = (typeof WIDGETS)[number]["id"];
export const WIDGET_IDS = WIDGETS.map((w) => w.id) as WidgetId[];

// Widgets in Spalten (Kennzahlen sind eine feste Kachelreihe oberhalb und nur ein-/ausblendbar)
export const SPALTEN_WIDGETS = WIDGET_IDS.filter((id) => id !== "kennzahlen");

export type DashboardLayout = { left: WidgetId[]; right: WidgetId[]; hidden: WidgetId[] };

export const STANDARD_LAYOUT: DashboardLayout = {
  left: ["ersteSchritte", "schnell", "aufgaben"],
  right: ["liquiditaet", "debitoren", "kreditoren"],
  hidden: [],
};

// Zone që kërkon të drejtë (null = çdo përdorues)
export const WIDGET_BEREICH: Record<WidgetId, Bereich | null> = {
  kennzahlen: null,
  aufgaben: null,
  liquiditaet: "FINANZEN",
  debitoren: "FINANZEN",
  kreditoren: "FINANZEN",
  ersteSchritte: "VERKAUF",
  schnell: "EINSTELLUNGEN",
};

const gueltig = (x: unknown): x is WidgetId => WIDGET_IDS.includes(x as WidgetId);

// Liest ein gespeichertes Layout; fehlende/neue Widgets werden an ihre Standardspalte angehängt, Doppelte entfernt
export function parseLayout(json: string): DashboardLayout {
  let left: WidgetId[] = [];
  let right: WidgetId[] = [];
  let hidden: WidgetId[] = [];
  try {
    const d = JSON.parse(json || "{}");
    if (Array.isArray(d.left)) left = d.left.filter(gueltig);
    if (Array.isArray(d.right)) right = d.right.filter(gueltig);
    if (Array.isArray(d.hidden)) hidden = d.hidden.filter(gueltig);
  } catch {
    /* kaputtes JSON → Standard */
  }
  const gesehen = new Set<WidgetId>();
  const einmalig = (liste: WidgetId[]) => liste.filter((id) => id !== "kennzahlen" && !gesehen.has(id) && gesehen.add(id));
  left = einmalig(left);
  right = einmalig(right);
  for (const id of STANDARD_LAYOUT.left) if (!gesehen.has(id)) left.push(id), gesehen.add(id);
  for (const id of STANDARD_LAYOUT.right) if (!gesehen.has(id)) right.push(id), gesehen.add(id);
  return { left, right, hidden: [...new Set(hidden)] };
}
