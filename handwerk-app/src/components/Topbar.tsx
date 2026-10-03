"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icons";

// Kopfzeile wie bei bexio: Marke · Betriebs-Auswahl mit Logo · Suche (Strg+K) · Hilfe · Einstellungen · Benutzermenü
export type TopBetrieb = { id: string; name: string; logoV: number }; // logoV 0 = kein Logo, sonst Version für Cache

const initialen = (name: string) =>
  name
    .replace(/[^\p{L}\s]/gu, "") // Klammern/Zeichen entfernen: «Chef (Büro)» → «Chef Büro»
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export function BetriebLogo({ b, gross = false }: { b: TopBetrieb; gross?: boolean }) {
  const mass = gross ? "h-10 w-10" : "h-7 w-7";
  return b.logoV > 0 ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/logo/${b.id}?v=${b.logoV}`} alt="" className={`${mass} shrink-0 rounded border border-line bg-white object-contain`} />
  ) : (
    <span className={`${mass} flex shrink-0 items-center justify-center rounded bg-forest text-[11px] font-bold text-white`}>
      {initialen(b.name) || "?"}
    </span>
  );
}

// Dropdown, das beim Klick ausserhalb oder mit Escape schliesst
function useOffen() {
  const [offen, setOffen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!offen) return;
    const aus = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", aus);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", aus);
      document.removeEventListener("keydown", esc);
    };
  }, [offen]);
  return { offen, setOffen, ref };
}

export default function Topbar({
  betriebe,
  aktivId,
  wechseln,
  abmelden,
  benutzer,
  darfEinstellungen,
}: {
  betriebe: TopBetrieb[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
  abmelden: () => void | Promise<void>;
  benutzer: { name: string; email: string };
  darfEinstellungen: boolean;
}) {
  const aktiv = betriebe.find((b) => b.id === aktivId) ?? betriebe[0];
  const betriebMenu = useOffen();
  const benutzerMenu = useOffen();
  const suche = useRef<HTMLInputElement>(null);

  // Strg+K / Cmd+K fokussiert die Suche
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        suche.current?.focus();
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const menuKarte = "absolute z-30 mt-1 min-w-56 overflow-hidden rounded-tiff border border-line bg-white py-1 shadow-lg";
  const menuPunkt = "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-surface2";
  const ikonKnopf = "flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-ink";

  return (
    <div className="flex h-14 items-center gap-3 px-4">
      <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight" aria-label="Handwerk by TIFF — Dashboard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tiff-logo.svg" alt="" className="h-8 w-8 rounded" />
        <span className="hidden sm:inline">Handwerk</span>
        <span className="hidden text-[9px] font-normal uppercase tracking-widest text-gold lg:inline">by Tiff</span>
      </Link>

      {/* Betrieb mit Logo (bei mehreren Betrieben wählbar) */}
      {aktiv && (
        <div ref={betriebMenu.ref} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => betriebe.length > 1 && betriebMenu.setOffen((o) => !o)}
            aria-haspopup={betriebe.length > 1}
            aria-expanded={betriebMenu.offen}
            className={`flex h-10 items-center gap-2.5 rounded border border-line bg-white px-2.5 text-sm font-medium ${betriebe.length > 1 ? "hover:bg-surface2" : "cursor-default"}`}
          >
            <BetriebLogo b={aktiv} />
            <span className="max-w-48 truncate">{aktiv.name}</span>
            {betriebe.length > 1 && <span className="text-[10px] text-muted">▼</span>}
          </button>
          {betriebMenu.offen && (
            <form action={wechseln} className={`${menuKarte} left-0`}>
              <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Betrieb wechseln</div>
              {betriebe.map((b) => (
                <button key={b.id} name="betriebId" value={b.id} className={`${menuPunkt} ${b.id === aktivId ? "font-semibold" : ""}`}>
                  <BetriebLogo b={b} />
                  <span className="truncate">{b.name}</span>
                  {b.id === aktivId && <span className="ml-auto text-forest">✓</span>}
                </button>
              ))}
            </form>
          )}
        </div>
      )}

      <form action="/suche" className="relative mx-auto hidden w-full max-w-md sm:block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="suche" className="h-4 w-4" />
        </span>
        <input
          ref={suche}
          name="q"
          placeholder="Suche"
          className="h-9 w-full rounded-full border border-line bg-paper pl-9 pr-16 text-sm outline-none focus:border-forest"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[10px] text-muted">Strg+K</kbd>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Link href="/suche" className={`${ikonKnopf} sm:hidden`} title="Suche" aria-label="Suche">
          <Icon name="suche" />
        </Link>
        <Link href="/hilfe" className={ikonKnopf} title="Hilfe & Kurzanleitung">
          <Icon name="hilfe" />
        </Link>
        {darfEinstellungen && (
          <Link href="/einstellungen" className={ikonKnopf} title="Einstellungen">
            <Icon name="einstellungen" />
          </Link>
        )}
        <div ref={benutzerMenu.ref} className="relative ml-1">
          <button
            type="button"
            onClick={() => benutzerMenu.setOffen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={benutzerMenu.offen}
            className="flex h-10 items-center gap-2 rounded-full pl-1 pr-3 text-sm hover:bg-surface2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-xs font-bold text-forest">
              {initialen(benutzer.name)}
            </span>
            <span className="hidden max-w-36 truncate md:inline">{benutzer.name}</span>
            <span className="text-[10px] text-muted">▼</span>
          </button>
          {benutzerMenu.offen && (
            <div className={`${menuKarte} right-0`}>
              <div className="border-b border-line px-4 py-2">
                <div className="text-sm font-semibold">{benutzer.name}</div>
                <div className="text-xs text-muted">{benutzer.email}</div>
              </div>
              <Link href="/profil" onClick={() => benutzerMenu.setOffen(false)} className={menuPunkt}>
                <Icon name="profil" /> Mein Profil bearbeiten
              </Link>
              <Link href="/profil#passwort" onClick={() => benutzerMenu.setOffen(false)} className={menuPunkt}>
                <Icon name="einstellungen" /> Passwort ändern
              </Link>
              <Link href="/hilfe" onClick={() => benutzerMenu.setOffen(false)} className={menuPunkt}>
                <Icon name="hilfe" /> Hilfe & Kurzanleitung
              </Link>
              <form action={abmelden} className="border-t border-line">
                <button className={menuPunkt}>
                  <Icon name="abmelden" /> Abmelden
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
