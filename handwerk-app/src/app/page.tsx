export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { TIFF } from "@/lib/tiff";
import { darf, type Bereich } from "@/lib/rechte";
import { chf } from "@/lib/format";
import { offenerBetrag } from "@/lib/mahnwesen";
import { faelligDatum, istUeberfaellig } from "@/lib/faellig";

export default async function Dashboard() {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const sieht = (b: Bereich) => darf(mitarbeiter, b);
  const in30Tagen = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [kunden, offerten, offene, erledigte, rechnungen, wartungen] = await Promise.all([
    db.kunde.count({ where: { betriebId: betrieb.id } }),
    db.offerte.count({ where: { betriebId: betrieb.id, status: { in: ["ENTWURF", "GESENDET"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: { in: ["OFFEN", "IN_ARBEIT"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: "ERLEDIGT" } }),
    db.rechnung.count({ where: { betriebId: betrieb.id, status: { not: "BEZAHLT" } } }),
    db.wartungsvertrag.count({
      where: { betriebId: betrieb.id, status: "AKTIV", naechsteWartung: { lte: in30Tagen } },
    }),
  ]);

  // Widgets si te bexio: lëvizjet e parasë sipas muajit + Debitoren/Kreditoren (hapur / i vonuar)
  const jahr = new Date().getFullYear();
  const [zahlungen, offeneRechnungen, offeneAusgaben] = await Promise.all([
    db.zahlung.findMany({
      where: { betriebId: betrieb.id, datum: { gte: new Date(jahr, 0, 1), lt: new Date(jahr + 1, 0, 1) } },
      select: { datum: true, betrag: true },
    }),
    db.rechnung.findMany({ where: { betriebId: betrieb.id, status: "VERSENDET" }, include: { gutschriften: true } }),
    db.ausgabe.findMany({ where: { betriebId: betrieb.id, status: "OFFEN" } }),
  ]);
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
  const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  const alleKarten: { label: string; wert: number; href: string; bereich: Bereich }[] = [
    { label: "Kontakte", wert: kunden, href: "/kunden", bereich: "KONTAKTE" },
    { label: "Offene Offerten", wert: offerten, href: "/offerten", bereich: "VERKAUF" },
    { label: "Offene Aufträge", wert: offene, href: "/auftraege", bereich: "AUFTRAEGE" },
    { label: "Bereit zum Verrechnen", wert: erledigte, href: "/auftraege", bereich: "AUFTRAEGE" },
    { label: "Offene Rechnungen", wert: rechnungen, href: "/rechnungen", bereich: "VERKAUF" },
    { label: "Fällige Wartungen (30 Tage)", wert: wartungen, href: "/wartung", bereich: "AUFTRAEGE" },
  ];
  const karten = alleKarten.filter((k) => sieht(k.bereich));


  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">{betrieb.name} — vom Rapport zur QR-Rechnung in 5 Minuten.</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-tiff border border-line bg-white px-4 py-2 text-sm shadow-sm">
        <span className="font-semibold">Support · {TIFF.name}</span>
        <a href={`mailto:${TIFF.supportEmail}`} className="text-forest underline">
          ✉ {TIFF.supportEmail}
        </a>
        <a href={`tel:${TIFF.supportTelefon.replace(/\s/g, "")}`} className="text-forest underline">
          ☎ {TIFF.supportTelefon}
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {karten.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-tiff border border-line bg-white p-4 shadow-sm hover:border-forest"
          >
            <div className="text-3xl font-bold">{k.wert}</div>
            <div className="mt-1 text-sm text-muted">{k.label}</div>
          </Link>
        ))}
      </div>

      {sieht("FINANZEN") && (
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">Flüssige Mittel — Eingänge und Ausgänge {jahr}</h2>
          <div className="mt-3 flex h-36 items-end gap-1" role="img" aria-label="Eingänge und Ausgänge pro Monat">
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
        </section>

        <div className="grid gap-4">
          {[
            { titel: "Offene Rechnungen (Debitoren)", t: debitoren, href: "/rechnungen?filter=ueberfaellig" },
            { titel: "Offene Lieferantenrechnungen (Kreditoren)", t: kreditoren, href: "/ausgaben" },
          ].map(({ titel, t, href }) => {
            const summe = t.offen + t.ueberfaellig;
            return (
              <Link key={titel} href={href} className="rounded-tiff border border-line bg-white p-4 shadow-sm hover:border-forest">
                <h2 className="text-sm font-semibold">{titel}</h2>
                <div className="mt-1 text-xs text-muted">Total unbezahlt: CHF {chf(summe)}</div>
                <div className="mt-2 flex h-3 overflow-hidden rounded bg-surface2">
                  <div className="bg-sky-400" style={{ width: `${summe ? (t.offen / summe) * 100 : 0}%` }} />
                  <div className="bg-red-500" style={{ width: `${summe ? (t.ueberfaellig / summe) * 100 : 0}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span><span className="font-semibold uppercase text-sky-700">Offen</span> CHF {chf(t.offen)}</span>
                  <span><span className="font-semibold uppercase text-red-700">Überfällig</span> CHF {chf(t.ueberfaellig)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      )}

      {/* «Erste Schritte» — struktura e njohur nga bexio */}
      <section className="mt-8 rounded-tiff border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Erste Schritte</h2>
        <ol className="mt-3 grid gap-3 text-sm">
          <li>
            1.{" "}
            <Link href="/kunden" className="font-medium text-forest underline">
              Kontakt erstellen
            </Link>
            <span className="text-muted"> — Dies kann ein Kunde mit seinen Objekten/Anlagen sein</span>
          </li>
          <li>
            2.{" "}
            <Link href="/artikel" className="font-medium text-forest underline">
              Produkte & Artikel importieren
            </Link>
            <span className="text-muted"> — CSV vom Lieferanten (Debrunner, Meier Tobler…) mit Ihren Rabatten</span>
          </li>
          <li>
            3. Schreiben Sie{" "}
            <Link href="/offerten" className="font-medium text-forest underline">
              eine Offerte
            </Link>{" "}
            <span className="text-muted">oder direkt</span>{" "}
            <Link href="/auftraege" className="font-medium text-forest underline">
              einen Auftrag mit Rapport & Rechnung
            </Link>
          </li>
        </ol>
      </section>

      {/* «Schnelleinstellungen» — si te bexio */}
      <section className="mt-4 rounded-tiff border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Schnelleinstellungen</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/einstellungen" className="font-medium text-forest underline">
            Firmenprofil &amp; Logo
          </Link>
          <Link href="/einstellungen" className="font-medium text-forest underline">
            Druck-Layout (Farben der Dokumente)
          </Link>
          <Link href="/artikel" className="font-medium text-forest underline">
            Datenimport (Artikel-CSV)
          </Link>
        </div>
      </section>
    </div>
  );
}
