"use server";

// Server actions për Lieferscheine (fletë-dorëzimi nga një Auftrag, pa çmime).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { vergibNummer } from "./nummern";

export async function createLieferschein(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const auftragId = String(formData.get("auftragId"));
  const auftrag = await db.auftrag.findFirst({
    where: { id: auftragId, betriebId: betrieb.id },
    include: { rapporte: { include: { positionen: true } } },
  });
  if (!auftrag) throw new Error("Auftrag nicht gefunden");

  // Pozicionet e zgjedhura (vetëm nga rapportet e këtij Auftrag-u)
  const gewaehlt = new Set(formData.getAll("positionId").map(String));
  const positionen = auftrag.rapporte.flatMap((r) => r.positionen).filter((p) => gewaehlt.has(p.id));
  if (positionen.length === 0) redirect(`/auftraege/${auftragId}?fehler=lieferschein-leer`);

  const nr = await vergibNummer(betrieb.id, "LIEFERSCHEIN");
  const l = await db.lieferschein.create({
    data: {
      betriebId: betrieb.id,
      auftragId,
      ...nr,
      bemerkung: String(formData.get("bemerkung") ?? "").trim(),
      positionen: {
        create: positionen.map((p) => ({ bezeichnung: p.bezeichnung, menge: p.menge, einheit: p.einheit })),
      },
    },
  });
  revalidatePath("/lieferscheine");
  redirect(`/lieferscheine/${l.id}`);
}

export async function setLieferscheinStatus(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const status = String(formData.get("status")) === "GELIEFERT" ? "GELIEFERT" : "ENTWURF";
  const id = String(formData.get("id"));
  await db.lieferschein.updateMany({ where: { id, betriebId: betrieb.id }, data: { status } });
  revalidatePath(`/lieferscheine/${id}`);
  revalidatePath("/lieferscheine");
}

export async function deleteLieferschein(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("AUFTRAEGE");
  const id = String(formData.get("id"));
  const l = await db.lieferschein.findFirst({ where: { id, betriebId: betrieb.id } });
  if (!l) redirect("/lieferscheine");
  if (l.status !== "ENTWURF") redirect(`/lieferscheine/${id}?fehler=gesperrt`);
  await db.lieferschein.delete({ where: { id } });
  revalidatePath("/lieferscheine");
  redirect("/lieferscheine");
}
