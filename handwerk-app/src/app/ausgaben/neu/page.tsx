export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import { projektNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createAusgabe } from "@/lib/actions-buero";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

const KATEGORIEN = ["Material", "Fahrzeug", "Werkzeug", "Miete", "Versicherung", "Büro", "Sonstiges"];

export default async function NeueAusgabe({ searchParams }: { searchParams: Promise<{ beleg?: string; fehler?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const [projekte, beleg] = await Promise.all([
    db.projekt.findMany({ where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } }, orderBy: { nummer: "desc" } }),
    sp.beleg ? db.beleg.findFirst({ where: { id: sp.beleg, betriebId: betrieb.id }, select: { id: true, titel: true } }) : null,
  ]);

  return (
    <FormularSeite
      zurueckHref="/ausgaben"
      zurueckLabel="Ausgaben"
      titel="Neue Ausgabe"
      untertitel={beleg ? <>Aus Beleg «{beleg.titel}» — der Beleg wird nach dem Speichern als erledigt markiert.</> : "Lieferantenrechnung oder Betriebskosten erfassen."}
    >
      {sp.fehler && <Hinweis art="fehler">Bitte Beschreibung und einen Betrag grösser als 0 angeben.</Hinweis>}
      <form action={createAusgabe} className={`mt-3 ${KARTE}`}>
        {beleg && <input type="hidden" name="belegId" value={beleg.id} />}
        <Feld label="Beschreibung *" voll>
          <input name="beschreibung" required defaultValue={beleg?.titel ?? ""} placeholder="z.B. Rechnung 4711 Material Baustelle Seeblick" className={FELD} />
        </Feld>
        <Feld label="Lieferant">
          <input name="lieferant" placeholder="z.B. Debrunner Acifer" className={FELD} />
        </Feld>
        <Feld label="Kategorie">
          <select name="kategorie" className={FELD}>
            {KATEGORIEN.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Datum">
          <input name="datum" type="date" defaultValue={lokalIso(new Date())} className={FELD} />
        </Feld>
        <Feld label="Fällig am">
          <input name="faelligAm" type="date" className={FELD} />
        </Feld>
        <Feld label="Betrag brutto CHF *">
          <input name="betragBrutto" required inputMode="decimal" placeholder="0.00" className={FELD} />
        </Feld>
        <Feld label="MwSt %">
          <select name="mwstSatz" defaultValue="8.1" className={FELD}>
            <option value="8.1">8.1 %</option>
            <option value="2.6">2.6 %</option>
            <option value="3.8">3.8 %</option>
            <option value="0">0 %</option>
          </select>
        </Feld>
        <Feld label="Projekt (für Nachkalkulation)" voll>
          <select name="projektId" className={FELD}>
            <option value="">— kein Projekt —</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
            ))}
          </select>
        </Feld>
        <FormularFuss speichern="Ausgabe speichern" abbrechenHref="/ausgaben" />
      </form>
    </FormularSeite>
  );
}
