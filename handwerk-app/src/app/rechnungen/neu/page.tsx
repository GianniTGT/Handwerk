export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { createRechnung } from "@/lib/actions";

// Rechnungen entstehen aus Aufträgen: hier die Aufträge wählen, die noch keine Schlussrechnung haben
export default async function NeueRechnung() {
  const { betrieb } = await sitzungErforderlich();
  const auftraege = await db.auftrag.findMany({
    where: { betriebId: betrieb.id, status: { in: ["ERLEDIGT", "IN_ARBEIT", "OFFEN"] }, rechnungen: { none: { art: "SCHLUSS" } } },
    include: { kunde: true, rapporte: { include: { positionen: true } }, rechnungen: true },
    orderBy: [{ status: "asc" }, { nummer: "desc" }],
  });
  const mitWert = auftraege
    .map((a) => ({
      a,
      netto: a.rapporte.flatMap((r) => r.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0),
    }))
    .filter((x) => x.netto > 0);
  const bereit = mitWert.filter((x) => x.a.status === "ERLEDIGT");
  const weitere = mitWert.filter((x) => x.a.status !== "ERLEDIGT");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/rechnungen" className="text-sm text-forest underline">← Rechnungen</Link>
      <h1 className="mt-1 text-xl font-bold">Neue Rechnung</h1>
      <p className="mt-1 text-sm text-muted">
        Rechnungen werden aus einem Auftrag erstellt (die Positionen kommen aus dem Rapport). Wählen Sie den Auftrag — oder{" "}
        <Link href="/auftraege/neu" className="text-forest underline">erstellen Sie zuerst einen Auftrag</Link>.
      </p>
      <Liste titel="Erledigt — bereit zum Verrechnen" liste={bereit} />
      <Liste titel="Noch in Arbeit (z. B. für Akonto/Anzahlung)" liste={weitere} />
    </div>
  );
}

// Auftragsliste mit «Rechnung erstellen» (auf Modulebene, damit React die Komponente nicht bei jedem Render neu anlegt)
type Zeile = { a: { id: string; nummer: number; titel: string; kunde: { name: string }; rechnungen: unknown[] }; netto: number };
function Liste({ titel, liste }: { titel: string; liste: Zeile[] }) {
  return (
    <section className="mt-4">
      <h2 className="font-semibold">{titel}</h2>
      <ul className="mt-2 divide-y divide-line rounded-tiff border border-line bg-white">
        {liste.length === 0 && <li className="p-3 text-sm text-muted">Keine Aufträge.</li>}
        {liste.map(({ a, netto }) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <Link href={`/auftraege/${a.id}`} className="font-medium hover:underline">#{a.nummer} — {a.titel}</Link>
              <div className="text-muted">
                {a.kunde.name} · netto CHF {chf(netto)}
                {a.rechnungen.length > 0 && ` · bereits ${a.rechnungen.length} Akonto-Rechnung(en)`}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/auftraege/${a.id}`} className="rounded border border-line px-3 py-1.5 text-xs hover:bg-surface2">Akonto / Details</Link>
              <form action={createRechnung}>
                <input type="hidden" name="auftragId" value={a.id} />
                <button className="rounded bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-lift">
                  ⚡ {a.rechnungen.length > 0 ? "Schlussrechnung" : "Rechnung"} erstellen
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
