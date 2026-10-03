export const dynamic = "force-dynamic";

import Neu from "@/components/Neu";
import { lokalIso } from "@/lib/datum";
import { projektNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { createAusgabe, deleteAusgabe, setAusgabeStatus } from "@/lib/actions-buero";

const KATEGORIEN = ["Material", "Fahrzeug", "Werkzeug", "Miete", "Versicherung", "Büro", "Sonstiges"];

export default async function AusgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string; beleg?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const ausgaben = await db.ausgabe.findMany({
    where: { betriebId: betrieb.id },
    orderBy: { datum: "desc" },
  });
  const projekte = await db.projekt.findMany({
    where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } },
    orderBy: { nummer: "desc" },
  });
  const beleg = sp.beleg
    ? await db.beleg.findFirst({ where: { id: sp.beleg, betriebId: betrieb.id } })
    : null;

  const offen = ausgaben.filter((a) => a.status === "OFFEN");
  const summeOffen = offen.reduce((s, a) => s + a.betragBrutto, 0);
  const heute = new Date();
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">Ausgaben</h1>
      <p className="mt-1 text-sm text-muted">
        Lieferantenrechnungen und Betriebskosten erfassen. Offen: {offen.length} · CHF {chf(summeOffen)}
      </p>

      {sp.gespeichert && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>
      )}
      {sp.fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          Bitte Beschreibung und einen Betrag grösser als 0 angeben.
        </p>
      )}

      <Neu label="Neue Ausgabe" offen={!!beleg || !!sp.fehler}>
<form
        action={createAusgabe}
        className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <h2 className="font-semibold md:col-span-4">
          Neue Ausgabe
          {beleg && <span className="ml-2 text-sm font-normal text-muted">aus Beleg «{beleg.titel}»</span>}
        </h2>
        {beleg && <input type="hidden" name="belegId" value={beleg.id} />}
        <input name="lieferant" placeholder="Lieferant (z.B. Debrunner Acifer)" className={feld} />
        <input
          name="beschreibung"
          required
          defaultValue={beleg?.titel ?? ""}
          placeholder="Beschreibung"
          className={`${feld} md:col-span-2`}
        />
        <select name="kategorie" className={feld}>
          {KATEGORIEN.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <label className="grid gap-0.5 text-xs text-muted">
          Datum
          <input name="datum" type="date" defaultValue={lokalIso(heute)} className={feld} />
        </label>
        <label className="grid gap-0.5 text-xs text-muted">
          Fällig am
          <input name="faelligAm" type="date" className={feld} />
        </label>
        <label className="grid gap-0.5 text-xs text-muted">
          Betrag brutto (CHF)
          <input name="betragBrutto" required inputMode="decimal" placeholder="0.00" className={feld} />
        </label>
        <label className="grid gap-0.5 text-xs text-muted">
          MwSt %
          <select name="mwstSatz" defaultValue="8.1" className={feld}>
            <option value="8.1">8.1</option>
            <option value="2.6">2.6</option>
            <option value="3.8">3.8</option>
            <option value="0">0</option>
          </select>
        </label>
        <select name="projektId" className={`${feld} md:col-span-4`}>
          <option value="">Projekt (optional, für Nachkalkulation)</option>
          {projekte.map((p) => (
            <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
          ))}
        </select>
        <button className="rounded bg-forest p-2.5 text-sm font-semibold text-white hover:bg-forest-lift md:col-span-4">
          Ausgabe speichern
        </button>
      </form>
</Neu>

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {ausgaben.length === 0 && <li className="p-4 text-sm text-muted">Noch keine Ausgaben erfasst.</li>}
        {ausgaben.map((a) => {
          const ueberfaellig = a.status === "OFFEN" && a.faelligAm && a.faelligAm < heute;
          return (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <div className="font-medium">
                  {a.beschreibung}
                  {a.lieferant && <span className="text-muted"> — {a.lieferant}</span>}
                </div>
                <div className="text-sm text-muted">
                  {a.datum.toLocaleDateString("de-CH")} · {a.kategorie} · MwSt {a.mwstSatz}%
                  {a.faelligAm && (
                    <span className={ueberfaellig ? "font-medium text-red-700" : ""}>
                      {" "}
                      · fällig {a.faelligAm.toLocaleDateString("de-CH")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <strong>CHF {chf(a.betragBrutto)}</strong>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "BEZAHLT" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {a.status === "BEZAHLT" ? "bezahlt" : "offen"}
                </span>
                <form action={setAusgabeStatus}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value={a.status === "BEZAHLT" ? "OFFEN" : "BEZAHLT"} />
                  <button className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2">
                    {a.status === "BEZAHLT" ? "Wieder öffnen" : "Als bezahlt"}
                  </button>
                </form>
                <form action={deleteAusgabe}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="rounded border border-line px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                    Löschen
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
