export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { aufgabenBulk, deleteAufgabe, setAufgabeStatus } from "@/lib/actions-aufgaben";
import { projektNr } from "@/lib/nrtext";
import { Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const TABS: [string, string][] = [
  ["offen", "Offen"],
  ["meine", "Meine"],
  ["ueberfaellig", "Überfällig"],
  ["erledigt", "Erledigt"],
  ["alle", "Alle"],
];

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; gespeichert?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const { filter = "offen", q: qRoh = "", gespeichert } = await searchParams;
  const q = qRoh.trim().toLowerCase();

  const [alle, kunden, projekte] = await Promise.all([
    db.aufgabe.findMany({
      where: { betriebId: betrieb.id },
      include: { zugewiesenAn: true },
      orderBy: [{ status: "asc" }, { faelligAm: { sort: "asc", nulls: "last" } }, { erstellt: "desc" }],
      take: 500,
    }),
    db.kunde.findMany({ where: { betriebId: betrieb.id }, select: { id: true, name: true } }),
    db.projekt.findMany({ where: { betriebId: betrieb.id }, select: { id: true, nummer: true, nummerText: true, name: true } }),
  ]);
  const kundeName = new Map(kunden.map((k) => [k.id, k.name]));
  const projektMap = new Map(projekte.map((p) => [p.id, p]));
  const heute = new Date().setHours(0, 0, 0, 0);
  const zeilen = alle.map((a) => ({ a, ueberfaellig: a.status === "OFFEN" && !!a.faelligAm && a.faelligAm.getTime() < heute }));
  const passt = (z: (typeof zeilen)[number], key: string) =>
    key === "offen"
      ? z.a.status === "OFFEN"
      : key === "meine"
        ? z.a.status === "OFFEN" && z.a.zugewiesenAnId === mitarbeiter.id
        : key === "ueberfaellig"
          ? z.ueberfaellig
          : key === "erledigt"
            ? z.a.status === "ERLEDIGT"
            : true;
  const sichtbar = zeilen.filter(
    (z) =>
      passt(z, filter) &&
      (!q ||
        `${z.a.titel} ${z.a.beschreibung} ${z.a.kategorie} ${z.a.zugewiesenAn?.name ?? ""} ${(z.a.kundeId && kundeName.get(z.a.kundeId)) || ""}`
          .toLowerCase()
          .includes(q))
  );

  return (
    <div>
      <ListenKopf titel="Aufgaben" untertitel="To-dos für das Team: Anrufe, Termine, Material, Nachfassen von Offerten." neuHref="/aufgaben/neu" neuLabel="Neue Aufgabe" />
      {gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}
      <ReiterUndSuche
        basis="/aufgaben"
        aktiv={filter}
        q={qRoh}
        suchePlatzhalter="Suche: Titel, Kategorie, Person, Kontakt …"
        reiter={TABS.map(([key, label]) => ({ key, label, anzahl: zeilen.filter((z) => passt(z, key)).length, warn: key === "ueberfaellig" }))}
        rechts={
          <form id="bulk" action={aufgabenBulk} className="flex gap-1 text-xs">
            <button name="aktion" value="erledigen" className="rounded-md border border-line bg-white px-2 py-1.5 hover:bg-surface2">Auswahl erledigen</button>
            <button name="aktion" value="loeschen" className="rounded-md border border-line bg-white px-2 py-1.5 text-red-700 hover:bg-red-50">Auswahl löschen</button>
          </form>
        }
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="w-8 p-2" />
            <th className="p-2">Aufgabe</th>
            <th className="hidden p-2 sm:table-cell">Zugewiesen</th>
            <th className="p-2">Fällig</th>
            <th className="hidden p-2 md:table-cell">Bezug</th>
            <th className="hidden p-2 lg:table-cell">Kategorie</th>
            <th className="p-2 text-right">Aktion</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ a, ueberfaellig }) => {
            const p = a.projektId ? projektMap.get(a.projektId) : undefined;
            const erledigt = a.status === "ERLEDIGT";
            return (
              <tr key={a.id} className={`hover:bg-surface2 ${erledigt ? "opacity-60" : ""}`}>
                <td className="p-2 text-center">
                  <input type="checkbox" name="id" value={a.id} form="bulk" aria-label="Auswählen" />
                </td>
                <td className="p-2">
                  <span className={`font-medium ${erledigt ? "line-through" : ""}`}>{a.titel}</span>
                  {a.beschreibung && <span className="block max-w-md truncate text-xs text-muted">{a.beschreibung}</span>}
                </td>
                <td className="hidden p-2 text-muted sm:table-cell">{a.zugewiesenAn?.name ?? "—"}</td>
                <td className="whitespace-nowrap p-2">
                  {a.faelligAm ? (
                    ueberfaellig ? (
                      <Pille farbe="bg-red-100 text-red-700">{a.faelligAm.toLocaleDateString("de-CH")} · überfällig</Pille>
                    ) : (
                      <span className="text-muted">{a.faelligAm.toLocaleDateString("de-CH")}</span>
                    )
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="hidden p-2 text-muted md:table-cell">
                  {a.kundeId && kundeName.get(a.kundeId) && (
                    <Link href={`/kunden/${a.kundeId}`} className="block hover:underline">{kundeName.get(a.kundeId)}</Link>
                  )}
                  {p && <Link href={`/projekte/${p.id}`} className="block hover:underline">{projektNr(p)} {p.name}</Link>}
                  {!a.kundeId && !p && "—"}
                </td>
                <td className="hidden p-2 lg:table-cell">{a.kategorie ? <Pille>{a.kategorie}</Pille> : <span className="text-muted">—</span>}</td>
                <td className="p-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    <form action={setAufgabeStatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={erledigt ? "OFFEN" : "ERLEDIGT"} />
                      <button className="whitespace-nowrap rounded-md border border-forest px-2 py-1 text-xs font-medium text-forest hover:bg-surface2">
                        {erledigt ? "Wieder öffnen" : "✓ Erledigt"}
                      </button>
                    </form>
                    <form action={deleteAufgabe}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="px-1 text-muted hover:text-red-600" title="Löschen" aria-label="Löschen">✕</button>
                    </form>
                  </span>
                </td>
              </tr>
            );
          })}
          {sichtbar.length === 0 && (
            <Leer colSpan={7}>
              Keine Aufgaben. <Link href="/aufgaben/neu" className="text-forest underline">Neue Aufgabe erstellen</Link>
            </Leer>
          )}
        </tbody>
      </Tabelle>
    </div>
  );
}
