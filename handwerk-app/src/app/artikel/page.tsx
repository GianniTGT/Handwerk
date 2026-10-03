export const dynamic = "force-dynamic";

import Link from "next/link";
import { Leer } from "@/components/Liste";
import { Ik } from "@/components/Icons";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { einkaufsPreis, marge, verkaufsPreis } from "@/lib/preise";
import { deleteArtikel } from "@/lib/actions";

const TABS: [string, string, string | null][] = [
  ["alle", "Alle", null],
  ["ware", "Waren", "WARE"],
  ["dienstleistung", "Dienstleistungen", "DIENSTLEISTUNG"],
];

export default async function ArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    import?: string;
    neu?: string;
    aktualisiert?: string;
    uebersprungen?: string;
    grund?: string;
    gespeichert?: string;
    fehler?: string;
  }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = sp.filter ?? "alle";
  const art = TABS.find((t) => t[0] === filter)?.[2] ?? null;

  const [artikel, anzahlen, konditionen] = await Promise.all([
    db.artikel.findMany({
      where: {
        betriebId: betrieb.id,
        ...(art ? { art } : {}),
        ...(q
          ? {
              OR: [
                { bezeichnung: { contains: q, mode: "insensitive" } },
                { artikelNr: { contains: q, mode: "insensitive" } },
                { gruppe: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { lieferant: true },
      orderBy: { bezeichnung: "asc" },
      take: 300,
    }),
    db.artikel.groupBy({ by: ["art"], where: { betriebId: betrieb.id }, _count: true }),
    db.kondition.findMany({ where: { betriebId: betrieb.id } }),
  ]);
  const anzahl = (a: string | null) => anzahlen.filter((x) => !a || x.art === a).reduce((s, x) => s + x._count, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Produkte</h1>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-line bg-white text-lg hover:bg-surface2" title="Weitere Aktionen" aria-label="Weitere Aktionen">
              ⋮
            </summary>
            <div className="absolute right-0 z-10 mt-1 min-w-56 overflow-hidden rounded-tiff border border-line bg-white py-1 shadow-lg">
              <Link href="/import?typ=artikel" className="block px-4 py-2 text-sm hover:bg-surface2">Produkte importieren</Link>
              <Link href="/artikel/lieferanten" className="block px-4 py-2 text-sm hover:bg-surface2">Lieferanten, Konditionen &amp; Preislisten</Link>
              {/* Download-Route, kein Seitenwechsel */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/export/artikel" className="block px-4 py-2 text-sm hover:bg-surface2">Produkte exportieren (CSV)</a>
            </div>
          </details>
          <Link href="/artikel/neu" className="rounded-md bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift">
            ＋ Neues Produkt
          </Link>
        </div>
      </div>

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
          {sp.grund === "datei" ? "keine Datei gewählt" : sp.grund === "gross" ? "Datei grösser als 10 MB" : "keine gültigen Zeilen — Spalte «Bezeichnung» vorhanden?"}
          ).
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 text-sm">
          {TABS.map(([key, label, a]) => (
            <Link
              key={key}
              href={`/artikel?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}
            >
              {label} ({anzahl(a)})
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={q} placeholder="Suche: Bezeichnung, Art-Nr, Gruppe …" className="w-60 rounded border border-line p-1.5 text-sm" />
          <button className="rounded-md bg-forest px-3 text-sm font-medium text-white">Suchen</button>
        </form>
      </div>

      <div className="mt-3 overflow-hidden rounded-tiff border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="hidden p-2 sm:table-cell">Art-Nr</th>
              <th className="p-2">Bezeichnung</th>
              <th className="hidden p-2 lg:table-cell">Gruppe</th>
              <th className="hidden p-2 md:table-cell">Lieferant</th>
              <th className="hidden p-2 text-right md:table-cell">EK</th>
              <th className="p-2 text-right">VK</th>
              <th className="hidden p-2 text-right lg:table-cell">Marge</th>
              <th className="w-16 p-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {artikel.map((a) => {
              const ek = einkaufsPreis(a, konditionen);
              const vk = verkaufsPreis(a, konditionen);
              const m = marge(ek, vk);
              return (
                <tr key={a.id} className="hover:bg-surface2">
                  <td className="hidden p-2 text-muted sm:table-cell">{a.artikelNr || "—"}</td>
                  <td className="p-2 font-medium">
                    <Link href={`/artikel/${a.id}`} className="block hover:underline">
                      {a.bezeichnung}
                    </Link>
                    <span className="text-xs font-normal text-muted">{a.art === "WARE" ? "Ware" : "Dienstleistung"} · {a.einheit}</span>
                  </td>
                  <td className="hidden p-2 text-muted lg:table-cell">{a.gruppe || "—"}</td>
                  <td className="hidden p-2 text-muted md:table-cell">{a.lieferant?.name ?? "—"}</td>
                  <td className="hidden p-2 text-right tabular-nums md:table-cell">{chf(ek)}</td>
                  <td className="p-2 text-right font-medium tabular-nums">{chf(vk)}</td>
                  <td className="hidden p-2 text-right text-muted tabular-nums lg:table-cell">{m > 0 ? `${m}%` : "—"}</td>
                  <td className="p-2 text-right">
                    <Link href={`/artikel/${a.id}`} className="mr-2 text-muted hover:text-forest" title="Bearbeiten"><Ik name="stift" className="mr-0" /></Link>
                    <form action={deleteArtikel} className="inline">
                      <input type="hidden" name="artikelId" value={a.id} />
                      <button className="text-muted hover:text-red-600" title="Löschen" aria-label="Löschen"><Ik name="x" className="mr-0" /></button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {artikel.length === 0 && (
              q || filter !== "alle" ? (
                <Leer colSpan={8}>Keine Produkte zu dieser Auswahl.</Leer>
              ) : (
                <Leer colSpan={8} icon="produkte" titel="Sie haben noch keine Produkte erfasst.">
                  Erfassen Sie jetzt <Link href="/artikel/neu">ein Produkt oder eine Dienstleistung</Link> oder{" "}
                  <Link href="/import?typ=artikel">importieren Sie Ihre Produkte</Link> aus bexio, Excel oder einer Lieferanten-Preisliste.
                  <br />
                  Anschliessend wählen Sie Ihren Katalog in Offerten, Aufträgen und Rechnungen einfach aus.
                </Leer>
              )
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        EK = Einkaufspreis (bei Katalogartikeln Bruttopreis − Lieferanten-Rabatt), VK = EK + Zuschlag. Angezeigt werden max. 300 Produkte — die Suche benutzen.
      </p>
    </div>
  );
}
