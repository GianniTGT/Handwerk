// Bausteine für Listenseiten im bexio-Stil: Kopfzeile mit Hauptaktion, Reiter mit Anzahl,
// Suchfeld, Tabelle mit Fusszeile, Statuspillen und Hinweise. Reine Server-Komponenten.
import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "./Icons";

export function ListenKopf({
  titel,
  untertitel,
  neuHref,
  neuLabel,
  menue,
  children,
}: {
  titel: string;
  untertitel?: ReactNode;
  neuHref?: string;
  neuLabel?: string;
  /** Inhalt des «⋮»-Menüs (Import, Export, Nebenseiten) */
  menue?: ReactNode;
  /** weitere Knöpfe rechts neben «Neu» */
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{titel}</h1>
        <div className="flex items-center gap-2">
          {children}
          {menue && (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border border-line bg-white px-3 py-1.5 text-sm hover:bg-surface2" title="Weitere Aktionen">
                ⋮
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-80 rounded-tiff border border-line bg-white p-3 shadow-lg">{menue}</div>
            </details>
          )}
          {neuHref && (
            <Link href={neuHref} className="rounded-md bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift">
              ＋ {neuLabel ?? "Neu"}
            </Link>
          )}
        </div>
      </div>
      {untertitel && <p className="mt-1 text-sm text-muted">{untertitel}</p>}
    </div>
  );
}

export type ReiterDef = { key: string; label: string; anzahl?: number; warn?: boolean };

// Reiterleiste links, Suchfeld rechts; der Suchbegriff bleibt beim Reiterwechsel erhalten
export function ReiterUndSuche({
  basis,
  reiter,
  aktiv,
  q = "",
  suchePlatzhalter,
  rechts,
}: {
  basis: string;
  reiter: ReiterDef[];
  aktiv: string;
  q?: string;
  /** ohne Platzhalter wird kein Suchfeld angezeigt */
  suchePlatzhalter?: string;
  rechts?: ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1 text-sm">
        {reiter.map((t) => (
          <Link
            key={t.key}
            href={`${basis}?filter=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1 ${
              aktiv === t.key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"
            } ${t.warn && aktiv !== t.key ? "text-red-700" : ""}`}
          >
            {t.label}
            {t.anzahl !== undefined && ` (${t.anzahl})`}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {rechts}
        {suchePlatzhalter && (
          <form className="flex gap-2">
            <input type="hidden" name="filter" value={aktiv} />
            <input name="q" defaultValue={q} placeholder={suchePlatzhalter} className="w-56 rounded border border-line p-1.5 text-sm" />
            <button className="rounded-md bg-forest px-3 text-sm font-medium text-white">Suchen</button>
          </form>
        )}
      </div>
    </div>
  );
}

export function Tabelle({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-tiff border border-line bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export const KOPF = "bg-surface2 text-left text-xs uppercase text-muted";
export const ZEILEN = "divide-y divide-line";
export const FUSS = "bg-surface2 text-sm font-semibold";

// Leere Liste: mit «titel» und «icon» als freundlicher Einstieg wie bei bexio (Bild, Erklärung, Links),
// ohne «titel» als schlichte Zeile (z.B. «Keine Treffer» bei aktiver Suche)
export function Leer({ colSpan, children, icon, titel }: { colSpan: number; children: ReactNode; icon?: string; titel?: string }) {
  if (!titel) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-4 text-center text-muted">
          {children}
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Icon name={icon ?? "mehr"} className="h-24 w-24 shrink-0 text-line" />
          <div>
            <p className="text-xl font-medium text-ink">{titel}</p>
            <div className="mt-2 text-base leading-relaxed text-muted [&_a]:text-forest [&_a]:underline">{children}</div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function Pille({ farbe, children, title }: { farbe?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${farbe ?? "bg-surface2 text-muted"}`}>
      {children}
    </span>
  );
}

export function Hinweis({ art = "ok", children }: { art?: "ok" | "fehler"; children: ReactNode }) {
  return (
    <p className={`mt-3 rounded p-2 text-sm ${art === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{children}</p>
  );
}

// Seite für ein Erfassungsformular: Zurück-Link, Titel, schmale Spalte (wie bei bexio)
export function FormularSeite({
  zurueckHref,
  zurueckLabel,
  titel,
  untertitel,
  breit,
  children,
}: {
  zurueckHref: string;
  zurueckLabel: string;
  titel: string;
  untertitel?: ReactNode;
  breit?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto ${breit ? "max-w-7xl" : "max-w-5xl"}`}>
      <Link href={zurueckHref} className="text-sm text-forest underline">
        ← {zurueckLabel}
      </Link>
      <h1 className="mt-1 text-xl font-bold">{titel}</h1>
      {untertitel && <p className="mt-1 text-sm text-muted">{untertitel}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export const FELD = "w-full rounded border border-line bg-white p-2 text-sm";
export const KARTE = "grid gap-3 rounded-tiff border border-line bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3";
// Speicherleiste, die beim Scrollen am unteren Rand sichtbar bleibt
export const SPEICHERLEISTE =
  "sticky bottom-0 z-10 -mx-4 mt-3 flex flex-wrap items-center gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-tiff md:border";
export const KNOPF = "inline-flex h-10 items-center justify-center rounded-md bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-lift";
export const KNOPF_RUHIG = "inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-5 text-sm hover:bg-surface2";

function Pflicht({ label }: { label: string }) {
  return label.trim().endsWith("*") ? (
    <span>
      {label.trim().slice(0, -1).trim()} <span className="text-red-600">*</span>
    </span>
  ) : (
    <>{label}</>
  );
}

export function Feld({ label, children, voll }: { label: ReactNode; children: ReactNode; voll?: boolean }) {
  return (
    <label className={`grid gap-0.5 text-xs text-muted ${voll ? "col-span-full" : ""}`}>
      {typeof label === "string" ? <Pflicht label={label} /> : label}
      {children}
    </label>
  );
}

export function FormularFuss({ speichern, abbrechenHref, children }: { speichern: string; abbrechenHref: string; children?: ReactNode }) {
  return (
    <div className={`${SPEICHERLEISTE} col-span-full -mb-4 mt-1`}>
      <button className={KNOPF}>{speichern}</button>
      <Link href={abbrechenHref} className={KNOPF_RUHIG}>
        Abbrechen
      </Link>
      {children}
    </div>
  );
}
