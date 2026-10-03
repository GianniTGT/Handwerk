export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { rechnungNr } from "@/lib/nrtext";
import { offenerBetrag } from "@/lib/mahnwesen";
import { createGutschrift } from "@/lib/actions-verkauf";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

const fehlerTexte: Record<string, string> = {
  "gutschrift-betrag": "Der Betrag übersteigt den Rechnungsbetrag (inkl. bereits erstellter Gutschriften).",
  "gutschrift-entwurf": "Für einen Entwurf kann keine Gutschrift erstellt werden — Rechnung zuerst als versendet markieren.",
  rechnung: "Bitte eine Rechnung wählen.",
};

export default async function NeueGutschrift({ searchParams }: { searchParams: Promise<{ rechnung?: string; fehler?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  // Nur versendete oder bezahlte Rechnungen lassen sich gutschreiben
  const rechnungen = await db.rechnung.findMany({
    where: { betriebId: betrieb.id, status: { in: ["VERSENDET", "BEZAHLT"] } },
    include: { auftrag: { include: { kunde: true } }, gutschriften: true },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
    take: 300,
  });
  const vorgewaehlt = rechnungen.some((r) => r.id === sp.rechnung) ? sp.rechnung : "";

  return (
    <FormularSeite
      zurueckHref="/gutschriften"
      zurueckLabel="Gutschriften"
      titel="Neue Gutschrift"
      untertitel="Ohne Betrag wird der ganze offene Betrag der Rechnung gutgeschrieben."
    >
      {sp.fehler && <Hinweis art="fehler">{fehlerTexte[sp.fehler] ?? "Gutschrift konnte nicht erstellt werden."}</Hinweis>}
      <form action={createGutschrift} className={`mt-3 ${KARTE}`}>
        <input type="hidden" name="zurueck" value="/gutschriften/neu" />
        <Feld label="Rechnung *" voll>
          <select name="rechnungId" required defaultValue={vorgewaehlt} className={FELD}>
            <option value="">Rechnung wählen …</option>
            {rechnungen.map((r) => (
              <option key={r.id} value={r.id}>
                {rechnungNr(r)} — {r.auftrag.kunde.name} · brutto CHF {chf(r.totalBrutto)}
                {r.status === "VERSENDET" ? ` · offen CHF ${chf(offenerBetrag(r))}` : " · bezahlt"}
              </option>
            ))}
          </select>
        </Feld>
        <Feld label="Grund">
          <input name="grund" placeholder="z.B. Preisnachlass, Rücknahme" className={FELD} />
        </Feld>
        <Feld label="Betrag brutto CHF (leer = offener Betrag)">
          <input name="betragBrutto" inputMode="decimal" placeholder="0.00" className={FELD} />
        </Feld>
        <FormularFuss speichern="Gutschrift erstellen" abbrechenHref="/gutschriften">
          {rechnungen.length === 0 && (
            <span className="text-xs text-muted">
              Keine versendeten Rechnungen vorhanden — <Link href="/rechnungen" className="underline">zu den Rechnungen</Link>.
            </span>
          )}
        </FormularFuss>
      </form>
    </FormularSeite>
  );
}
