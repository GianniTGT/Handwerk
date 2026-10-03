export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sitzungErforderlich } from "@/lib/auth";
import ArtikelForm from "@/components/ArtikelForm";

export default async function NeuesProdukt() {
  const { betrieb } = await sitzungErforderlich();
  const lieferanten = await db.lieferant.findMany({
    where: { betriebId: betrieb.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/artikel" className="text-sm text-forest underline">← Produkte</Link>
      <h1 className="mt-1 text-xl font-bold">Neues Produkt</h1>
      <div className="mt-4">
        <ArtikelForm lieferanten={lieferanten} abbrechenHref="/artikel" />
      </div>
    </div>
  );
}
