export const dynamic = "force-dynamic";

import Link from "next/link";
import { SPEICHERLEISTE } from "@/components/Liste";
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

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  GESENDET: "bg-blue-100 text-blue-800",
  ANGENOMMEN: "bg-green-100 text-green-800",
  ABGELEHNT: "bg-red-100 text-red-700",
};
const statusText: Record<string, string> = {
  ENTWURF: "Entwurf",
  GESENDET: "Offen",
  ANGENOMMEN: "Bestätigt",
  ABGELEHNT: "Abgelehnt",
};
const knopf = "rounded-md px-4 py-2 text-sm font-semibold";
const feld = "w-full rounded border border-line bg-white p-2 text-sm";

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
  const totalNetto = offerte.gruppen.flatMap((g) => g.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0);
  const mwst = totalNetto * 0.081;
  const brutto = runde5Rappen(totalNetto * 1.081);
  const bearbeitbar = offerte.status === "ENTWURF" || offerte.status === "GESENDET";

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/offerten" className="text-sm text-forest underline">← Offerten</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Offerte {offerteNummer(offerte)}</h1>
          <p className="mt-1 text-sm text-muted">{offerte.titel}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusFarben[offerte.status] ?? ""}`}>
          {statusText[offerte.status] ?? offerte.status}
        </span>
      </div>

      <div className="mt-3">
        <EmailStatusBanner status={email} />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1.5 rounded-tiff border border-line bg-white p-4 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">Kontakt</dt>
          <dd><Link href={`/kunden/${offerte.kundeId}`} className="underline">{offerte.kunde.name}</Link></dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">Objekt</dt>
          <dd>{offerte.objekt?.bezeichnung ?? "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">Datum</dt>
          <dd>{offerte.datum.toLocaleDateString("de-CH")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">Gültig bis</dt>
          <dd>{offerte.gueltigBis.toLocaleDateString("de-CH")}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3">
        {offerte.gruppen.map((gruppe, gi) => {
          const gruppenTotal = gruppe.positionen.reduce((s, p) => s + p.menge * p.ansatz, 0);
          return (
            <section key={gruppe.id} className="overflow-hidden rounded-tiff border border-line bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-line bg-surface2 px-4 py-2.5">
                <h2 className="font-semibold">{gi + 1}. {gruppe.titel}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold tabular-nums">CHF {chf(gruppenTotal)}</span>
                  {bearbeitbar && gruppe.positionen.length === 0 && (
                    <form action={deleteOfferteGruppe}>
                      <input type="hidden" name="offerteId" value={offerte.id} />
                      <input type="hidden" name="gruppeId" value={gruppe.id} />
                      <button className="text-muted hover:text-red-600" aria-label="Gruppe löschen">✕</button>
                    </form>
                  )}
                </div>
              </div>

              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {gruppe.positionen.map((p, pi) => (
                    <tr key={p.id} className="align-top">
                      <td className="w-12 px-4 py-2 text-muted">{gi + 1}.{pi + 1}</td>
                      <td className="whitespace-pre-line py-2">{p.bezeichnung}</td>
                      <td className="w-16 py-2 text-right tabular-nums">{p.menge}</td>
                      <td className="hidden w-16 py-2 pl-2 text-muted sm:table-cell">{p.einheit}</td>
                      <td className="hidden w-24 py-2 text-right tabular-nums sm:table-cell">{chf(p.ansatz)}</td>
                      <td className="w-28 py-2 text-right font-medium tabular-nums">{chf(p.menge * p.ansatz)}</td>
                      <td className="w-10 py-2 pr-3 text-right">
                        {bearbeitbar && (
                          <form action={deleteOffertePosition}>
                            <input type="hidden" name="offerteId" value={offerte.id} />
                            <input type="hidden" name="positionId" value={p.id} />
                            <button className="text-muted hover:text-red-600" aria-label="Position löschen">✕</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {gruppe.positionen.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-muted">Noch keine Positionen.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {bearbeitbar && (
                <details className="border-t border-line">
                  <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-forest hover:bg-surface2">
                    ＋ Position hinzufügen
                  </summary>
                  <form action={addOffertePosition} className="grid grid-cols-2 gap-2 border-t border-line p-4 md:grid-cols-7">
                    <input type="hidden" name="gruppeId" value={gruppe.id} />
                    <select name="artikelId" className={`${feld} md:col-span-2`}>
                      <option value="">Aus Katalog …</option>
                      {artikel.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.bezeichnung} ({chf(verkaufsPreis(a, konditionen))}/{a.einheit})
                        </option>
                      ))}
                    </select>
                    <textarea name="bezeichnung" rows={1} placeholder="oder frei (mehrzeilig = Details)" className={`${feld} md:col-span-2`} />
                    <input name="menge" type="number" step="0.25" defaultValue={1} className={feld} aria-label="Menge" />
                    <select name="einheit" className={feld} aria-label="Einheit">
                      <option>Stk.</option>
                      <option>h</option>
                      <option>Std.</option>
                      <option>m</option>
                      <option>pauschal</option>
                    </select>
                    <input name="ansatz" type="number" step="0.05" placeholder="CHF" className={feld} aria-label="Ansatz CHF" />
                    <button className="rounded-md bg-forest p-2 text-sm font-semibold text-white hover:bg-forest-lift md:col-span-7">
                      Position hinzufügen
                    </button>
                  </form>
                </details>
              )}
            </section>
          );
        })}

        {bearbeitbar && (
          <details className="rounded-tiff border border-dashed border-line bg-white">
            <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-forest hover:bg-surface2">
              ＋ Gruppe hinzufügen
            </summary>
            <form action={addOfferteGruppe} className="flex gap-2 border-t border-line p-4">
              <input type="hidden" name="offerteId" value={offerte.id} />
              <input name="titel" placeholder="z.B. Demontage, Neuanschluss Pumpen …" className={feld} />
              <button className="rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-lift">Hinzufügen</button>
            </form>
          </details>
        )}

        <div className="ml-auto w-full max-w-xs rounded-tiff border border-line bg-white p-4 text-sm">
          <div className="flex justify-between py-1">
            <span>Total netto</span>
            <span className="tabular-nums">CHF {chf(totalNetto)}</span>
          </div>
          <div className="flex justify-between py-1 text-muted">
            <span>MwSt. 8.1%</span>
            <span className="tabular-nums">{chf(mwst)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 font-bold">
            <span>Total brutto</span>
            <span className="tabular-nums">CHF {chf(brutto)}</span>
          </div>
        </div>

        <EmailForm
          action={sendeOfferteEmail}
          hiddenName="offerteId"
          hiddenValue={offerte.id}
          an={offerte.kunde.email}
          betreff={fuelle(vorlagen.OFFERTE.betreff, offerteWerte)}
          text={fuelle(vorlagen.OFFERTE.text, offerteWerte)}
        />
      </div>

      <div className={SPEICHERLEISTE}>
              <a href={`/api/offerten/${offerte.id}/pdf`} target="_blank" className={`${knopf} bg-forest text-white hover:bg-forest-lift`}>
                📄 PDF
              </a>
              {offerte.status === "ENTWURF" && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="GESENDET" />
                  <button className={`${knopf} border border-forest text-forest hover:bg-surface2`}>Als gesendet markieren</button>
                </form>
              )}
              {offerte.status === "GESENDET" && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="ANGENOMMEN" />
                  <button className={`${knopf} border border-forest text-forest hover:bg-surface2`}>Als bestätigt markieren</button>
                </form>
              )}
              {!offerte.auftragId && bearbeitbar && totalNetto > 0 && (
                <form action={konvertiereOfferte}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <button className={`${knopf} bg-gold text-ink hover:bg-gold-soft`}>✓ In Auftrag umwandeln</button>
                </form>
              )}
              {bearbeitbar && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="ABGELEHNT" />
                  <button className={`${knopf} border border-red-300 text-red-700 hover:bg-red-50`}>Abgelehnt</button>
                </form>
              )}
              {offerte.status === "ABGELEHNT" && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="ENTWURF" />
                  <button className={`${knopf} border border-line bg-white hover:bg-surface2`}>Wieder als Entwurf öffnen</button>
                </form>
              )}
              {offerte.auftragId && (
                <Link href={`/auftraege/${offerte.auftragId}`} className={`${knopf} border border-line bg-white hover:bg-surface2`}>
                  → Auftrag ansehen
                </Link>
              )}
            </div>
    </div>
  );
}
