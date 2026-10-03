export const dynamic = "force-dynamic";

import { sitzungErforderlich } from "@/lib/auth";
import { EXPORT_TYPEN } from "@/lib/export";
import { darf } from "@/lib/rechte";
import ExportKarte from "@/components/ExportKarte";

export default async function ExportPage() {
  const { mitarbeiter } = await sitzungErforderlich();
  const typen = Object.entries(EXPORT_TYPEN).filter(([, d]) => !d.bereich || darf(mitarbeiter, d.bereich));

  return (
    <div>
      <h1 className="text-xl font-bold">Export</h1>
      <p className="mt-1 text-sm text-muted">
        Listen als CSV herunterladen (öffnet sich direkt in Excel, Trennzeichen «;»). Wo sinnvoll mit Zeitraum.
        Praktisch für den Treuhänder oder eigene Auswertungen.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {typen.map(([typ, d]) => (
          <ExportKarte key={typ} typ={typ} label={d.label} mitZeitraum={d.mitZeitraum} />
        ))}
      </div>
    </div>
  );
}
