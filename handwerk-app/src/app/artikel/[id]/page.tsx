export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import { chf } from "@/lib/format";
import { einkaufsPreis, marge, verkaufsPreis } from "@/lib/preise";
import ArtikelForm from "@/components/ArtikelForm";

export default async function ProduktBearbeiten({ params }: { params: Promise<{ id: string }> }) {
  const { betrieb } = await sitzungErforderlich();
  const { id } = await params;
  const [a, lieferanten, konditionen] = await Promise.all([
    db.artikel.findFirst({ where: { id, betriebId: betrieb.id } }),
    db.lieferant.findMany({ where: { betriebId: betrieb.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.kondition.findMany({ where: { betriebId: betrieb.id } }),
  ]);
  if (!a) notFound();
  const ek = einkaufsPreis(a, konditionen);
  const vk = verkaufsPreis(a, konditionen);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/artikel" className="text-sm text-forest underline">← Produkte</Link>
      <h1 className="mt-1 text-xl font-bold">{a.bezeichnung}</h1>
      <p className="mt-1 text-sm text-muted">
        EK CHF {chf(ek)} · VK CHF {chf(vk)} · Marge {marge(ek, vk)}%
        {a.lieferantId && a.bruttoPreis > 0 && ` · Katalogpreis brutto CHF ${chf(a.bruttoPreis)}`}
      </p>
      <div className="mt-4">
        <ArtikelForm
          a={{ ...a, lieferantIstKatalog: !!a.lieferantId && a.bruttoPreis > 0 }}
          lieferanten={lieferanten}
          abbrechenHref="/artikel"
        />
      </div>
    </div>
  );
}
