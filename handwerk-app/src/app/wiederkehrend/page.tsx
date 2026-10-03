export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { rechnungslauf, speichereAbo } from "@/lib/actions-wiederkehrend";

const iso = (d: Date | null) => (d ? lokalIso(d) : "");

export default async function WiederkehrendPage({
  searchParams,
}: {
  searchParams: Promise<{ lauf?: string; gespeichert?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
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
  const dran = vertraege.filter((v) => v.pauschalAbrechnung && v.preis > 0 && stichtag(v) <= grenze);
  const feld = "rounded border border-line p-1.5 text-sm";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Wiederkehrende Rechnungen</h1>
        <form action={rechnungslauf}>
          <button
            disabled={dran.length === 0}
            className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift disabled:opacity-40"
          >
            Rechnungslauf starten ({dran.length})
          </button>
        </form>
      </div>
      <p className="mt-1 text-sm text-muted">
        Wartungsverträge mit Pauschalpreis werden im gewählten Intervall automatisch verrechnet: Der Lauf erstellt je fälliger
        Vertrag einen Auftrag und eine Rechnung als <strong>Entwurf</strong> — prüfen und versenden Sie sie unter «Rechnungen».
        Die Wartungs-Einsätze selbst planen Sie weiterhin unter «Wartung».
      </p>
      {sp.lauf && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Rechnungslauf: {sp.lauf} Rechnung(en) erstellt.{" "}
          <Link href="/rechnungen" className="underline">Zu den Rechnungen</Link>
        </p>
      )}
      {sp.gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {vertraege.length === 0 && (
          <li className="p-4 text-sm text-muted">Keine aktiven Wartungsverträge — unter «Wartung» anlegen.</li>
        )}
        {vertraege.map((v) => {
          const faellig = v.pauschalAbrechnung && v.preis > 0 && stichtag(v) <= grenze;
          return (
            <li key={v.id} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    WV-{v.nummer} — {v.titel}
                    {faellig && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">fällig</span>
                    )}
                  </div>
                  <div className="text-sm text-muted">
                    {v.kunde.name} · {v.objekt.bezeichnung} · alle {v.intervallMonate} Monate ·{" "}
                    {v.preis > 0 ? `CHF ${chf(v.preis)} netto` : "kein Preis hinterlegt"}
                  </div>
                </div>
                <form action={speichereAbo} className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="hidden" name="vertragId" value={v.id} />
                  <label className="flex items-center gap-1">
                    <input type="checkbox" name="pauschal" value="1" defaultChecked={v.pauschalAbrechnung} disabled={v.preis <= 0} />
                    Pauschale automatisch verrechnen
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    nächste Rechnung
                    <input type="date" name="naechsteRechnung" defaultValue={iso(stichtag(v))} className={feld} />
                  </label>
                  <button className="rounded border border-forest px-3 py-1.5 text-xs font-medium text-forest hover:bg-surface2">
                    Speichern
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-6 font-semibold">Journal der Läufe</h2>
      <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
        {laeufe.length === 0 && <li className="p-3 text-sm text-muted">Noch kein Lauf.</li>}
        {laeufe.map((l) => (
          <li key={l.id} className="p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{l.datum.toLocaleDateString("de-CH")} · {l.anzahl} Rechnung(en)</span>
              <span>CHF {chf(l.summeBrutto)}</span>
            </div>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-muted">{l.details}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
