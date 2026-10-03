export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import { projektNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createZeit } from "@/lib/actions-projekte";
import { TAETIGKEITEN } from "@/lib/projekte";
import Stoppuhr from "@/components/Stoppuhr";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

const fehlerTexte: Record<string, string> = {
  dauer: "Bitte eine Dauer angeben (z.B. 1:30 oder 1.5).",
  mitarbeiter: "Mitarbeiter nicht gefunden.",
  projekt: "Projekt nicht gefunden.",
  auftrag: "Auftrag nicht gefunden.",
};

export default async function ZeitErfassen({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; projekt?: string; auftrag?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const sp = await searchParams;
  const [team, projekte, auftraege] = await Promise.all([
    db.mitarbeiter.findMany({ where: { betriebId: betrieb.id, aktiv: true }, orderBy: { name: "asc" } }),
    db.projekt.findMany({ where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } }, orderBy: { nummer: "desc" } }),
    db.auftrag.findMany({
      where: { betriebId: betrieb.id, status: { in: ["OFFEN", "IN_ARBEIT", "ERLEDIGT"] } },
      include: { kunde: true },
      orderBy: { nummer: "desc" },
    }),
  ]);

  return (
    <FormularSeite
      zurueckHref="/zeiten"
      zurueckLabel="Zeiterfassung"
      titel="Zeit erfassen"
      untertitel="Dauer als h:mm (1:30) oder dezimal (1.5) — oder die Stoppuhr laufen lassen."
    >
      {sp.fehler && <Hinweis art="fehler">{fehlerTexte[sp.fehler] ?? "Fehler."}</Hinweis>}
      <form action={createZeit} className={`mt-3 ${KARTE}`}>
        <Feld label="Mitarbeiter">
          <select name="mitarbeiterId" defaultValue={mitarbeiter.id} className={FELD}>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Datum">
          <input name="datum" type="date" defaultValue={lokalIso(new Date())} className={FELD} />
        </Feld>
        <Feld label="Dauer *">
          <input name="dauer" required placeholder="h:mm oder 1.5" className={FELD} />
        </Feld>
        <div className="flex items-end">
          <Stoppuhr zielName="dauer" />
        </div>
        <Feld label="Tätigkeit">
          <select name="taetigkeit" className={FELD}>
            {TAETIGKEITEN.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Feld>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="abrechenbar" value="1" defaultChecked /> abrechenbar
        </label>
        <Feld label="Projekt">
          <select name="projektId" defaultValue={projekte.some((p) => p.id === sp.projekt) ? sp.projekt : ""} className={FELD}>
            <option value="">— kein Projekt —</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Auftrag">
          <select name="auftragId" defaultValue={auftraege.some((a) => a.id === sp.auftrag) ? sp.auftrag : ""} className={FELD}>
            <option value="">— kein Auftrag —</option>
            {auftraege.map((a) => (
              <option key={a.id} value={a.id}>#{a.nummer} {a.titel} — {a.kunde.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Bemerkung" voll>
          <input name="bemerkung" className={FELD} />
        </Feld>
        <FormularFuss speichern="Speichern" abbrechenHref="/zeiten" />
      </form>
    </FormularSeite>
  );
}
