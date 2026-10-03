export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { offenerBetrag } from "@/lib/mahnwesen";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

function Balken({ wert, max, farbe = "bg-forest" }: { wert: number; max: number; farbe?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-surface2">
      <div className={`h-full ${farbe}`} style={{ width: `${max > 0 ? Math.max(0, (wert / max) * 100) : 0}%` }} />
    </div>
  );
}

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; bis?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const sp = await searchParams;

  const jahr = new Date().getFullYear();
  const parse = (v?: string) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const von = parse(sp.von) ?? new Date(jahr, 0, 1);
  const bisTag = parse(sp.bis) ?? new Date(jahr, 11, 31);
  const bis = new Date(bisTag.getFullYear(), bisTag.getMonth(), bisTag.getDate() + 1); // exklusiv
  const zeitraum = { gte: von, lt: bis };

  const [rechnungen, gutschriften, offerten, offeneRechnungen] = await Promise.all([
    db.rechnung.findMany({
      where: { betriebId: betrieb.id, status: { not: "ENTWURF" }, datum: zeitraum },
      include: { auftrag: { include: { kunde: true, rapporte: { include: { positionen: true } } } } },
    }),
    db.gutschrift.findMany({
      where: { betriebId: betrieb.id, datum: zeitraum },
      include: { rechnung: { include: { auftrag: { include: { kunde: true } } } } },
    }),
    db.offerte.findMany({
      where: { betriebId: betrieb.id, datum: zeitraum },
      include: { gruppen: { include: { positionen: true } } },
    }),
    db.rechnung.findMany({
      where: { betriebId: betrieb.id, status: "VERSENDET" },
      include: { gutschriften: true },
    }),
  ]);

  // Umsatz netto = Rechnungen − Gutschriften (neto)
  const gutschriftNetto = gutschriften.reduce((s, g) => s + g.totalNetto, 0);
  const umsatzBrutto = rechnungen.reduce((s, r) => s + r.totalNetto, 0);
  const umsatz = umsatzBrutto - gutschriftNetto;
  const schluss = rechnungen.filter((r) => r.art === "SCHLUSS" || r.art === "TEIL");
  const durchschnitt = schluss.length ? umsatz / schluss.length : 0;
  const offenSumme = offeneRechnungen.reduce((s, r) => s + offenerBetrag(r), 0);

  // Monate (vetëm nëse periudha ≤ 36 muaj; përndryshe sipas vitit)
  const monatsMap = new Map<string, number>();
  for (const r of rechnungen) {
    const k = `${r.datum.getFullYear()}-${String(r.datum.getMonth() + 1).padStart(2, "0")}`;
    monatsMap.set(k, (monatsMap.get(k) ?? 0) + r.totalNetto);
  }
  for (const g of gutschriften) {
    const k = `${g.datum.getFullYear()}-${String(g.datum.getMonth() + 1).padStart(2, "0")}`;
    monatsMap.set(k, (monatsMap.get(k) ?? 0) - g.totalNetto);
  }
  const monate: { key: string; label: string; wert: number }[] = [];
  for (let d = new Date(von.getFullYear(), von.getMonth(), 1); d < bis && monate.length < 60; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monate.push({ key, label: `${MONATE[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`, wert: monatsMap.get(key) ?? 0 });
  }
  const maxMonat = Math.max(1, ...monate.map((m) => m.wert));

  // Kunden und kategori
  const kundenMap = new Map<string, { name: string; umsatz: number; anzahl: number; kategorie: string }>();
  const addKunde = (id: string, name: string, kategorie: string, betrag: number, zaehlt: boolean) => {
    const k = kundenMap.get(id) ?? { name, umsatz: 0, anzahl: 0, kategorie };
    k.umsatz += betrag;
    if (zaehlt) k.anzahl += 1;
    kundenMap.set(id, k);
  };
  for (const r of rechnungen) addKunde(r.auftrag.kundeId, r.auftrag.kunde.name, r.auftrag.kunde.kategorie, r.totalNetto, true);
  for (const g of gutschriften) addKunde(g.rechnung.auftrag.kundeId, g.rechnung.auftrag.kunde.name, g.rechnung.auftrag.kunde.kategorie, -g.totalNetto, false);
  const kunden = [...kundenMap.values()].sort((a, b) => b.umsatz - a.umsatz);
  const topKunden = kunden.slice(0, 10);
  const maxKunde = Math.max(1, topKunden[0]?.umsatz ?? 1);

  const katMap = new Map<string, number>();
  for (const k of kunden) katMap.set(k.kategorie || "ohne Kategorie", (katMap.get(k.kategorie || "ohne Kategorie") ?? 0) + k.umsatz);
  const kategorien = [...katMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxKat = Math.max(1, kategorien[0]?.[1] ?? 1);

  // Arbeit vs. Material (nga Schlussrechnung-et: pozicionet e rapporteve)
  let arbeit = 0;
  let material = 0;
  for (const r of rechnungen.filter((x) => x.art === "SCHLUSS")) {
    for (const rp of r.auftrag.rapporte) {
      for (const p of rp.positionen) {
        if (p.typ === "ARBEIT") arbeit += p.menge * p.ansatz;
        else material += p.menge * p.ansatz;
      }
    }
  }
  const leistungen = arbeit + material;

  // Offerten
  const offertenWert = (o: (typeof offerten)[number]) => o.gruppen.flatMap((g) => g.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0);
  const stati = ["ENTWURF", "GESENDET", "ANGENOMMEN", "ABGELEHNT"].map((st) => {
    const liste = offerten.filter((o) => o.status === st);
    return { status: st, anzahl: liste.length, wert: liste.reduce((s, o) => s + offertenWert(o), 0) };
  });
  const angenommen = stati.find((s) => s.status === "ANGENOMMEN")!;
  const abgelehnt = stati.find((s) => s.status === "ABGELEHNT")!;
  const quote = angenommen.anzahl + abgelehnt.anzahl > 0 ? (angenommen.anzahl / (angenommen.anzahl + abgelehnt.anzahl)) * 100 : null;

  const karten: [string, string][] = [
    ["Umsatz netto", `CHF ${chf(umsatz)}`],
    ["Rechnungen", String(schluss.length)],
    ["Ø pro Rechnung", `CHF ${chf(durchschnitt)}`],
    ["Gutschriften", `CHF ${chf(gutschriftNetto)}`],
    ["Offene Forderungen", `CHF ${chf(offenSumme)}`],
    ["Offertenquote", quote === null ? "—" : `${quote.toFixed(0)} %`],
  ];
  const feld = "rounded border border-line p-1.5 text-sm";
  const exportQ = `von=${iso(von)}&bis=${iso(bisTag)}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Verkaufsanalyse</h1>
          <p className="mt-1 text-sm text-muted">Auswertung der Rechnungen (ohne Entwürfe), Gutschriften und Offerten im Zeitraum.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2 text-sm">
          <label className="grid gap-0.5 text-xs text-muted">Von<input type="date" name="von" defaultValue={iso(von)} className={feld} /></label>
          <label className="grid gap-0.5 text-xs text-muted">Bis<input type="date" name="bis" defaultValue={iso(bisTag)} className={feld} /></label>
          <button className="rounded bg-forest px-3 py-1.5 font-medium text-white hover:bg-forest-lift">Anwenden</button>
          <Link href={`/analyse?von=${jahr}-01-01&bis=${jahr}-12-31`} className="rounded border border-line px-3 py-1.5 hover:bg-surface2">Dieses Jahr</Link>
          <Link href={`/analyse?von=${jahr - 1}-01-01&bis=${jahr - 1}-12-31`} className="rounded border border-line px-3 py-1.5 hover:bg-surface2">Vorjahr</Link>
        </form>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {karten.map(([l, w]) => (
          <div key={l} className="rounded-tiff border border-line bg-white p-3 shadow-sm">
            <div className="text-lg font-bold">{w}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Umsatz pro Monat (netto)</h2>
        <div className="mt-3 flex h-40 items-end gap-1" role="img" aria-label="Umsatz pro Monat">
          {monate.map((m) => (
            <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-forest" style={{ height: `${Math.max(0, (m.wert / maxMonat) * 100)}%` }} title={`${m.label}: CHF ${chf(m.wert)}`} />
              <span className="text-[10px] text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Top-Kunden</h2>
          <ul className="mt-3 grid gap-3 text-sm">
            {topKunden.length === 0 && <li className="text-muted">Keine Umsätze im Zeitraum.</li>}
            {topKunden.map((k) => (
              <li key={k.name}>
                <div className="flex justify-between gap-2">
                  <span>{k.name}{k.kategorie && <span className="ml-1 text-xs text-muted">· {k.kategorie}</span>}</span>
                  <span className="font-medium">CHF {chf(k.umsatz)} <span className="text-xs font-normal text-muted">({k.anzahl})</span></span>
                </div>
                <Balken wert={k.umsatz} max={maxKunde} />
              </li>
            ))}
          </ul>
        </section>

        <div className="grid content-start gap-4">
          <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Umsatz nach Kundenkategorie</h2>
            <ul className="mt-3 grid gap-3 text-sm">
              {kategorien.length === 0 && <li className="text-muted">Keine Daten.</li>}
              {kategorien.map(([name, wert]) => (
                <li key={name}>
                  <div className="flex justify-between"><span>{name}</span><span className="font-medium">CHF {chf(wert)}</span></div>
                  <Balken wert={wert} max={maxKat} farbe="bg-sky-500" />
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Arbeit vs. Material</h2>
            <p className="text-xs text-muted">aus den Rapport-Positionen der Schlussrechnungen (vor Akonto-Abzug)</p>
            <ul className="mt-3 grid gap-3 text-sm">
              <li>
                <div className="flex justify-between"><span>Arbeit</span><span className="font-medium">CHF {chf(arbeit)} ({leistungen ? ((arbeit / leistungen) * 100).toFixed(0) : 0} %)</span></div>
                <Balken wert={arbeit} max={leistungen} farbe="bg-amber-500" />
              </li>
              <li>
                <div className="flex justify-between"><span>Material</span><span className="font-medium">CHF {chf(material)} ({leistungen ? ((material / leistungen) * 100).toFixed(0) : 0} %)</span></div>
                <Balken wert={material} max={leistungen} farbe="bg-rose-500" />
              </li>
            </ul>
          </section>
        </div>
      </div>

      <section className="mt-4 rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Offerten im Zeitraum</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stati.map((s) => (
            <div key={s.status} className="rounded border border-line p-3">
              <div className="text-xs uppercase text-muted">{s.status}</div>
              <div className="text-lg font-bold">{s.anzahl}</div>
              <div className="text-xs text-muted">CHF {chf(s.wert)}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Offertenquote = angenommen ÷ (angenommen + abgelehnt).</p>
      </section>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <a href={`/api/export/verkaufspositionen?${exportQ}`} className="rounded bg-forest px-3 py-1.5 font-medium text-white hover:bg-forest-lift">
          ⬇ Positionsdaten (CSV, für Pivot-Tabellen)
        </a>
        <a href={`/api/export/rechnungen?${exportQ}`} className="rounded border border-forest px-3 py-1.5 font-medium text-forest hover:bg-surface2">
          ⬇ Rechnungen (CSV)
        </a>
      </div>
    </div>
  );
}
