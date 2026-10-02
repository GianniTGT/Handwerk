export const dynamic = "force-dynamic";

import { bestellungNr } from "@/lib/nrtext";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { createBestellung } from "@/lib/actions-bestellungen";

const statusFarben: Record<string, string> = {
  ENTWURF: "bg-amber-100 text-amber-800",
  BESTELLT: "bg-blue-100 text-blue-800",
  GELIEFERT: "bg-green-100 text-green-800",
};
const TABS: [string, string][] = [
  ["alle", "Alle"],
  ["entwurf", "Entwurf"],
  ["bestellt", "Bestellt"],
  ["geliefert", "Geliefert"],
];

export default async function BestellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; fehler?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const { filter = "alle", fehler } = await searchParams;
  const [bestellungen, lieferanten] = await Promise.all([
    db.bestellung.findMany({
      where: { betriebId: betrieb.id, ...(filter !== "alle" ? { status: filter.toUpperCase() } : {}) },
      include: { lieferant: true, positionen: true },
      orderBy: { nummer: "desc" },
    }),
    db.lieferant.findMany({ where: { betriebId: betrieb.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold">Bestellungen</h1>
      <p className="mt-1 text-sm text-muted">Material bei Lieferanten bestellen — Positionen aus dem Artikelstamm (Einkaufspreis) oder frei.</p>
      {fehler && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">Bitte einen Lieferanten wählen (Lieferanten unter «Produkte» anlegen).</p>}

      <form action={createBestellung} className="mt-4 grid gap-2 rounded-tiff border border-line bg-white p-4 shadow-sm md:grid-cols-[1fr_2fr_auto]">
        <select name="lieferantId" required className="rounded border border-line p-2 text-sm">
          <option value="">Lieferant …</option>
          {lieferanten.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <input name="bemerkung" placeholder="Bemerkung / Lieferadresse (optional)" className="rounded border border-line p-2 text-sm" />
        <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-lift">Neue Bestellung</button>
      </form>

      <div className="mt-4 flex gap-1 text-sm">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/bestellungen?filter=${key}`} className={`rounded-full border px-3 py-1 ${filter === key ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-surface2"}`}>
            {label}
          </Link>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-line rounded-tiff border border-line bg-white">
        {bestellungen.length === 0 && <li className="p-4 text-sm text-muted">Keine Bestellungen.</li>}
        {bestellungen.map((b) => (
          <li key={b.id}>
            <Link href={`/bestellungen/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-surface2">
              <div>
                <div className="font-medium">{bestellungNr(b)} — {b.lieferant.name}</div>
                <div className="text-sm text-muted">
                  {b.datum.toLocaleDateString("de-CH")} · {b.positionen.length} Position(en) · CHF{" "}
                  {chf(b.positionen.reduce((s, p) => s + p.menge * p.preis, 0))}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusFarben[b.status] ?? ""}`}>{b.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
