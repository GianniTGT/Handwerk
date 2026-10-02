export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createOfferte } from "@/lib/actions";
import { chf, offerteNummer } from "@/lib/format";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  GESENDET: "bg-blue-100 text-blue-800",
  ANGENOMMEN: "bg-green-100 text-green-800",
  ABGELEHNT: "bg-red-100 text-red-700",
};

export default async function OffertenPage() {
  const { betrieb } = await sitzungErforderlich();
  const [offerten, kunden] = await Promise.all([
    db.offerte.findMany({
      where: { betriebId: betrieb.id },
      include: { kunde: true, gruppen: { include: { positionen: true } } },
      orderBy: { nummer: "desc" },
    }),
    db.kunde.findMany({
      where: { betriebId: betrieb.id },
      include: { objekte: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const standardGueltigBis = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-xl font-bold">Offerten</h1>
        <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
          {offerten.map((o) => {
            const total = o.gruppen.flatMap((g) => g.positionen).reduce((s, p) => s + p.menge * p.ansatz, 0);
            return (
              <li key={o.id}>
                <Link href={`/offerten/${o.id}`} className="flex items-center justify-between p-3 hover:bg-surface2">
                  <div>
                    <div className="font-medium">
                      {offerteNummer(o)} — {o.titel}
                    </div>
                    <div className="text-sm text-muted">
                      {o.kunde.name} · CHF {chf(total)} · gültig bis {o.gueltigBis.toLocaleDateString("de-CH")}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[o.status] ?? ""}`}>
                    {o.status}
                  </span>
                </Link>
              </li>
            );
          })}
          {offerten.length === 0 && <li className="p-3 text-sm text-muted">Noch keine Offerten.</li>}
        </ul>
      </div>

      <form action={createOfferte} className="h-fit rounded-tiff border border-line bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Neue Offerte</h2>
        <div className="mt-3 grid gap-2">
          <select name="kundeId" required className="rounded border border-line p-2 text-sm">
            <option value="">Kunde wählen *</option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select name="objektId" className="rounded border border-line p-2 text-sm">
            <option value="">Objekt (optional)</option>
            {kunden.flatMap((k) =>
              k.objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {k.name} — {o.bezeichnung}
                </option>
              ))
            )}
          </select>
          <input name="titel" required placeholder="Titel (z.B. Anschlüsse neue Pumpen) *" className="rounded border border-line p-2 text-sm" />
          <label className="grid gap-1 text-xs text-muted">
            Gültig bis
            <input name="gueltigBis" type="date" defaultValue={standardGueltigBis} className="rounded border border-line p-2 text-sm text-ink" />
          </label>
          <button className="rounded bg-forest p-2 text-sm font-medium text-white hover:bg-forest-lift">
            Offerte erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
