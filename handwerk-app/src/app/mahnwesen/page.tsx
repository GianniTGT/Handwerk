export const dynamic = "force-dynamic";

import { rechnungNr } from "@/lib/nrtext";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { faelligDatum, istUeberfaellig, tageUeberfaellig } from "@/lib/faellig";
import { MAHNSTUFEN, naechsteMahnstufe, offenerBetrag } from "@/lib/mahnwesen";
import { mahneRechnung, mahnlauf } from "@/lib/actions-verkauf";

export default async function MahnwesenPage({
  searchParams,
}: {
  searchParams: Promise<{ lauf?: string; ohneEmail?: string; gemahnt?: string; versand?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
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
        faellig,
        ueberfaellig: istUeberfaellig(faellig, r.status),
        bereit: naechsteMahnstufe(r, betrieb),
      };
    })
    .filter((z) => z.ueberfaellig || z.r.mahnstufe > 0);
  const bereit = zeilen.filter((z) => z.bereit).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Mahnwesen</h1>
        <form action={mahnlauf}>
          <button
            disabled={bereit === 0}
            className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift disabled:opacity-40"
          >
            Mahnlauf starten ({bereit})
          </button>
        </form>
      </div>
      <p className="mt-1 text-sm text-muted">
        Stufen: Zahlungserinnerung {betrieb.mahnfrist1Tage} Tage nach Fälligkeit · 1. Mahnung {betrieb.mahnfrist2Tage}{" "}
        Tage danach · 2. Mahnung weitere {betrieb.mahnfrist3Tage} Tage. Fristen unter Einstellungen.
      </p>

      {sp.lauf && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Mahnlauf: {sp.lauf} Rechnung(en) gemahnt
          {Number(sp.ohneEmail) > 0 && ` — ${sp.ohneEmail} ohne E-Mail-Adresse (PDF manuell versenden)`}.
        </p>
      )}
      {sp.gemahnt && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Gemahnt{sp.versand === "ohne-email" ? " — Kunde hat keine E-Mail, PDF manuell versenden" : ""}
          {sp.versand === "fehler" ? " — E-Mail-Versand fehlgeschlagen, PDF manuell versenden" : ""}.
        </p>
      )}
      {sp.fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Diese Rechnung kann nicht gemahnt werden.</p>
      )}

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {zeilen.length === 0 && (
          <li className="p-4 text-sm text-muted">Keine überfälligen oder gemahnten Rechnungen.</li>
        )}
        {zeilen.map(({ r, faellig, ueberfaellig, bereit: stufe }) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">
                {rechnungNr(r)} — {r.auftrag.kunde.name}
              </div>
              <div className="text-sm text-muted">
                offen CHF {chf(offenerBetrag(r))} · fällig {faellig.toLocaleDateString("de-CH")}
                {ueberfaellig && (
                  <span className="font-medium text-red-700"> ({tageUeberfaellig(faellig)} Tage überfällig)</span>
                )}
                {r.letzteMahnungAm && ` · zuletzt gemahnt ${r.letzteMahnungAm.toLocaleDateString("de-CH")}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.mahnstufe === 0 ? "bg-surface2 text-muted" : r.mahnstufe === 1 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                }`}
              >
                {r.mahnstufe === 0 ? "nicht gemahnt" : MAHNSTUFEN[r.mahnstufe]}
              </span>
              {r.mahnstufe > 0 && (
                <a href={`/api/mahnungen/${r.id}`} target="_blank" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2">
                  PDF
                </a>
              )}
              {r.mahnstufe < 3 && (
                <form action={mahneRechnung}>
                  <input type="hidden" name="rechnungId" value={r.id} />
                  <button className="rounded border border-forest px-2 py-1 text-xs font-medium text-forest hover:bg-surface2">
                    {stufe ? `${MAHNSTUFEN[stufe]} senden` : `Jetzt ${MAHNSTUFEN[r.mahnstufe + 1]}`}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
