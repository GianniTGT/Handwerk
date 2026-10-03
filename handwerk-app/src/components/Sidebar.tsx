"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { bereichFuerPfad, type Bereich } from "@/lib/rechte";

type Punkt = { href: string; label: string };
type Gruppe = { id: string; label: string; icon: string; href?: string; items?: Punkt[] };

// Menüstruktur wie bei bexio: einzelne Hauptpunkte, Untermenüs nur dort, wo mehrere Seiten zusammengehören
const MENU: Gruppe[] = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", href: "/" },
  { id: "kontakte", label: "Kontakte", icon: "👤", href: "/kunden" },
  {
    id: "verkauf",
    label: "Verkauf",
    icon: "🧾",
    items: [
      { href: "/offerten", label: "Offerten" },
      { href: "/auftraege", label: "Aufträge" },
      { href: "/lieferscheine", label: "Lieferscheine" },
      { href: "/rechnungen", label: "Rechnungen" },
      { href: "/wiederkehrend", label: "Wiederkehrende Rechnungen" },
      { href: "/gutschriften", label: "Gutschriften" },
      { href: "/mahnwesen", label: "Mahnwesen" },
      { href: "/analyse", label: "Analyse" },
    ],
  },
  {
    id: "ausgaben",
    label: "Ausgaben",
    icon: "🛒",
    items: [
      { href: "/bestellungen", label: "Bestellungen" },
      { href: "/ausgaben", label: "Lieferantenrechnungen" },
    ],
  },
  {
    id: "projekte",
    label: "Projekte",
    icon: "🏗️",
    items: [
      { href: "/projekte", label: "Projekte" },
      { href: "/zeiten", label: "Zeiterfassung" },
      { href: "/wartung", label: "Wartungsverträge" },
    ],
  },
  { id: "produkte", label: "Produkte", icon: "📦", href: "/artikel" },
  { id: "banking", label: "Banking", icon: "🏦", href: "/banking" },
  { id: "buchhaltung", label: "Buchhaltung", icon: "📊", href: "/buchhaltung" },
  { id: "posteingang", label: "Posteingang", icon: "📥", href: "/posteingang" },
  {
    id: "mehr",
    label: "Mehr",
    icon: "➕",
    items: [
      { href: "/aufgaben", label: "Aufgaben" },
      { href: "/export", label: "Export" },
      { href: "/hilfe", label: "Hilfe & Kurzanleitung" },
    ],
  },
  { id: "einstellungen", label: "Einstellungen", icon: "⚙️", href: "/einstellungen" },
];

const erlaubtFuer = (href: string, erlaubt: Bereich[]) => {
  const b = bereichFuerPfad(href);
  return !b || erlaubt.includes(b);
};

function sichtbareGruppen(erlaubt: Bereich[]): Gruppe[] {
  return MENU.flatMap((g) => {
    if (g.href) return erlaubtFuer(g.href, erlaubt) ? [g] : [];
    const items = (g.items ?? []).filter((i) => erlaubtFuer(i.href, erlaubt));
    return items.length ? [{ ...g, items }] : [];
  });
}

const istAktiv = (pfad: string, href: string) => (href === "/" ? pfad === "/" : pfad === href || pfad.startsWith(href + "/"));

// Navigationsliste (Seitenleiste und Handy-Menü teilen sich diese Komponente)
function NavListe({ erlaubt, beiKlick }: { erlaubt: Bereich[]; beiKlick?: () => void }) {
  const pfad = usePathname();
  const gruppen = sichtbareGruppen(erlaubt);
  // manuell auf-/zugeklappt; sonst ist die Gruppe der aktuellen Seite offen
  const [manuell, setManuell] = useState<Record<string, boolean>>({});

  return (
    <ul className="grid gap-0.5">
      {gruppen.map((g) => {
        if (g.href) {
          const aktiv = istAktiv(pfad, g.href);
          return (
            <li key={g.id}>
              <Link
                href={g.href}
                onClick={beiKlick}
                className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm ${
                  aktiv ? "bg-forest font-semibold text-white" : "text-ink hover:bg-surface2"
                }`}
              >
                <span className="w-5 text-center">{g.icon}</span>
                {g.label}
              </Link>
            </li>
          );
        }
        const imGruppe = (g.items ?? []).some((i) => istAktiv(pfad, i.href));
        const offen = manuell[g.id] ?? imGruppe;
        return (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => setManuell((m) => ({ ...m, [g.id]: !offen }))}
              aria-expanded={offen}
              className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm hover:bg-surface2 ${
                imGruppe ? "font-semibold" : ""
              }`}
            >
              <span className="w-5 text-center">{g.icon}</span>
              <span className="flex-1">{g.label}</span>
              <span className={`text-[10px] text-muted transition-transform ${offen ? "rotate-90" : ""}`}>▶</span>
            </button>
            {offen && (
              <ul className="mb-1 ml-5 mt-0.5 grid gap-0.5 border-l border-line pl-2">
                {g.items!.map((i) => {
                  const aktiv = istAktiv(pfad, i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={beiKlick}
                        className={`block rounded px-2.5 py-1.5 text-[13px] ${
                          aktiv ? "bg-forest font-semibold text-white" : "text-ink hover:bg-surface2"
                        }`}
                      >
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type BetriebInfo = { id: string; name: string };

function BetriebWahl({
  betriebe,
  aktivId,
  wechseln,
}: {
  betriebe: BetriebInfo[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="mb-3 rounded border border-line bg-paper p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Betrieb</div>
      {betriebe.length > 1 ? (
        <form action={wechseln}>
          <select
            name="betriebId"
            defaultValue={aktivId}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="mt-1 w-full rounded border border-line bg-white p-1 text-sm font-semibold"
            aria-label="Betrieb wechseln"
          >
            {betriebe.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </form>
      ) : (
        <div className="mt-1 text-sm font-semibold">{betriebe[0]?.name}</div>
      )}
    </div>
  );
}

export default function Sidebar({
  betriebe,
  aktivId,
  wechseln,
  erlaubt,
  tiffAdmin,
}: {
  betriebe: BetriebInfo[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
  erlaubt: Bereich[];
  tiffAdmin: boolean;
}) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-white md:block print:hidden">
      <nav className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
        <BetriebWahl betriebe={betriebe} aktivId={aktivId} wechseln={wechseln} />
        <NavListe erlaubt={erlaubt} />
        {tiffAdmin && (
          <Link
            href="/admin/betriebe"
            className="mt-4 block rounded border border-line bg-paper px-3 py-2 text-xs font-medium text-forest hover:bg-surface2"
          >
            ⚙ Kunden-Betriebe verwalten
          </Link>
        )}
      </nav>
    </aside>
  );
}

// Handy: Menü-Knopf öffnet dieselbe Navigation als Ausklappfeld (Seitenleiste ist unter md ausgeblendet)
export function MobileNav({
  erlaubt,
  betriebe,
  aktivId,
  wechseln,
  tiffAdmin,
}: {
  erlaubt: Bereich[];
  betriebe: BetriebInfo[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
  tiffAdmin: boolean;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <div className="border-b border-line bg-white md:hidden">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold"
      >
        <span>☰ Menü</span>
        <span className="text-xs font-normal text-muted">{offen ? "schliessen" : "öffnen"}</span>
      </button>
      {offen && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-line p-3">
          <BetriebWahl betriebe={betriebe} aktivId={aktivId} wechseln={wechseln} />
          <NavListe erlaubt={erlaubt} beiKlick={() => setOffen(false)} />
          {tiffAdmin && (
            <Link
              href="/admin/betriebe"
              onClick={() => setOffen(false)}
              className="mt-3 block rounded border border-line bg-paper px-3 py-2 text-xs font-medium text-forest"
            >
              ⚙ Kunden-Betriebe verwalten
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
