export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { deleteGutschrift } from "@/lib/actions-verkauf";

export default async function GutschriftenPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const sp = await searchParams;
  const gutschriften = await db.gutschrift.findMany({
    where: { betriebId: betrieb.id },
    include: { rechnung: { include: { auftrag: { include: { kunde: true } } } } },
    orderBy: { nummer: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-bold">Gutschriften</h1>
      <p className="mt-1 text-sm text-muted">
        Gutschriften werden in der Rechnungsliste mit «Gutschrift» zu einer Rechnung erstellt und verringern deren offenen Betrag.
      </p>
      {sp.gespeichert && <p className="mt-3 rounded bg-green-100 p-2 text-sm text-green-800">Gutschrift erstellt ✓</p>}

      <ul className="mt-4 divide-y divide-line rounded-tiff border border-line bg-white">
        {gutschriften.length === 0 && <li className="p-4 text-sm text-muted">Noch keine Gutschriften.</li>}
        {gutschriften.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <div className="font-medium">
                GS-{g.nummer} — {g.rechnung.auftrag.kunde.name}
              </div>
              <div className="text-sm text-muted">
                zu RE-{g.rechnung.nummer} · {g.datum.toLocaleDateString("de-CH")}
                {g.grund && ` · ${g.grund}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <strong>CHF {chf(g.totalBrutto)}</strong>
              <a href={`/api/gutschriften/${g.id}`} target="_blank" className="rounded bg-forest px-2 py-1 text-xs font-medium text-white hover:bg-forest-lift">
                📄 PDF
              </a>
              <form action={deleteGutschrift}>
                <input type="hidden" name="id" value={g.id} />
                <button className="rounded border border-line px-2 py-1 text-xs text-red-700 hover:bg-red-50">Löschen</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
