export const dynamic = "force-dynamic";

import { projektNr } from "@/lib/nrtext";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { deleteZeit, setZeitStatus } from "@/lib/actions-projekte";
import { stunden } from "@/lib/projekte";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const TABS: [string, string][] = [
  ["woche", "Diese Woche"],
  ["heute", "Heute"],
  ["monat", "Dieser Monat"],
  ["meine", "Meine"],
  ["offen", "Nicht verrechnet"],
  ["alle", "Alle"],
];
const statusFarben: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-800",
  ERLEDIGT: "bg-blue-100 text-blue-800",
  FAKTURIERT: "bg-green-100 text-green-800",
};
const statusText: Record<string, string> = { OFFEN: "Offen", ERLEDIGT: "Erledigt", FAKTURIERT: "Verrechnet" };

export default async function ZeitenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; gespeichert?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const { filter = "woche", q: qRoh = "", gespeichert } = await searchParams;
  const q = qRoh.trim().toLowerCase();

  const heute = new Date();
  const tagStart = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  const wocheStart = new Date(tagStart);
  wocheStart.setDate(tagStart.getDate() - ((tagStart.getDay() + 6) % 7));
  const monatStart = new Date(heute.getFullYear(), heute.getMonth(), 1);

  const alle = await db.zeiteintrag.findMany({
    where: { betriebId: betrieb.id },
    include: { mitarbeiter: true, projekt: true, auftrag: true, kunde: true },
    orderBy: [{ datum: "desc" }, { erstellt: "desc" }],
    take: 1000,
  });
  const passt = (z: (typeof alle)[number], key: string) =>
    key === "heute"
      ? z.datum >= tagStart
      : key === "woche"
        ? z.datum >= wocheStart
        : key === "monat"
          ? z.datum >= monatStart
          : key === "meine"
            ? z.mitarbeiterId === mitarbeiter.id
            : key === "offen"
              ? z.status !== "FAKTURIERT" && z.abrechenbar
              : true;
  const sichtbar = alle.filter(
    (z) =>
      passt(z, filter) &&
      (!q ||
        `${z.mitarbeiter.name} ${z.taetigkeit} ${z.bemerkung} ${z.projekt?.name ?? ""} ${z.auftrag?.titel ?? ""} ${z.kunde?.name ?? ""}`
          .toLowerCase()
          .includes(q))
  );
  const summeMin = sichtbar.reduce((s, z) => s + z.minuten, 0);
  const summeChf = sichtbar.filter((z) => z.abrechenbar).reduce((s, z) => s + (z.minuten / 60) * z.stundensatz, 0);

  return (
    <div>
      <ListenKopf
        titel="Zeiterfassung"
        untertitel="Arbeitszeit pro Mitarbeiter. Zeiten mit Auftrag lassen sich im Auftrag als Rapport-Positionen in die Rechnung übernehmen."
        neuHref="/zeiten/neu"
        neuLabel="Zeit erfassen"
        menue={
          <div className="grid gap-1 text-sm">
            <Link href="/einstellungen" className="text-forest underline">Stundensätze (Einstellungen)</Link>
            {/* Download-Route, kein Seitenwechsel */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/export/zeiten" className="text-forest underline">⬇ Zeiten exportieren (CSV)</a>
          </div>
        }
      />
      {gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}
      <ReiterUndSuche
        basis="/zeiten"
        aktiv={filter}
        q={qRoh}
        suchePlatzhalter="Suche: Mitarbeiter, Projekt, Auftrag, Bemerkung …"
        reiter={TABS.map(([key, label]) => ({ key, label, anzahl: alle.filter((z) => passt(z, key)).length }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Datum</th>
            <th className="p-2">Mitarbeiter</th>
            <th className="hidden p-2 sm:table-cell">Tätigkeit</th>
            <th className="hidden p-2 md:table-cell">Bezug</th>
            <th className="p-2 text-right">Dauer</th>
            <th className="hidden p-2 text-right lg:table-cell">CHF</th>
            <th className="p-2">Status</th>
            <th className="w-28 p-2" />
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map((z) => (
            <tr key={z.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 text-muted">{z.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2 font-medium">{z.mitarbeiter.name}</td>
              <td className="hidden p-2 sm:table-cell">
                {z.taetigkeit}
                {z.bemerkung && <span className="block max-w-xs truncate text-xs text-muted">{z.bemerkung}</span>}
              </td>
              <td className="hidden p-2 text-muted md:table-cell">
                {z.projekt && (
                  <Link href={`/projekte/${z.projekt.id}`} className="block hover:underline">{projektNr(z.projekt)} {z.projekt.name}</Link>
                )}
                {z.auftrag && (
                  <Link href={`/auftraege/${z.auftrag.id}`} className="block hover:underline">Auftrag #{z.auftrag.nummer} {z.auftrag.titel}</Link>
                )}
                {!z.projekt && !z.auftrag && (z.kunde?.name ?? "—")}
              </td>
              <td className="p-2 text-right tabular-nums">
                {stunden(z.minuten)}
                {!z.abrechenbar && <span className="block text-[10px] text-muted">nicht abrechenbar</span>}
              </td>
              <td className="hidden p-2 text-right tabular-nums text-muted lg:table-cell">{z.abrechenbar ? chf((z.minuten / 60) * z.stundensatz) : "—"}</td>
              <td className="p-2"><Pille farbe={statusFarben[z.status]}>{statusText[z.status] ?? z.status}</Pille></td>
              <td className="p-2 text-right">
                {z.status !== "FAKTURIERT" && (
                  <span className="inline-flex items-center gap-1">
                    <form action={setZeitStatus}>
                      <input type="hidden" name="id" value={z.id} />
                      <input type="hidden" name="status" value={z.status === "OFFEN" ? "ERLEDIGT" : "OFFEN"} />
                      <button className="whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs hover:bg-surface2">
                        {z.status === "OFFEN" ? "Erledigt" : "Wieder öffnen"}
                      </button>
                    </form>
                    <form action={deleteZeit}>
                      <input type="hidden" name="id" value={z.id} />
                      <button className="px-1 text-muted hover:text-red-600" title="Löschen" aria-label="Löschen">✕</button>
                    </form>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={8}>
              Keine Einträge. <Link href="/zeiten/neu" className="text-forest underline">Zeit erfassen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2" colSpan={2}>Total ({sichtbar.length})</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="p-2 text-right tabular-nums">{stunden(summeMin)} h</td>
              <td className="hidden p-2 text-right tabular-nums lg:table-cell">{chf(summeChf)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
