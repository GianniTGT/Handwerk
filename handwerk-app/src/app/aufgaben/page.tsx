export const dynamic = "force-dynamic";

import Neu from "@/components/Neu";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { aufgabenBulk, createAufgabe, deleteAufgabe, setAufgabeStatus } from "@/lib/actions-aufgaben";
import { projektNr } from "@/lib/nrtext";

const KATEGORIEN = ["Anruf", "Termin", "Material", "Offerte nachfassen", "Administration"];
const TABS: [string, string][] = [
  ["offen", "Offen"],
  ["meine", "Meine"],
  ["erledigt", "Erledigt"],
  ["alle", "Alle"],
];

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const { filter = "offen", gespeichert, fehler } = await searchParams;

  const [aufgaben, team, kunden, projekte] = await Promise.all([
    db.aufgabe.findMany({
      where: {
        betriebId: betrieb.id,
        ...(filter === "offen" ? { status: "OFFEN" } : {}),
        ...(filter === "meine" ? { status: "OFFEN", zugewiesenAnId: mitarbeiter.id } : {}),
        ...(filter === "erledigt" ? { status: "ERLEDIGT" } : {}),
      },
      include: { zugewiesenAn: true },
      orderBy: [{ status: "asc" }, { faelligAm: { sort: "asc", nulls: "last" } }, { erstellt: "desc" }],
      take: 300,
    }),
    db.mitarbeiter.findMany({ where: { betriebId: betrieb.id, aktiv: true }, orderBy: { name: "asc" } }),
    db.kunde.findMany({ where: { betriebId: betrieb.id, archiviert: false }, orderBy: { name: "asc" } }),
    db.projekt.findMany({ where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } }, orderBy: { nummer: "desc" } }),
  ]);
  const kundeName = new Map(kunden.map((k) => [k.id, k.name]));
  const projektMap = new Map(projekte.map((p) => [p.id, p]));
  const heute = new Date().setHours(0, 0, 0, 0);
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">Aufgaben</h1>
      <p className="mt-1 text-sm text-muted">To-dos für das Team: Anrufe, Termine, Material, Nachfassen von Offerten.</p>
      {gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}
      {fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          {fehler === "titel" ? "Bitte einen Titel angeben." : "Ungültige Zuordnung."}
        </p>
      )}

      <Neu label="Neue Aufgabe">
<form action={createAufgabe} className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-4">
        <h2 className="font-semibold md:col-span-4">Neue Aufgabe</h2>
        <input name="titel" required placeholder="Titel (z.B. Familie Muster zurückrufen)" className={`${feld} md:col-span-2`} />
        <select name="zugewiesenAnId" defaultValue={mitarbeiter.id} className={feld}>
          {team.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input name="faelligAm" type="date" className={feld} />
        <input name="kategorie" list="aufgaben-kat" placeholder="Kategorie" className={feld} />
        <datalist id="aufgaben-kat">
          {KATEGORIEN.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <select name="kundeId" className={feld}>
          <option value="">Kontakt (optional)</option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <select name="projektId" className={feld}>
          <option value="">Projekt (optional)</option>
          {projekte.map((p) => (
            <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
          ))}
        </select>
        <input name="beschreibung" placeholder="Notiz" className={feld} />
        <button className="rounded bg-forest p-2 text-sm font-semibold text-white hover:bg-forest-lift md:col-span-4">Aufgabe speichern</button>
      </form>
</Neu>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 text-sm">
          {TABS.map(([key, label]) => (
            <Link key={key} href={`/aufgaben?filter=${key}`} className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
              {label}
            </Link>
          ))}
        </div>
        <form id="bulk" action={aufgabenBulk} className="flex gap-2 text-xs">
          <button name="aktion" value="erledigen" className="rounded border border-line px-2 py-1 hover:bg-surface2">Auswahl erledigen</button>
          <button name="aktion" value="loeschen" className="rounded border border-line px-2 py-1 text-red-700 hover:bg-red-50">Auswahl löschen</button>
        </form>
      </div>

      <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white">
        {aufgaben.length === 0 && <li className="p-4 text-sm text-muted">Keine Aufgaben.</li>}
        {aufgaben.map((a) => {
          const ueberfaellig = a.status === "OFFEN" && a.faelligAm && a.faelligAm.getTime() < heute;
          const p = a.projektId ? projektMap.get(a.projektId) : undefined;
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-3 p-3">
              <input type="checkbox" name="id" value={a.id} form="bulk" aria-label="Auswählen" />
              <div className={`min-w-0 flex-1 ${a.status === "ERLEDIGT" ? "opacity-60" : ""}`}>
                <div className={`font-medium ${a.status === "ERLEDIGT" ? "line-through" : ""}`}>
                  {a.titel}
                  {a.kategorie && <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-normal text-muted">{a.kategorie}</span>}
                </div>
                <div className="text-sm text-muted">
                  {a.zugewiesenAn?.name ?? "—"}
                  {a.faelligAm && (
                    <span className={ueberfaellig ? "font-medium text-red-700" : ""}> · fällig {a.faelligAm.toLocaleDateString("de-CH")}{ueberfaellig && " (überfällig)"}</span>
                  )}
                  {a.kundeId && kundeName.get(a.kundeId) && (
                    <> · <Link href={`/kunden/${a.kundeId}`} className="underline">{kundeName.get(a.kundeId)}</Link></>
                  )}
                  {p && <> · <Link href={`/projekte/${p.id}`} className="underline">{projektNr(p)}</Link></>}
                  {a.beschreibung && ` · ${a.beschreibung}`}
                </div>
              </div>
              <form action={setAufgabeStatus}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value={a.status === "OFFEN" ? "ERLEDIGT" : "OFFEN"} />
                <button className="rounded border border-forest px-2 py-1 text-xs font-medium text-forest hover:bg-surface2">
                  {a.status === "OFFEN" ? "✓ Erledigt" : "Wieder öffnen"}
                </button>
              </form>
              <form action={deleteAufgabe}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-muted hover:text-red-600" aria-label="Löschen">✕</button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
