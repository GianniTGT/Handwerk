export const dynamic = "force-dynamic";

import { darf, type Bereich } from "@/lib/rechte";
import { rechnungNr } from "@/lib/nrtext";
import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf, offerteNummer } from "@/lib/format";

function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-tiff border border-line bg-white">
      <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">{titel}</h2>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

export default async function SuchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich();
  const q = ((await searchParams).q ?? "").trim();

  if (!q) {
    return (
      <div>
        <h1 className="text-xl font-bold">Suche</h1>
        <form className="mt-3 flex gap-2">
          <input name="q" autoFocus placeholder="Kontakte, Offerten, Aufträge, Rechnungen, Artikel …" className="w-full rounded border border-line p-2 text-sm" />
          <button className="rounded bg-forest px-4 text-sm font-semibold text-white">Suchen</button>
        </form>
      </div>
    );
  }

  const enthaelt = { contains: q, mode: "insensitive" as const };
  // Vetëm zonat për të cilat përdoruesi ka të drejtë
  const zona = (b: Bereich) => darf(mitarbeiter, b);
  const [kunden, offerten, auftraege, rechnungen, artikel] = await Promise.all([
    !zona("KONTAKTE") ? Promise.resolve([]) : db.kunde.findMany({
      where: { betriebId: betrieb.id, OR: [{ name: enthaelt }, { ort: enthaelt }, { email: enthaelt }] },
      take: 10,
    }),
    !zona("VERKAUF") ? Promise.resolve([]) : db.offerte.findMany({
      where: { betriebId: betrieb.id, OR: [{ titel: enthaelt }, { kunde: { name: enthaelt } }] },
      include: { kunde: true },
      take: 10,
    }),
    !zona("AUFTRAEGE") ? Promise.resolve([]) : db.auftrag.findMany({
      where: { betriebId: betrieb.id, OR: [{ titel: enthaelt }, { kunde: { name: enthaelt } }] },
      include: { kunde: true },
      take: 10,
    }),
    !zona("VERKAUF") ? Promise.resolve([]) : db.rechnung.findMany({
      where: { betriebId: betrieb.id, auftrag: { OR: [{ titel: enthaelt }, { kunde: { name: enthaelt } }] } },
      include: { auftrag: { include: { kunde: true } } },
      take: 10,
    }),
    !zona("PRODUKTE") ? Promise.resolve([]) : db.artikel.findMany({
      where: { betriebId: betrieb.id, OR: [{ bezeichnung: enthaelt }, { artikelNr: enthaelt }] },
      take: 10,
    }),
  ]);

  const leer =
    !kunden.length && !offerten.length && !auftraege.length && !rechnungen.length && !artikel.length;


  return (
    <div>
      <h1 className="text-xl font-bold">Suche: «{q}»</h1>
      {leer && <p className="mt-3 text-sm text-muted">Keine Treffer.</p>}
      <div className="mt-4 grid gap-4">
        {kunden.length > 0 && (
          <Block titel="Kontakte">
            {kunden.map((k) => (
              <li key={k.id}>
                <Link href={`/kunden/${k.id}`} className="block px-3 py-2 text-sm hover:bg-surface2">
                  {k.name} <span className="text-muted">· {k.plz} {k.ort}</span>
                </Link>
              </li>
            ))}
          </Block>
        )}
        {offerten.length > 0 && (
          <Block titel="Offerten">
            {offerten.map((o) => (
              <li key={o.id}>
                <Link href={`/offerten/${o.id}`} className="block px-3 py-2 text-sm hover:bg-surface2">
                  {offerteNummer(o)} — {o.titel} <span className="text-muted">· {o.kunde.name}</span>
                </Link>
              </li>
            ))}
          </Block>
        )}
        {auftraege.length > 0 && (
          <Block titel="Aufträge">
            {auftraege.map((a) => (
              <li key={a.id}>
                <Link href={`/auftraege/${a.id}`} className="block px-3 py-2 text-sm hover:bg-surface2">
                  #{a.nummer} — {a.titel} <span className="text-muted">· {a.kunde.name} · {a.status}</span>
                </Link>
              </li>
            ))}
          </Block>
        )}
        {rechnungen.length > 0 && (
          <Block titel="Rechnungen">
            {rechnungen.map((r) => (
              <li key={r.id}>
                <Link href="/rechnungen" className="block px-3 py-2 text-sm hover:bg-surface2">
                  {rechnungNr(r)} — {r.auftrag.kunde.name}{" "}
                  <span className="text-muted">· CHF {chf(r.totalBrutto)} · {r.status}</span>
                </Link>
              </li>
            ))}
          </Block>
        )}
        {artikel.length > 0 && (
          <Block titel="Produkte / Artikel">
            {artikel.map((a) => (
              <li key={a.id}>
                <Link href={`/artikel?q=${encodeURIComponent(a.bezeichnung)}`} className="block px-3 py-2 text-sm hover:bg-surface2">
                  {a.artikelNr && <span className="text-muted">{a.artikelNr} · </span>}
                  {a.bezeichnung}
                </Link>
              </li>
            ))}
          </Block>
        )}
      </div>
    </div>
  );
}
