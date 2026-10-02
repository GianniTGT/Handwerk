export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { setRechnungStatus } from "@/lib/actions";

const chf = (n: number) =>
  n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  VERSENDET: "bg-blue-100 text-blue-800",
  BEZAHLT: "bg-green-100 text-green-800",
};

export default async function RechnungenPage() {
  const { betrieb } = await sitzungErforderlich();
  const rechnungen = await db.rechnung.findMany({
    where: { betriebId: betrieb.id },
    include: { auftrag: { include: { kunde: true } } },
    orderBy: { nummer: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-bold">Rechnungen</h1>
      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {rechnungen.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">
                Rechnung #{r.nummer} — {r.auftrag.kunde.name}
              </div>
              <div className="text-sm text-muted">
                Auftrag #{r.auftrag.nummer} · {r.datum.toLocaleDateString("de-CH")} · netto CHF{" "}
                {chf(r.totalNetto)} · <strong>brutto CHF {chf(r.totalBrutto)}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[r.status] ?? ""}`}>
                {r.status}
              </span>
              <a
                href={`/api/rechnungen/${r.id}/pdf`}
                className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-lift"
              >
                📄 PDF mit QR
              </a>
              {r.status !== "BEZAHLT" && (
                <form action={setRechnungStatus}>
                  <input type="hidden" name="rechnungId" value={r.id} />
                  <input type="hidden" name="status" value={r.status === "ENTWURF" ? "VERSENDET" : "BEZAHLT"} />
                  <button className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface2">
                    {r.status === "ENTWURF" ? "Als versendet markieren" : "Als bezahlt markieren"}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
        {rechnungen.length === 0 && (
          <li className="p-3 text-sm text-muted">
            Noch keine Rechnungen — erstelle sie direkt aus einem Auftrag.
          </li>
        )}
      </ul>
    </div>
  );
}
