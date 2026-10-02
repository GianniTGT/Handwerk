export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { einkaufsPreis, marge, verkaufsPreis } from "@/lib/preise";
import { saveArtikel } from "@/lib/actions";
import {
  createLieferant,
  deleteArtikel,
  deleteKondition,
  importArtikelCsv,
  setKondition,
} from "@/lib/actions";

const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; import?: string; neu?: string; aktualisiert?: string; uebersprungen?: string; grund?: string; gespeichert?: string; fehler?: string; edit?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const [artikel, lieferanten, konditionen] = await Promise.all([
    db.artikel.findMany({
      where: {
        betriebId: betrieb.id,
        ...(q
          ? {
              OR: [
                { bezeichnung: { contains: q, mode: "insensitive" } },
                { artikelNr: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { lieferant: true },
      orderBy: { bezeichnung: "asc" },
      take: 200,
    }),
    db.lieferant.findMany({ where: { betriebId: betrieb.id }, orderBy: { name: "asc" } }),
    db.kondition.findMany({
      where: { betriebId: betrieb.id },
      include: { lieferant: true },
      orderBy: [{ lieferantId: "asc" }, { rabattgruppe: "asc" }],
    }),
  ]);

  const bearb = sp.edit ? artikel.find((x) => x.id === sp.edit) : undefined;

  return (
    <div>
      <h1 className="text-xl font-bold">Artikel & Lieferanten</h1>

      {sp.gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>}
      {sp.fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte eine Bezeichnung angeben.</p>}
      {sp.import === "ok" && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Import fertig: {sp.neu} neu, {sp.aktualisiert} aktualisiert
          {Number(sp.uebersprungen) > 0 && `, ${sp.uebersprungen} Zeilen übersprungen`}.
        </p>
      )}
      {sp.import === "fehler" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          Import fehlgeschlagen (
          {sp.grund === "datei"
            ? "keine Datei gewählt"
            : sp.grund === "gross"
              ? "Datei grösser als 10 MB"
              : "keine gültigen Zeilen — Spalte «Bezeichnung» vorhanden?"}
          ).
        </p>
      )}

      <div className="mt-4 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div>
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Suche: Bezeichnung oder Art-Nr…"
              className="w-full rounded border border-line p-2 text-sm"
            />
            <button className="rounded bg-forest px-4 text-sm font-medium text-white">Suchen</button>
          </form>

          <table className="mt-3 w-full rounded-tiff border border-line bg-white text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="p-2">Art-Nr</th>
                <th className="p-2">Bezeichnung</th>
                <th className="p-2">Lieferant</th>
                <th className="p-2">Art</th>
                <th className="p-2 text-right">EK*</th>
                <th className="p-2 text-right">Zuschlag</th>
                <th className="p-2 text-right">VK</th>
                <th className="p-2 text-right">Marge</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {artikel.map((a) => (
                <tr key={a.id} className="border-b border-line">
                  <td className="p-2 text-muted">{a.artikelNr || "—"}</td>
                  <td className="p-2">{a.bezeichnung}</td>
                  <td className="p-2 text-muted">{a.lieferant?.name ?? "manuell"}</td>
                  <td className="p-2 text-muted">{a.art === "WARE" ? "Ware" : "Dienstl."}{a.gruppe && ` · ${a.gruppe}`}</td>
                  <td className="p-2 text-right">{chf(einkaufsPreis(a, konditionen))}</td>
                  <td className="p-2 text-right text-muted">{a.zuschlagProzent > 0 ? `${a.zuschlagProzent}%` : "—"}</td>
                  <td className="p-2 text-right font-medium">{chf(verkaufsPreis(a, konditionen))}</td>
                  <td className="p-2 text-right text-muted">
                    {marge(einkaufsPreis(a, konditionen), verkaufsPreis(a, konditionen)) > 0
                      ? `${marge(einkaufsPreis(a, konditionen), verkaufsPreis(a, konditionen))}%`
                      : "—"}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <a href={`/artikel?edit=${a.id}`} className="mr-2 text-muted hover:text-forest" title="Bearbeiten">✎</a>
                    <form action={deleteArtikel} className="inline">
                      <input type="hidden" name="artikelId" value={a.id} />
                      <button className="text-muted hover:text-red-600">✕</button>
                    </form>
                  </td>
                </tr>
              ))}
              {artikel.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-3 text-muted">
                    Keine Artikel{q && " für diese Suche"} — rechts CSV importieren.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-muted">
            * EK = Brutto × (1 − Rabatt der Kondition) bzw. manueller Einkaufspreis. VK = EK × (1 + Zuschlag). Ohne Zuschlag gilt der EK. Angezeigt werden max. 200 Artikel — Suche benutzen.
          </p>
        </div>

        <div className="grid h-fit gap-4">
          <form action={saveArtikel} className="rounded-tiff border border-line bg-white p-4 shadow-sm">
            {bearb && <input type="hidden" name="artikelId" value={bearb.id} />}
            <h2 className="font-semibold">{bearb ? `Bearbeiten: ${bearb.bezeichnung}` : "Neuer Artikel / Dienstleistung"}</h2>
            <div className="mt-2 grid gap-2 text-sm">
              <select key={bearb?.id} name="art" defaultValue={bearb?.art ?? "WARE"} className="rounded border border-line p-2">
                <option value="WARE">Ware</option>
                <option value="DIENSTLEISTUNG">Dienstleistung</option>
              </select>
              <input key={bearb?.id} name="bezeichnung" required defaultValue={bearb?.bezeichnung} placeholder="Bezeichnung" className="rounded border border-line p-2" />
              <div className="grid grid-cols-2 gap-2">
                <input key={bearb?.id} name="artikelNr" defaultValue={bearb?.artikelNr} placeholder="Art-Nr / Code" className="rounded border border-line p-2" />
                <input key={bearb?.id} name="einheit" defaultValue={bearb?.einheit} placeholder="Einheit (Stk., Std., m)" className="rounded border border-line p-2" />
              </div>
              <input key={bearb?.id} name="gruppe" defaultValue={bearb?.gruppe} placeholder="Gruppe (z.B. Heizung, Sanitär)" className="rounded border border-line p-2" />
              <div className="grid grid-cols-3 gap-2">
                <input key={bearb?.id} name="einkaufspreis" inputMode="decimal" defaultValue={bearb && bearb.einkaufspreis > 0 ? bearb.einkaufspreis : bearb && !bearb.lieferantId ? bearb.preis : ""} placeholder="EK" className="rounded border border-line p-2" />
                <input key={bearb?.id} name="zuschlagProzent" inputMode="decimal" defaultValue={bearb?.zuschlagProzent || ""} placeholder="Zuschlag %" className="rounded border border-line p-2" />
                <input name="verkaufspreis" inputMode="decimal" placeholder="VK" className="rounded border border-line p-2" />
              </div>
              <p className="text-xs text-muted">EK + Zuschlag oder EK + VK angeben (Zuschlag wird berechnet). Dienstleistung: nur VK.</p>
              <select key={bearb?.id} name="mwstSatz" defaultValue={String(bearb?.mwstSatz ?? 8.1)} className="rounded border border-line p-2">
                <option value="8.1">MwSt 8.1%</option>
                <option value="2.6">MwSt 2.6%</option>
                <option value="3.8">MwSt 3.8%</option>
                <option value="0">MwSt 0%</option>
              </select>
              <select key={bearb?.id} name="lieferantId" defaultValue={bearb?.lieferantId ?? ""} className="rounded border border-line p-2">
                <option value="">Ohne Lieferant</option>
                {lieferanten.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <button className="rounded bg-forest p-2 font-medium text-white hover:bg-forest-lift">Speichern</button>
              {bearb && <a href="/artikel" className="text-center text-xs text-muted underline">Abbrechen</a>}
            </div>
          </form>

          <form
            action={importArtikelCsv}
            className="rounded-tiff border border-line bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">CSV-Import</h2>
            <p className="mt-1 text-xs text-muted">
              Spalten (Kopfzeile, Reihenfolge egal): ArtikelNr; Bezeichnung; Einheit;
              Bruttopreis; Rabattgruppe. Trennzeichen ; oder , — Export aus Excel oder
              Lieferanten-Webshop (Debrunner, Meier Tobler…).
            </p>
            <div className="mt-3 grid gap-2">
              <select name="lieferantId" className="rounded border border-line p-2 text-sm">
                <option value="">Ohne Lieferant (manuelle Artikel)</option>
                {lieferanten.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <input
                name="datei"
                type="file"
                accept=".csv,text/csv"
                required
                className="rounded border border-line p-2 text-sm"
              />
              <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
                Importieren
              </button>
            </div>
          </form>

          <form
            action={createLieferant}
            className="rounded-tiff border border-line bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">Neuer Lieferant</h2>
            <div className="mt-2 flex gap-2">
              <input
                name="name"
                required
                placeholder="z.B. Debrunner Acifer"
                className="w-full rounded border border-line p-2 text-sm"
              />
              <button className="rounded bg-forest px-3 text-sm font-medium text-white">+</button>
            </div>
          </form>

          <div className="rounded-tiff border border-line bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Konditionen (Rabatte)</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {konditionen.map((k) => (
                <li key={k.id} className="flex items-center justify-between py-1.5">
                  <span>
                    {k.lieferant.name} · RG «{k.rabattgruppe || "—"}»
                  </span>
                  <span className="flex items-center gap-2">
                    <strong>−{k.rabattProzent}%</strong>
                    <form action={deleteKondition}>
                      <input type="hidden" name="konditionId" value={k.id} />
                      <button className="text-muted hover:text-red-600">✕</button>
                    </form>
                  </span>
                </li>
              ))}
              {konditionen.length === 0 && (
                <li className="py-1.5 text-muted">Noch keine Konditionen.</li>
              )}
            </ul>
            <form action={setKondition} className="mt-3 grid grid-cols-[1fr_1fr_80px_auto] gap-2">
              <select name="lieferantId" required className="rounded border border-line p-2 text-sm">
                <option value="">Lieferant…</option>
                {lieferanten.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <input name="rabattgruppe" placeholder="Rabattgruppe" className="rounded border border-line p-2 text-sm" />
              <input name="rabattProzent" type="number" step="0.1" min="0" max="100" required placeholder="%" className="rounded border border-line p-2 text-sm" />
              <button className="rounded bg-forest px-3 text-sm font-medium text-white">OK</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
