export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { darf, type Bereich } from "@/lib/rechte";
import { chf } from "@/lib/format";
import { offenerBetrag } from "@/lib/mahnwesen";
import { faelligDatum, istUeberfaellig } from "@/lib/faellig";
import { WIDGETS, WIDGET_BEREICH, parseLayout, type WidgetId } from "@/lib/dashboard";
import DashboardEditor from "@/components/DashboardEditor";
import { BetriebLogo } from "@/components/Topbar";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

// Balken «offen / überfällig» für Debitoren und Kreditoren (ausserhalb der Seite, damit React die Komponente nicht bei jedem Render neu anlegt)
function Posten({ titel, t, href }: { titel: string; t: { offen: number; ueberfaellig: number }; href: string }) {
  const summe = t.offen + t.ueberfaellig;
  return (
    <Link href={href} className="block">
      <div className="text-xs text-muted">Total unbezahlt: CHF {chf(summe)}</div>
      <div className="mt-3 flex h-3 overflow-hidden rounded bg-surface2" aria-label={titel}>
        <div className="bg-sky-400" style={{ width: `${summe ? (t.offen / summe) * 100 : 0}%` }} />
        <div className="bg-red-500" style={{ width: `${summe ? (t.ueberfaellig / summe) * 100 : 0}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span><span className="text-xs font-semibold uppercase text-sky-700">Offen</span> CHF {chf(t.offen)}</span>
        <span><span className="text-xs font-semibold uppercase text-red-700">Überfällig</span> CHF {chf(t.ueberfaellig)}</span>
      </div>
    </Link>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ bearbeiten?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const bearbeiten = (await searchParams).bearbeiten === "1";
  const sieht = (b: Bereich) => darf(mitarbeiter, b);
  const in30Tagen = new Date();
  in30Tagen.setDate(in30Tagen.getDate() + 30);
  const jahr = new Date().getFullYear();

  const [kunden, offerten, offene, erledigte, rechnungen, wartungen, meineAufgaben, aufgabenListe, versendete] = await Promise.all([
    db.kunde.count({ where: { betriebId: betrieb.id, archiviert: false } }),
    db.offerte.count({ where: { betriebId: betrieb.id, status: { in: ["ENTWURF", "GESENDET"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: { in: ["OFFEN", "IN_ARBEIT"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: "ERLEDIGT" } }),
    db.rechnung.count({ where: { betriebId: betrieb.id, status: { not: "BEZAHLT" } } }),
    db.wartungsvertrag.count({
      where: { betriebId: betrieb.id, status: "AKTIV", naechsteWartung: { lte: in30Tagen } },
    }),
    db.aufgabe.count({ where: { betriebId: betrieb.id, status: "OFFEN", zugewiesenAnId: mitarbeiter.id } }),
    db.aufgabe.findMany({
      where: { betriebId: betrieb.id, status: "OFFEN", zugewiesenAnId: mitarbeiter.id },
      orderBy: [{ faelligAm: { sort: "asc", nulls: "last" } }, { erstellt: "desc" }],
      take: 5,
    }),
    db.rechnung.findMany({ where: { betriebId: betrieb.id, status: "VERSENDET" }, select: { datum: true, faelligAm: true, status: true } }),
  ]);
  const ueberfaelligAnzahl = versendete.filter((r) => istUeberfaellig(faelligDatum(r, betrieb.zahlungsfristTage), r.status)).length;

  // Finanz-Widgets nur laden, wenn der Benutzer sie sehen darf
  const finanz = sieht("FINANZEN");
  const [zahlungen, offeneRechnungen, offeneAusgaben] = finanz
    ? await Promise.all([
        db.zahlung.findMany({
          where: { betriebId: betrieb.id, datum: { gte: new Date(jahr, 0, 1), lt: new Date(jahr + 1, 0, 1) } },
          select: { datum: true, betrag: true },
        }),
        db.rechnung.findMany({ where: { betriebId: betrieb.id, status: "VERSENDET" }, include: { gutschriften: true } }),
        db.ausgabe.findMany({ where: { betriebId: betrieb.id, status: "OFFEN" } }),
      ])
    : [[], [], []];

  const monate = Array.from({ length: 12 }, (_, i) => {
    const m = zahlungen.filter((z) => z.datum.getMonth() === i);
    return {
      ein: m.filter((z) => z.betrag > 0).reduce((s, z) => s + z.betrag, 0),
      aus: -m.filter((z) => z.betrag < 0).reduce((s, z) => s + z.betrag, 0),
    };
  });
  const totalEin = monate.reduce((s, m) => s + m.ein, 0);
  const totalAus = monate.reduce((s, m) => s + m.aus, 0);
  const maxMonat = Math.max(1, ...monate.map((m) => Math.max(m.ein, m.aus)));

  const teile = (posten: { betrag: number; ueberfaellig: boolean }[]) => ({
    offen: posten.filter((p) => !p.ueberfaellig).reduce((s, p) => s + p.betrag, 0),
    ueberfaellig: posten.filter((p) => p.ueberfaellig).reduce((s, p) => s + p.betrag, 0),
  });
  const debitoren = teile(
    offeneRechnungen.map((r) => ({
      betrag: offenerBetrag(r),
      ueberfaellig: istUeberfaellig(faelligDatum(r, betrieb.zahlungsfristTage), r.status),
    }))
  );
  const kreditoren = teile(
    offeneAusgaben.map((a) => ({
      betrag: a.betragBrutto,
      ueberfaellig: !!a.faelligAm && a.faelligAm.getTime() < new Date().setHours(0, 0, 0, 0),
    }))
  );

  const alleKarten: { label: string; wert: number; href: string; bereich?: Bereich; warnung?: boolean }[] = [
    { label: "Kontakte", wert: kunden, href: "/kunden", bereich: "KONTAKTE" },
    { label: "Offene Offerten", wert: offerten, href: "/offerten", bereich: "VERKAUF" },
    { label: "Offene Aufträge", wert: offene, href: "/auftraege", bereich: "AUFTRAEGE" },
    { label: "Bereit zum Verrechnen", wert: erledigte, href: "/auftraege", bereich: "AUFTRAEGE" },
    { label: "Offene Rechnungen", wert: rechnungen, href: "/rechnungen", bereich: "VERKAUF" },
    { label: "Überfällige Rechnungen", wert: ueberfaelligAnzahl, href: "/rechnungen?filter=ueberfaellig", bereich: "VERKAUF", warnung: true },
    { label: "Meine Aufgaben", wert: meineAufgaben, href: "/aufgaben?filter=meine" },
    { label: "Fällige Wartungen (30 Tage)", wert: wartungen, href: "/wartung", bereich: "AUFTRAEGE" },
  ];
  const karten = alleKarten.filter((k) => !k.bereich || sieht(k.bereich));
  // Gleichmässiges Raster: Spaltenzahl so wählen, dass die Reihen voll sind (8 → 4×2, 6 → 3×2 …)
  const spalten =
    karten.length % 4 === 0 ? "lg:grid-cols-4" : karten.length % 3 === 0 ? "lg:grid-cols-3" : karten.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";

  const inhalt: Record<WidgetId, { breit?: boolean; ohneRahmen?: boolean; titel: string; node: ReactNode }> = {
    kennzahlen: {
      breit: true,
      ohneRahmen: true,
      titel: "Kennzahlen",
      node: (
        <div className={`grid grid-cols-2 gap-4 ${spalten}`}>
          {karten.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="flex h-32 flex-col items-center justify-center rounded-tiff border border-line bg-white px-3 text-center shadow-sm transition hover:border-forest hover:shadow"
            >
              <div className={`text-4xl font-bold leading-none ${k.warnung && k.wert > 0 ? "text-red-600" : "text-forest"}`}>{k.wert}</div>
              <div className="mt-3 text-sm text-muted">{k.label}</div>
            </Link>
          ))}
        </div>
      ),
    },
    aufgaben: {
      titel: "Meine Aufgaben",
      node: (
        <ul className="grid gap-2 text-sm">
          {aufgabenListe.length === 0 && <li className="text-muted">Keine offenen Aufgaben. 🎉</li>}
          {aufgabenListe.map((a) => {
            const ueberfaellig = a.faelligAm && a.faelligAm.getTime() < new Date().setHours(0, 0, 0, 0);
            return (
              <li key={a.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate">{a.titel}</span>
                {a.faelligAm && (
                  <span className={`shrink-0 text-xs ${ueberfaellig ? "font-medium text-red-700" : "text-muted"}`}>
                    {a.faelligAm.toLocaleDateString("de-CH")}
                  </span>
                )}
              </li>
            );
          })}
          <li>
            <Link href="/aufgaben" className="text-xs font-medium text-forest underline">Alle Aufgaben →</Link>
          </li>
        </ul>
      ),
    },
    liquiditaet: {
      breit: true,
      titel: `Flüssige Mittel — Eingänge und Ausgänge ${jahr}`,
      node: (
        <>
          <div className="flex h-36 items-end gap-1" role="img" aria-label="Eingänge und Ausgänge pro Monat">
            {monate.map((m, i) => (
              <div key={i} className="flex h-full flex-1 items-end justify-center gap-0.5">
                <div className="w-1/2 rounded-t bg-green-600" style={{ height: `${(m.ein / maxMonat) * 100}%` }} title={`${MONATE[i]}: Eingang CHF ${chf(m.ein)}`} />
                <div className="w-1/2 rounded-t bg-red-500" style={{ height: `${(m.aus / maxMonat) * 100}%` }} title={`${MONATE[i]}: Ausgang CHF ${chf(m.aus)}`} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-muted">
            {MONATE.map((n) => (
              <span key={n} className="flex-1 text-center">{n}</span>
            ))}
          </div>
          <div className="mt-3 flex gap-8 text-sm">
            <div>
              <div className="text-[10px] font-semibold uppercase text-muted">Total Einnahmen</div>
              <div className="font-bold text-green-700">CHF {chf(totalEin)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-muted">Total Ausgaben</div>
              <div className="font-bold text-red-700">CHF {chf(totalAus)}</div>
            </div>
          </div>
          {totalEin + totalAus === 0 && (
            <p className="mt-2 text-xs text-muted">
              Noch keine Zahlungen — erfasse sie unter <Link href="/banking" className="text-forest underline">Banking</Link>.
            </p>
          )}
        </>
      ),
    },
    debitoren: {
      titel: "Offene Rechnungen (Debitoren)",
      node: <Posten titel="Debitoren" t={debitoren} href="/rechnungen?filter=ueberfaellig" />,
    },
    kreditoren: {
      titel: "Offene Lieferantenrechnungen (Kreditoren)",
      node: <Posten titel="Kreditoren" t={kreditoren} href="/ausgaben" />,
    },
    ersteSchritte: {
      titel: "Erste Schritte",
      node: (
        <ol className="grid gap-3 text-sm">
          <li>
            1. <Link href="/kunden/neu" className="font-medium text-forest underline">Kontakt erstellen</Link>
            <span className="text-muted"> — Kunde mit seinen Objekten/Anlagen</span>
          </li>
          <li>
            2. <Link href="/artikel" className="font-medium text-forest underline">Produkte &amp; Artikel importieren</Link>
            <span className="text-muted"> — CSV vom Lieferanten mit Ihren Rabatten</span>
          </li>
          <li>
            3. <Link href="/offerten" className="font-medium text-forest underline">Offerte schreiben</Link>
            <span className="text-muted"> oder direkt </span>
            <Link href="/auftraege" className="font-medium text-forest underline">Auftrag mit Rapport &amp; Rechnung</Link>
          </li>
        </ol>
      ),
    },
    schnell: {
      titel: "Schnelleinstellungen",
      node: (
        <div className="grid gap-2 text-sm">
          <Link href="/einstellungen" className="font-medium text-forest underline">Firmenprofil &amp; Logo</Link>
          <Link href="/einstellungen" className="font-medium text-forest underline">Druck-Layout (Farben der Dokumente)</Link>
          <Link href="/artikel" className="font-medium text-forest underline">Datenimport (Artikel-CSV)</Link>
        </div>
      ),
    },
  };

  const layout = parseLayout(mitarbeiter.dashboard);
  const darfWidget = (id: WidgetId) => !WIDGET_BEREICH[id] || sieht(WIDGET_BEREICH[id]!);
  const kennzahlenNode = inhalt.kennzahlen.node;

  const Karte = ({ id }: { id: WidgetId }) => (
    <section className="rounded-tiff border border-line bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">{inhalt[id].titel}</h2>
      {inhalt[id].node}
    </section>
  );
  const sichtbarIn = (ids: WidgetId[]) => ids.filter((id) => darfWidget(id) && !layout.hidden.includes(id));
  const spaltenInhalt = [sichtbarIn(layout.left), sichtbarIn(layout.right)];
  const nichtsDa = spaltenInhalt[0].length + spaltenInhalt[1].length === 0 && layout.hidden.includes("kennzahlen");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BetriebLogo b={{ id: betrieb.id, name: betrieb.name, logoV: betrieb.logo.length }} gross />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Dashboard</h1>
            <p className="text-sm text-muted">{betrieb.name}</p>
          </div>
        </div>
        {bearbeiten ? (
          <Link href="/" className="rounded-md bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-green-700">
            Fertig
          </Link>
        ) : (
          <Link href="/?bearbeiten=1" className="rounded-md border border-line bg-white px-4 py-2 text-sm shadow-sm hover:bg-surface2">
            Dashboard bearbeiten
          </Link>
        )}
      </div>

      {bearbeiten ? (
        <div className="mt-5">
          <DashboardEditor
            start={layout}
            kennzahlen={kennzahlenNode}
            items={WIDGETS.filter((w) => w.id !== "kennzahlen" && darfWidget(w.id)).map((w) => ({
              id: w.id,
              titel: inhalt[w.id].titel,
              node: inhalt[w.id].node,
            }))}
          />
        </div>
      ) : (
        <>
          {!layout.hidden.includes("kennzahlen") && <div className="mt-5">{kennzahlenNode}</div>}
          <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
            {spaltenInhalt.map((ids, n) => (
              <div key={n} className="grid content-start gap-4">
                {ids.map((id) => (
                  <Karte key={id} id={id} />
                ))}
              </div>
            ))}
          </div>
          {nichtsDa && (
            <p className="mt-6 text-center text-sm text-muted">
              Alle Widgets sind ausgeblendet. <Link href="/?bearbeiten=1" className="text-forest underline">Dashboard bearbeiten</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
