export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default async function BuchhaltungPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const jahr = parseInt(sp.jahr ?? "") || new Date().getFullYear();
  const von = new Date(jahr, 0, 1);
  const bis = new Date(jahr + 1, 0, 1);

  const [rechnungen, ausgaben, offeneForderungen, offeneAusgaben] = await Promise.all([
    db.rechnung.findMany({
      where: { betriebId: betrieb.id, status: { not: "ENTWURF" }, datum: { gte: von, lt: bis } },
    }),
    db.ausgabe.findMany({ where: { betriebId: betrieb.id, datum: { gte: von, lt: bis } } }),
    db.rechnung.aggregate({
      where: { betriebId: betrieb.id, status: "VERSENDET" },
      _sum: { totalBrutto: true },
    }),
    db.ausgabe.aggregate({
      where: { betriebId: betrieb.id, status: "OFFEN" },
      _sum: { betragBrutto: true },
    }),
  ]);

  // Rreshta mujorë: ertrag neto, shpenzim neto, MwSt e detyrueshme / Vorsteuer
  const monate = MONATE.map((name, i) => {
    const ertrag = rechnungen.filter((r) => r.datum.getMonth() === i);
    const aufwand = ausgaben.filter((a) => a.datum.getMonth() === i);
    const umsatz = ertrag.reduce((s, r) => s + r.totalNetto, 0);
    const mwstGeschuldet = ertrag.reduce((s, r) => s + (r.totalBrutto - r.totalNetto), 0);
    const kostenNetto = aufwand.reduce((s, a) => s + a.betragBrutto / (1 + a.mwstSatz / 100), 0);
    const vorsteuer = aufwand.reduce((s, a) => s + (a.betragBrutto - a.betragBrutto / (1 + a.mwstSatz / 100)), 0);
    return { name, umsatz, kostenNetto, mwstGeschuldet, vorsteuer };
  });
  const summe = monate.reduce(
    (t, m) => ({
      umsatz: t.umsatz + m.umsatz,
      kostenNetto: t.kostenNetto + m.kostenNetto,
      mwstGeschuldet: t.mwstGeschuldet + m.mwstGeschuldet,
      vorsteuer: t.vorsteuer + m.vorsteuer,
    }),
    { umsatz: 0, kostenNetto: 0, mwstGeschuldet: 0, vorsteuer: 0 }
  );
  const gewinn = summe.umsatz - summe.kostenNetto;
  const mwstZahllast = summe.mwstGeschuldet - summe.vorsteuer;

  const karten = [
    { label: "Umsatz (netto)", wert: summe.umsatz },
    { label: "Aufwand (netto)", wert: summe.kostenNetto },
    { label: "Gewinn", wert: gewinn },
    { label: "MwSt-Zahllast", wert: mwstZahllast },
    { label: "Offene Forderungen", wert: offeneForderungen._sum.totalBrutto ?? 0 },
    { label: "Offene Verbindlichkeiten", wert: offeneAusgaben._sum.betragBrutto ?? 0 },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Buchhaltung {jahr}</h1>
        <div className="flex gap-1 text-sm">
          <Link href={`/buchhaltung?jahr=${jahr - 1}`} className="rounded border border-line px-2 py-1 hover:bg-surface2">
            ← {jahr - 1}
          </Link>
          <Link href={`/buchhaltung?jahr=${jahr + 1}`} className="rounded border border-line px-2 py-1 hover:bg-surface2">
            {jahr + 1} →
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        Übersicht aus versendeten/bezahlten Rechnungen und erfassten Ausgaben. Kein Ersatz für die
        Buchhaltung Ihres Treuhänders.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {karten.map((k) => (
          <div key={k.label} className="rounded-tiff border border-line bg-white p-4 shadow-sm">
            <div className="text-xl font-bold">CHF {chf(k.wert)}</div>
            <div className="mt-1 text-sm text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-tiff border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-2">Monat</th>
              <th className="p-2 text-right">Umsatz</th>
              <th className="p-2 text-right">Aufwand</th>
              <th className="p-2 text-right">Ergebnis</th>
              <th className="p-2 text-right">MwSt geschuldet</th>
              <th className="p-2 text-right">Vorsteuer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {monate.map((m) => (
              <tr key={m.name}>
                <td className="p-2">{m.name}</td>
                <td className="p-2 text-right">{chf(m.umsatz)}</td>
                <td className="p-2 text-right">{chf(m.kostenNetto)}</td>
                <td className="p-2 text-right">{chf(m.umsatz - m.kostenNetto)}</td>
                <td className="p-2 text-right">{chf(m.mwstGeschuldet)}</td>
                <td className="p-2 text-right">{chf(m.vorsteuer)}</td>
              </tr>
            ))}
            <tr className="bg-surface2 font-semibold">
              <td className="p-2">Total</td>
              <td className="p-2 text-right">{chf(summe.umsatz)}</td>
              <td className="p-2 text-right">{chf(summe.kostenNetto)}</td>
              <td className="p-2 text-right">{chf(gewinn)}</td>
              <td className="p-2 text-right">{chf(summe.mwstGeschuldet)}</td>
              <td className="p-2 text-right">{chf(summe.vorsteuer)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
