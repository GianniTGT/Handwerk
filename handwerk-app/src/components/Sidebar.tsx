"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { bereichFuerPfad, type Bereich } from "@/lib/rechte";
import Icon from "./Icons";

type Punkt = { href: string; label: string };
type Gruppe = { id: string; label: string; icon: string; href?: string; items?: Punkt[] };

// Menüstruktur wie bei bexio: einzelne Hauptpunkte, Untermenüs nur dort, wo mehrere Seiten zusammengehören
const MENU: Gruppe[] = [
  { id: "dashboard", label: "Dashboard", icon: "home", href: "/" },
  { id: "kontakte", label: "Kontakte", icon: "kontakte", href: "/kunden" },
  {
    id: "verkauf",
    label: "Verkauf",
    icon: "verkauf",
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
    icon: "ausgaben",
    items: [
      { href: "/bestellungen", label: "Bestellungen" },
      { href: "/ausgaben", label: "Lieferantenrechnungen" },
    ],
  },
  {
    id: "projekte",
    label: "Projekte",
    icon: "projekte",
    items: [
      { href: "/projekte", label: "Projekte" },
      { href: "/zeiten", label: "Zeiterfassung" },
      { href: "/wartung", label: "Wartungsverträge" },
    ],
  },
  { id: "produkte", label: "Produkte", icon: "produkte", href: "/artikel" },
  { id: "banking", label: "Banking", icon: "banking", href: "/banking" },
  { id: "buchhaltung", label: "Buchhaltung", icon: "buchhaltung", href: "/buchhaltung" },
  { id: "posteingang", label: "Posteingang", icon: "posteingang", href: "/posteingang" },
  {
    id: "mehr",
    label: "Mehr",
    icon: "mehr",
    items: [
      { href: "/aufgaben", label: "Aufgaben" },
      { href: "/export", label: "Export" },
      { href: "/hilfe", label: "Hilfe & Kurzanleitung" },
    ],
  },
  { id: "einstellungen", label: "Einstellungen", icon: "einstellungen", href: "/einstellungen" },
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

// Eine einheitliche Zeilenform für Haupt- und Untermenüpunkte: gleiche Höhe, gleiche Schrift, gleiche Ausrichtung
const ZEILE = "flex items-center rounded-md px-3 py-2 text-sm transition-colors";
const AKTIV = "bg-forest font-semibold text-white";
const RUHIG = "text-ink hover:bg-surface2";

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
          return (
            <li key={g.id}>
              <Link href={g.href} onClick={beiKlick} className={`${ZEILE} gap-3 ${istAktiv(pfad, g.href) ? AKTIV : RUHIG}`}>
                <Icon name={g.icon} />
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
              className={`${ZEILE} w-full gap-3 text-left ${RUHIG} ${imGruppe ? "font-semibold" : ""}`}
            >
              <Icon name={g.icon} />
              <span className="flex-1">{g.label}</span>
              <Icon name="pfeil" className={`h-3.5 w-3.5 text-muted transition-transform ${offen ? "rotate-90" : ""}`} />
            </button>
            {offen && (
              <ul className="mt-0.5 grid gap-0.5">
                {g.items!.map((i) => (
                  <li key={i.href}>
                    {/* Einrückung = Icon-Breite + Abstand der Hauptzeile: Texte stehen bündig untereinander */}
                    <Link href={i.href} onClick={beiKlick} className={`${ZEILE} pl-[2.9rem] ${istAktiv(pfad, i.href) ? AKTIV : RUHIG}`}>
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type BetriebInfo = { id: string; name: string };

type Support = { name: string; email: string; telefon: string };

// Support-Block unten in der Seitenleiste (immer an derselben Stelle, an der Seite verankert)
function SupportFuss({ support, tiffAdmin, beiKlick }: { support: Support; tiffAdmin: boolean; beiKlick?: () => void }) {
  return (
    <div className="border-t border-line p-3 text-xs">
      {tiffAdmin && (
        <Link
          href="/admin/betriebe"
          onClick={beiKlick}
          className="mb-3 flex items-center gap-2 rounded-md border border-line px-3 py-2 font-medium text-forest hover:bg-surface2"
        >
          <Icon name="gebaeude" className="h-4 w-4" /> Kunden-Betriebe verwalten
        </Link>
      )}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Support · {support.name}</div>
      <a href={`mailto:${support.email}`} className="mt-1.5 flex items-center gap-2 break-all text-ink hover:text-forest">
        <Icon name="mail" className="h-4 w-4 shrink-0 text-muted" /> {support.email}
      </a>
      <a href={`tel:${support.telefon.replace(/\s/g, "")}`} className="mt-1 flex items-center gap-2 text-ink hover:text-forest">
        <Icon name="telefon" className="h-4 w-4 shrink-0 text-muted" /> {support.telefon}
      </a>
    </div>
  );
}

export default function Sidebar({
  erlaubt,
  tiffAdmin,
  support,
}: {
  erlaubt: Bereich[];
  tiffAdmin: boolean;
  support: Support;
}) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-line bg-white md:flex print:hidden">
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Hauptmenü">
        <NavListe erlaubt={erlaubt} />
      </nav>
      <SupportFuss support={support} tiffAdmin={tiffAdmin} />
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
  support,
}: {
  erlaubt: Bereich[];
  betriebe: BetriebInfo[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
  tiffAdmin: boolean;
  support: Support;
}) {
  const [offen, setOffen] = useState(false);
  return (
    <div className="border-t border-line bg-white md:hidden print:hidden">
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
        <div className="max-h-[75vh] overflow-y-auto border-t border-line">
          {betriebe.length > 1 && (
            <form action={wechseln} className="border-b border-line p-3">
              <select
                name="betriebId"
                defaultValue={aktivId}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="w-full rounded-md border border-line bg-paper p-2 text-sm font-semibold"
                aria-label="Betrieb wechseln"
              >
                {betriebe.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </form>
          )}
          <div className="p-3">
            <NavListe erlaubt={erlaubt} beiKlick={() => setOffen(false)} />
          </div>
          <SupportFuss support={support} tiffAdmin={tiffAdmin} beiKlick={() => setOffen(false)} />
        </div>
      )}
    </div>
  );
}
