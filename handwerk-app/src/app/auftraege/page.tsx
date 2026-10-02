export const dynamic = "force-dynamic";

import Link from "next/link";
import { db, aktuellerBetrieb } from "@/lib/db";
import { createAuftrag } from "@/lib/actions";

const statusFarben: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-800",
  IN_ARBEIT: "bg-blue-100 text-blue-800",
  ERLEDIGT: "bg-green-100 text-green-800",
  VERRECHNET: "bg-slate-200 text-slate-600",
};

export default async function AuftraegePage() {
  const betrieb = await aktuellerBetrieb();
  const [auftraege, kunden] = await Promise.all([
    db.auftrag.findMany({
      where: { betriebId: betrieb.id },
      include: { kunde: true, objekt: true },
      orderBy: { nummer: "desc" },
    }),
    db.kunde.findMany({
      where: { betriebId: betrieb.id },
      include: { objekte: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-xl font-bold">Aufträge</h1>
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {auftraege.map((a) => (
            <li key={a.id}>
              <Link href={`/auftraege/${a.id}`} className="flex items-center justify-between p-3 hover:bg-slate-50">
                <div>
                  <div className="font-medium">
                    #{a.nummer} — {a.titel}
                  </div>
                  <div className="text-sm text-slate-500">
                    {a.kunde.name}
                    {a.objekt && ` · ${a.objekt.bezeichnung}`}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[a.status] ?? ""}`}>
                  {a.status}
                </span>
              </Link>
            </li>
          ))}
          {auftraege.length === 0 && (
            <li className="p-3 text-sm text-slate-500">Noch keine Aufträge.</li>
          )}
        </ul>
      </div>

      <form action={createAuftrag} className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Neuer Auftrag</h2>
        <div className="mt-3 grid gap-2">
          <select name="kundeId" required className="rounded border border-slate-300 p-2 text-sm">
            <option value="">Kunde wählen *</option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select name="objektId" className="rounded border border-slate-300 p-2 text-sm">
            <option value="">Objekt (optional)</option>
            {kunden.flatMap((k) =>
              k.objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {k.name} — {o.bezeichnung}
                </option>
              ))
            )}
          </select>
          <input name="titel" required placeholder="Titel (z.B. Boiler entkalken) *" className="rounded border border-slate-300 p-2 text-sm" />
          <textarea name="beschreibung" placeholder="Beschreibung" rows={3} className="rounded border border-slate-300 p-2 text-sm" />
          <button className="rounded bg-slate-900 p-2 text-sm font-medium text-white hover:bg-slate-700">
            Auftrag erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
