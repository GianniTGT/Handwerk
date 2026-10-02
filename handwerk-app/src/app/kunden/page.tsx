export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { importKundenCsv, saveKunde } from "@/lib/actions-kontakte";
import KundeFelder from "@/components/KundeFelder";

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
    fehler?: string;
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
      include: { _count: { select: { objekte: true, auftraege: true } } },
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
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-xl font-bold">Kontakte</h1>
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
        {sp.fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte einen Namen angeben.</p>}

        <form className="mt-3 flex flex-wrap gap-2">
          {archiv && <input type="hidden" name="filter" value="archiviert" />}
          <input name="q" defaultValue={q} placeholder="Suche: Name, Ort, E-Mail, Telefon…" className="min-w-0 flex-1 rounded border border-line p-2 text-sm" />
          <select name="kategorie" defaultValue={sp.kategorie ?? ""} className="rounded border border-line p-2 text-sm">
            <option value="">Alle Kategorien</option>
            {kategorien.map((c) => (
              <option key={c.kategorie}>{c.kategorie}</option>
            ))}
          </select>
          <button className="rounded bg-forest px-4 text-sm font-medium text-white">Filtern</button>
        </form>
        <div className="mt-3 flex gap-1 text-sm">
          <Link href="/kunden" className={`rounded-full border px-3 py-1 ${!archiv ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            Alle
          </Link>
          <Link href="/kunden?filter=archiviert" className={`rounded-full border px-3 py-1 ${archiv ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            Archiviert
          </Link>
        </div>

        <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white">
          {kunden.map((k) => (
            <li key={k.id}>
              <Link href={`/kunden/${k.id}`} className="block p-3 hover:bg-surface2">
                <div className="font-medium">
                  {k.name}
                  {k.kategorie && (
                    <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-normal text-muted">{k.kategorie}</span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {[k.strasse, `${k.plz} ${k.ort}`.trim()].filter(Boolean).join(", ")} · {k._count.objekte} Objekt(e) ·{" "}
                  {k._count.auftraege} Auftrag/Aufträge
                </div>
              </Link>
            </li>
          ))}
          {kunden.length === 0 && <li className="p-3 text-sm text-muted">Keine Kontakte.</li>}
        </ul>
      </div>

      <div className="grid h-fit gap-4">
        <form action={saveKunde} className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Neuer Kontakt</h2>
          <div className="mt-3">
            <KundeFelder />
            <button className="mt-3 w-full rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">Speichern</button>
          </div>
        </form>

        <form action={importKundenCsv} className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Kontakte importieren (CSV)</h2>
          <p className="mt-1 text-xs text-muted">
            Kopfzeile mit Spalten wie Name/Firma, Strasse, PLZ, Ort, Telefon, Mobile, E-Mail, Website, Kategorie, Typ.
            Trennzeichen ; oder ,. Duplikate (Name + PLZ) werden übersprungen.
          </p>
          <input name="datei" type="file" accept=".csv,text/csv" required className="mt-2 w-full rounded border border-line p-2 text-sm" />
          <button className="mt-2 w-full rounded border border-forest p-2 text-sm font-medium text-forest hover:bg-surface2">Importieren</button>
        </form>
      </div>
    </div>
  );
}
