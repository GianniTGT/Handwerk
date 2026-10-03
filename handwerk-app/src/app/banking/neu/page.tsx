export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import { sitzungErforderlich } from "@/lib/auth";
import { createZahlung } from "@/lib/actions-buero";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

export default async function ZahlungErfassen({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  await sitzungErforderlich();
  const sp = await searchParams;
  return (
    <FormularSeite
      zurueckHref="/banking"
      zurueckLabel="Banking"
      titel="Zahlung erfassen"
      untertitel="Ein Eingang, dessen Betrag zu einer offenen Rechnung passt, markiert diese automatisch als bezahlt (analog Ausgang → Ausgabe)."
    >
      {sp.fehler && <Hinweis art="fehler">Bitte einen Betrag grösser als 0 angeben.</Hinweis>}
      <form action={createZahlung} className={`mt-3 ${KARTE}`}>
        <Feld label="Art">
          <select name="art" className={FELD}>
            <option value="ein">Eingang (Kunde zahlt)</option>
            <option value="aus">Ausgang (wir zahlen)</option>
          </select>
        </Feld>
        <Feld label="Datum">
          <input name="datum" type="date" defaultValue={lokalIso(new Date())} className={FELD} />
        </Feld>
        <Feld label="Betrag CHF *">
          <input name="betrag" required inputMode="decimal" placeholder="0.00" className={FELD} />
        </Feld>
        <Feld label="Referenz (QR-Referenz, Rechnungsnummer)">
          <input name="referenz" className={FELD} />
        </Feld>
        <Feld label="Text / Auftraggeber" voll>
          <input name="text" placeholder="z.B. Familie Muster, Rechnung RE-20260001" className={FELD} />
        </Feld>
        <FormularFuss speichern="Zahlung speichern" abbrechenHref="/banking" />
      </form>
    </FormularSeite>
  );
}
