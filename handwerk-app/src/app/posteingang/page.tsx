export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { deleteBeleg, setBelegStatus } from "@/lib/actions-buero";
import { Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const TABS: [string, string, string | null][] = [
  ["neu", "Neu", "NEU"],
  ["erledigt", "Erledigt", "ERLEDIGT"],
  ["alle", "Alle", null],
];

export default async function PosteingangPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; filter?: string; q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const filter = sp.filter ?? "neu";
  const q = (sp.q ?? "").trim().toLowerCase();
  const alle = await db.beleg.findMany({
    where: { betriebId: betrieb.id },
    select: { id: true, titel: true, dateiname: true, mimeTyp: true, status: true, erstellt: true },
    orderBy: { erstellt: "desc" },
    take: 500,
  });
  const aktiv = TABS.find((t) => t[0] === filter) ?? TABS[0];
  const sichtbar = alle.filter((b) => (!aktiv[2] || b.status === aktiv[2]) && (!q || `${b.titel} ${b.dateiname}`.toLowerCase().includes(q)));

  return (
    <div>
      <ListenKopf
        titel="Posteingang"
        untertitel="Lieferantenrechnungen und Dokumente hochladen, ansehen und als Ausgabe verbuchen."
        neuHref="/posteingang/neu"
        neuLabel="Beleg hochladen"
      />
      {sp.gespeichert && <Hinweis>Hochgeladen ✓</Hinweis>}
      <ReiterUndSuche
        basis="/posteingang"
        aktiv={filter}
        q={sp.q ?? ""}
        suchePlatzhalter="Suche: Titel, Dateiname …"
        reiter={TABS.map(([key, label, st]) => ({ key, label, anzahl: alle.filter((b) => !st || b.status === st).length }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="hidden p-2 sm:table-cell">Eingang</th>
            <th className="p-2">Titel</th>
            <th className="hidden p-2 md:table-cell">Datei</th>
            <th className="p-2">Status</th>
            <th className="p-2 text-right">Aktion</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map((b) => (
            <tr key={b.id} className="hover:bg-surface2">
              <td className="hidden whitespace-nowrap p-2 text-muted sm:table-cell">{b.erstellt.toLocaleDateString("de-CH")}</td>
              <td className="p-2 font-medium">
                <a href={`/api/belege/${b.id}`} target="_blank" className="hover:underline" title="Beleg ansehen">
                  {b.mimeTyp === "application/pdf" ? "📄" : "🖼️"} {b.titel}
                </a>
              </td>
              <td className="hidden max-w-xs truncate p-2 text-muted md:table-cell">{b.dateiname}</td>
              <td className="p-2">
                <Pille farbe={b.status === "NEU" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>{b.status === "NEU" ? "Neu" : "Erledigt"}</Pille>
              </td>
              <td className="p-2 text-right">
                <span className="inline-flex flex-wrap items-center justify-end gap-1">
                  {b.status === "NEU" && (
                    <Link href={`/ausgaben/neu?beleg=${b.id}`} className="whitespace-nowrap rounded-md bg-forest px-2 py-1 text-xs font-medium text-white hover:bg-forest-lift">
                      Als Ausgabe erfassen
                    </Link>
                  )}
                  <form action={setBelegStatus}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value={b.status === "NEU" ? "ERLEDIGT" : "NEU"} />
                    <button className="whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs hover:bg-surface2">
                      {b.status === "NEU" ? "Erledigt" : "Wieder öffnen"}
                    </button>
                  </form>
                  <form action={deleteBeleg}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="px-1 text-muted hover:text-red-600" title="Löschen" aria-label="Löschen">✕</button>
                  </form>
                </span>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={5}>
              {filter === "neu" ? "Keine neuen Belege." : "Keine Belege."} <Link href="/posteingang/neu" className="text-forest underline">Beleg hochladen</Link>
            </Leer>
          )}
        </tbody>
      </Tabelle>
    </div>
  );
}
