export const dynamic = "force-dynamic";

import Link from "next/link";
import { db, aktuellerBetrieb } from "@/lib/db";
import { createKunde } from "@/lib/actions";

export default async function KundenPage() {
  const betrieb = await aktuellerBetrieb();
  const kunden = await db.kunde.findMany({
    where: { betriebId: betrieb.id },
    include: { objekte: true, auftraege: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-xl font-bold">Kunden</h1>
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {kunden.map((k) => (
            <li key={k.id}>
              <Link href={`/kunden/${k.id}`} className="block p-3 hover:bg-slate-50">
                <div className="font-medium">{k.name}</div>
                <div className="text-sm text-slate-500">
                  {k.strasse}, {k.plz} {k.ort} · {k.objekte.length} Objekt(e) ·{" "}
                  {k.auftraege.length} Auftrag/Aufträge
                </div>
              </Link>
            </li>
          ))}
          {kunden.length === 0 && (
            <li className="p-3 text-sm text-slate-500">Noch keine Kunden.</li>
          )}
        </ul>
      </div>

      <form
        action={createKunde}
        className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="font-semibold">Neuer Kunde</h2>
        <div className="mt-3 grid gap-2">
          <input name="name" required placeholder="Name *" className="rounded border border-slate-300 p-2 text-sm" />
          <input name="strasse" placeholder="Strasse" className="rounded border border-slate-300 p-2 text-sm" />
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <input name="plz" placeholder="PLZ" className="rounded border border-slate-300 p-2 text-sm" />
            <input name="ort" placeholder="Ort" className="rounded border border-slate-300 p-2 text-sm" />
          </div>
          <input name="telefon" placeholder="Telefon" className="rounded border border-slate-300 p-2 text-sm" />
          <input name="email" type="email" placeholder="E-Mail" className="rounded border border-slate-300 p-2 text-sm" />
          <button className="mt-1 rounded bg-slate-900 p-2 text-sm font-medium text-white hover:bg-slate-700">
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
