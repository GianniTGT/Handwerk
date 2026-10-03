export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { rechnungslauf, speichereAbo } from "@/lib/actions-wiederkehrend";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const iso = (d: Date | null) => (d ? lokalIso(d) : "");
const TABS: [string, string][] = [
  ["alle", "Alle aktiven Verträge"],
  ["abo", "Mit Pauschale"],
  ["faellig", "Fällig"],
  ["ohne", "Ohne Pauschale"],
];

export default async function WiederkehrendPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; lauf?: string; gespeichert?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const filter = sp.filter ?? "alle";
  const q = (sp.q ?? "").trim().toLowerCase();
  const [vertraege, laeufe] = await Promise.all([
    db.wartungsvertrag.findMany({
      where: { betriebId: betrieb.id, status: "AKTIV" },
      include: { kunde: true, objekt: true },
      orderBy: { nummer: "asc" },
    }),
    db.rechnungslauf.findMany({ where: { betriebId: betrieb.id }, orderBy: { datum: "desc" }, take: 20 }),
  ]);
  const grenze = new Date(new Date().setHours(23, 59, 59, 999));
  const stichtag = (v: (typeof vertraege)[number]) => v.naechsteRechnung ?? v.naechsteWartung;
  const zeilen = vertraege.map((v) => ({
    v,
    abo: v.pauschalAbrechnung && v.preis > 0,
    faellig: v.pauschalAbrechnung && v.preis > 0 && stichtag(v) <= grenze,
  }));
  const passt = (z: (typeof zeilen)[number], key: string) =>
    key === "abo" ? z.abo : key === "faellig" ? z.faellig : key === "ohne" ? !z.abo : true;
  const sichtbar = zeilen.filter(
    (z) => passt(z, filter) && (!q || `WV-${z.v.nummer} ${z.v.titel} ${z.v.kunde.name} ${z.v.objekt.bezeichnung}`.toLowerCase().includes(q))
  );
  const dran = zeilen.filter((z) => z.faellig).length;
  const summeAbo = sichtbar.filter((z) => z.abo).reduce((s, z) => s + z.v.preis, 0);
  const feld = "rounded border border-line p-1 text-xs";

  return (
    <div>
      <ListenKopf
        titel="Wiederkehrende Rechnungen"
        untertitel={
          <>
            Wartungsverträge mit Pauschalpreis werden im Intervall automatisch verrechnet: Der Lauf erstellt je fälligem Vertrag einen Auftrag
            und eine Rechnung als <strong>Entwurf</strong> — prüfen und versenden unter «Rechnungen». Die Einsätze planen Sie unter{" "}
            <Link href="/wartung" className="underline">Wartungsverträge</Link>.
          </>
        }
      >
        <form action={rechnungslauf}>
          <button
            disabled={dran === 0}
            className="rounded-md bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift disabled:opacity-40"
          >
            Rechnungslauf starten ({dran})
          </button>
        </form>
      </ListenKopf>
      {sp.lauf && (
        <Hinweis>
          Rechnungslauf: {sp.lauf} Rechnung(en) erstellt. <Link href="/rechnungen?filter=entwurf" className="underline">Zu den Entwürfen</Link>
        </Hinweis>
      )}
      {sp.gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}

      <ReiterUndSuche
        basis="/wiederkehrend"
        aktiv={filter}
        q={sp.q ?? ""}
        suchePlatzhalter="Suche: Nummer, Titel, Kontakt …"
        reiter={TABS.map(([key, label]) => ({ key, label, anzahl: zeilen.filter((z) => passt(z, key)).length, warn: key === "faellig" }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="p-2">Vertrag</th>
            <th className="hidden p-2 sm:table-cell">Kontakt / Anlage</th>
            <th className="hidden p-2 md:table-cell">Intervall</th>
            <th className="p-2 text-right">Pauschale CHF</th>
            <th className="p-2">Nächste Rechnung</th>
            <th className="p-2 text-right">Abo</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ v, abo, faellig }) => (
            <tr key={v.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">WV-{v.nummer}</td>
              <td className="p-2 font-medium">{v.titel}</td>
              <td className="hidden p-2 sm:table-cell">
                {v.kunde.name}
                <span className="block text-xs text-muted">{v.objekt.bezeichnung}</span>
              </td>
              <td className="hidden p-2 text-muted md:table-cell">alle {v.intervallMonate} Monate</td>
              <td className="p-2 text-right tabular-nums">{v.preis > 0 ? chf(v.preis) : <span className="text-muted">kein Preis</span>}</td>
              <td className="whitespace-nowrap p-2">
                {faellig ? <Pille farbe="bg-amber-100 text-amber-800">fällig · {stichtag(v).toLocaleDateString("de-CH")}</Pille> : abo ? stichtag(v).toLocaleDateString("de-CH") : <span className="text-muted">—</span>}
              </td>
              <td className="p-2">
                <form action={speichereAbo} className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
                  <input type="hidden" name="vertragId" value={v.id} />
                  <label className="flex items-center gap-1 whitespace-nowrap" title={v.preis <= 0 ? "Zuerst einen Preis im Vertrag hinterlegen" : ""}>
                    <input type="checkbox" name="pauschal" value="1" defaultChecked={v.pauschalAbrechnung} disabled={v.preis <= 0} /> automatisch
                  </label>
                  <input type="date" name="naechsteRechnung" defaultValue={iso(stichtag(v))} className={feld} aria-label="Nächste Rechnung" />
                  <button className="rounded-md border border-forest px-2 py-1 font-medium text-forest hover:bg-surface2">OK</button>
                </form>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={7}>
              Keine aktiven Wartungsverträge. <Link href="/wartung/neu" className="text-forest underline">Vertrag erfassen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2" colSpan={2}>Total ({sichtbar.length}) · Pauschalen pro Lauf</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="p-2 text-right tabular-nums">{chf(summeAbo)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </Tabelle>

      <h2 className="mt-6 font-semibold">Journal der Läufe</h2>
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Datum</th>
            <th className="p-2 text-right">Rechnungen</th>
            <th className="p-2 text-right">Brutto CHF</th>
            <th className="hidden p-2 md:table-cell">Details</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {laeufe.map((l) => (
            <tr key={l.id} className="align-top">
              <td className="whitespace-nowrap p-2">{l.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2 text-right tabular-nums">{l.anzahl}</td>
              <td className="p-2 text-right tabular-nums">{chf(l.summeBrutto)}</td>
              <td className="hidden whitespace-pre-wrap p-2 text-xs text-muted md:table-cell">{l.details}</td>
            </tr>
          ))}
          {laeufe.length === 0 && <Leer colSpan={4}>Noch kein Lauf.</Leer>}
        </tbody>
      </Tabelle>
    </div>
  );
}
