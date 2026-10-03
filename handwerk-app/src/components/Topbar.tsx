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

// Benutzer-Avatar: Profilfoto, sonst Initialen
function Avatar({ benutzer, gross = false }: { benutzer: { id: string; name: string; fotoV: number }; gross?: boolean }) {
  const mass = gross ? "h-12 w-12 text-base" : "h-8 w-8 text-xs";
  return benutzer.fotoV > 0 ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/avatar/${benutzer.id}?v=${benutzer.fotoV}`} alt="" className={`${mass} shrink-0 rounded-full border border-line object-cover`} />
  ) : (
    <span className={`${mass} flex shrink-0 items-center justify-center rounded-full bg-surface2 font-bold text-forest`}>{initialen(benutzer.name)}</span>
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
  return [offen, setOffen, ref] as const;
}

export default function Topbar({
  betriebe,
  aktivId,
  wechseln,
  abmelden,
  benutzer,
  darfEinstellungen,
  tiffAdmin,
}: {
  betriebe: TopBetrieb[];
  aktivId: string;
  wechseln: (formData: FormData) => void | Promise<void>;
  abmelden: () => void | Promise<void>;
  benutzer: { id: string; name: string; email: string; fotoV: number }; // fotoV 0 = kein Foto, sonst Version für Cache
  darfEinstellungen: boolean;
  tiffAdmin: boolean;
}) {
  const aktiv = betriebe.find((b) => b.id === aktivId) ?? betriebe[0];
  const [betriebOffen, setBetriebOffen, betriebRef] = useOffen();
  const [benutzerOffen, setBenutzerOffen, benutzerRef] = useOffen();
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
        <div ref={betriebRef} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setBetriebOffen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={betriebOffen}
            className="flex h-10 items-center gap-2.5 rounded border border-line bg-white px-2.5 text-sm font-medium hover:bg-surface2"
          >
            <BetriebLogo b={aktiv} />
            <span className="max-w-48 truncate">{aktiv.name}</span>
            <span className="text-[10px] text-muted">▼</span>
          </button>
          {betriebOffen && (
            <div className={`${menuKarte} left-0 min-w-64`}>
              {betriebe.length > 1 && (
                <form action={wechseln} className="border-b border-line pb-1">
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
              {darfEinstellungen && (
                <Link href="/einstellungen" onClick={() => setBetriebOffen(false)} className={menuPunkt}>
                  <Icon name="einstellungen" /> Meinen Betrieb verwalten
                </Link>
              )}
              {tiffAdmin && (
                <>
                  <Link href="/admin/betriebe" onClick={() => setBetriebOffen(false)} className={menuPunkt}>
                    <Icon name="gebaeude" /> Kunden-Betriebe verwalten
                  </Link>
                  <Link href="/admin/betriebe#neu" onClick={() => setBetriebOffen(false)} className={`${menuPunkt} font-medium text-forest`}>
                    <Icon name="plus" /> Neuen Betrieb erstellen
                  </Link>
                </>
              )}
              {!darfEinstellungen && !tiffAdmin && betriebe.length <= 1 && (
                <div className="px-4 py-2 text-xs text-muted">Betriebsdaten verwaltet Ihr Administrator.</div>
              )}
            </div>
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
        <div ref={benutzerRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setBenutzerOffen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={benutzerOffen}
            className="flex h-10 items-center gap-2 rounded-full pl-1 pr-3 text-sm hover:bg-surface2"
          >
            <Avatar benutzer={benutzer} />
            <span className="hidden max-w-36 truncate md:inline">{benutzer.name}</span>
            <span className="text-[10px] text-muted">▼</span>
          </button>
          {benutzerOffen && (
            <div className={`${menuKarte} right-0`}>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Avatar benutzer={benutzer} gross />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{benutzer.name}</div>
                  <div className="truncate text-xs text-muted">{benutzer.email}</div>
                </div>
              </div>
              <Link href="/profil" onClick={() => setBenutzerOffen(false)} className={menuPunkt}>
                <Icon name="profil" /> Mein Profil bearbeiten
              </Link>
              <Link href="/profil#passwort" onClick={() => setBenutzerOffen(false)} className={menuPunkt}>
                <Icon name="einstellungen" /> Passwort ändern
              </Link>
              <Link href="/hilfe" onClick={() => setBenutzerOffen(false)} className={menuPunkt}>
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
