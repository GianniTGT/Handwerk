export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createAufgabe } from "@/lib/actions-aufgaben";
import { projektNr } from "@/lib/nrtext";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

const KATEGORIEN = ["Anruf", "Termin", "Material", "Offerte nachfassen", "Administration"];

export default async function NeueAufgabe({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; kunde?: string; projekt?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const sp = await searchParams;
  const [team, kunden, projekte] = await Promise.all([
    db.mitarbeiter.findMany({ where: { betriebId: betrieb.id, aktiv: true }, orderBy: { name: "asc" } }),
    db.kunde.findMany({ where: { betriebId: betrieb.id, archiviert: false }, orderBy: { name: "asc" } }),
    db.projekt.findMany({ where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } }, orderBy: { nummer: "desc" } }),
  ]);

  return (
    <FormularSeite zurueckHref="/aufgaben" zurueckLabel="Aufgaben" titel="Neue Aufgabe">
      {sp.fehler && <Hinweis art="fehler">{sp.fehler === "titel" ? "Bitte einen Titel angeben." : "Ungültige Zuordnung."}</Hinweis>}
      <form action={createAufgabe} className={`mt-3 ${KARTE}`}>
        <Feld label="Titel *" voll>
          <input name="titel" required placeholder="z.B. Familie Muster zurückrufen" className={FELD} />
        </Feld>
        <Feld label="Zugewiesen an">
          <select name="zugewiesenAnId" defaultValue={mitarbeiter.id} className={FELD}>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Fällig am">
          <input name="faelligAm" type="date" className={FELD} />
        </Feld>
        <Feld label="Kategorie">
          <input name="kategorie" list="aufgaben-kat" placeholder="z.B. Anruf" className={FELD} />
          <datalist id="aufgaben-kat">
            {KATEGORIEN.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Feld>
        <Feld label="Kontakt">
          <select name="kundeId" defaultValue={kunden.some((k) => k.id === sp.kunde) ? sp.kunde : ""} className={FELD}>
            <option value="">— kein Kontakt —</option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Projekt">
          <select name="projektId" defaultValue={projekte.some((p) => p.id === sp.projekt) ? sp.projekt : ""} className={FELD}>
            <option value="">— kein Projekt —</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Notiz" voll>
          <textarea name="beschreibung" rows={3} className={FELD} />
        </Feld>
        <FormularFuss speichern="Aufgabe speichern" abbrechenHref="/aufgaben" />
      </form>
    </FormularSeite>
  );
}
