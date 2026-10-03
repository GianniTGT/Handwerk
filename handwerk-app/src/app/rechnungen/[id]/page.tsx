export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { faelligDatum, istUeberfaellig, tageUeberfaellig } from "@/lib/faellig";
import { MAHNSTUFEN, offenerBetrag } from "@/lib/mahnwesen";
import { gutschriftNr, rechnungNr } from "@/lib/nrtext";
import { fuelle, ladeVorlagen } from "@/lib/mailvorlagen";
import { sendeRechnungEmail, setRechnungStatus } from "@/lib/actions";
import { createGutschrift, mahneRechnung } from "@/lib/actions-verkauf";
import EmailForm, { EmailStatusBanner } from "@/components/EmailForm";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  VERSENDET: "bg-blue-100 text-blue-800",
  BEZAHLT: "bg-green-100 text-green-800",
};
const statusText: Record<string, string> = { ENTWURF: "Entwurf", VERSENDET: "Offen", BEZAHLT: "Bezahlt" };

export default async function RechnungDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { id } = await params;
  const { email } = await searchParams;
  const r = await db.rechnung.findFirst({
    where: { id, betriebId: betrieb.id },
    include: {
      gutschriften: { orderBy: { nummer: "asc" } },
      auftrag: { include: { kunde: true, objekt: true, rapporte: { include: { positionen: true } } } },
    },
  });
  if (!r) notFound();

  const vorlagen = await ladeVorlagen(betrieb.id);
  const kunde = r.auftrag.kunde;
  const faellig = faelligDatum(r, betrieb.zahlungsfristTage);
  const ueberfaellig = istUeberfaellig(faellig, r.status);
  const offen = r.status === "BEZAHLT" ? 0 : offenerBetrag(r);
  const nr = rechnungNr(r);
  const positionen =
    r.art === "TEIL"
      ? [{ id: "teil", bezeichnung: r.bezeichnung || "Akonto", menge: 1, einheit: "pauschal", ansatz: r.totalNetto }]
      : r.auftrag.rapporte.flatMap((rp) => rp.positionen);
  const werte = {
    KUNDE: kunde.name,
    NUMMER: nr,
    TITEL: r.auftrag.titel,
    BETRAG: chf(offen),
    FAELLIG: faellig.toLocaleDateString("de-CH"),
    FIRMA: betrieb.name,
  };
  const mwst = r.totalBrutto - r.totalNetto;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/rechnungen" className="text-sm text-forest underline">← Rechnungen</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {r.art === "TEIL" ? "Teilrechnung" : "Rechnung"} {nr}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link href={`/kunden/${r.auftrag.kundeId}`} className="underline">{kunde.name}</Link>
            <span>· Auftrag <Link href={`/auftraege/${r.auftragId}`} className="underline">#{r.auftrag.nummer}</Link> {r.auftrag.titel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ueberfaellig ? "bg-red-100 text-red-800" : (statusFarben[r.status] ?? "")}`}>
            {ueberfaellig ? `Überfällig (${tageUeberfaellig(faellig)} Tage)` : (statusText[r.status] ?? r.status)}
          </span>
          {r.mahnstufe > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">{MAHNSTUFEN[r.mahnstufe]}</span>
          )}
        </div>
      </div>

      <div className="mt-3"><EmailStatusBanner status={email} /></div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`/api/rechnungen/${r.id}/pdf`} target="_blank" className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">
          📄 PDF mit QR-Rechnung
        </a>
        {r.status !== "BEZAHLT" && (
          <form action={setRechnungStatus}>
            <input type="hidden" name="rechnungId" value={r.id} />
            <input type="hidden" name="status" value={r.status === "ENTWURF" ? "VERSENDET" : "BEZAHLT"} />
            <button className="rounded border border-forest px-4 py-2 text-sm font-semibold text-forest hover:bg-surface2">
              {r.status === "ENTWURF" ? "Als versendet markieren" : "Als bezahlt markieren"}
            </button>
          </form>
        )}
        {r.status === "BEZAHLT" && (
          <form action={setRechnungStatus}>
            <input type="hidden" name="rechnungId" value={r.id} />
            <input type="hidden" name="status" value="VERSENDET" />
            <button className="rounded border border-line bg-white px-4 py-2 text-sm hover:bg-surface2">Wieder öffnen</button>
          </form>
        )}
        {r.status === "VERSENDET" && r.mahnstufe < 3 && (
          <form action={mahneRechnung}>
            <input type="hidden" name="rechnungId" value={r.id} />
            <button className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
              🔔 {MAHNSTUFEN[r.mahnstufe + 1]} senden
            </button>
          </form>
        )}
        {r.mahnstufe > 0 && (
          <a href={`/api/mahnungen/${r.id}`} target="_blank" className="rounded border border-line bg-white px-4 py-2 text-sm hover:bg-surface2">
            Mahnung (PDF)
          </a>
        )}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1.5 rounded-tiff border border-line bg-white p-4 text-sm sm:grid-cols-2">
        {([
          ["Rechnungsdatum", r.datum.toLocaleDateString("de-CH")],
          ["Fällig am", r.status === "ENTWURF" ? "—" : faellig.toLocaleDateString("de-CH")],
          ["Objekt", r.auftrag.objekt?.bezeichnung ?? "—"],
          ["Mahnstufe", r.mahnstufe ? MAHNSTUFEN[r.mahnstufe] : "keine"],
        ] as [string, string][]).map(([l, w]) => (
          <div key={l} className="flex gap-2">
            <dt className="w-36 shrink-0 text-muted">{l}</dt>
            <dd>{w}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 overflow-hidden rounded-tiff border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-2">Pos.</th>
              <th className="p-2">Beschreibung</th>
              <th className="p-2 text-right">Menge</th>
              <th className="hidden p-2 sm:table-cell">Einheit</th>
              <th className="hidden p-2 text-right sm:table-cell">Ansatz</th>
              <th className="p-2 text-right">Total CHF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {positionen.map((p, i) => (
              <tr key={p.id}>
                <td className="p-2 text-muted">{i + 1}</td>
                <td className="p-2">{p.bezeichnung}</td>
                <td className="p-2 text-right tabular-nums">{p.menge}</td>
                <td className="hidden p-2 text-muted sm:table-cell">{p.einheit}</td>
                <td className="hidden p-2 text-right tabular-nums sm:table-cell">{chf(p.ansatz)}</td>
                <td className="p-2 text-right tabular-nums">{chf(p.menge * p.ansatz)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            {r.abzugNetto > 0 && (
              <>
                <tr><td colSpan={5} className="p-2 text-right text-muted">Total Leistungen</td><td className="p-2 text-right tabular-nums">{chf(r.totalNetto + r.abzugNetto)}</td></tr>
                <tr><td colSpan={5} className="p-2 text-right text-muted">Abzgl. Akonto-Rechnungen</td><td className="p-2 text-right tabular-nums">−{chf(r.abzugNetto)}</td></tr>
              </>
            )}
            <tr><td colSpan={5} className="p-2 text-right text-muted">Total netto</td><td className="p-2 text-right tabular-nums">{chf(r.totalNetto)}</td></tr>
            <tr><td colSpan={5} className="p-2 text-right text-muted">MwSt {r.mwstSatz}%</td><td className="p-2 text-right tabular-nums">{chf(mwst)}</td></tr>
            <tr className="bg-surface2 font-semibold"><td colSpan={5} className="p-2 text-right">Total brutto</td><td className="p-2 text-right tabular-nums">{chf(r.totalBrutto)}</td></tr>
            {r.gutschriften.length > 0 && (
              <tr><td colSpan={5} className="p-2 text-right text-muted">Gutschriften</td><td className="p-2 text-right tabular-nums">−{chf(r.gutschriften.reduce((s, g) => s + g.totalBrutto, 0))}</td></tr>
            )}
            <tr className="font-semibold"><td colSpan={5} className="p-2 text-right">Offen</td><td className="p-2 text-right tabular-nums">{chf(offen)}</td></tr>
          </tfoot>
        </table>
      </div>

      {r.gutschriften.length > 0 && (
        <div className="mt-4 rounded-tiff border border-line bg-white p-3 text-sm">
          <h2 className="font-semibold">Gutschriften</h2>
          <ul className="mt-1 divide-y divide-line">
            {r.gutschriften.map((g) => (
              <li key={g.id} className="flex justify-between gap-2 py-1.5">
                <span>{gutschriftNr(g)} · {g.datum.toLocaleDateString("de-CH")}{g.grund && ` · ${g.grund}`}</span>
                <a href={`/api/gutschriften/${g.id}`} target="_blank" className="text-forest underline">CHF {chf(g.totalBrutto)} · PDF</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <EmailForm
          action={sendeRechnungEmail}
          hiddenName="rechnungId"
          hiddenValue={r.id}
          extra={{ rueck: `/rechnungen/${r.id}` }}
          an={kunde.email}
          betreff={fuelle(vorlagen.RECHNUNG.betreff, werte)}
          text={fuelle(vorlagen.RECHNUNG.text, werte)}
        />
        {r.status !== "ENTWURF" && (
          <details className="rounded-tiff border border-line bg-white">
            <summary className="cursor-pointer select-none p-3 text-sm font-semibold hover:bg-surface2">↩️ Gutschrift erstellen</summary>
            <form action={createGutschrift} className="grid gap-2 border-t border-line p-3 md:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="rechnungId" value={r.id} />
              <input name="grund" placeholder="Grund (z.B. Preisnachlass)" className="rounded border border-line p-2 text-sm" />
              <input name="betragBrutto" inputMode="decimal" placeholder={`Betrag brutto (leer = offen CHF ${chf(offenerBetrag(r))})`} className="rounded border border-line p-2 text-sm" />
              <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Erstellen</button>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}
