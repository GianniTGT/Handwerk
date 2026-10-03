import { verkaufsPreis } from "@/lib/preise";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import {
  addRapportPosition,
  createRechnung,
  createTeilrechnung,
  deleteRapportFoto,
  deleteRapportPosition,
  saveRapportFoto,
  saveUnterschrift,
} from "@/lib/actions";
import { rechnungNr, lieferscheinNr } from "@/lib/nrtext";
import { createLieferschein } from "@/lib/actions-lieferscheine";
import { zeitenInRapport } from "@/lib/actions-projekte";
import { stunden } from "@/lib/projekte";
import SignaturePad from "@/components/SignaturePad";
import FotoUpload from "@/components/FotoUpload";

const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function AuftragDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ zeiten?: string; fehler?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { betrieb } = await sitzungErforderlich();
  const auftrag = await db.auftrag.findFirst({
    where: { id, betriebId: betrieb.id },
    include: {
      kunde: true,
      objekt: true,
      rechnungen: { orderBy: { nummer: "asc" } },
      lieferscheine: { orderBy: { nummer: "asc" } },
      offerte: { include: { gruppen: { include: { positionen: true } } } },
      rapporte: { include: { positionen: true, fotos: { orderBy: { erstellt: "asc" } } } },
    },
  });
  if (!auftrag) notFound();

  const [artikel, konditionen] = await Promise.all([
    db.artikel.findMany({
      where: { betriebId: betrieb.id },
      orderBy: { bezeichnung: "asc" },
    }),
    db.kondition.findMany({ where: { betriebId: betrieb.id } }),
  ]);

  const offeneZeiten = await db.zeiteintrag.findMany({
    where: { auftragId: auftrag.id, betriebId: betrieb.id, abrechenbar: true, status: { not: "FAKTURIERT" } },
    select: { minuten: true, stundensatz: true },
  });
  const zeitMinuten = offeneZeiten.reduce((s, z) => s + z.minuten, 0);
  const zeitWert = offeneZeiten.reduce((s, z) => s + (z.minuten / 60) * z.stundensatz, 0);

  const schluss = auftrag.rechnungen.find((r) => r.art === "SCHLUSS");
  const teile = auftrag.rechnungen.filter((r) => r.art === "TEIL");
  const akontoNetto = teile.reduce((s, r) => s + r.totalNetto, 0);

  const positionen = auftrag.rapporte.flatMap((r) => r.positionen);
  const fotos = auftrag.rapporte.flatMap((r) => r.fotos);
  const unterschrift = auftrag.rapporte.find((r) => r.unterschrift)?.unterschrift ?? "";
  const totalNetto = positionen.reduce((s, p) => s + p.menge * p.ansatz, 0);
  const offertenWert =
    auftrag.offerte?.gruppen.flatMap((g) => g.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0) ?? 0;
  const auftragswert = offertenWert > 0 ? offertenWert : totalNetto;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Auftrag #{auftrag.nummer} — {auftrag.titel}
          </h1>
          <p className="text-sm text-muted">
            <Link href={`/kunden/${auftrag.kundeId}`} className="underline">
              {auftrag.kunde.name}
            </Link>
            {auftrag.objekt && ` · ${auftrag.objekt.bezeichnung}`} · Status: {auftrag.status}
          </p>
          {auftrag.beschreibung && <p className="mt-2 text-sm">{auftrag.beschreibung}</p>}
        </div>
        {!schluss && positionen.length > 0 && (
          <form action={createRechnung}>
            <input type="hidden" name="auftragId" value={auftrag.id} />
            <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-soft">
              ⚡ {teile.length > 0 ? "Schlussrechnung erstellen" : "Rechnung erstellen"}
            </button>
          </form>
        )}
        {schluss && (
          <Link
            href="/rechnungen"
            className="rounded bg-surface2 px-4 py-2 text-sm font-medium text-ink"
          >
            Rechnung {rechnungNr(schluss)} ansehen
          </Link>
        )}
      </div>

      {sp.zeiten && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">{sp.zeiten} Zeiteintrag/-einträge als Rapport-Positionen übernommen ✓</p>
      )}
      {sp.fehler === "akonto-zu-hoch" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Die Akonto-Rechnungen würden den Auftragswert übersteigen.</p>
      )}
      {sp.fehler === "akonto-betrag" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte einen Betrag oder Prozentsatz angeben.</p>
      )}
      {sp.fehler === "lieferschein-leer" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte mindestens eine Position für den Lieferschein auswählen.</p>
      )}
      {sp.fehler === "verrechnet" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Auftrag ist bereits verrechnet.</p>
      )}
      {offeneZeiten.length > 0 && auftrag.status !== "VERRECHNET" && (
        <form action={zeitenInRapport} className="mt-3 flex flex-wrap items-center gap-3 rounded-tiff border border-line bg-white p-3 text-sm">
          <input type="hidden" name="auftragId" value={auftrag.id} />
          <span>
            ⏱ {offeneZeiten.length} offene abrechenbare Zeit(en): <strong>{stunden(zeitMinuten)} h</strong> · CHF {chf(zeitWert)}
          </span>
          <button className="rounded border border-forest px-3 py-1.5 text-xs font-semibold text-forest hover:bg-surface2">
            In Rapport übernehmen
          </button>
        </form>
      )}

      {auftrag.rechnungen.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white text-sm">
          {auftrag.rechnungen.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 p-2">
              <span>
                {r.art === "TEIL" ? "Teilrechnung" : "Schlussrechnung"} {rechnungNr(r)}
                {r.bezeichnung && ` — ${r.bezeichnung}`}
              </span>
              <span className="text-muted">netto CHF {chf(r.totalNetto)} · {r.status}</span>
            </li>
          ))}
        </ul>
      )}
      {!schluss && positionen.length > 0 && (
        <details className="mt-3 rounded-tiff border border-line bg-white">
          <summary className="cursor-pointer select-none p-3 text-sm font-semibold hover:bg-surface2">
            💶 Teilrechnung (Akonto) erstellen
          </summary>
          <form action={createTeilrechnung} className="grid gap-2 border-t border-line p-3 md:grid-cols-[2fr_1fr_1fr_auto]">
            <input type="hidden" name="auftragId" value={auftrag.id} />
            <input name="bezeichnung" placeholder="Bezeichnung (z.B. Akonto bei Auftragsbeginn)" className="rounded border border-line p-2 text-sm" />
            <input name="prozent" inputMode="decimal" placeholder="% vom Auftragswert" className="rounded border border-line p-2 text-sm" />
            <input name="betragNetto" inputMode="decimal" placeholder="oder Betrag netto" className="rounded border border-line p-2 text-sm" />
            <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Erstellen</button>
            <p className="text-xs text-muted md:col-span-4">
              Auftragswert netto CHF {chf(auftragswert)}{offertenWert > 0 ? " (laut Offerte)" : " (laut Rapport)"} · bereits per Akonto: CHF {chf(akontoNetto)}.
              Die Schlussrechnung zieht die Akonto-Rechnungen automatisch ab.
            </p>
          </form>
        </details>
      )}

      {positionen.length > 0 && (
        <details className="mt-3 rounded-tiff border border-line bg-white">
          <summary className="cursor-pointer select-none p-3 text-sm font-semibold hover:bg-surface2">
            🚛 Lieferschein erstellen{auftrag.lieferscheine.length > 0 && ` (${auftrag.lieferscheine.map((l) => lieferscheinNr(l)).join(", ")} bereits vorhanden)`}
          </summary>
          <form action={createLieferschein} className="grid gap-2 border-t border-line p-3 text-sm">
            <input type="hidden" name="auftragId" value={auftrag.id} />
            <div className="grid gap-1">
              {auftrag.rapporte.flatMap((r) => r.positionen).map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" name="positionId" value={p.id} defaultChecked={p.typ === "MATERIAL"} />
                  {p.menge} {p.einheit} — {p.bezeichnung}
                  <span className="text-xs text-muted">({p.typ === "MATERIAL" ? "Material" : "Arbeit"})</span>
                </label>
              ))}
            </div>
            <input name="bemerkung" placeholder="Bemerkung (optional)" className="rounded border border-line p-2" />
            <button className="w-fit rounded bg-forest px-4 py-2 font-semibold text-white hover:bg-forest-lift">Lieferschein erstellen</button>
          </form>
        </details>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-semibold">Rapport-Positionen</h2>
          <table className="mt-2 w-full rounded-tiff border border-line bg-white text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="p-2">Typ</th>
                <th className="p-2">Bezeichnung</th>
                <th className="p-2 text-right">Menge</th>
                <th className="p-2">Einheit</th>
                <th className="p-2 text-right">Ansatz</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {positionen.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="p-2">{p.typ === "ARBEIT" ? "🕐" : "🔩"}</td>
                  <td className="p-2">{p.bezeichnung}</td>
                  <td className="p-2 text-right">{p.menge}</td>
                  <td className="p-2">{p.einheit}</td>
                  <td className="p-2 text-right">{chf(p.ansatz)}</td>
                  <td className="p-2 text-right font-medium">{chf(p.menge * p.ansatz)}</td>
                  <td className="p-2">
                    {!schluss && (
                      <form action={deleteRapportPosition}>
                        <input type="hidden" name="auftragId" value={auftrag.id} />
                        <input type="hidden" name="positionId" value={p.id} />
                        <button className="text-muted hover:text-red-600">✕</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {positionen.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-muted">
                    Noch keine Positionen — unten erfassen.
                  </td>
                </tr>
              )}
            </tbody>
            {positionen.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={5} className="p-2 text-right">
                    Total netto
                  </td>
                  <td className="p-2 text-right">CHF {chf(totalNetto)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>

          {!schluss && (
            <form
              action={addRapportPosition}
              className="mt-4 rounded-tiff border border-line bg-white p-4"
            >
              <input type="hidden" name="auftragId" value={auftrag.id} />
              <h3 className="text-sm font-semibold">Position erfassen</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-6">
                <select name="typ" className="rounded border border-line p-2 text-sm">
                  <option value="ARBEIT">Arbeit</option>
                  <option value="MATERIAL">Material</option>
                </select>
                <select name="artikelId" className="rounded border border-line p-2 text-sm md:col-span-2">
                  <option value="">Aus Katalog…</option>
                  {artikel.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bezeichnung} ({chf(verkaufsPreis(a, konditionen))}/{a.einheit})
                    </option>
                  ))}
                </select>
                <input
                  name="bezeichnung"
                  placeholder="oder frei eingeben"
                  className="rounded border border-line p-2 text-sm md:col-span-3"
                />
                <input name="menge" type="number" step="0.25" defaultValue={1} className="rounded border border-line p-2 text-sm" />
                <select name="einheit" className="rounded border border-line p-2 text-sm">
                  <option>Std.</option>
                  <option>Stk.</option>
                  <option>m</option>
                  <option>pauschal</option>
                </select>
                <input name="ansatz" type="number" step="0.05" placeholder="CHF/Einheit" className="rounded border border-line p-2 text-sm" />
                <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift md:col-span-3">
                  Hinzufügen
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="grid h-fit gap-4">
          <div className="rounded-tiff border border-line bg-white p-4">
            <div className="text-sm font-semibold">Foto-Dokumentation ({fotos.length})</div>
            {fotos.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {fotos.map((foto) => (
                  <div key={foto.id} className="group relative">
                    <a href={`/api/fotos/${foto.id}`} target="_blank">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/fotos/${foto.id}`}
                        alt="Rapport-Foto"
                        className="h-20 w-full rounded border border-line object-cover"
                      />
                    </a>
                    <form action={deleteRapportFoto} className="absolute right-1 top-1">
                      <input type="hidden" name="auftragId" value={auftrag.id} />
                      <input type="hidden" name="fotoId" value={foto.id} />
                      <button className="rounded bg-white/90 px-1.5 text-xs text-red-600 opacity-0 shadow group-hover:opacity-100">
                        ✕
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <FotoUpload auftragId={auftrag.id} onSave={saveRapportFoto} />
            </div>
          </div>
          <div className="rounded-tiff border border-line bg-white p-4">
            <SignaturePad
              auftragId={auftrag.id}
              vorhandeneUnterschrift={unterschrift}
              onSave={saveUnterschrift}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
