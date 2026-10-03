"use server";

// Dashboard bearbeiten: Spalten, Reihenfolge und Sichtbarkeit der Widgets pro Benutzer speichern

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { parseLayout } from "./dashboard";

// Wird vom Editor nach jeder Änderung aufgerufen; leerer String = Standardlayout
export async function speichereDashboardLayout(json: string) {
  const { mitarbeiter } = await sitzungErforderlich();
  const layout = json ? parseLayout(json) : null; // parseLayout säubert unbekannte/doppelte Einträge
  await db.mitarbeiter.update({
    where: { id: mitarbeiter.id },
    data: { dashboard: layout ? JSON.stringify(layout) : "" },
  });
  revalidatePath("/");
}
