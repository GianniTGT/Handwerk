export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createProjekt } from "@/lib/actions-projekte";
import { SUBSTATUS, stunden } from "@/lib/projekte";

const statusFarben: Record<string, string> = {
  OFFEN: "bg-amber-100 text-amber-800",
  AKTIV: "bg-blue-100 text-blue-800",
  ARCHIVIERT: "bg-surface2 text-muted",
};
const TABS: [string, string][] = [
  ["alle", "Alle"],
  ["offen", "Offen"],
  ["aktiv", "Aktiv"],
  ["archiviert", "Archiviert"],
];

export default async function ProjektePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", fehler } = await searchParams;
  const [projekte, kunden] = await Promise.all([
    db.projekt.findMany({
      where: { betriebId: betrieb.id },
      include: { kunde: true, zeiten: { select: { minuten: true } }, _count: { select: { auftraege: true } } },
      orderBy: { nummer: "desc" },
    }),
    db.kunde.findMany({ where: { betriebId: betrieb.id, archiviert: false }, orderBy: { name: "asc" } }),
  ]);
  const sichtbar = projekte.filter((p) => (filter === "alle" ? p.status !== "ARCHIVIERT" : p.status === filter.toUpperCase()));
  const feld = "rounded border border-line p-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">Projekte</h1>
      <p className="mt-1 text-sm text-muted">Baustellen und Objekte: Aufträge, Zeiten und Material an einem Ort, mit Nachkalkulation.</p>
      {fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte einen Projektnamen angeben.</p>}

      <form action={createProjekt} className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-4">
        <h2 className="font-semibold md:col-span-4">Neues Projekt</h2>
        <input name="name" required placeholder="Projektname (z.B. Heizungssanierung Seeblick)" className={`${feld} md:col-span-2`} />
        <select name="kundeId" className={feld}>
          <option value="">Internes Projekt (kein Kunde)</option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <select name="substatus" className={feld}>
          <option value="">Substatus …</option>
          {SUBSTATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="grid gap-0.5 text-xs text-muted">Start<input name="start" type="date" className={feld} /></label>
        <label className="grid gap-0.5 text-xs text-muted">Ende<input name="ende" type="date" className={feld} /></label>
        <input name="beschreibung" placeholder="Beschreibung" className={`${feld} md:col-span-2 md:self-end`} />
        <button className="rounded bg-forest p-2.5 text-sm font-semibold text-white hover:bg-forest-lift md:col-span-4">Projekt erstellen</button>
      </form>

      <div className="mt-4 flex gap-1 text-sm">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/projekte?filter=${key}`} className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            {label}
          </Link>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white">
        {sichtbar.length === 0 && <li className="p-4 text-sm text-muted">Keine Projekte.</li>}
        {sichtbar.map((p) => (
          <li key={p.id}>
            <Link href={`/projekte/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-surface2">
              <div>
                <div className="font-medium">P-{p.nummer} — {p.name}</div>
                <div className="text-sm text-muted">
                  {p.kunde?.name ?? "intern"}
                  {p.substatus && ` · ${p.substatus}`} · {p._count.auftraege} Auftrag/Aufträge · {stunden(p.zeiten.reduce((s, z) => s + z.minuten, 0))} h
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[p.status] ?? ""}`}>{p.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
