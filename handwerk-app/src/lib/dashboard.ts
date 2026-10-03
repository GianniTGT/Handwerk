// Dashboard-Layout pro Benutzer (wie «Dashboard bearbeiten» bei bexio): Reihenfolge und Sichtbarkeit der Widgets

export const WIDGETS = [
  { id: "kennzahlen", titel: "Kennzahlen" },
  { id: "aufgaben", titel: "Meine Aufgaben" },
  { id: "liquiditaet", titel: "Flüssige Mittel" },
  { id: "debitoren", titel: "Offene Rechnungen (Debitoren)" },
  { id: "kreditoren", titel: "Offene Lieferantenrechnungen (Kreditoren)" },
  { id: "ersteSchritte", titel: "Erste Schritte" },
  { id: "schnell", titel: "Schnelleinstellungen" },
  { id: "hilfe", titel: "Hilfe & Support" },
] as const;

import type { Bereich } from "./rechte";

export type WidgetId = (typeof WIDGETS)[number]["id"];
const IDS = WIDGETS.map((w) => w.id) as WidgetId[];

export type DashboardLayout = { order: WidgetId[]; hidden: WidgetId[] };

export function parseLayout(json: string): DashboardLayout {
  let order: WidgetId[] = [];
  let hidden: WidgetId[] = [];
  try {
    const d = JSON.parse(json || "{}");
    if (Array.isArray(d.order)) order = d.order.filter((x: unknown): x is WidgetId => IDS.includes(x as WidgetId));
    if (Array.isArray(d.hidden)) hidden = d.hidden.filter((x: unknown): x is WidgetId => IDS.includes(x as WidgetId));
  } catch {
    /* kaputtes JSON → Standard */
  }
  // Neue Widgets (nach Updates) hinten anhängen, doppelte entfernen
  const reihenfolge = [...new Set([...order, ...IDS])];
  return { order: reihenfolge, hidden: [...new Set(hidden)] };
}

export const layoutAlsJson = (l: DashboardLayout) => JSON.stringify(l);

// Zone që kërkon të drejtë (null = çdo përdorues). Widget-et pa të drejtë nuk shfaqen dhe nuk numërohen te lëvizja.
export const WIDGET_BEREICH: Record<WidgetId, Bereich | null> = {
  kennzahlen: null,
  aufgaben: null,
  liquiditaet: "FINANZEN",
  debitoren: "FINANZEN",
  kreditoren: "FINANZEN",
  ersteSchritte: "VERKAUF",
  schnell: "EINSTELLUNGEN",
  hilfe: null,
};

// Lëviz një widget një vend përmes widget-eve që përdoruesi sheh në të vërtetë
export function verschiebe(
  l: DashboardLayout,
  id: WidgetId,
  richtung: "hoch" | "runter",
  sichtbar: WidgetId[] = l.order
): DashboardLayout {
  const liste = l.order.filter((x) => sichtbar.includes(x));
  const i = liste.indexOf(id);
  const nachbar = liste[richtung === "hoch" ? i - 1 : i + 1];
  if (i < 0 || !nachbar) return l;
  const order = [...l.order];
  const a = order.indexOf(id);
  const b = order.indexOf(nachbar);
  [order[a], order[b]] = [order[b], order[a]];
  return { ...l, order };
}

export const umschalten = (l: DashboardLayout, id: WidgetId, sichtbar: boolean): DashboardLayout => ({
  ...l,
  hidden: sichtbar ? l.hidden.filter((x) => x !== id) : [...new Set([...l.hidden, id])],
});
