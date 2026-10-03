"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bereichFuerPfad, type Bereich } from "@/lib/rechte";

// Mban vetëm lidhjet për zonat e lejuara (zonat pa mbrojtje, p.sh. Dashboard, janë gjithmonë të lejuara)
const filtro = (lista: Eintrag[], erlaubt: Bereich[]) =>
  lista.filter((e) => {
    const b = bereichFuerPfad(e.href);
    return !b || erlaubt.includes(b);
  });

type Eintrag = { href: string; label: string; icon: string };

// Struktura e njohur e Bexio-s — klientët e Bexio-s orientohen menjëherë
const haupt: Eintrag[] = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/kunden", label: "Kontakte", icon: "👤" },
  { href: "/aufgaben", label: "Aufgaben", icon: "✅" },
];
const verkauf: Eintrag[] = [
  { href: "/projekte", label: "Projekte", icon: "🏗️" },
  { href: "/zeiten", label: "Zeiten", icon: "⏱️" },
  { href: "/offerten", label: "Offerten", icon: "📄" },
  { href: "/auftraege", label: "Aufträge", icon: "🔧" },
  { href: "/wartung", label: "Wartung", icon: "⏰" },
  { href: "/rechnungen", label: "Rechnungen", icon: "🧾" },
  { href: "/lieferscheine", label: "Lieferscheine", icon: "🚛" },
  { href: "/wiederkehrend", label: "Wiederkehrend", icon: "🔁" },
  { href: "/gutschriften", label: "Gutschriften", icon: "↩️" },
  { href: "/mahnwesen", label: "Mahnwesen", icon: "🔔" },
];
const weitere: Eintrag[] = [
  { href: "/ausgaben", label: "Ausgaben", icon: "🛒" },
  { href: "/bestellungen", label: "Bestellungen", icon: "🚚" },
  { href: "/artikel", label: "Produkte", icon: "📦" },
  { href: "/banking", label: "Banking", icon: "🏦" },
  { href: "/buchhaltung", label: "Buchhaltung", icon: "📊" },
  { href: "/posteingang", label: "Posteingang", icon: "📥" },
];
const mehr: Eintrag[] = [
  { href: "/export", label: "Export", icon: "⬇️" },
  { href: "/einstellungen", label: "Einstellungen", icon: "⚙️" }];

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
    </Link>
  );
}

type BetriebInfo = { id: string; name: string };

export default function Sidebar({
  betriebe,
  aktivId,
  wechseln,
  support,
  erlaubt,
}: {
  betriebe: BetriebInfo[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
  support: { email: string; telefon: string };
  erlaubt: Bereich[];
}) {
  const pfad = usePathname();
  const hauptF = filtro(haupt, erlaubt);
  const verkaufF = filtro(verkauf, erlaubt);
  const weitereF = filtro(weitere, erlaubt);
  const mehrF = filtro(mehr, erlaubt);
  const istAktiv = (href: string) => (href === "/" ? pfad === "/" : pfad.startsWith(href));

  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-white md:block">
      <nav className="sticky top-14 grid max-h-[calc(100vh-3.5rem)] gap-0.5 overflow-y-auto p-3">
        {/* Firma aktive — dropdown si te bexio (vetëm kur ka më shumë se një firmë) */}
        <div className="mb-3 rounded border border-line bg-paper p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Betrieb</div>
          {betriebe.length > 1 ? (
            <form action={wechseln}>
              <select
                name="betriebId"
                defaultValue={aktivId}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="mt-1 w-full rounded border border-line bg-white p-1 text-sm font-semibold"
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
        {hauptF.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        {verkaufF.length > 0 && (
          <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Verkauf
          </div>
        )}
        {verkaufF.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        <div className="my-2 border-t border-line" />
        {weitereF.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        {mehrF.length > 0 && (
          <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Mehr
          </div>
        )}
        {mehrF.map((e) => (
          <Punkt key={e.href} e={e} aktiv={istAktiv(e.href)} />
        ))}
        <div className="mt-4 rounded border border-line bg-paper p-2 text-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Support · TIFF
          </div>
          <a href={`mailto:${support.email}`} className="mt-1 block break-all text-forest underline">
            {support.email}
          </a>
          <a href={`tel:${support.telefon.replace(/\s/g, "")}`} className="block text-forest underline">
            {support.telefon}
          </a>
        </div>
      </nav>
    </aside>
  );
}

// Navigim kompakt për mobile (sidebar-i fshihet nën md)
export function MobileNav({ erlaubt }: { erlaubt: Bereich[] }) {
  const pfad = usePathname();
  const alles = filtro([...haupt, ...verkauf, ...weitere, ...mehr], erlaubt);
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
