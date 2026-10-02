export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { deleteBeleg, setBelegStatus, uploadBeleg } from "@/lib/actions-buero";

const fehlerTexte: Record<string, string> = {
  datei: "Bitte eine Datei auswählen.",
  gross: "Datei zu gross — max. 3 MB.",
  format: "Nur PDF, JPEG oder PNG.",
};

export default async function PosteingangPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const belege = await db.beleg.findMany({
    where: { betriebId: betrieb.id },
    select: { id: true, titel: true, dateiname: true, mimeTyp: true, status: true, erstellt: true },
    orderBy: { erstellt: "desc" },
  });
  const neu = belege.filter((b) => b.status === "NEU").length;
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">Posteingang</h1>
      <p className="mt-1 text-sm text-muted">
        Lieferantenrechnungen und Dokumente hochladen, ansehen und als Ausgabe verbuchen. Neu: {neu}
      </p>

      {sp.gespeichert && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Hochgeladen ✓</p>
      )}
      {sp.fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          {fehlerTexte[sp.fehler] ?? "Upload fehlgeschlagen."}
        </p>
      )}

      <form
        action={uploadBeleg}
        className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]"
      >
        <input name="titel" placeholder="Titel (optional)" className={feld} />
        <input name="datei" type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" />
        <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">
          Hochladen
        </button>
      </form>

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {belege.length === 0 && <li className="p-4 text-sm text-muted">Der Posteingang ist leer.</li>}
        {belege.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">
                {b.mimeTyp === "application/pdf" ? "📄" : "🖼️"} {b.titel}
              </div>
              <div className="text-sm text-muted">
                {b.erstellt.toLocaleDateString("de-CH")} · {b.dateiname}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.status === "NEU" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                }`}
              >
                {b.status === "NEU" ? "neu" : "erledigt"}
              </span>
              <a
                href={`/api/belege/${b.id}`}
                target="_blank"
                className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2"
              >
                Ansehen
              </a>
              {b.status === "NEU" && (
                <Link
                  href={`/ausgaben?beleg=${b.id}`}
                  className="rounded bg-forest px-2 py-1 text-xs font-medium text-white hover:bg-forest-lift"
                >
                  Als Ausgabe erfassen
                </Link>
              )}
              <form action={setBelegStatus}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="status" value={b.status === "NEU" ? "ERLEDIGT" : "NEU"} />
                <button className="rounded border border-line px-2 py-1 text-xs hover:bg-surface2">
                  {b.status === "NEU" ? "Erledigt" : "Wieder öffnen"}
                </button>
              </form>
              <form action={deleteBeleg}>
                <input type="hidden" name="id" value={b.id} />
                <button className="rounded border border-line px-2 py-1 text-xs text-red-700 hover:bg-red-50">
                  Löschen
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
