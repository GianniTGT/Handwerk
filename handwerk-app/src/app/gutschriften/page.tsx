export const dynamic = "force-dynamic";

import Link from "next/link";
import { Ik } from "@/components/Icons";
import { gutschriftNr, rechnungNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { deleteGutschrift } from "@/lib/actions-verkauf";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

export default async function GutschriftenPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; q?: string; filter?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const alle = await db.gutschrift.findMany({
    where: { betriebId: betrieb.id },
    include: { rechnung: { include: { auftrag: { include: { kunde: true } } } } },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
    take: 500,
  });
  const sichtbar = alle.filter(
    (g) => !q || `${gutschriftNr(g)} ${rechnungNr(g.rechnung)} ${g.rechnung.auftrag.kunde.name} ${g.grund}`.toLowerCase().includes(q)
  );
  const summe = sichtbar.reduce((s, g) => s + g.totalBrutto, 0);

  return (
    <div>
      <ListenKopf
        titel="Gutschriften"
        untertitel="Eine Gutschrift gehört zu einer versendeten Rechnung und verringert deren offenen Betrag."
        neuHref="/gutschriften/neu"
        neuLabel="Neue Gutschrift"
      />
      {sp.gespeichert && <Hinweis>Gutschrift erstellt ✓</Hinweis>}
      <ReiterUndSuche
        basis="/gutschriften"
        aktiv="alle"
        q={sp.q ?? ""}
        suchePlatzhalter="Suche: Nummer, Rechnung, Kontakt, Grund …"
        reiter={[{ key: "alle", label: "Alle", anzahl: alle.length }]}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="hidden p-2 sm:table-cell">Datum</th>
            <th className="p-2">Kontakt</th>
            <th className="hidden p-2 md:table-cell">Rechnung</th>
            <th className="hidden p-2 lg:table-cell">Grund</th>
            <th className="p-2 text-right">Brutto CHF</th>
            <th className="w-24 p-2" />
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map((g) => (
            <tr key={g.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">{gutschriftNr(g)}</td>
              <td className="hidden p-2 text-muted sm:table-cell">{g.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2">{g.rechnung.auftrag.kunde.name}</td>
              <td className="hidden p-2 md:table-cell">
                <Link href={`/rechnungen/${g.rechnungId}`} className="text-forest hover:underline">{rechnungNr(g.rechnung)}</Link>
              </td>
              <td className="hidden max-w-xs truncate p-2 text-muted lg:table-cell">{g.grund || "—"}</td>
              <td className="p-2 text-right tabular-nums">{chf(g.totalBrutto)}</td>
              <td className="p-2 text-right">
                <a href={`/api/gutschriften/${g.id}`} target="_blank" title="PDF" className="mr-2 hover:opacity-70"><Ik name="pdf" className="mr-0" /></a>
                <form action={deleteGutschrift} className="inline">
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-muted hover:text-red-600" title="Löschen" aria-label="Löschen"><Ik name="x" className="mr-0" /></button>
                </form>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={7}>
              Keine Gutschriften. <Link href="/gutschriften/neu" className="text-forest underline">Neue Gutschrift erstellen</Link>
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2">Total ({sichtbar.length})</td>
              <td className="hidden sm:table-cell" />
              <td />
              <td className="hidden md:table-cell" />
              <td className="hidden lg:table-cell" />
              <td className="p-2 text-right tabular-nums">{chf(summe)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
