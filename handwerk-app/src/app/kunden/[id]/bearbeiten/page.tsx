export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { saveKunde } from "@/lib/actions-kontakte";
import KundeFelder from "@/components/KundeFelder";

export default async function KontaktBearbeiten({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { id } = await params;
  const { fehler } = await searchParams;
  const [kunde, team] = await Promise.all([
    db.kunde.findFirst({ where: { id, betriebId: betrieb.id } }),
    db.mitarbeiter.findMany({
      where: { betriebId: betrieb.id, aktiv: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!kunde) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/kunden/${kunde.id}`} className="text-sm text-forest underline">← {kunde.name}</Link>
      <h1 className="mt-1 text-xl font-bold">Kontakt bearbeiten</h1>
      {fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{fehler === "nr" ? "Diese Kontakt-Nr. ist bereits vergeben." : "Bitte Firma bzw. Nachname angeben."}</p>}
      <form action={saveKunde} className="mt-4">
        <input type="hidden" name="kundeId" value={kunde.id} />
        <KundeFelder k={kunde} team={team} />
        <div className="sticky bottom-0 -mx-4 mt-4 flex gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-tiff md:border">
          <button className="rounded bg-forest px-5 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Speichern</button>
          <Link href={`/kunden/${kunde.id}`} className="rounded border border-line bg-white px-5 py-2 text-sm hover:bg-surface2">Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}
