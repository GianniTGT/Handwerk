export const dynamic = "force-dynamic";

import Link from "next/link";
import { rechnungNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { faelligDatum, istUeberfaellig, tageUeberfaellig } from "@/lib/faellig";
import { MAHNSTUFEN, naechsteMahnstufe, offenerBetrag } from "@/lib/mahnwesen";
import { mahneRechnung, mahnlauf } from "@/lib/actions-verkauf";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const stufenFarbe = (stufe: number) =>
  stufe === 0 ? "bg-surface2 text-muted" : stufe === 1 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

export default async function MahnwesenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; lauf?: string; ohneEmail?: string; gemahnt?: string; versand?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const filter = sp.filter ?? "alle";
  const q = (sp.q ?? "").trim().toLowerCase();
  const rechnungen = await db.rechnung.findMany({
    where: { betriebId: betrieb.id, status: "VERSENDET" },
    include: { auftrag: { include: { kunde: true } }, gutschriften: true },
    orderBy: { nummer: "asc" },
  });
  const zeilen = rechnungen
    .map((r) => {
      const faellig = faelligDatum(r, betrieb.zahlungsfristTage);
      return {
        r,
        nr: rechnungNr(r),
        faellig,
        offen: offenerBetrag(r),
        ueberfaellig: istUeberfaellig(faellig, r.status),
        bereit: naechsteMahnstufe(r, betrieb),
      };
    })
    .filter((z) => z.ueberfaellig || z.r.mahnstufe > 0);
  const reiter = [
    { key: "alle", label: "Alle", anzahl: zeilen.length },
    { key: "bereit", label: "Mahnung fällig", anzahl: zeilen.filter((z) => z.bereit).length, warn: true },
    { key: "nicht", label: "Noch nicht gemahnt", anzahl: zeilen.filter((z) => z.r.mahnstufe === 0).length },
    { key: "gemahnt", label: "Gemahnt", anzahl: zeilen.filter((z) => z.r.mahnstufe > 0).length },
  ];
  const sichtbar = zeilen.filter(
    (z) =>
      (filter === "bereit" ? !!z.bereit : filter === "nicht" ? z.r.mahnstufe === 0 : filter === "gemahnt" ? z.r.mahnstufe > 0 : true) &&
      (!q || `${z.nr} ${z.r.auftrag.kunde.name}`.toLowerCase().includes(q))
  );
  const bereit = zeilen.filter((z) => z.bereit).length;
  const summeOffen = sichtbar.reduce((s, z) => s + z.offen, 0);

  return (
    <div>
      <ListenKopf
        titel="Mahnwesen"
        untertitel={
          <>
            Zahlungserinnerung {betrieb.mahnfrist1Tage} Tage nach Fälligkeit · 1. Mahnung {betrieb.mahnfrist2Tage} Tage danach · 2. Mahnung weitere{" "}
            {betrieb.mahnfrist3Tage} Tage. Fristen und Texte unter <Link href="/einstellungen" className="underline">Einstellungen</Link>.
          </>
        }
      >
        <form action={mahnlauf}>
          <button
            disabled={bereit === 0}
            className="rounded-md bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift disabled:opacity-40"
          >
            Mahnlauf starten ({bereit})
          </button>
        </form>
      </ListenKopf>

      {sp.lauf && (
        <Hinweis>
          Mahnlauf: {sp.lauf} Rechnung(en) gemahnt
          {Number(sp.ohneEmail) > 0 && ` — ${sp.ohneEmail} ohne E-Mail-Adresse (PDF manuell versenden)`}.
        </Hinweis>
      )}
      {sp.gemahnt && (
        <Hinweis>
          Gemahnt{sp.versand === "ohne-email" ? " — Kunde hat keine E-Mail, PDF manuell versenden" : ""}
          {sp.versand === "fehler" ? " — E-Mail-Versand fehlgeschlagen, PDF manuell versenden" : ""}.
        </Hinweis>
      )}
      {sp.fehler && <Hinweis art="fehler">Diese Rechnung kann nicht gemahnt werden.</Hinweis>}

      <ReiterUndSuche basis="/mahnwesen" aktiv={filter} q={sp.q ?? ""} suchePlatzhalter="Suche: Nummer, Kontakt …" reiter={reiter} />

      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Nr.</th>
            <th className="p-2">Kontakt</th>
            <th className="hidden p-2 sm:table-cell">Fällig</th>
            <th className="hidden p-2 text-right md:table-cell">Überfällig</th>
            <th className="p-2 text-right">Offen CHF</th>
            <th className="p-2">Mahnstufe</th>
            <th className="hidden p-2 lg:table-cell">Zuletzt gemahnt</th>
            <th className="p-2 text-right">Aktion</th>
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map(({ r, nr, faellig, offen, ueberfaellig, bereit: stufe }) => (
            <tr key={r.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 font-medium">
                <Link href={`/rechnungen/${r.id}`} className="block hover:underline">{nr}</Link>
              </td>
              <td className="p-2">{r.auftrag.kunde.name}</td>
              <td className="hidden p-2 text-muted sm:table-cell">{faellig.toLocaleDateString("de-CH")}</td>
              <td className={`hidden p-2 text-right tabular-nums md:table-cell ${ueberfaellig ? "font-medium text-red-700" : "text-muted"}`}>
                {ueberfaellig ? `${tageUeberfaellig(faellig)} Tage` : "—"}
              </td>
              <td className="p-2 text-right tabular-nums">{chf(offen)}</td>
              <td className="p-2">
                <Pille farbe={stufenFarbe(r.mahnstufe)}>{r.mahnstufe === 0 ? "nicht gemahnt" : MAHNSTUFEN[r.mahnstufe]}</Pille>
              </td>
              <td className="hidden p-2 text-muted lg:table-cell">{r.letzteMahnungAm ? r.letzteMahnungAm.toLocaleDateString("de-CH") : "—"}</td>
              <td className="p-2 text-right">
                <span className="inline-flex flex-wrap items-center justify-end gap-1">
                  {r.mahnstufe > 0 && (
                    <a href={`/api/mahnungen/${r.id}`} target="_blank" className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface2">
                      PDF
                    </a>
                  )}
                  {r.mahnstufe < 3 && (
                    <form action={mahneRechnung}>
                      <input type="hidden" name="rechnungId" value={r.id} />
                      <button className="whitespace-nowrap rounded-md border border-forest px-2 py-1 text-xs font-medium text-forest hover:bg-surface2">
                        {stufe ? `${MAHNSTUFEN[stufe]} senden` : `Jetzt ${MAHNSTUFEN[r.mahnstufe + 1]}`}
                      </button>
                    </form>
                  )}
                </span>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && <Leer colSpan={8}>Keine überfälligen oder gemahnten Rechnungen.</Leer>}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2" colSpan={2}>Total ({sichtbar.length})</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="p-2 text-right tabular-nums">{chf(summeOffen)}</td>
              <td />
              <td className="hidden lg:table-cell" />
              <td />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
