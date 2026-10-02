export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { verkaufsPreis } from "@/lib/preise";
import { chf, offerteNummer, runde5Rappen } from "@/lib/format";
import { fuelle, ladeVorlagen } from "@/lib/mailvorlagen";
import EmailForm, { EmailStatusBanner } from "@/components/EmailForm";
import {
  addOfferteGruppe,
  addOffertePosition,
  deleteOfferteGruppe,
  deleteOffertePosition,
  konvertiereOfferte,
  sendeOfferteEmail,
  setOfferteStatus,
} from "@/lib/actions";

export default async function OfferteDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id } = await params;
  const { email } = await searchParams;
  const { betrieb } = await sitzungErforderlich();
  const offerte = await db.offerte.findFirst({
    where: { id, betriebId: betrieb.id },
    include: {
      kunde: true,
      objekt: true,
      gruppen: {
        orderBy: { reihenfolge: "asc" },
        include: { positionen: { orderBy: { reihenfolge: "asc" } } },
      },
    },
  });
  if (!offerte) notFound();

  const [artikel, konditionen] = await Promise.all([
    db.artikel.findMany({ where: { betriebId: betrieb.id }, orderBy: { bezeichnung: "asc" } }),
    db.kondition.findMany({ where: { betriebId: betrieb.id } }),
  ]);

  const vorlagen = await ladeVorlagen(betrieb.id);
  const offerteWerte = {
    KUNDE: offerte.kunde.name,
    NUMMER: offerteNummer(offerte),
    TITEL: offerte.titel,
    FIRMA: betrieb.name,
  };
  const totalNetto = offerte.gruppen
    .flatMap((g) => g.positionen)
    .reduce((s, p) => s + p.menge * p.ansatz, 0);
  const mwst = totalNetto * 0.081;
  const brutto = runde5Rappen(totalNetto * 1.081);
  const bearbeitbar = offerte.status === "ENTWURF" || offerte.status === "GESENDET";

  return (
    <div>
      <EmailStatusBanner status={email} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {offerteNummer(offerte)} — {offerte.titel}
          </h1>
          <p className="text-sm text-muted">
            <Link href={`/kunden/${offerte.kundeId}`} className="underline">
              {offerte.kunde.name}
            </Link>
            {offerte.objekt && ` · ${offerte.objekt.bezeichnung}`} · Status: {offerte.status} ·
            gültig bis {offerte.gueltigBis.toLocaleDateString("de-CH")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/offerten/${offerte.id}/pdf`}
            className="rounded bg-forest px-3 py-2 text-sm font-medium text-white hover:bg-forest-lift"
          >
            📄 PDF
          </a>
          {offerte.status === "ENTWURF" && (
            <form action={setOfferteStatus}>
              <input type="hidden" name="offerteId" value={offerte.id} />
              <input type="hidden" name="status" value="GESENDET" />
              <button className="rounded border border-line px-3 py-2 text-sm hover:bg-surface2">
                Als gesendet markieren
              </button>
            </form>
          )}
          {!offerte.auftragId && bearbeitbar && totalNetto > 0 && (
            <form action={konvertiereOfferte}>
              <input type="hidden" name="offerteId" value={offerte.id} />
              <button className="rounded bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-gold-soft">
                ✓ In Auftrag umwandeln
              </button>
            </form>
          )}
          {bearbeitbar && (
            <form action={setOfferteStatus}>
              <input type="hidden" name="offerteId" value={offerte.id} />
              <input type="hidden" name="status" value="ABGELEHNT" />
              <button className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                Abgelehnt
              </button>
            </form>
          )}
          {offerte.auftragId && (
            <Link
              href={`/auftraege/${offerte.auftragId}`}
              className="rounded bg-surface2 px-3 py-2 text-sm font-medium"
            >
              → Auftrag ansehen
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {offerte.gruppen.map((gruppe, gi) => {
          const gruppenTotal = gruppe.positionen.reduce((s, p) => s + p.menge * p.ansatz, 0);
          return (
            <div key={gruppe.id} className="rounded-tiff border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  {gi + 1}. {gruppe.titel}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">CHF {chf(gruppenTotal)}</span>
                  {bearbeitbar && gruppe.positionen.length === 0 && (
                    <form action={deleteOfferteGruppe}>
                      <input type="hidden" name="offerteId" value={offerte.id} />
                      <input type="hidden" name="gruppeId" value={gruppe.id} />
                      <button className="text-muted hover:text-red-600">✕</button>
                    </form>
                  )}
                </div>
              </div>

              <table className="mt-2 w-full text-sm">
                <tbody>
                  {gruppe.positionen.map((p, pi) => (
                    <tr key={p.id} className="border-t border-line align-top">
                      <td className="w-12 py-2 text-muted">
                        {gi + 1}.{pi + 1}
                      </td>
                      <td className="py-2 whitespace-pre-line">{p.bezeichnung}</td>
                      <td className="w-20 py-2 text-right">{p.menge}</td>
                      <td className="w-20 py-2 pl-2">{p.einheit}</td>
                      <td className="w-24 py-2 text-right">{chf(p.ansatz)}</td>
                      <td className="w-28 py-2 text-right font-medium">{chf(p.menge * p.ansatz)}</td>
                      <td className="w-8 py-2 text-right">
                        {bearbeitbar && (
                          <form action={deleteOffertePosition}>
                            <input type="hidden" name="offerteId" value={offerte.id} />
                            <input type="hidden" name="positionId" value={p.id} />
                            <button className="text-muted hover:text-red-600">✕</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {gruppe.positionen.length === 0 && (
                    <tr className="border-t border-line">
                      <td colSpan={7} className="py-2 text-muted">
                        Noch keine Positionen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {bearbeitbar && (
                <form action={addOffertePosition} className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 md:grid-cols-7">
                  <input type="hidden" name="gruppeId" value={gruppe.id} />
                  <select name="artikelId" className="rounded border border-line p-2 text-sm md:col-span-2">
                    <option value="">Aus Katalog…</option>
                    {artikel.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bezeichnung} ({chf(verkaufsPreis(a, konditionen))}/{a.einheit})
                      </option>
                    ))}
                  </select>
                  <textarea
                    name="bezeichnung"
                    rows={1}
                    placeholder="oder frei (mehrzeilig = Details/Bullets)"
                    className="rounded border border-line p-2 text-sm md:col-span-2"
                  />
                  <input name="menge" type="number" step="0.25" defaultValue={1} className="rounded border border-line p-2 text-sm" />
                  <select name="einheit" className="rounded border border-line p-2 text-sm">
                    <option>Stk.</option>
                    <option>h</option>
                    <option>Std.</option>
                    <option>m</option>
                    <option>pauschal</option>
                  </select>
                  <input name="ansatz" type="number" step="0.05" placeholder="CHF" className="rounded border border-line p-2 text-sm" />
                  <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift md:col-span-7">
                    Position hinzufügen
                  </button>
                </form>
              )}
            </div>
          );
        })}

        {bearbeitbar && (
          <form action={addOfferteGruppe} className="flex gap-2 rounded-tiff border border-dashed border-line bg-white p-4">
            <input type="hidden" name="offerteId" value={offerte.id} />
            <input
              name="titel"
              placeholder="Neue Gruppe (z.B. Demontage, Neuanschluss Pumpen…)"
              className="w-full rounded border border-line p-2 text-sm"
            />
            <button className="rounded bg-forest px-4 text-sm font-medium text-white hover:bg-forest-lift">
              + Gruppe
            </button>
          </form>
        )}

        <EmailForm
          action={sendeOfferteEmail}
          hiddenName="offerteId"
          hiddenValue={offerte.id}
          an={offerte.kunde.email}
          betreff={fuelle(vorlagen.OFFERTE.betreff, offerteWerte)}
          text={fuelle(vorlagen.OFFERTE.text, offerteWerte)}
        />

        <div className="ml-auto w-72 rounded-tiff border border-line bg-white p-4 text-sm">
          <div className="flex justify-between py-1">
            <span>Total netto</span>
            <span>CHF {chf(totalNetto)}</span>
          </div>
          <div className="flex justify-between py-1 text-muted">
            <span>MwSt. 8.1%</span>
            <span>{chf(mwst)}</span>
          </div>
          <div className="flex justify-between border-t border-line py-1 font-bold">
            <span>Betrag inkl. MwSt.</span>
            <span>CHF {chf(brutto)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
