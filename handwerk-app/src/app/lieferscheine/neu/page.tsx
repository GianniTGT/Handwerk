export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { FormularSeite, KOPF, Leer, Tabelle, ZEILEN } from "@/components/Liste";

// Ein Lieferschein gehört immer zu einem Auftrag: hier den Auftrag wählen, die Positionen werden im Auftrag angekreuzt
export default async function NeuerLieferschein() {
  const { betrieb } = await sitzungErforderlich();
  const auftraege = await db.auftrag.findMany({
    where: { betriebId: betrieb.id, status: { not: "VERRECHNET" } },
    include: { kunde: true, rapporte: { include: { positionen: true } }, _count: { select: { lieferscheine: true } } },
    orderBy: { nummer: "desc" },
    take: 200,
  });
  const mitPositionen = auftraege.map((a) => ({ a, positionen: a.rapporte.reduce((s, r) => s + r.positionen.length, 0) }));

  return (
    <FormularSeite
      zurueckHref="/lieferscheine"
      zurueckLabel="Lieferscheine"
      titel="Neuer Lieferschein"
      untertitel="Auftrag wählen — im Auftrag kreuzen Sie an, welche Rapport-Positionen geliefert wurden."
      breit
    >
      <Tabelle>
        <thead className={KOPF}>
          <tr>
            <th className="p-2">Auftrag</th>
            <th className="p-2">Kontakt</th>
            <th className="hidden p-2 text-right sm:table-cell">Positionen</th>
            <th className="hidden p-2 text-right sm:table-cell">Lieferscheine</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody className={ZEILEN}>
          {mitPositionen.map(({ a, positionen }) => (
            <tr key={a.id} className="hover:bg-surface2">
              <td className="p-2 font-medium">#{a.nummer} {a.titel}</td>
              <td className="p-2">{a.kunde.name}</td>
              <td className="hidden p-2 text-right tabular-nums sm:table-cell">{positionen}</td>
              <td className="hidden p-2 text-right tabular-nums sm:table-cell">{a._count.lieferscheine}</td>
              <td className="p-2 text-right">
                {positionen > 0 ? (
                  <Link href={`/auftraege/${a.id}?lieferschein=1`} className="whitespace-nowrap text-sm font-medium text-forest hover:underline">
                    Lieferschein erstellen →
                  </Link>
                ) : (
                  <Link href={`/auftraege/${a.id}`} className="whitespace-nowrap text-xs text-muted hover:underline">
                    noch keine Positionen
                  </Link>
                )}
              </td>
            </tr>
          ))}
          {mitPositionen.length === 0 && (
            <Leer colSpan={5}>
              Keine offenen Aufträge. <Link href="/auftraege/neu" className="text-forest underline">Neuen Auftrag erstellen</Link>
            </Leer>
          )}
        </tbody>
      </Tabelle>
    </FormularSeite>
  );
}
