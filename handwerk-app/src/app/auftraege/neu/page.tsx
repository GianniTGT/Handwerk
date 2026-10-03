export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createAuftrag } from "@/lib/actions";
import { projektNr } from "@/lib/nrtext";
import KundeObjektWahl from "@/components/KundeObjektWahl";

export default async function NeuerAuftrag({ searchParams }: { searchParams: Promise<{ kunde?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const { kunde } = await searchParams;
  const [kunden, projekte] = await Promise.all([
    db.kunde.findMany({
      where: { betriebId: betrieb.id, archiviert: false },
      select: { id: true, name: true, objekte: { select: { id: true, bezeichnung: true } } },
      orderBy: { name: "asc" },
    }),
    db.projekt.findMany({ where: { betriebId: betrieb.id, status: { not: "ARCHIVIERT" } }, orderBy: { nummer: "desc" } }),
  ]);
  const feld = "w-full rounded border border-line bg-white p-2 text-sm";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/auftraege" className="text-sm text-forest underline">← Aufträge</Link>
      <h1 className="mt-1 text-xl font-bold">Neuer Auftrag</h1>
      <form action={createAuftrag} className="mt-4 grid gap-3 rounded-tiff border border-line bg-white p-4 shadow-sm sm:grid-cols-2">
        <KundeObjektWahl kunden={kunden} startKundeId={kunden.some((k) => k.id === kunde) ? kunde : ""} />
        <label className="grid gap-0.5 text-xs text-muted sm:col-span-2">
          Titel *
          <input name="titel" required placeholder="z.B. Boiler entkalken" className={feld} />
        </label>
        <label className="grid gap-0.5 text-xs text-muted sm:col-span-2">
          Beschreibung
          <textarea name="beschreibung" rows={3} className={feld} />
        </label>
        {projekte.length > 0 && (
          <label className="grid gap-0.5 text-xs text-muted sm:col-span-2">
            Projekt (optional)
            <select name="projektId" className={feld} defaultValue="">
              <option value="">— kein Projekt —</option>
              {projekte.map((p) => (
                <option key={p.id} value={p.id}>{projektNr(p)} {p.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-end gap-2 sm:col-span-2">
          <button className="rounded bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Auftrag erstellen</button>
          <Link href="/auftraege" className="rounded border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">Abbrechen</Link>
          <Link href="/kunden/neu" className="ml-auto text-xs text-forest underline">Kontakt fehlt? Neu anlegen</Link>
        </div>
      </form>
    </div>
  );
}
