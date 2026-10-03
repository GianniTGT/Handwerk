export const dynamic = "force-dynamic";

import Link from "next/link";
import { Ik } from "@/components/Icons";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { createLieferant, deleteKondition, setKondition } from "@/lib/actions";

export default async function LieferantenPage() {
  const { betrieb } = await sitzungErforderlich();
  const [lieferanten, konditionen] = await Promise.all([
    db.lieferant.findMany({
      where: { betriebId: betrieb.id },
      include: { _count: { select: { artikel: true, bestellungen: true } } },
      orderBy: { name: "asc" },
    }),
    db.kondition.findMany({
      where: { betriebId: betrieb.id },
      include: { lieferant: true },
      orderBy: [{ lieferantId: "asc" }, { rabattgruppe: "asc" }],
    }),
  ]);
  const feld = "w-full rounded border border-line bg-white p-2 text-sm";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/artikel" className="text-sm text-forest underline">← Produkte</Link>
      <h1 className="mt-1 text-xl font-bold">Lieferanten &amp; Konditionen</h1>
      <p className="mt-1 text-sm text-muted">
        Der Einkaufspreis eines Katalogartikels ergibt sich aus Bruttopreis − Rabatt der Rabattgruppe beim Lieferanten.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Lieferanten</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {lieferanten.length === 0 && <li className="py-2 text-muted">Noch keine Lieferanten.</li>}
            {lieferanten.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{l.name}</span>
                <span className="text-xs text-muted">{l._count.artikel} Artikel · {l._count.bestellungen} Bestellungen</span>
              </li>
            ))}
          </ul>
          <form action={createLieferant} className="mt-3 flex gap-2">
            <input name="name" required placeholder="z.B. Debrunner Acifer" className={feld} />
            <button className="rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-lift">＋</button>
          </form>
        </section>

        <section className="rounded-tiff border border-line bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Konditionen (Rabatte)</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {konditionen.length === 0 && <li className="py-2 text-muted">Noch keine Konditionen.</li>}
            {konditionen.map((k) => (
              <li key={k.id} className="flex items-center justify-between py-2">
                <span>{k.lieferant.name} · RG «{k.rabattgruppe || "—"}»</span>
                <span className="flex items-center gap-2">
                  <strong>−{k.rabattProzent}%</strong>
                  <form action={deleteKondition}>
                    <input type="hidden" name="konditionId" value={k.id} />
                    <button className="text-muted hover:text-red-600" aria-label="Löschen"><Ik name="x" className="mr-0" /></button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
          <form action={setKondition} className="mt-3 grid grid-cols-[1fr_1fr_5rem_auto] gap-2">
            <select name="lieferantId" required className={feld}>
              <option value="">Lieferant …</option>
              {lieferanten.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <input name="rabattgruppe" placeholder="Rabattgruppe" className={feld} />
            <input name="rabattProzent" type="number" step="0.1" min="0" max="100" required placeholder="%" className={feld} />
            <button className="rounded-md bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-lift">OK</button>
          </form>
        </section>
      </div>
    </div>
  );
}
