"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Eintrag = { href: string; label: string; icon: string; bald?: boolean };

// Struktura e njohur e Bexio-s — klientët e Bexio-s orientohen menjëherë
const haupt: Eintrag[] = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/kunden", label: "Kontakte", icon: "👤" },
];
const verkauf: Eintrag[] = [
  { href: "/offerten", label: "Offerten", icon: "📄" },
  { href: "/auftraege", label: "Aufträge", icon: "🔧" },
  { href: "/rechnungen", label: "Rechnungen", icon: "🧾" },
];
const weitere: Eintrag[] = [
  { href: "/ausgaben", label: "Ausgaben", icon: "🛒", bald: true },
  { href: "/artikel", label: "Produkte", icon: "📦" },
  { href: "/banking", label: "Banking", icon: "🏦", bald: true },
  { href: "/buchhaltung", label: "Buchhaltung", icon: "📊", bald: true },
  { href: "/posteingang", label: "Posteingang", icon: "📥", bald: true },
];
const mehr: Eintrag[] = [{ href: "/einstellungen", label: "Einstellungen", icon: "⚙️" }];

function Punkt({ e, aktiv }: { e: Eintrag; aktiv: boolean }) {
  return (
    <Link
      href={e.href}
      className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
        aktiv ? "bg-forest font-semibold text-white" : "text-ink hover:bg-surface2"
      }`}
    >
      <span className="w-5 text-center">{e.icon}</span>
      {e.label}
      {e.bald && (
        <span className="ml-auto rounded-full bg-surface2 px-1.5 text-[10px] uppercase text-muted">
          bald
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pfad = usePathname();
  const istAktiv = (href: string) => (href === "/" ? pfad === "/" : pfad.startsWith(href));

  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-white md:block">
      <nav className="sticky top-14 grid gap-0.5 p-3">
        {haupt.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Verkauf
        </div>
        {verkauf.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        <div className="my-2 border-t border-line" />
        {weitere.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Mehr
        </div>
        {mehr.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
      </nav>
    </aside>
  );
}

// Navigim kompakt për mobile (sidebar-i fshihet nën md)
export function MobileNav() {
  const pfad = usePathname();
  const alles = [...haupt, ...verkauf, { href: "/artikel", label: "Produkte", icon: "📦" }, ...mehr];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-white px-2 py-1.5 md:hidden">
      {alles.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          className={`whitespace-nowrap rounded px-2.5 py-1 text-xs ${
            (e.href === "/" ? pfad === "/" : pfad.startsWith(e.href))
              ? "bg-forest text-white"
              : "text-ink hover:bg-surface2"
          }`}
        >
          {e.icon} {e.label}
        </Link>
      ))}
    </nav>
  );
}
