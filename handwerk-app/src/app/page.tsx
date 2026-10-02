export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";

export default async function Dashboard() {
  const { betrieb } = await sitzungErforderlich();
  const [kunden, offene, erledigte, rechnungen] = await Promise.all([
    db.kunde.count({ where: { betriebId: betrieb.id } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: { in: ["OFFEN", "IN_ARBEIT"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: "ERLEDIGT" } }),
    db.rechnung.count({ where: { betriebId: betrieb.id, status: { not: "BEZAHLT" } } }),
  ]);

  const karten = [
    { label: "Kunden", wert: kunden, href: "/kunden" },
    { label: "Offene Aufträge", wert: offene, href: "/auftraege" },
    { label: "Erledigt — bereit zum Verrechnen", wert: erledigte, href: "/auftraege" },
    { label: "Offene Rechnungen", wert: rechnungen, href: "/rechnungen" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">{betrieb.name}</h1>
      <p className="mt-1 text-sm text-muted">
        Vom Rapport zur QR-Rechnung in 5 Minuten.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {karten.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-tiff border border-line bg-white p-4 shadow-sm hover:border-forest"
          >
            <div className="text-3xl font-bold">{k.wert}</div>
            <div className="mt-1 text-sm text-muted">{k.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-tiff border border-dashed border-line bg-white p-4 text-sm text-muted">
        <strong>Nächste Schritte im MVP:</strong> Foto-Upload im Rapport, Wartungsverträge mit
        Erinnerungen, Artikel-Import (CSV/IGH), Login & Mandanten-Trennung, PWA offline.
      </div>
    </div>
  );
}
