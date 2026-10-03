export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createOfferte } from "@/lib/actions";
import { lokalIso } from "@/lib/datum";
import KundeObjektWahl from "@/components/KundeObjektWahl";
import { SPEICHERLEISTE } from "@/components/Liste";

export default async function NeueOfferte({ searchParams }: { searchParams: Promise<{ kunde?: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const { kunde } = await searchParams;
  const kunden = await db.kunde.findMany({
    where: { betriebId: betrieb.id, archiviert: false },
    select: { id: true, name: true, objekte: { select: { id: true, bezeichnung: true } } },
    orderBy: { name: "asc" },
  });
  const feld = "w-full rounded border border-line bg-white p-2 text-sm";
  const in14Tagen = new Date();
  in14Tagen.setDate(in14Tagen.getDate() + 14);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/offerten" className="text-sm text-forest underline">← Offerten</Link>
      <h1 className="mt-1 text-xl font-bold">Neue Offerte</h1>
      <form action={createOfferte} className="mt-4">
        <div className="grid gap-3 rounded-tiff border border-line bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <KundeObjektWahl kunden={kunden} startKundeId={kunden.some((k) => k.id === kunde) ? kunde : ""} />
        <label className="grid gap-0.5 text-xs text-muted">
          Titel *
          <input name="titel" required placeholder="z.B. Anschlüsse neue Pumpen" className={feld} />
        </label>
        <label className="grid gap-0.5 text-xs text-muted">
          Gültig bis
          <input name="gueltigBis" type="date" defaultValue={lokalIso(in14Tagen)} className={feld} />
        </label>
        </div>
        <div className={SPEICHERLEISTE}>
          <button className="rounded-md bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Offerte erstellen</button>
          <Link href="/offerten" className="rounded-md border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">Abbrechen</Link>
          <Link href="/kunden/neu" className="ml-auto text-xs text-forest underline">Kontakt fehlt? Neu anlegen</Link>
        </div>
      </form>
    </div>
  );
}
