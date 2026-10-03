export const dynamic = "force-dynamic";

import Neu from "@/components/Neu";
import { lokalIso } from "@/lib/datum";
import { projektNr } from "@/lib/nrtext";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { createZeit, deleteZeit, setZeitStatus } from "@/lib/actions-projekte";
import { TAETIGKEITEN, stunden } from "@/lib/projekte";
import Stoppuhr from "@/components/Stoppuhr";

const fehlerTexte: Record<string, string> = {
  dauer: "Bitte eine Dauer angeben (z.B. 1:30 oder 1.5).",
  mitarbeiter: "Mitarbeiter nicht gefunden.",
  projekt: "Projekt nicht gefunden.",
  auftrag: "Auftrag nicht gefunden.",
};
const TABS: [string, string][] = [
  ["alle", "Alle"],
  ["heute", "Heute"],
  ["woche", "Aktuelle Woche"],
  ["monat", "Aktueller Monat"],
  ["meine", "Meine"],
];
const statusFarben: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-800",
  ERLEDIGT: "bg-blue-100 text-blue-800",
  FAKTURIERT: "bg-green-100 text-green-800",
};

export default async function ZeitenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const { filter = "alle", gespeichert, fehler } = await searchParams;

  const heute = new Date();
  const tagStart = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  const wocheStart = new Date(tagStart);
  wocheStart.setDate(tagStart.getDate() - ((tagStart.getDay() + 6) % 7));
  const monatStart = new Date(heute.getFullYear(), heute.getMonth(), 1);

  const [zeiten, team, projekte, auftraege] = await Promise.all([
    db.zeiteintrag.findMany({
      where: {
        betriebId: betrieb.id,
        ...(filter === "heute" ? { datum: { gte: tagStart } } : {}),
        ...(filter === "woche" ? { datum: { gte: wocheStart } } : {}),
        ...(filter === "monat" ? { datum: { gte: monatStart } } : {}),
        ...(filter === "meine" ? { mitarbeiterId: mitarbeiter.id } : {}),
      },
      include: { mitarbeiter: true, projekt: true, auftrag: true, kunde: true },
      orderBy: [{ datum: "desc" }, { erstellt: "desc" }],
      take: 300,
    }),
    db.mitarbeiter.findMany({ where: { betriebId: betrieb.id }, orderBy: { name: "asc" } }),
    db.projekt.findMany({ where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } }, orderBy: { nummer: "desc" } }),
    db.auftrag.findMany({
      where: { betriebId: betrieb.id, status: { in: ["OFFEN", "IN_ARBEIT", "ERLEDIGT"] } },
      include: { kunde: true },
      orderBy: { nummer: "desc" },
    }),
  ]);
  const summeMin = zeiten.reduce((s, z) => s + z.minuten, 0);
  const summeChf = zeiten.filter((z) => z.abrechenbar).reduce((s, z) => s + (z.minuten / 60) * z.stundensatz, 0);
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">Zeiterfassung</h1>
      <p className="mt-1 text-sm text-muted">
        Arbeitszeit pro Mitarbeiter erfassen. Zeiten mit Auftrag lassen sich im Auftrag als Rapport-Positionen in die Rechnung übernehmen.
        Stundensätze unter Einstellungen.
      </p>
      {gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}
      {fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{fehlerTexte[fehler] ?? "Fehler."}</p>}

      <Neu label="Neuer Eintrag" offen>
<form action={createZeit} className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-4">
        <h2 className="font-semibold md:col-span-4">Neuer Eintrag</h2>
        <select name="mitarbeiterId" defaultValue={mitarbeiter.id} className={feld}>
          {team.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input name="datum" type="date" defaultValue={lokalIso(heute)} className={feld} />
        <input name="dauer" required placeholder="Dauer (h:mm oder 1.5)" className={feld} />
        <div className="flex items-center"><Stoppuhr zielName="dauer" /></div>
        <select name="taetigkeit" className={feld}>
          {TAETIGKEITEN.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select name="projektId" className={feld}>
          <option value="">Projekt (optional)</option>
          {projekte.map((p) => (
            <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
          ))}
        </select>
        <select name="auftragId" className={feld}>
          <option value="">Auftrag (optional)</option>
          {auftraege.map((a) => (
            <option key={a.id} value={a.id}>#{a.nummer} {a.titel} — {a.kunde.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="abrechenbar" value="1" defaultChecked /> abrechenbar
        </label>
        <input name="bemerkung" placeholder="Bemerkung" className={`${feld} md:col-span-3`} />
        <button className="rounded bg-forest p-2 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
      </form>
</Neu>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 text-sm">
          {TABS.map(([key, label]) => (
            <Link key={key} href={`/zeiten?filter=${key}`} className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
              {label}
            </Link>
          ))}
        </div>
        <div className="text-sm text-muted">
          Total <strong>{stunden(summeMin)} h</strong> · abrechenbar CHF {chf(summeChf)}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white">
        {zeiten.length === 0 && <li className="p-4 text-sm text-muted">Keine Einträge.</li>}
        {zeiten.map((z) => (
          <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">
                {z.mitarbeiter.name} · {z.taetigkeit} · {stunden(z.minuten)} h
                {!z.abrechenbar && <span className="ml-1 text-xs text-muted">(nicht abrechenbar)</span>}
              </div>
              <div className="text-sm text-muted">
                {z.datum.toLocaleDateString("de-CH")}
                {z.projekt && ` · ${projektNr(z.projekt)} ${z.projekt.name}`}
                {z.auftrag && ` · Auftrag #${z.auftrag.nummer}`}
                {z.kunde && ` · ${z.kunde.name}`}
                {z.bemerkung && ` · ${z.bemerkung}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[z.status] ?? ""}`}>{z.status}</span>
              {z.status !== "FAKTURIERT" && (
                <>
                  <form action={setZeitStatus}>
                    <input type="hidden" name="id" value={z.id} />
                    <input type="hidden" name="status" value={z.status === "OFFEN" ? "ERLEDIGT" : "OFFEN"} />
                    <button className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2">
                      {z.status === "OFFEN" ? "Erledigt" : "Wieder öffnen"}
                    </button>
                  </form>
                  <form action={deleteZeit}>
                    <input type="hidden" name="id" value={z.id} />
                    <button className="rounded border border-line px-2 py-1 text-xs text-red-700 hover:bg-red-50">Löschen</button>
                  </form>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
