export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createProjekt } from "@/lib/actions-projekte";
import { SUBSTATUS } from "@/lib/projekte";
import { FELD, Feld, FormularFuss, FormularSeite, Hinweis, KARTE } from "@/components/Liste";

export default async function NeuesProjekt({ searchParams }: { searchParams: Promise<{ fehler?: string; kunde?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const kunden = await db.kunde.findMany({ where: { betriebId: betrieb.id, archiviert: false }, orderBy: { name: "asc" } });

  return (
    <FormularSeite zurueckHref="/projekte" zurueckLabel="Projekte" titel="Neues Projekt">
      {sp.fehler === "name" && <Hinweis art="fehler">Bitte einen Projektnamen angeben.</Hinweis>}
      {sp.fehler === "kunde" && <Hinweis art="fehler">Kontakt nicht gefunden.</Hinweis>}
      <form action={createProjekt} className={`mt-3 ${KARTE}`}>
        <Feld label="Projektname *" voll>
          <input name="name" required placeholder="z.B. Heizungssanierung Seeblick" className={FELD} />
        </Feld>
        <Feld label="Kontakt">
          <select name="kundeId" defaultValue={kunden.some((k) => k.id === sp.kunde) ? sp.kunde : ""} className={FELD}>
            <option value="">Internes Projekt (kein Kontakt)</option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Substatus">
          <select name="substatus" defaultValue="" className={FELD}>
            <option value="">— kein Substatus —</option>
            {SUBSTATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Feld>
        <Feld label="Start">
          <input name="start" type="date" className={FELD} />
        </Feld>
        <Feld label="Ende">
          <input name="ende" type="date" className={FELD} />
        </Feld>
        <Feld label="Beschreibung" voll>
          <textarea name="beschreibung" rows={3} className={FELD} />
        </Feld>
        <FormularFuss speichern="Projekt erstellen" abbrechenHref="/projekte">
          <Link href="/kunden/neu" className="ml-auto text-xs text-forest underline">Kontakt fehlt? Neu anlegen</Link>
        </FormularFuss>
      </form>
    </FormularSeite>
  );
}
