export const dynamic = "force-dynamic";

import { bestellungNr } from "@/lib/nrtext";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { FUSS, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  BESTELLT: "bg-blue-100 text-blue-800",
  GELIEFERT: "bg-green-100 text-green-800",
};
const statusText: Record<string, string> = { ENTWURF: "Entwurf", BESTELLT: "Bestellt", GELIEFERT: "Geliefert" };
const TABS: [string, string, string | null][] = [
  ["alle", "Alle", null],
  ["entwurf", "Entwürfe", "ENTWURF"],
  ["bestellt", "Bestellt", "BESTELLT"],
  ["geliefert", "Geliefert", "GELIEFERT"],
];

export default async function BestellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", q: qRoh = "" } = await searchParams;
  const q = qRoh.trim().toLowerCase();
  const alle = await db.bestellung.findMany({
    where: { betriebId: betrieb.id },
    include: { lieferant: true, positionen: true },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
    take: 500,
  });
  const zeilen = alle.map((b) => ({ b, nr: bestellungNr(b), total: b.positionen.reduce((s, p) => s + p.menge * p.preis, 0) }));
  const aktiv = TABS.find((t) => t[0] === filter) ?? TABS[0];
  const sichtbar = zeilen.filter(
    (x) => (!aktiv[2] || x.b.status === aktiv[2]) && (!q || `${x.nr} ${x.b.lieferant.name} ${x.b.bemerkung}`.toLowerCase().includes(q))
  );
  const summe = sichtbar.reduce((s, x) => s + x.total, 0);

  return (
    <div>
      <ListenKopf
        titel="Bestellungen"
        untertitel="Material bei Lieferanten bestellen — Positionen aus dem Produktstamm (Einkaufspreis) oder frei."
        neuHref="/bestellungen/neu"
        neuLabel="Neue Bestellung"
      />
      <ReiterUndSuche
        basis="/bestellungen"
        aktiv={filter}
        q={qRoh}
        suchePlatzhalter="Suche: Nummer, Lieferant, Bemerkung …"
        reiter={TABS.map(([key, label, st]) => ({ key, label, anzahl: zeilen.filter((x) => !st || x.b.status === st).length }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="hidden p-2 sm:table-cell">Datum</th>
            <th className="p-2">Lieferant</th>
            <th className="hidden p-2 md:table-cell">Bemerkung</th>
            <th className="hidden p-2 text-right lg:table-cell">Positionen</th>
            <th className="p-2 text-right">Netto CHF</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ b, nr, total }) => (
            <tr key={b.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">
                <Link href={`/bestellungen/${b.id}`} className="block hover:underline">{nr}</Link>
              </td>
              <td className="hidden p-2 text-muted sm:table-cell">{b.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2">{b.lieferant.name}</td>
              <td className="hidden max-w-xs truncate p-2 text-muted md:table-cell">{b.bemerkung || "—"}</td>
              <td className="hidden p-2 text-right tabular-nums lg:table-cell">{b.positionen.length}</td>
              <td className="p-2 text-right tabular-nums">{chf(total)}</td>
              <td className="p-2"><Pille farbe={statusFarben[b.status]}>{statusText[b.status] ?? b.status}</Pille></td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={7}>
              Keine Bestellungen. <Link href="/bestellungen/neu" className="text-forest underline">Neue Bestellung erstellen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2">Total ({sichtbar.length})</td>
              <td className="hidden sm:table-cell" />
              <td />
              <td className="hidden md:table-cell" />
              <td className="hidden lg:table-cell" />
              <td className="p-2 text-right tabular-nums">{chf(summe)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
