export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf, offerteNummer } from "@/lib/format";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  GESENDET: "bg-blue-100 text-blue-800",
  ANGENOMMEN: "bg-green-100 text-green-800",
  ABGELEHNT: "bg-red-100 text-red-700",
};
const statusText: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Offen",
  ANGENOMMEN: "Bestätigt",
  ABGELEHNT: "Abgelehnt",
};
const TABS: [string, string, string | null][] = [
  ["alle", "Alle", null],
  ["entwurf", "Entwürfe", "ENTWURF"],
  ["offen", "Offen", "GESENDET"],
  ["bestaetigt", "Bestätigt", "ANGENOMMEN"],
  ["abgelehnt", "Abgelehnt", "ABGELEHNT"],
];

export default async function OffertenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", q: qRoh = "" } = await searchParams;
  const q = qRoh.trim().toLowerCase();

  const alle = await db.offerte.findMany({
    where: { betriebId: betrieb.id },
    include: { kunde: true, gruppen: { include: { positionen: true } } },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
    take: 500,
  });
  const mitTotal = alle.map((o) => ({
    o,
    nr: offerteNummer(o),
    total: o.gruppen.flatMap((g) => g.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0),
  }));
  const zaehler = (st: string | null) => mitTotal.filter((x) => !st || x.o.status === st).length;
  const aktiv = TABS.find((t) => t[0] === filter) ?? TABS[0];
  const sichtbar = mitTotal.filter(
    (x) =>
      (!aktiv[2] || x.o.status === aktiv[2]) &&
      (!q || `${x.nr} ${x.o.titel} ${x.o.kunde.name}`.toLowerCase().includes(q))
  );
  const summe = sichtbar.reduce((s, x) => s + x.total, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Offerten</h1>
        <Link href="/offerten/neu" className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift">
          ＋ Neue Offerte
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 text-sm">
          {TABS.map(([key, label, st]) => (
            <Link
              key={key}
              href={`/offerten?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}
            >
              {label} ({zaehler(st)})
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={qRoh} placeholder="Suche: Nummer, Titel, Kontakt …" className="w-56 rounded border border-line p-1.5 text-sm" />
          <button className="rounded bg-forest px-3 text-sm font-medium text-white">Suchen</button>
        </form>
      </div>

      <div className="mt-3 overflow-hidden rounded-tiff border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-2">Nr.</th>
              <th className="hidden p-2 sm:table-cell">Datum</th>
              <th className="p-2">Kontakt</th>
              <th className="hidden p-2 md:table-cell">Titel</th>
              <th className="hidden p-2 lg:table-cell">Gültig bis</th>
              <th className="p-2 text-right">Netto CHF</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sichtbar.map(({ o, nr, total }) => (
              <tr key={o.id} className="hover:bg-surface2">
                <td className="whitespace-nowrap p-2 font-medium">
                  <Link href={`/offerten/${o.id}`} className="block hover:underline">{nr}</Link>
                </td>
                <td className="hidden p-2 text-muted sm:table-cell">{o.datum.toLocaleDateString("de-CH")}</td>
                <td className="p-2">{o.kunde.name}</td>
                <td className="hidden max-w-xs truncate p-2 text-muted md:table-cell">{o.titel}</td>
                <td className="hidden p-2 text-muted lg:table-cell">{o.gueltigBis.toLocaleDateString("de-CH")}</td>
                <td className="p-2 text-right tabular-nums">{chf(total)}</td>
                <td className="p-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[o.status] ?? ""}`}>
                    {statusText[o.status] ?? o.status}
                  </span>
                </td>
              </tr>
            ))}
            {sichtbar.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted">
                  Keine Offerten. <Link href="/offerten/neu" className="text-forest underline">Neue Offerte erstellen</Link>
                </td>
              </tr>
            )}
          </tbody>
          {sichtbar.length > 0 && (
            <tfoot className="bg-surface2 text-sm font-semibold">
              <tr>
                <td className="p-2" colSpan={5}>Total ({sichtbar.length})</td>
                <td className="p-2 text-right tabular-nums">{chf(summe)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
