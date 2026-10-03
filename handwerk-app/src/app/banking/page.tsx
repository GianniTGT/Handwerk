export const dynamic = "force-dynamic";

import { lokalIso } from "@/lib/datum";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { createZahlung, deleteZahlung, importZahlungenCsv } from "@/lib/actions-buero";

const fehlerTexte: Record<string, string> = {
  eingabe: "Bitte einen Betrag grösser als 0 angeben.",
  datei: "Bitte eine CSV-Datei auswählen.",
  gross: "Datei zu gross — max. 2 MB.",
};

export default async function BankingPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; fehler?: string; importiert?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const zahlungen = await db.zahlung.findMany({
    where: { betriebId: betrieb.id },
    orderBy: [{ datum: "desc" }, { erstellt: "desc" }],
    take: 200,
  });
  const eingang = zahlungen.filter((z) => z.betrag > 0).reduce((s, z) => s + z.betrag, 0);
  const ausgang = zahlungen.filter((z) => z.betrag < 0).reduce((s, z) => s + z.betrag, 0);
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">Banking</h1>
      <p className="mt-1 text-sm text-muted">
        Zahlungen erfassen oder per CSV importieren. Passende Beträge markieren offene Rechnungen
        bzw. Ausgaben automatisch als bezahlt.
      </p>

      {sp.gespeichert && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gespeichert ✓</p>
      )}
      {sp.importiert && (
        <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">
          {sp.importiert} Zahlung(en) importiert ✓
        </p>
      )}
      {sp.fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">
          {fehlerTexte[sp.fehler] ?? "Aktion fehlgeschlagen."}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <div className="text-xl font-bold text-green-700">CHF {chf(eingang)}</div>
          <div className="text-sm text-muted">Eingänge</div>
        </div>
        <div className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <div className="text-xl font-bold text-red-700">CHF {chf(ausgang)}</div>
          <div className="text-sm text-muted">Ausgänge</div>
        </div>
        <div className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <div className="text-xl font-bold">CHF {chf(eingang + ausgang)}</div>
          <div className="text-sm text-muted">Saldo</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <form
          action={createZahlung}
          className="grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm"
        >
          <h2 className="font-semibold">Zahlung erfassen</h2>
          <div className="grid grid-cols-2 gap-2">
            <select name="art" className={feld}>
              <option value="ein">Eingang</option>
              <option value="aus">Ausgang</option>
            </select>
            <input name="datum" type="date" defaultValue={lokalIso(new Date())} className={feld} />
          </div>
          <input name="betrag" required inputMode="decimal" placeholder="Betrag CHF" className={feld} />
          <input name="text" placeholder="Text / Auftraggeber" className={feld} />
          <input name="referenz" placeholder="Referenz (optional)" className={feld} />
          <button className="rounded bg-forest p-2 text-sm font-semibold text-white hover:bg-forest-lift">
            Speichern
          </button>
        </form>

        <form
          action={importZahlungenCsv}
          className="grid content-start gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm"
        >
          <h2 className="font-semibold">CSV-Import</h2>
          <p className="text-xs text-muted">
            Spalten: <code>Datum;Text;Betrag;Referenz</code> — Datum als TT.MM.JJJJ oder JJJJ-MM-TT, Ausgänge mit
            negativem Betrag.
          </p>
          <input name="datei" type="file" accept=".csv,text/csv,text/plain" className="text-sm" />
          <button className="rounded border border-forest p-2 text-sm font-semibold text-forest hover:bg-surface2">
            Importieren
          </button>
        </form>
      </div>

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {zahlungen.length === 0 && <li className="p-4 text-sm text-muted">Noch keine Zahlungen.</li>}
        {zahlungen.map((z) => (
          <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">{z.text || "—"}</div>
              <div className="text-sm text-muted">
                {z.datum.toLocaleDateString("de-CH")}
                {z.referenz && ` · Ref. ${z.referenz}`}
                {z.rechnungId && " · Rechnung zugeordnet ✓"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <strong className={z.betrag >= 0 ? "text-green-700" : "text-red-700"}>
                {z.betrag >= 0 ? "+" : "−"} CHF {chf(Math.abs(z.betrag))}
              </strong>
              <form action={deleteZahlung}>
                <input type="hidden" name="id" value={z.id} />
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
