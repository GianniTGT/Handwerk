export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createWartungsvertrag } from "@/lib/actions";
import { lokalIso } from "@/lib/datum";
import { FELD, Feld, FormularFuss, FormularSeite, KARTE } from "@/components/Liste";

export default async function NeuerWartungsvertrag({ searchParams }: { searchParams: Promise<{ objekt?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const kunden = await db.kunde.findMany({
    where: { betriebId: betrieb.id, archiviert: false },
    include: { objekte: true },
    orderBy: { name: "asc" },
  });
  const objekte = kunden.flatMap((k) => k.objekte.map((o) => ({ id: o.id, label: `${k.name} — ${o.bezeichnung}` })));
  const inEinemJahr = new Date();
  inEinemJahr.setFullYear(inEinemJahr.getFullYear() + 1);

  return (
    <FormularSeite
      zurueckHref="/wartung"
      zurueckLabel="Wartungsverträge"
      titel="Neuer Wartungsvertrag"
      untertitel="Ein Vertrag gehört zu einer Anlage (Objekt) eines Kontakts. Anlagen erfassen Sie im Kontakt."
    >
      <form action={createWartungsvertrag} className={`mt-3 ${KARTE}`}>
        <Feld label="Anlage / Objekt *" voll>
          <select name="objektId" required defaultValue={objekte.some((o) => o.id === sp.objekt) ? sp.objekt : ""} className={FELD}>
            <option value="">Anlage wählen …</option>
            {objekte.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Titel" voll>
          <input name="titel" placeholder="Standard: Jahreswartung Heizung" className={FELD} />
        </Feld>
        <Feld label="Intervall">
          <select name="intervallMonate" defaultValue="12" className={FELD}>
            <option value="12">jährlich (12 Monate)</option>
            <option value="6">halbjährlich (6 Monate)</option>
            <option value="3">vierteljährlich (3 Monate)</option>
            <option value="24">alle 2 Jahre</option>
          </select>
        </Feld>
        <Feld label="Nächste Wartung *">
          <input name="naechsteWartung" type="date" required defaultValue={lokalIso(inEinemJahr)} className={FELD} />
        </Feld>
        <Feld label="Vereinbarter Preis CHF (optional)">
          <input name="preis" type="number" step="0.05" min="0" placeholder="0.00" className={FELD} />
        </Feld>
        <Feld label="Bemerkung">
          <input name="bemerkung" placeholder="z.B. Schlüssel beim Hauswart" className={FELD} />
        </Feld>
        <FormularFuss speichern="Vertrag erfassen" abbrechenHref="/wartung">
          {objekte.length === 0 && (
            <span className="text-xs text-muted">
              Noch keine Anlagen — <Link href="/kunden" className="underline">im Kontakt ein Objekt anlegen</Link>.
            </span>
          )}
        </FormularFuss>
      </form>
    </FormularSeite>
  );
}
