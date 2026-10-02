export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { nettoPreis } from "@/lib/preise";
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
  searchParams: Promise<{ q?: string; import?: string; neu?: string; aktualisiert?: string; uebersprungen?: string; grund?: string }>;
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

  return (
    <div>
      <h1 className="text-xl font-bold">Artikel & Lieferanten</h1>

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
                <th className="p-2">RG</th>
                <th className="p-2 text-right">Brutto</th>
                <th className="p-2 text-right">Netto*</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {artikel.map((a) => (
                <tr key={a.id} className="border-b border-line">
                  <td className="p-2 text-muted">{a.artikelNr || "—"}</td>
                  <td className="p-2">{a.bezeichnung}</td>
                  <td className="p-2 text-muted">{a.lieferant?.name ?? "manuell"}</td>
                  <td className="p-2 text-muted">{a.rabattgruppe || "—"}</td>
                  <td className="p-2 text-right">{a.bruttoPreis > 0 ? chf(a.bruttoPreis) : "—"}</td>
                  <td className="p-2 text-right font-medium">{chf(nettoPreis(a, konditionen))}</td>
                  <td className="p-2">
                    <form action={deleteArtikel}>
                      <input type="hidden" name="artikelId" value={a.id} />
                      <button className="text-muted hover:text-red-600">✕</button>
                    </form>
                  </td>
                </tr>
              ))}
              {artikel.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-muted">
                    Keine Artikel{q && " für diese Suche"} — rechts CSV importieren.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-muted">
            * Netto = Brutto × (1 − Rabatt der Kondition). Ohne Kondition gilt Brutto bzw. der
            manuelle Preis. Angezeigt werden max. 200 Artikel — Suche benutzen.
          </p>
        </div>

        <div className="grid h-fit gap-4">
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
