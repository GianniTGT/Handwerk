export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { TIFF } from "@/lib/tiff";

export default async function Dashboard() {
  const { betrieb } = await sitzungErforderlich();
  const in30Tagen = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [kunden, offerten, offene, erledigte, rechnungen, wartungen] = await Promise.all([
    db.kunde.count({ where: { betriebId: betrieb.id } }),
    db.offerte.count({ where: { betriebId: betrieb.id, status: { in: ["ENTWURF", "GESENDET"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: { in: ["OFFEN", "IN_ARBEIT"] } } }),
    db.auftrag.count({ where: { betriebId: betrieb.id, status: "ERLEDIGT" } }),
    db.rechnung.count({ where: { betriebId: betrieb.id, status: { not: "BEZAHLT" } } }),
    db.wartungsvertrag.count({
      where: { betriebId: betrieb.id, status: "AKTIV", naechsteWartung: { lte: in30Tagen } },
    }),
  ]);

  const karten = [
    { label: "Kontakte", wert: kunden, href: "/kunden" },
    { label: "Offene Offerten", wert: offerten, href: "/offerten" },
    { label: "Offene Aufträge", wert: offene, href: "/auftraege" },
    { label: "Bereit zum Verrechnen", wert: erledigte, href: "/auftraege" },
    { label: "Offene Rechnungen", wert: rechnungen, href: "/rechnungen" },
    { label: "Fällige Wartungen (30 Tage)", wert: wartungen, href: "/wartung" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">{betrieb.name} — vom Rapport zur QR-Rechnung in 5 Minuten.</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-tiff border border-line bg-white px-4 py-2 text-sm shadow-sm">
        <span className="font-semibold">Support · {TIFF.name}</span>
        <a href={`mailto:${TIFF.supportEmail}`} className="text-forest underline">
          ✉ {TIFF.supportEmail}
        </a>
        <a href={`tel:${TIFF.supportTelefon.replace(/\s/g, "")}`} className="text-forest underline">
          ☎ {TIFF.supportTelefon}
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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

      {/* «Erste Schritte» — struktura e njohur nga bexio */}
      <section className="mt-8 rounded-tiff border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Erste Schritte</h2>
        <ol className="mt-3 grid gap-3 text-sm">
          <li>
            1.{" "}
            <Link href="/kunden" className="font-medium text-forest underline">
              Kontakt erstellen
            </Link>
            <span className="text-muted"> — Dies kann ein Kunde mit seinen Objekten/Anlagen sein</span>
          </li>
          <li>
            2.{" "}
            <Link href="/artikel" className="font-medium text-forest underline">
              Produkte & Artikel importieren
            </Link>
            <span className="text-muted"> — CSV vom Lieferanten (Debrunner, Meier Tobler…) mit Ihren Rabatten</span>
          </li>
          <li>
            3. Schreiben Sie{" "}
            <Link href="/offerten" className="font-medium text-forest underline">
              eine Offerte
            </Link>{" "}
            <span className="text-muted">oder direkt</span>{" "}
            <Link href="/auftraege" className="font-medium text-forest underline">
              einen Auftrag mit Rapport & Rechnung
            </Link>
          </li>
        </ol>
      </section>

      {/* «Schnelleinstellungen» — si te bexio */}
      <section className="mt-4 rounded-tiff border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Schnelleinstellungen</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/einstellungen" className="font-medium text-forest underline">
            Firmenprofil &amp; Logo
          </Link>
          <Link href="/einstellungen" className="font-medium text-forest underline">
            Druck-Layout (Farben der Dokumente)
          </Link>
          <Link href="/artikel" className="font-medium text-forest underline">
            Datenimport (Artikel-CSV)
          </Link>
        </div>
      </section>
    </div>
  );
}
