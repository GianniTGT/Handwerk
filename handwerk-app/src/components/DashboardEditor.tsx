"use client";

import { useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { speichereDashboardLayout } from "@/lib/actions-dashboard";
import { STANDARD_LAYOUT, type DashboardLayout, type WidgetId } from "@/lib/dashboard";

// «Dashboard bearbeiten» wie bei bexio: Karten per Ziehen an der Greiffläche zwischen zwei Spalten verschieben,
// Schalter «Sichtbar im Dashboard» pro Widget. Änderungen werden sofort gespeichert.
export type EditorItem = { id: WidgetId; titel: string; node: ReactNode };

export default function DashboardEditor({
  items,
  start,
  kennzahlen,
}: {
  items: EditorItem[]; // nur Widgets, die der Benutzer sehen darf
  start: DashboardLayout;
  kennzahlen: ReactNode;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<DashboardLayout>(start);
  const [, starte] = useTransition();
  const ziehe = useRef<WidgetId | null>(null);
  const [ueber, setUeber] = useState<string | null>(null); // Ziel-Hervorhebung: Karten-ID oder "left"/"right"

  const nach = (id: WidgetId) => items.find((i) => i.id === id);
  const speichern = (l: DashboardLayout) => {
    setLayout(l);
    starte(() => {
      void speichereDashboardLayout(JSON.stringify(l));
    });
  };

  // Karte `id` in Spalte `spalte` vor `vorId` (oder ans Ende) einfügen
  const verschiebe = (id: WidgetId, spalte: "left" | "right", vorId?: WidgetId) => {
    if (id === vorId) return;
    const links = layout.left.filter((x) => x !== id);
    const rechts = layout.right.filter((x) => x !== id);
    const ziel = spalte === "left" ? links : rechts;
    const pos = vorId ? ziel.indexOf(vorId) : -1;
    if (pos >= 0) ziel.splice(pos, 0, id);
    else ziel.push(id);
    speichern({ ...layout, left: links, right: rechts });
  };

  const schalte = (id: WidgetId, sichtbar: boolean) =>
    speichern({
      ...layout,
      hidden: sichtbar ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id],
    });

  const beiDrop = (e: DragEvent, spalte: "left" | "right", vorId?: WidgetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (ziehe.current) verschiebe(ziehe.current, spalte, vorId);
    ziehe.current = null;
    setUeber(null);
  };

  const schalter = ({ an, beiAenderung, label }: { an: boolean; beiAenderung: (v: boolean) => void; label: string }) => (
    <button
      type="button"
      role="switch"
      aria-checked={an}
      aria-label={label}
      onClick={() => beiAenderung(!an)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${an ? "bg-sky-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${an ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );

  const spalte = (name: "left" | "right", ids: WidgetId[]) => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setUeber(name);
      }}
      onDrop={(e) => beiDrop(e, name)}
      className={`grid min-h-24 content-start gap-4 rounded-tiff ${ueber === name ? "bg-sky-50 outline-dashed outline-2 outline-sky-300" : ""}`}
    >
      {ids.map((id, i) => {
        const w = nach(id);
        if (!w) return null;
        const an = !layout.hidden.includes(id);
        return (
          <section
            key={id}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setUeber(id);
            }}
            onDrop={(e) => beiDrop(e, name, id)}
            className={`overflow-hidden rounded-tiff border bg-white shadow-sm ${ueber === id ? "border-sky-400 ring-2 ring-sky-200" : "border-line"}`}
          >
            <div
              draggable
              onDragStart={(e) => {
                ziehe.current = id;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
              }}
              onDragEnd={() => {
                ziehe.current = null;
                setUeber(null);
              }}
              className="flex cursor-grab items-center gap-3 border-b border-line px-4 py-3 active:cursor-grabbing"
            >
              <span className="select-none text-xl leading-none text-gray-400" aria-hidden title="Zum Verschieben ziehen">⠿</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{w.titel}</h2>
                <div className="text-xs text-muted">Sichtbar im Dashboard</div>
              </div>
              {/* Pfeile als Ersatz für Ziehen auf Touch-Geräten */}
              <div className="flex gap-1 text-xs md:hidden">
                <button type="button" aria-label="Nach oben" className="rounded border border-line px-1.5 py-0.5" disabled={i === 0} onClick={() => verschiebe(id, name, ids[i - 1])}>▲</button>
                <button type="button" aria-label="Nach unten" className="rounded border border-line px-1.5 py-0.5" disabled={i === ids.length - 1} onClick={() => verschiebe(id, name, ids[i + 2])}>▼</button>
                <button type="button" aria-label="In andere Spalte" className="rounded border border-line px-1.5 py-0.5" onClick={() => verschiebe(id, name === "left" ? "right" : "left")}>⇄</button>
              </div>
              {schalter({ an, beiAenderung: (v) => schalte(id, v), label: `${w.titel} sichtbar` })}
            </div>
            <div className={`p-4 ${an ? "" : "opacity-40"}`}>{w.node}</div>
          </section>
        );
      })}
    </div>
  );

  const kennzahlenAn = !layout.hidden.includes("kennzahlen");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-tiff border border-line bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {schalter({ an: kennzahlenAn, beiAenderung: (v) => schalte("kennzahlen", v), label: "Kennzahlen sichtbar" })}
          <div>
            <div className="font-semibold">Kennzahlen (Kachelreihe)</div>
            <div className="text-xs text-muted">Sichtbar im Dashboard</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setLayout(STANDARD_LAYOUT);
            starte(async () => {
              await speichereDashboardLayout("");
              router.refresh();
            });
          }}
          className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface2"
        >
          Zurücksetzen
        </button>
      </div>
      <div className={`mt-4 ${kennzahlenAn ? "" : "opacity-40"}`}>{kennzahlen}</div>
      <p className="mt-4 text-sm text-muted">
        Ziehen Sie eine Karte an der Kopfzeile in die andere Spalte oder an eine neue Stelle. Mit dem Schalter blenden Sie sie aus.
      </p>
      <div className="mt-3 grid items-start gap-4 lg:grid-cols-2">
        {spalte("left", layout.left)}
        {spalte("right", layout.right)}
      </div>
    </div>
  );
}
