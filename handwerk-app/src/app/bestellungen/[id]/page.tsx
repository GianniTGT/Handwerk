export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { einkaufsPreis } from "@/lib/preise";
import {
  addBestellPosition,
  deleteBestellPosition,
  deleteBestellung,
  setBestellStatus,
} from "@/lib/actions-bestellungen";

export default async function BestellungDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { id } = await params;
  const { fehler } = await searchParams;
  const b = await db.bestellung.findFirst({
    where: { id, betriebId: betrieb.id },
    include: { lieferant: true, positionen: true },
  });
  if (!b) notFound();

  const [artikel, konditionen] = await Promise.all([
    db.artikel.findMany({
      where: { betriebId: betrieb.id, OR: [{ lieferantId: b.lieferantId }, { lieferantId: null }] },
      orderBy: { bezeichnung: "asc" },
      take: 500,
    }),
    db.kondition.findMany({ where: { betriebId: betrieb.id } }),
  ]);
  const summe = b.positionen.reduce((s, p) => s + p.menge * p.preis, 0);
  const entwurf = b.status === "ENTWURF";
  const feld = "rounded border border-line p-2 text-sm";
  const naechster = b.status === "ENTWURF" ? "BESTELLT" : b.status === "BESTELLT" ? "GELIEFERT" : null;

  return (
    <div>
      <Link href="/bestellungen" className="text-sm text-forest underline">← Bestellungen</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Bestellung BE-{b.nummer} — {b.lieferant.name}</h1>
          <p className="text-sm text-muted">{b.datum.toLocaleDateString("de-CH")} · {b.status}{b.bemerkung && ` · ${b.bemerkung}`}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/bestellungen/${b.id}`} target="_blank" className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-lift">📄 PDF</a>
          {naechster && b.positionen.length > 0 && (
            <form action={setBestellStatus}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="status" value={naechster} />
              <button className="rounded border border-forest px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface2">
                {naechster === "BESTELLT" ? "Als bestellt markieren" : "Als geliefert markieren"}
              </button>
            </form>
          )}
        </div>
      </div>
      {fehler === "gesperrt" && <p className="mt-3 rounded bg-amber-100 p-2 text-sm text-amber-800">Nur Entwürfe können geändert oder gelöscht werden.</p>}
      {fehler === "bezeichnung" && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte eine Bezeichnung angeben.</p>}

      <table className="mt-4 w-full rounded-tiff border border-line bg-white text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-muted">
            <th className="p-2">Art-Nr</th>
            <th className="p-2">Bezeichnung</th>
            <th className="p-2 text-right">Menge</th>
            <th className="p-2">Einheit</th>
            <th className="p-2 text-right">EK</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {b.positionen.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <td className="p-2 text-muted">{p.artikelNr || "—"}</td>
              <td className="p-2">{p.bezeichnung}</td>
              <td className="p-2 text-right">{p.menge}</td>
              <td className="p-2">{p.einheit}</td>
              <td className="p-2 text-right">{chf(p.preis)}</td>
              <td className="p-2 text-right font-medium">{chf(p.menge * p.preis)}</td>
              <td className="p-2">
                {entwurf && (
                  <form action={deleteBestellPosition}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-muted hover:text-red-600">✕</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {b.positionen.length === 0 && (
            <tr><td colSpan={7} className="p-3 text-muted">Noch keine Positionen.</td></tr>
          )}
          <tr className="font-semibold"><td colSpan={5} className="p-2 text-right">Total netto</td><td className="p-2 text-right">CHF {chf(summe)}</td><td /></tr>
        </tbody>
      </table>

      {entwurf && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <form action={addBestellPosition} className="grid gap-2 rounded-tiff border border-line bg-white p-3">
            <input type="hidden" name="bestellungId" value={b.id} />
            <h2 className="text-sm font-semibold">Aus Artikelstamm</h2>
            <select name="artikelId" required className={feld}>
              <option value="">Artikel …</option>
              {artikel.map((a) => (
                <option key={a.id} value={a.id}>{a.artikelNr && `${a.artikelNr} · `}{a.bezeichnung} ({chf(einkaufsPreis(a, konditionen))}/{a.einheit})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input name="menge" defaultValue="1" inputMode="decimal" className={`${feld} w-24`} />
              <button className="flex-1 rounded border border-forest p-2 text-sm font-medium text-forest hover:bg-surface2">Hinzufügen</button>
            </div>
          </form>
          <form action={addBestellPosition} className="grid gap-2 rounded-tiff border border-line bg-white p-3">
            <input type="hidden" name="bestellungId" value={b.id} />
            <h2 className="text-sm font-semibold">Freie Position</h2>
            <input name="bezeichnung" required placeholder="Bezeichnung" className={feld} />
            <div className="grid grid-cols-4 gap-2">
              <input name="artikelNr" placeholder="Art-Nr" className={feld} />
              <input name="menge" defaultValue="1" inputMode="decimal" className={feld} />
              <input name="einheit" placeholder="Einheit" className={feld} />
              <input name="preis" inputMode="decimal" placeholder="EK" className={feld} />
            </div>
            <button className="rounded border border-forest p-2 text-sm font-medium text-forest hover:bg-surface2">Hinzufügen</button>
          </form>
        </div>
      )}
      {entwurf && (
        <form action={deleteBestellung} className="mt-4">
          <input type="hidden" name="id" value={b.id} />
          <button className="rounded border border-line px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">Bestellung löschen</button>
        </form>
      )}
    </div>
  );
}
