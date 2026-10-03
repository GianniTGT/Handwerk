export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { lieferscheinNr } from "@/lib/nrtext";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  GELIEFERT: "bg-green-100 text-green-800",
};
const TABS: [string, string][] = [
  ["alle", "Alle"],
  ["entwurf", "Entwurf"],
  ["geliefert", "Geliefert"],
];

export default async function LieferscheinePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle" } = await searchParams;
  const lieferscheine = await db.lieferschein.findMany({
    where: { betriebId: betrieb.id, ...(filter !== "alle" ? { status: filter.toUpperCase() } : {}) },
    include: { auftrag: { include: { kunde: true } }, positionen: true },
    orderBy: [{ datum: "desc" }, { nummer: "desc" }],
  });

  return (
    <div>
      <h1 className="text-xl font-bold">Lieferscheine</h1>
      <p className="mt-1 text-sm text-muted">
        Lieferscheine entstehen aus einem Auftrag («Lieferschein erstellen» im Auftrag) und zeigen die gelieferten Positionen ohne Preise.
      </p>
      <div className="mt-4 flex gap-1 text-sm">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/lieferscheine?filter=${key}`} className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            {label}
          </Link>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white">
        {lieferscheine.length === 0 && <li className="p-4 text-sm text-muted">Keine Lieferscheine.</li>}
        {lieferscheine.map((l) => (
          <li key={l.id}>
            <Link href={`/lieferscheine/${l.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-surface2">
              <div>
                <div className="font-medium">{lieferscheinNr(l)} — {l.auftrag.kunde.name}</div>
                <div className="text-sm text-muted">
                  {l.datum.toLocaleDateString("de-CH")} · Auftrag #{l.auftrag.nummer} {l.auftrag.titel} · {l.positionen.length} Position(en)
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[l.status] ?? ""}`}>{l.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
