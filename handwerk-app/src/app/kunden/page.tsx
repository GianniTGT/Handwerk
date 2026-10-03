export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { importKundenCsv } from "@/lib/actions-kontakte";

const importFehler: Record<string, string> = {
  datei: "keine Datei gewählt",
  gross: "Datei grösser als 5 MB",
  leer: "keine Datenzeilen",
  name: "Spalte «Name» oder «Firma» fehlt in der Kopfzeile",
};

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    kategorie?: string;
    import?: string;
    neu?: string;
    uebersprungen?: string;
    grund?: string;
  }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const archiv = sp.filter === "archiviert";

  const [kunden, kategorien] = await Promise.all([
    db.kunde.findMany({
      where: {
        betriebId: betrieb.id,
        archiviert: archiv,
        ...(sp.kategorie ? { kategorie: sp.kategorie } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { ort: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { telefon: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    }),
    db.kunde.findMany({
      where: { betriebId: betrieb.id, kategorie: { not: "" } },
      select: { kategorie: true },
      distinct: ["kategorie"],
      orderBy: { kategorie: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Kontakte</h1>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="cursor-pointer list-none rounded border border-line bg-white px-3 py-1.5 text-sm hover:bg-surface2" title="Weitere Aktionen">
              ⋮
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-72 rounded-tiff border border-line bg-white p-3 shadow-lg">
              <form action={importKundenCsv} className="grid gap-2 text-sm">
                <div className="font-semibold">Kontakte importieren (CSV)</div>
                <p className="text-xs text-muted">
                  Kopfzeile mit Name/Firma, Strasse, PLZ, Ort, Telefon, Mobile, E-Mail, Website, Kategorie, Typ. Trennzeichen ; oder ,
                  Duplikate (Name + PLZ) werden übersprungen.
                </p>
                <input name="datei" type="file" accept=".csv,text/csv" required className="rounded border border-line p-1.5 text-xs" />
                <button className="rounded border border-forest p-1.5 text-sm font-medium text-forest hover:bg-surface2">Importieren</button>
              </form>
              {/* Download-Route, kein Seitenwechsel */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/export/kontakte" className="mt-3 block text-sm text-forest underline">⬇ Kontakte exportieren (CSV)</a>
              <Link href="/import?typ=kontakte" className="mt-2 block text-sm text-forest underline">Datenübernahme von bexio / Excel (mit Spaltenprüfung)</Link>
            </div>
          </details>
          <Link href="/kunden/neu" className="rounded bg-forest px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-lift">
            ＋ Neuer Kontakt
          </Link>
        </div>
      </div>

      {sp.import === "ok" && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          Import fertig: {sp.neu} neu{Number(sp.uebersprungen) > 0 && `, ${sp.uebersprungen} übersprungen (leer/Duplikat)`}.
        </p>
      )}
      {sp.import === "fehler" && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          Import fehlgeschlagen ({importFehler[sp.grund ?? ""] ?? "Fehler"}).
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 text-sm">
          <Link href="/kunden" className={`rounded-full border px-3 py-1 ${!archiv ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            Alle
          </Link>
          <Link href="/kunden?filter=archiviert" className={`rounded-full border px-3 py-1 ${archiv ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            Archiviert
          </Link>
        </div>
        <form className="flex flex-wrap gap-2">
          {archiv && <input type="hidden" name="filter" value="archiviert" />}
          <input name="q" defaultValue={q} placeholder="Suche: Name, Ort, E-Mail, Telefon …" className="w-56 rounded border border-line p-1.5 text-sm" />
          <select name="kategorie" defaultValue={sp.kategorie ?? ""} className="rounded border border-line p-1.5 text-sm">
            <option value="">Alle Kategorien</option>
            {kategorien.map((c) => (
              <option key={c.kategorie}>{c.kategorie}</option>
            ))}
          </select>
          <button className="rounded bg-forest px-3 text-sm font-medium text-white">Filtern</button>
        </form>
      </div>

      <div className="mt-3 overflow-hidden rounded-tiff border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface2 text-left text-xs uppercase text-muted">
            <tr>
              <th className="w-10 p-2" />
              <th className="p-2">Name</th>
              <th className="p-2">PLZ</th>
              <th className="p-2">Ort</th>
              <th className="hidden p-2 md:table-cell">E-Mail</th>
              <th className="hidden p-2 md:table-cell">Telefon</th>
              <th className="hidden p-2 lg:table-cell">Kategorie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {kunden.map((k) => (
              <tr key={k.id} className="hover:bg-surface2">
                <td className="p-2 text-center" title={k.typ === "PRIVAT" ? "Privatperson" : "Firma"}>
                  {k.typ === "PRIVAT" ? "👤" : "🏢"}
                </td>
                <td className="p-2 font-medium">
                  <Link href={`/kunden/${k.id}`} className="block hover:underline">
                    {k.name}
                  </Link>
                </td>
                <td className="p-2 text-muted">{k.plz}</td>
                <td className="p-2 text-muted">{k.ort}</td>
                <td className="hidden p-2 text-muted md:table-cell">{k.email}</td>
                <td className="hidden p-2 text-muted md:table-cell">{k.telefon || k.mobile}</td>
                <td className="hidden p-2 text-muted lg:table-cell">{k.kategorie}</td>
              </tr>
            ))}
            {kunden.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted">
                  Keine Kontakte. <Link href="/kunden/neu" className="text-forest underline">Ersten Kontakt erstellen</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
