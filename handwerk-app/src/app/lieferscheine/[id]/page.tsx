export const dynamic = "force-dynamic";

import Link from "next/link";
import { SPEICHERLEISTE } from "@/components/Liste";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { lieferscheinNr } from "@/lib/nrtext";
import { deleteLieferschein, setLieferscheinStatus } from "@/lib/actions-lieferscheine";

export default async function LieferscheinDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { id } = await params;
  const { fehler } = await searchParams;
  const l = await db.lieferschein.findFirst({
    where: { id, betriebId: betrieb.id },
    include: { positionen: true, auftrag: { include: { kunde: true } } },
  });
  if (!l) notFound();

  return (
    <div>
      <Link href="/lieferscheine" className="text-sm text-forest underline">← Lieferscheine</Link>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Lieferschein {lieferscheinNr(l)}</h1>
          <p className="text-sm text-muted">
            {l.auftrag.kunde.name} ·{" "}
            <Link href={`/auftraege/${l.auftragId}`} className="underline">Auftrag #{l.auftrag.nummer}</Link> ·{" "}
            {l.datum.toLocaleDateString("de-CH")} · {l.status}
            {l.bemerkung && ` · ${l.bemerkung}`}
          </p>
        </div>
      </div>
      {fehler === "gesperrt" && (
        <p className="mt-3 rounded bg-amber-100 p-2 text-sm text-amber-800">Gelieferte Lieferscheine können nicht gelöscht werden. Zuerst wieder öffnen.</p>
      )}

      <table className="mt-4 w-full rounded-tiff border border-line bg-white text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-muted">
            <th className="p-2">Bezeichnung</th>
            <th className="p-2 text-right">Menge</th>
            <th className="p-2">Einheit</th>
          </tr>
        </thead>
        <tbody>
          {l.positionen.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <td className="p-2">{p.bezeichnung}</td>
              <td className="p-2 text-right">{p.menge}</td>
              <td className="p-2">{p.einheit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {l.status === "ENTWURF" && (
        <form action={deleteLieferschein} className="mt-4">
          <input type="hidden" name="id" value={l.id} />
          <button className="rounded border border-line px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">Lieferschein löschen</button>
        </form>
      )}

      <div className={SPEICHERLEISTE}>
                <a href={`/api/lieferscheine/${l.id}`} target="_blank" className="rounded bg-forest px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-lift">📄 PDF</a>
                <form action={setLieferscheinStatus}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value={l.status === "ENTWURF" ? "GELIEFERT" : "ENTWURF"} />
                  <button className="rounded border border-forest px-3 py-1.5 text-sm font-medium text-forest hover:bg-surface2">
                    {l.status === "ENTWURF" ? "Als geliefert markieren" : "Wieder öffnen"}
                  </button>
                </form>
              </div>
    </div>
  );
}
