export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf, offerteNummer } from "@/lib/format";

export default async function SuchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { betrieb } = await sitzungErforderlich();
  const q = ((await searchParams).q ?? "").trim();

  if (!q) {
    return (
      <div>
        <h1 className="text-xl font-bold">Suche</h1>
        <p className="mt-2 text-sm text-muted">Suchbegriff oben eingeben.</p>
      </div>
    );
  }

  const enthaelt = { contains: q, mode: "insensitive" as const };
  const [kunden, offerten, auftraege, rechnungen, artikel] = await Promise.all([
    db.kunde.findMany({
      where: { betriebId: betrieb.id, OR: [{ name: enthaelt }, { ort: enthaelt }, { email: enthaelt }] },
      take: 10,
    }),
    db.offerte.findMany({
      where: { betriebId: betrieb.id, OR: [{ titel: enthaelt }, { kunde: { name: enthaelt } }] },
      include: { kunde: true },
      take: 10,
    }),
    db.auftrag.findMany({
      where: { betriebId: betrieb.id, OR: [{ titel: enthaelt }, { kunde: { name: enthaelt } }] },
      include: { kunde: true },
      take: 10,
    }),
    db.rechnung.findMany({
      where: { betriebId: betrieb.id, auftrag: { OR: [{ titel: enthaelt }, { kunde: { name: enthaelt } }] } },
      include: { auftrag: { include: { kunde: true } } },
      take: 10,
    }),
    db.artikel.findMany({
      where: { betriebId: betrieb.id, OR: [{ bezeichnung: enthaelt }, { artikelNr: enthaelt }] },
      take: 10,
    }),
  ]);

  const leer =
    !kunden.length && !offerten.length && !auftraege.length && !rechnungen.length && !artikel.length;

  const Block = ({ titel, children }: { titel: string; children: React.ReactNode }) => (
    <section className="rounded-tiff border border-line bg-white">
      <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">{titel}</h2>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );

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
                  RE-{r.nummer} — {r.auftrag.kunde.name}{" "}
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
