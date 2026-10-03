export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import Icon, { Ik } from "@/components/Icons";
import { Hinweis, Pille } from "@/components/Liste";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { verkaufsPreis } from "@/lib/preise";
import { chf, offerteNummer, runde5Rappen } from "@/lib/format";
import { lokalIso } from "@/lib/datum";
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
  updateOfferte,
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
const feld = "w-full rounded border border-line bg-white p-2 text-sm";
// Einträge der Seitenleiste (Aktionen): Link oder Knopf, gleiches Aussehen
const aktion = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-forest hover:bg-surface2";
const abschnitt = "text-[11px] font-semibold uppercase tracking-wider text-muted";

export default async function OfferteDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string; gespeichert?: string; fehler?: string; bearbeiten?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { betrieb } = await sitzungErforderlich();
  const offerte = await db.offerte.findFirst({
    where: { id, betriebId: betrieb.id },
    include: {
      kunde: { include: { objekte: { select: { id: true, bezeichnung: true } } } },
      objekt: true,
      gruppen: {
        orderBy: { reihenfolge: "asc" },
        include: { positionen: { orderBy: { reihenfolge: "asc" } } },
      },
    },
  });
  if (!offerte) notFound();

  const [artikel, konditionen, betreuer, vorlagen] = await Promise.all([
    db.artikel.findMany({ where: { betriebId: betrieb.id }, orderBy: { bezeichnung: "asc" } }),
    db.kondition.findMany({ where: { betriebId: betrieb.id } }),
    offerte.kunde.ansprechpartnerId ? db.mitarbeiter.findUnique({ where: { id: offerte.kunde.ansprechpartnerId }, select: { name: true } }) : null,
    ladeVorlagen(betrieb.id),
  ]);

  const offerteWerte = { KUNDE: offerte.kunde.name, NUMMER: offerteNummer(offerte), TITEL: offerte.titel, FIRMA: betrieb.name };
  const alle = offerte.gruppen.flatMap((g) => g.positionen);
  const totalNetto = alle.reduce((s, p) => s + p.menge * p.ansatz, 0);
  const mwst = totalNetto * 0.081;
  const brutto = runde5Rappen(totalNetto * 1.081);
  const bearbeitbar = offerte.status === "ENTWURF" || offerte.status === "GESENDET";
  const bearbeiten = sp.bearbeiten === "1" && bearbeitbar;

  return (
    <div>
      {/* Kopf: Nummer, Kontakt, Titel; rechts «Neue Offerte» */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/offerten" className="text-sm text-forest underline">← Offerten</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-x-2 text-xl font-bold">
            <span>Offerte {offerteNummer(offerte)}</span>
            <span className="font-normal text-muted">–</span>
            <Link href={`/kunden/${offerte.kundeId}`} className="text-forest hover:underline">{offerte.kunde.name}</Link>
            {bearbeitbar && !bearbeiten && (
              <Link href={`/offerten/${offerte.id}?bearbeiten=1`} className="text-muted hover:text-forest" title="Titel, Gültigkeit und Objekt bearbeiten" aria-label="Bearbeiten">
                <Icon name="stift" className="h-4 w-4" />
              </Link>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            <span className="font-medium text-ink">Titel:</span> {offerte.titel}
          </p>
        </div>
        <Link href="/offerten/neu" className="inline-flex h-10 items-center rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-lift">
          ＋ Neue Offerte
        </Link>
      </div>

      {sp.gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}
      {sp.fehler === "gesperrt" && <Hinweis art="fehler">Bestätigte oder abgelehnte Offerten lassen sich nicht mehr ändern.</Hinweis>}
      <div className="mt-2"><EmailStatusBanner status={sp.email} /></div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_18rem]">
        {/* Hauptspalte */}
        <div className="grid gap-4">
          {bearbeiten && (
            <form action={updateOfferte} className="grid gap-3 rounded-tiff border border-forest bg-white p-4 shadow-sm sm:grid-cols-3">
              <input type="hidden" name="offerteId" value={offerte.id} />
              <label className="grid gap-0.5 text-xs text-muted sm:col-span-3">
                <span>Titel <span className="text-red-600">*</span></span>
                <input name="titel" required defaultValue={offerte.titel} className={feld} />
              </label>
              <label className="grid gap-0.5 text-xs text-muted">
                Gültig bis
                <input name="gueltigBis" type="date" defaultValue={lokalIso(offerte.gueltigBis)} className={feld} />
              </label>
              <label className="grid gap-0.5 text-xs text-muted sm:col-span-2">
                Objekt / Anlage
                <select name="objektId" defaultValue={offerte.objektId ?? ""} className={feld}>
                  <option value="">— kein Objekt —</option>
                  {offerte.kunde.objekte.map((o) => (
                    <option key={o.id} value={o.id}>{o.bezeichnung}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-3">
                <button className="inline-flex h-10 items-center rounded-md bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
                <Link href={`/offerten/${offerte.id}`} className="inline-flex h-10 items-center rounded-md border border-line bg-white px-5 text-sm hover:bg-surface2">Abbrechen</Link>
              </div>
            </form>
          )}

          <section className="rounded-tiff border border-line bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="font-semibold">Positionen</h2>
              <span className="text-sm text-muted">{alle.length} Position(en) in {offerte.gruppen.length} Gruppe(n)</span>
            </div>

            {offerte.gruppen.map((gruppe, gi) => {
              const gruppenTotal = gruppe.positionen.reduce((s, p) => s + p.menge * p.ansatz, 0);
              return (
                <div key={gruppe.id} className="border-b border-line last:border-b-0">
                  <div className="flex items-center justify-between gap-2 bg-surface2 px-4 py-2">
                    <h3 className="text-sm font-semibold">{gi + 1}. {gruppe.titel}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold tabular-nums">CHF {chf(gruppenTotal)}</span>
                      {bearbeitbar && gruppe.positionen.length === 0 && offerte.gruppen.length > 1 && (
                        <form action={deleteOfferteGruppe}>
                          <input type="hidden" name="offerteId" value={offerte.id} />
                          <input type="hidden" name="gruppeId" value={gruppe.id} />
                          <button className="text-muted hover:text-red-600" aria-label="Gruppe löschen" title="Gruppe löschen"><Ik name="x" className="mr-0" /></button>
                        </form>
                      )}
                    </div>
                  </div>

                  {gruppe.positionen.length > 0 && (
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted">
                        <tr>
                          <th className="w-14 px-4 py-1.5 font-medium">Pos</th>
                          <th className="py-1.5 font-medium">Beschreibung</th>
                          <th className="w-20 py-1.5 text-right font-medium">Menge</th>
                          <th className="hidden w-20 py-1.5 pl-2 font-medium sm:table-cell">Einheit</th>
                          <th className="hidden w-28 py-1.5 text-right font-medium sm:table-cell">Einzelpreis</th>
                          <th className="w-28 py-1.5 pr-2 text-right font-medium">Preis CHF</th>
                          <th className="w-10 py-1.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line border-t border-line">
                        {gruppe.positionen.map((p, pi) => (
                          <tr key={p.id} className="align-top">
                            <td className="px-4 py-2 text-muted">{gi + 1}.{pi + 1}</td>
                            <td className="whitespace-pre-line py-2">{p.bezeichnung}</td>
                            <td className="py-2 text-right tabular-nums">{p.menge}</td>
                            <td className="hidden py-2 pl-2 text-muted sm:table-cell">{p.einheit}</td>
                            <td className="hidden py-2 text-right tabular-nums sm:table-cell">{chf(p.ansatz)}</td>
                            <td className="py-2 pr-2 text-right font-medium tabular-nums">{chf(p.menge * p.ansatz)}</td>
                            <td className="py-2 pr-3 text-right">
                              {bearbeitbar && (
                                <form action={deleteOffertePosition}>
                                  <input type="hidden" name="offerteId" value={offerte.id} />
                                  <input type="hidden" name="positionId" value={p.id} />
                                  <button className="text-muted hover:text-red-600" aria-label="Position löschen" title="Position löschen"><Ik name="x" className="mr-0" /></button>
                                </form>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {bearbeitbar && (
                    // Ohne Positionen ist das Erfassungsformular offen (wie bei bexio), sonst eingeklappt
                    <details open={gruppe.positionen.length === 0} className="group">
                      <summary className="flex cursor-pointer select-none items-center gap-1 px-4 py-2.5 text-sm font-medium text-forest hover:bg-surface2">
                        <Ik name="plus" />Position hinzufügen
                      </summary>
                      <form action={addOffertePosition} className="grid gap-3 border-t border-line p-4 lg:grid-cols-[1fr_20rem]">
                        <input type="hidden" name="gruppeId" value={gruppe.id} />
                        <label className="grid gap-0.5 text-xs text-muted">
                          <span>Beschreibung <span className="text-red-600">*</span></span>
                          <textarea name="bezeichnung" rows={5} required={false} placeholder="Leistung oder Material — weitere Zeilen erscheinen als Aufzählung" className={feld} />
                          <span className="text-[11px]">Oder rechts ein Produkt aus dem Katalog wählen, dann werden Text, Einheit und Preis übernommen.</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-0.5 text-xs text-muted col-span-2">
                            Produkt aus Katalog
                            <select name="artikelId" className={feld}>
                              <option value="">— frei erfassen —</option>
                              {artikel.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.bezeichnung} ({chf(verkaufsPreis(a, konditionen))}/{a.einheit})
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-0.5 text-xs text-muted">
                            <span>Anzahl <span className="text-red-600">*</span></span>
                            <input name="menge" type="number" step="0.25" min="0.25" defaultValue={1} required className={feld} />
                          </label>
                          <label className="grid gap-0.5 text-xs text-muted">
                            Einheit
                            <select name="einheit" className={feld}>
                              <option>Stk.</option>
                              <option>Std.</option>
                              <option>h</option>
                              <option>m</option>
                              <option>m²</option>
                              <option>pauschal</option>
                            </select>
                          </label>
                          <label className="grid gap-0.5 text-xs text-muted col-span-2">
                            Einzelpreis CHF
                            <input name="ansatz" type="number" step="0.05" min="0" placeholder="0.00 (leer = Katalogpreis)" className={feld} />
                          </label>
                          <div className="col-span-2 flex gap-2">
                            <button className="inline-flex h-10 items-center rounded-md bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
                          </div>
                        </div>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}

            {bearbeitbar && (
              <details className="border-t border-line">
                <summary className="flex cursor-pointer select-none items-center gap-1 px-4 py-2.5 text-sm font-medium text-forest hover:bg-surface2">
                  <Ik name="plus" />Gruppe hinzufügen
                </summary>
                <form action={addOfferteGruppe} className="flex gap-2 border-t border-line p-4">
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input name="titel" placeholder="z.B. Demontage, Neuanschluss Pumpen …" className={feld} />
                  <button className="inline-flex h-10 shrink-0 items-center rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-lift">Hinzufügen</button>
                </form>
              </details>
            )}

            <div className="flex justify-end border-t border-line p-4">
              <div className="w-full max-w-xs text-sm">
                <div className="flex justify-between py-1">
                  <span>Total netto</span>
                  <span className="tabular-nums">CHF {chf(totalNetto)}</span>
                </div>
                <div className="flex justify-between py-1 text-muted">
                  <span>MwSt. 8.1%</span>
                  <span className="tabular-nums">{chf(mwst)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2 font-bold">
                  <span>Betrag inkl. MwSt.</span>
                  <span className="tabular-nums">CHF {chf(brutto)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Seitenleiste: Status, Senden, Aktionen, Dokumentinformationen */}
        <aside className="grid gap-5 rounded-tiff border border-line bg-white p-4 text-sm shadow-sm xl:sticky xl:top-20">
          <div>
            <div className={abschnitt}>Status</div>
            <div className="mt-1.5">
              <Pille farbe={statusFarben[offerte.status]}>{statusText[offerte.status] ?? offerte.status}</Pille>
              {offerte.auftragId && <span className="ml-2 text-xs text-muted">in Auftrag umgewandelt</span>}
            </div>
          </div>

          {bearbeitbar && (
            <div>
              <div className={abschnitt}>Senden</div>
              <div className="mt-1.5">
                <EmailForm
                  action={sendeOfferteEmail}
                  hiddenName="offerteId"
                  hiddenValue={offerte.id}
                  an={offerte.kunde.email}
                  betreff={fuelle(vorlagen.OFFERTE.betreff, offerteWerte)}
                  text={fuelle(vorlagen.OFFERTE.text, offerteWerte)}
                />
              </div>
            </div>
          )}

          <div>
            <div className={abschnitt}>Aktionen</div>
            <div className="mt-1 grid">
              <a href={`/api/offerten/${offerte.id}/pdf`} target="_blank" className={aktion}>
                <Icon name="pdf" className="h-4 w-4" /> Offerte drucken (PDF)
              </a>
              {offerte.status === "ENTWURF" && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="GESENDET" />
                  <button className={aktion}><Icon name="mail" className="h-4 w-4" /> Als gesendet markieren</button>
                </form>
              )}
              {offerte.status === "GESENDET" && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="ANGENOMMEN" />
                  <button className={aktion}><Icon name="check" className="h-4 w-4" /> Als bestätigt markieren</button>
                </form>
              )}
              {!offerte.auftragId && bearbeitbar && totalNetto > 0 && (
                <form action={konvertiereOfferte}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <button className={aktion}><Icon name="blitz" className="h-4 w-4" /> In Auftrag umwandeln</button>
                </form>
              )}
              {offerte.auftragId && (
                <Link href={`/auftraege/${offerte.auftragId}`} className={aktion}>
                  <Icon name="projekte" className="h-4 w-4" /> Auftrag ansehen
                </Link>
              )}
              {bearbeitbar && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="ABGELEHNT" />
                  <button className={`${aktion} text-red-700`}><Icon name="x" className="h-4 w-4" /> Als abgelehnt markieren</button>
                </form>
              )}
              {offerte.status === "ABGELEHNT" && (
                <form action={setOfferteStatus}>
                  <input type="hidden" name="offerteId" value={offerte.id} />
                  <input type="hidden" name="status" value="ENTWURF" />
                  <button className={aktion}><Icon name="rueck" className="h-4 w-4" /> Wieder als Entwurf öffnen</button>
                </form>
              )}
            </div>
          </div>

          <div>
            <div className={abschnitt}>Dokumentinformationen</div>
            <dl className="mt-1.5 grid gap-1.5">
              <div>
                <dt className="text-xs text-muted">Kontakt</dt>
                <dd><Link href={`/kunden/${offerte.kundeId}`} className="text-forest hover:underline">{offerte.kunde.name}</Link></dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Objekt / Anlage</dt>
                <dd>{offerte.objekt?.bezeichnung ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Datum</dt>
                <dd>{offerte.datum.toLocaleDateString("de-CH")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Gültig bis</dt>
                <dd>{offerte.gueltigBis.toLocaleDateString("de-CH")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Betreut von</dt>
                <dd>{betreuer?.name ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
