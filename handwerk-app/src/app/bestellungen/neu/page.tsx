export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createBestellung } from "@/lib/actions-bestellungen";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

export default async function NeueBestellung({ searchParams }: { searchParams: Promise<{ fehler?: string; lieferant?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const lieferanten = await db.lieferant.findMany({ where: { betriebId: betrieb.id }, orderBy: { name: "asc" } });

  return (
    <FormularSeite
      zurueckHref="/bestellungen"
      zurueckLabel="Bestellungen"
      titel="Neue Bestellung"
      untertitel="Lieferant wählen — die Positionen erfassen Sie anschliessend in der Bestellung."
    >
      {sp.fehler && <Hinweis art="fehler">Bitte einen Lieferanten wählen.</Hinweis>}
      <form action={createBestellung} className={`mt-3 ${KARTE}`}>
        <Feld label="Lieferant *" voll>
          <select name="lieferantId" required defaultValue={lieferanten.some((l) => l.id === sp.lieferant) ? sp.lieferant : ""} className={FELD}>
            <option value="">Lieferant wählen …</option>
            {lieferanten.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Bemerkung / Lieferadresse" voll>
          <input name="bemerkung" placeholder="optional, z.B. Lieferung direkt auf die Baustelle" className={FELD} />
        </Feld>
        <FormularFuss speichern="Bestellung erstellen" abbrechenHref="/bestellungen">
          <Link href="/artikel/lieferanten" className="ml-auto text-xs text-forest underline">Lieferant fehlt? Neu anlegen</Link>
        </FormularFuss>
      </form>
    </FormularSeite>
  );
}
