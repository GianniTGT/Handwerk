export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { deleteZahlung, importZahlungenCsv } from "@/lib/actions-buero";
import { FUSS, Hinweis, KOPF, Leer, ListenKopf, Pille, ReiterUndSuche, Tabelle, ZEILEN } from "@/components/Liste";

const fehlerTexte: Record<string, string> = {
  eingabe: "Bitte einen Betrag grösser als 0 angeben.",
  datei: "Bitte eine CSV-Datei auswählen.",
  gross: "Datei zu gross — max. 2 MB.",
};
const TABS: [string, string][] = [
  ["alle", "Alle"],
  ["eingang", "Eingänge"],
  ["ausgang", "Ausgänge"],
  ["offen", "Nicht zugeordnet"],
];

export default async function BankingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; gespeichert?: string; fehler?: string; importiert?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const filter = sp.filter ?? "alle";
  const q = (sp.q ?? "").trim().toLowerCase();
  const alle = await db.zahlung.findMany({
    where: { betriebId: betrieb.id },
    orderBy: [{ datum: "desc" }, { erstellt: "desc" }],
    take: 500,
  });
  const passt = (z: (typeof alle)[number], key: string) =>
    key === "eingang" ? z.betrag > 0 : key === "ausgang" ? z.betrag < 0 : key === "offen" ? z.betrag > 0 && !z.rechnungId : true;
  const sichtbar = alle.filter((z) => passt(z, filter) && (!q || `${z.text} ${z.referenz}`.toLowerCase().includes(q)));
  const eingang = alle.filter((z) => z.betrag > 0).reduce((s, z) => s + z.betrag, 0);
  const ausgang = alle.filter((z) => z.betrag < 0).reduce((s, z) => s + z.betrag, 0);
  const summe = sichtbar.reduce((s, z) => s + z.betrag, 0);

  return (
    <div>
      <ListenKopf
        titel="Banking"
        untertitel="Zahlungen erfassen oder als CSV der Bank importieren. Passende Beträge markieren offene Rechnungen bzw. Ausgaben automatisch als bezahlt."
        neuHref="/banking/neu"
        neuLabel="Zahlung erfassen"
        menue={
          <>
            <form action={importZahlungenCsv} className="grid gap-2 text-sm">
              <div className="font-semibold">Bank-CSV importieren</div>
              <p className="text-xs text-muted">
                Spalten: <code>Datum;Text;Betrag;Referenz</code> — Datum als TT.MM.JJJJ oder JJJJ-MM-TT, Ausgänge mit negativem Betrag. Max. 2 MB.
              </p>
              <input name="datei" type="file" accept=".csv,text/csv,text/plain" required className="rounded border border-line p-1.5 text-xs" />
              <button className="rounded-md border border-forest p-1.5 text-sm font-medium text-forest hover:bg-surface2">Importieren</button>
            </form>
            <div className="mt-3 grid gap-1 border-t border-line pt-3 text-sm">
              {/* Download-Route, kein Seitenwechsel */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/export/zahlungen" className="text-forest underline">⬇ Zahlungen exportieren (CSV)</a>
            </div>
          </>
        }
      />

      {sp.gespeichert && <Hinweis>Gespeichert ✓</Hinweis>}
      {sp.importiert && <Hinweis>{sp.importiert} Zahlung(en) importiert ✓</Hinweis>}
      {sp.fehler && <Hinweis art="fehler">{fehlerTexte[sp.fehler] ?? "Aktion fehlgeschlagen."}</Hinweis>}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Eingänge", wert: eingang, farbe: "text-green-700" },
          { label: "Ausgänge", wert: ausgang, farbe: "text-red-700" },
          { label: "Saldo", wert: eingang + ausgang, farbe: "" },
        ].map((k) => (
          <div key={k.label} className="rounded-tiff border border-line bg-white p-3 shadow-sm">
            <div className={`text-lg font-bold tabular-nums ${k.farbe}`}>CHF {chf(k.wert)}</div>
            <div className="text-xs text-muted">{k.label}</div>
          </div>
        ))}
      </div>

      <ReiterUndSuche
        basis="/banking"
        aktiv={filter}
        q={sp.q ?? ""}
        suchePlatzhalter="Suche: Text, Referenz …"
        reiter={TABS.map(([key, label]) => ({ key, label, anzahl: alle.filter((z) => passt(z, key)).length }))}
      />
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Datum</th>
            <th className="p-2">Text</th>
            <th className="hidden p-2 md:table-cell">Referenz</th>
            <th className="p-2 text-right">Betrag CHF</th>
            <th className="hidden p-2 sm:table-cell">Zuordnung</th>
            <th className="w-10 p-2" />
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {sichtbar.map((z) => (
            <tr key={z.id} className="hover:bg-surface2">
              <td className="whitespace-nowrap p-2 text-muted">{z.datum.toLocaleDateString("de-CH")}</td>
              <td className="p-2 font-medium">{z.text || "—"}</td>
              <td className="hidden p-2 text-muted md:table-cell">{z.referenz || "—"}</td>
              <td className={`whitespace-nowrap p-2 text-right font-medium tabular-nums ${z.betrag >= 0 ? "text-green-700" : "text-red-700"}`}>
                {z.betrag >= 0 ? "+" : "−"} {chf(Math.abs(z.betrag))}
              </td>
              <td className="hidden p-2 sm:table-cell">
                {z.rechnungId ? (
                  <Link href={`/rechnungen/${z.rechnungId}`} className="hover:underline">
                    <Pille farbe="bg-green-100 text-green-800">Rechnung ✓</Pille>
                  </Link>
                ) : z.betrag > 0 ? (
                  <Pille>offen</Pille>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="p-2 text-right">
                <form action={deleteZahlung}>
                  <input type="hidden" name="id" value={z.id} />
                  <button className="text-muted hover:text-red-600" title="Löschen" aria-label="Löschen">✕</button>
                </form>
              </td>
            </tr>
          ))}
          {sichtbar.length === 0 && (
            <Leer colSpan={6}>
              Keine Zahlungen. <Link href="/banking/neu" className="text-forest underline">Zahlung erfassen</Link> oder über «⋮» eine CSV importieren.
            </Leer>
          )}
        </tbody>
        {sichtbar.length > 0 && (
          <tfoot className={FUSS}>
            <tr>
              <td className="p-2" colSpan={2}>Total ({sichtbar.length})</td>
              <td className="hidden md:table-cell" />
              <td className="p-2 text-right tabular-nums">{chf(summe)}</td>
              <td className="hidden sm:table-cell" />
              <td />
            </tr>
          </tfoot>
        )}
      </Tabelle>
    </div>
  );
}
