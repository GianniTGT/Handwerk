"use server";

// Dashboard bearbeiten: Reihenfolge/Sichtbarkeit der Widgets pro Benutzer speichern

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { darf } from "./rechte";
import { WIDGETS, WIDGET_BEREICH, layoutAlsJson, parseLayout, umschalten, verschiebe, type WidgetId } from "./dashboard";

export async function dashboardAktion(formData: FormData) {
  const { mitarbeiter } = await sitzungErforderlich();
  const id = String(formData.get("id")) as WidgetId;
  const aktion = String(formData.get("aktion"));
  let layout = parseLayout(mitarbeiter.dashboard);

  if (aktion === "zuruecksetzen") {
    layout = parseLayout("");
  } else if (WIDGETS.some((w) => w.id === id)) {
    if (aktion === "hoch" || aktion === "runter") {
      const sichtbar = WIDGETS.map((w) => w.id).filter((w) => !WIDGET_BEREICH[w] || darf(mitarbeiter, WIDGET_BEREICH[w]!));
      layout = verschiebe(layout, id, aktion, sichtbar);
    }
    else if (aktion === "ausblenden") layout = umschalten(layout, id, false);
    else if (aktion === "einblenden") layout = umschalten(layout, id, true);
  }
  await db.mitarbeiter.update({
    where: { id: mitarbeiter.id },
    data: { dashboard: aktion === "zuruecksetzen" ? "" : layoutAlsJson(layout) },
  });
  revalidatePath("/");
  redirect("/?bearbeiten=1");
}
