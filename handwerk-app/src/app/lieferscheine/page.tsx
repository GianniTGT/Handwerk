export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { lieferscheinNr } from "@/lib/nrtext";
import { KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  GELIEFERT: "bg-green-100 text-green-800",
};
const statusText: Record<string, string> = { ENTWURF: "Entwurf", GELIEFERT: "Geliefert" };
const TABS: [string, string, string | null][] = [
  ["alle", "Alle", null],
  ["entwurf", "Entwürfe", "ENTWURF"],
  ["geliefert", "Geliefert", "GELIEFERT"],
];

export default async function LieferscheinePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", q: qRoh = "" } = await searchParams;
  const q = qRoh.trim().toLowerCase();

  const alle = await db.lieferschein.findMany({
    where: { betriebId: betrieb.id },
    include: { auftrag: { include: { kunde: true } }, positionen: true },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
    take: 500,
  });
  const aktiv = TABS.find((t) => t[0] === filter) ?? TABS[0];
  const sichtbar = alle.filter(
    (l) =>
      (!aktiv[2] || l.status === aktiv[2]) &&
      (!q || `${lieferscheinNr(l)} ${l.auftrag.kunde.name} ${l.auftrag.titel} ${l.auftrag.nummer}`.toLowerCase().includes(q))
  );

  return (
    <div>
      <ListenKopf
        titel="Lieferscheine"
        untertitel="Lieferscheine entstehen aus einem Auftrag und zeigen die gelieferten Positionen ohne Preise."
        neuHref="/lieferscheine/neu"
        neuLabel="Neuer Lieferschein"
      />
      <ReiterUndSuche
        basis="/lieferscheine"
        aktiv={filter}
        q={qRoh}
        suchePlatzhalter="Suche: Nummer, Kontakt, Auftrag …"
        reiter={TABS.map(([key, label, st]) => ({ key, label, anzahl: alle.filter((l) => !st || l.status === st).length }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="hidden p-2 sm:table-cell">Datum</th>
            <th className="p-2">Kontakt</th>
            <th className="hidden p-2 md:table-cell">Auftrag</th>
            <th className="hidden p-2 text-right lg:table-cell">Positionen</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map((l) => (
            <tr key={l.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">
                <Link href={`/lieferscheine/${l.id}`} className="block hover:underline">{lieferscheinNr(l)}</Link>
              </td>
              <td className="hidden p-2 text-muted sm:table-cell">{l.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2">{l.auftrag.kunde.name}</td>
              <td className="hidden max-w-xs truncate p-2 text-muted md:table-cell">
                <Link href={`/auftraege/${l.auftragId}`} className="hover:underline">#{l.auftrag.nummer} {l.auftrag.titel}</Link>
              </td>
              <td className="hidden p-2 text-right tabular-nums lg:table-cell">{l.positionen.length}</td>
              <td className="p-2"><Pille farbe={statusFarben[l.status]}>{statusText[l.status] ?? l.status}</Pille></td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={6}>
              Keine Lieferscheine. <Link href="/lieferscheine/neu" className="text-forest underline">Lieferschein aus einem Auftrag erstellen</Link>
            </Leer>
          )}
        </tbody>
      </Tabelle>
    </div>
  );
}
