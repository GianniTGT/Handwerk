export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { SUBSTATUS, stunden } from "@/lib/projekte";
import { projektNr, rechnungNr } from "@/lib/nrtext";
import { auftragVonProjekt, auftragZuProjekt, deleteProjekt, updateProjekt } from "@/lib/actions-projekte";

const isoTag = (d: Date | null) => (d ? lokalIso(d) : "");

export default async function ProjektDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { id } = await params;
  const sp = await searchParams;
  const projekt = await db.projekt.findFirst({
    where: { id, betriebId: betrieb.id },
    include: {
      kunde: true,
      auftraege: { include: { rechnungen: true }, orderBy: { nummer: "desc" } },
      zeiten: { include: { mitarbeiter: true }, orderBy: { datum: "desc" } },
    },
  });
  if (!projekt) notFound();

  const [material, freie] = await Promise.all([
    db.ausgabe.findMany({ where: { betriebId: betrieb.id, projektId: id }, orderBy: { datum: "desc" } }),
    projekt.kundeId
      ? db.auftrag.findMany({
          where: { betriebId: betrieb.id, kundeId: projekt.kundeId, projektId: null },
          orderBy: { nummer: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Nachkalkulation: ertrag nga faturat e Auftrag-eve − material (neto)
  const erloes = projekt.auftraege.reduce((s, a) => s + a.rechnungen.reduce((t, r) => t + r.totalNetto, 0), 0);
  const materialNetto = material.reduce((s, a) => s + a.betragBrutto / (1 + a.mwstSatz / 100), 0);
  const minutenGesamt = projekt.zeiten.reduce((s, z) => s + z.minuten, 0);
  const zeitWert = projekt.zeiten.filter((z) => z.abrechenbar).reduce((s, z) => s + (z.minuten / 60) * z.stundensatz, 0);
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <Link href="/projekte" className="text-sm text-forest underline">← Projekte</Link>
      <h1 className="mt-1 text-xl font-bold">{projektNr(projekt)} — {projekt.name}</h1>
      <p className="text-sm text-muted">{projekt.kunde ? projekt.kunde.name : "Internes Projekt"}</p>
      {sp.gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}
      {sp.fehler && <p className="mt-3 rounded bg-amber-100 p-2 text-sm text-amber-800">Projekt hat Aufträge/Zeiten und wurde archiviert statt gelöscht.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Erlös (netto)", `CHF ${chf(erloes)}`],
          ["Material (netto)", `CHF ${chf(materialNetto)}`],
          ["Ergebnis vor Lohn", `CHF ${chf(erloes - materialNetto)}`],
          ["Zeiten", `${stunden(minutenGesamt)} h · CHF ${chf(zeitWert)}`],
        ].map(([l, w]) => (
          <div key={l} className="rounded-tiff border border-line bg-white p-3 shadow-sm">
            <div className="text-lg font-bold">{w}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </div>

      <form action={updateProjekt} className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-4">
        <input type="hidden" name="id" value={projekt.id} />
        <input name="name" defaultValue={projekt.name} className={`${feld} md:col-span-2`} />
        <select name="status" defaultValue={projekt.status} className={feld}>
          <option value="OFFEN">Offen</option>
          <option value="AKTIV">Aktiv</option>
          <option value="ARCHIVIERT">Archiviert</option>
        </select>
        <select name="substatus" defaultValue={projekt.substatus} className={feld}>
          <option value="">Substatus …</option>
          {SUBSTATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="grid gap-0.5 text-xs text-muted">Start<input name="start" type="date" defaultValue={isoTag(projekt.start)} className={feld} /></label>
        <label className="grid gap-0.5 text-xs text-muted">Ende<input name="ende" type="date" defaultValue={isoTag(projekt.ende)} className={feld} /></label>
        <input name="beschreibung" defaultValue={projekt.beschreibung} placeholder="Beschreibung" className={`${feld} md:col-span-2 md:self-end`} />
        <div className="flex gap-2 md:col-span-4">
          <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
        </div>
      </form>
      <form action={deleteProjekt} className="mt-2">
        <input type="hidden" name="id" value={projekt.id} />
        <button className="rounded border border-line px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">Projekt löschen (archiviert bei Verknüpfungen)</button>
      </form>

      <h2 className="mt-6 font-semibold">Aufträge</h2>
      <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
        {projekt.auftraege.length === 0 && <li className="p-3 text-sm text-muted">Noch kein Auftrag zugeordnet.</li>}
        {projekt.auftraege.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <Link href={`/auftraege/${a.id}`} className="font-medium text-forest underline">#{a.nummer} — {a.titel}</Link>
            <span className="flex items-center gap-2 text-muted">
              {a.status}{a.rechnungen.length > 0 && ` · ${a.rechnungen.map((r) => rechnungNr(r)).join(", ")} CHF ${chf(a.rechnungen.reduce((t, r) => t + r.totalNetto, 0))}`}
              <form action={auftragVonProjekt}>
                <input type="hidden" name="projektId" value={projekt.id} />
                <input type="hidden" name="auftragId" value={a.id} />
                <button className="rounded border border-line px-2 py-0.5 text-xs hover:bg-surface2">Lösen</button>
              </form>
            </span>
          </li>
        ))}
      </ul>
      {freie.length > 0 && (
        <form action={auftragZuProjekt} className="mt-2 flex gap-2">
          <input type="hidden" name="projektId" value={projekt.id} />
          <select name="auftragId" className={feld}>
            {freie.map((a) => (
              <option key={a.id} value={a.id}>#{a.nummer} — {a.titel}</option>
            ))}
          </select>
          <button className="rounded border border-forest px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface2">Auftrag zuordnen</button>
        </form>
      )}

      <h2 className="mt-6 font-semibold">Zeiten</h2>
      <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
        {projekt.zeiten.length === 0 && <li className="p-3 text-sm text-muted">Keine Zeiten. Erfassen unter «Zeiten».</li>}
        {projekt.zeiten.slice(0, 15).map((z) => (
          <li key={z.id} className="flex justify-between gap-2 p-3 text-sm">
            <span>{z.datum.toLocaleDateString("de-CH")} · {z.mitarbeiter.name} · {z.taetigkeit}</span>
            <span className="text-muted">{stunden(z.minuten)} h · {z.status}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-semibold">Material / Ausgaben</h2>
      <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
        {material.length === 0 && <li className="p-3 text-sm text-muted">Keine Ausgaben zugeordnet. Beim Erfassen einer Ausgabe das Projekt wählen.</li>}
        {material.map((a) => (
          <li key={a.id} className="flex justify-between gap-2 p-3 text-sm">
            <span>{a.datum.toLocaleDateString("de-CH")} · {a.beschreibung}{a.lieferant && ` — ${a.lieferant}`}</span>
            <span>CHF {chf(a.betragBrutto)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
