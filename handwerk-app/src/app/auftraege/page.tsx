export const dynamic = "force-dynamic";

import Link from "next/link";
import { Leer } from "@/components/Liste";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";

const statusFarben: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-800",
  IN_ARBEIT: "bg-blue-100 text-blue-800",
  ERLEDIGT: "bg-green-100 text-green-800",
  VERRECHNET: "bg-surface2 text-muted",
};
const statusText: Record<string, string> = {
  OFFEN: "Offen",
  IN_ARBEIT: "In Arbeit",
  ERLEDIGT: "Erledigt",
  VERRECHNET: "Verrechnet",
};
const TABS: [string, string, string[] | null][] = [
  ["alle", "Alle", null],
  ["offen", "Offen", ["OFFEN", "IN_ARBEIT"]],
  ["erledigt", "Zu verrechnen", ["ERLEDIGT"]],
  ["verrechnet", "Verrechnet", ["VERRECHNET"]],
];

export default async function AuftraegePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", q: qRoh = "" } = await searchParams;
  const q = qRoh.trim().toLowerCase();

  const alle = await db.auftrag.findMany({
    where: { betriebId: betrieb.id },
    include: { kunde: true, objekt: true },
    orderBy: { nummer: "desc" },
    take: 500,
  });
  const zaehler = (st: string[] | null) => alle.filter((a) => !st || st.includes(a.status)).length;
  const aktiv = TABS.find((t) => t[0] === filter) ?? TABS[0];
  const sichtbar = alle.filter(
    (a) =>
      (!aktiv[2] || aktiv[2].includes(a.status)) &&
      (!q || `${a.nummer} ${a.titel} ${a.kunde.name} ${a.objekt?.bezeichnung ?? ""}`.toLowerCase().includes(q))
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Aufträge</h1>
        <Link href="/auftraege/neu" className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift">
          ＋ Neuer Auftrag
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 text-sm">
          {TABS.map(([key, label, st]) => (
            <Link
              key={key}
              href={`/auftraege?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}
            >
              {label} ({zaehler(st)})
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={qRoh} placeholder="Suche: Nummer, Titel, Kontakt, Objekt …" className="w-60 rounded border border-line p-1.5 text-sm" />
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
              <th className="p-2">Titel</th>
              <th className="hidden p-2 lg:table-cell">Objekt</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sichtbar.map((a) => (
              <tr key={a.id} className="hover:bg-surface2">
                <td className="whitespace-nowrap p-2 font-medium">
                  <Link href={`/auftraege/${a.id}`} className="block hover:underline">#{a.nummer}</Link>
                </td>
                <td className="hidden p-2 text-muted sm:table-cell">{a.datum.toLocaleDateString("de-CH")}</td>
                <td className="p-2">{a.kunde.name}</td>
                <td className="max-w-xs truncate p-2 text-muted">{a.titel}</td>
                <td className="hidden max-w-[14rem] truncate p-2 text-muted lg:table-cell">{a.objekt?.bezeichnung ?? ""}</td>
                <td className="p-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[a.status] ?? ""}`}>
                    {statusText[a.status] ?? a.status}
                  </span>
                </td>
              </tr>
            ))}
            {sichtbar.length === 0 && (
              q || filter !== "alle" ? (
                <Leer colSpan={6}>Keine Aufträge zu dieser Auswahl.</Leer>
              ) : (
                <Leer colSpan={6} icon="projekte" titel="Sie haben noch keine Aufträge erfasst.">
                  <Link href="/auftraege/neu">Erstellen Sie jetzt einen Auftrag</Link> — mit Rapport, Fotos und Unterschrift vor Ort. Daraus entstehen
                  Lieferschein und Rechnung.
                </Leer>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
