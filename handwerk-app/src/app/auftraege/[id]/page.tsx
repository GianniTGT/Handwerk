import { nettoPreis } from "@/lib/preise";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import {
  addRapportPosition,
  createRechnung,
  deleteRapportFoto,
  deleteRapportPosition,
  saveRapportFoto,
  saveUnterschrift,
} from "@/lib/actions";
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
      rechnung: true,
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

  const positionen = auftrag.rapporte.flatMap((r) => r.positionen);
  const fotos = auftrag.rapporte.flatMap((r) => r.fotos);
  const unterschrift = auftrag.rapporte.find((r) => r.unterschrift)?.unterschrift ?? "";
  const totalNetto = positionen.reduce((s, p) => s + p.menge * p.ansatz, 0);

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
        {!auftrag.rechnung && positionen.length > 0 && (
          <form action={createRechnung}>
            <input type="hidden" name="auftragId" value={auftrag.id} />
            <button className="rounded bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-soft">
              ⚡ Rechnung erstellen
            </button>
          </form>
        )}
        {auftrag.rechnung && (
          <Link
            href="/rechnungen"
            className="rounded bg-surface2 px-4 py-2 text-sm font-medium text-ink"
          >
            Rechnung #{auftrag.rechnung.nummer} ansehen
          </Link>
        )}
      </div>

      {sp.zeiten && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">{sp.zeiten} Zeiteintrag/-einträge als Rapport-Positionen übernommen ✓</p>
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
                    {!auftrag.rechnung && (
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

          {!auftrag.rechnung && (
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
                      {a.bezeichnung} ({chf(nettoPreis(a, konditionen))}/{a.einheit})
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
