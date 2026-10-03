export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { saveKunde } from "@/lib/actions-kontakte";
import KundeFelder from "@/components/KundeFelder";

export default async function NeuerKontakt({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const { fehler } = await searchParams;
  const letzte = await db.kunde.aggregate({ where: { betriebId: betrieb.id }, _max: { kontaktNr: true } });
  const team = await db.mitarbeiter.findMany({
    where: { betriebId: betrieb.id, aktiv: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/kunden" className="text-sm text-forest underline">← Kontakte</Link>
      <h1 className="mt-1 text-xl font-bold">Neuer Kontakt</h1>
      {fehler && (
        <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{fehler === "nr" ? "Diese Kontakt-Nr. ist bereits vergeben." : "Bitte Firma bzw. Nachname angeben."}</p>
      )}
      <form action={saveKunde} className="mt-4">
        <KundeFelder k={{ ansprechpartnerId: mitarbeiter.id, kontaktNr: (letzte._max.kontaktNr ?? 0) + 1 }} team={team} />
        <div className="sticky bottom-0 -mx-4 mt-4 flex gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-tiff md:border">
          <button className="rounded bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
          <Link href="/kunden" className="rounded border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}
