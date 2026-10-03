export const dynamic = "force-dynamic";

import { projektNr } from "@/lib/nrtext";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { stunden } from "@/lib/projekte";
import { FUSS, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const statusFarben: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-800",
  AKTIV: "bg-blue-100 text-blue-800",
  ARCHIVIERT: "bg-surface2 text-muted",
};
const statusText: Record<string, string> = { OFFEN: "Offen", AKTIV: "Aktiv", ARCHIVIERT: "Archiviert" };
const TABS: [string, string][] = [
  ["laufend", "Laufend"],
  ["offen", "Offen"],
  ["aktiv", "Aktiv"],
  ["archiviert", "Archiviert"],
  ["alle", "Alle"],
];

export default async function ProjektePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "laufend", q: qRoh = "" } = await searchParams;
  const q = qRoh.trim().toLowerCase();
  const alle = await db.projekt.findMany({
    where: { betriebId: betrieb.id },
    include: { kunde: true, zeiten: { select: { minuten: true } }, _count: { select: { auftraege: true } } },
    orderBy: { nummer: "desc" },
    take: 500,
  });
  const zeilen = alle.map((p) => ({ p, nr: projektNr(p), minuten: p.zeiten.reduce((s, z) => s + z.minuten, 0) }));
  const passt = (status: string, key: string) =>
    key === "alle" ? true : key === "laufend" ? status !== "ARCHIVIERT" : status === key.toUpperCase();
  const sichtbar = zeilen.filter(
    (x) => passt(x.p.status, filter) && (!q || `${x.nr} ${x.p.name} ${x.p.kunde?.name ?? "intern"} ${x.p.substatus}`.toLowerCase().includes(q))
  );
  const summeMin = sichtbar.reduce((s, x) => s + x.minuten, 0);

  return (
    <div>
      <ListenKopf
        titel="Projekte"
        untertitel="Baustellen und Objekte: Aufträge, Zeiten und Material an einem Ort, mit Nachkalkulation."
        neuHref="/projekte/neu"
        neuLabel="Neues Projekt"
      />
      <ReiterUndSuche
        basis="/projekte"
        aktiv={filter}
        q={qRoh}
        suchePlatzhalter="Suche: Nummer, Name, Kontakt …"
        reiter={TABS.map(([key, label]) => ({ key, label, anzahl: zeilen.filter((x) => passt(x.p.status, key)).length }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="p-2">Projekt</th>
            <th className="hidden p-2 sm:table-cell">Kontakt</th>
            <th className="hidden p-2 lg:table-cell">Zeitraum</th>
            <th className="hidden p-2 text-right md:table-cell">Aufträge</th>
            <th className="p-2 text-right">Stunden</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ p, nr, minuten }) => (
            <tr key={p.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">
                <Link href={`/projekte/${p.id}`} className="block hover:underline">{nr}</Link>
              </td>
              <td className="p-2">
                <Link href={`/projekte/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                {p.substatus && <span className="block text-xs text-muted">{p.substatus}</span>}
              </td>
              <td className="hidden p-2 text-muted sm:table-cell">{p.kunde?.name ?? "intern"}</td>
              <td className="hidden whitespace-nowrap p-2 text-muted lg:table-cell">
                {p.start ? p.start.toLocaleDateString("de-CH") : "—"}
                {p.ende && ` – ${p.ende.toLocaleDateString("de-CH")}`}
              </td>
              <td className="hidden p-2 text-right tabular-nums md:table-cell">{p._count.auftraege}</td>
              <td className="p-2 text-right tabular-nums">{stunden(minuten)}</td>
              <td className="p-2"><Pille farbe={statusFarben[p.status]}>{statusText[p.status] ?? p.status}</Pille></td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={7}>
              Keine Projekte. <Link href="/projekte/neu" className="text-forest underline">Neues Projekt erstellen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2" colSpan={2}>Total ({sichtbar.length})</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden lg:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="p-2 text-right tabular-nums">{stunden(summeMin)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
