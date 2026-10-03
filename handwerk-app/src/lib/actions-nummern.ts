"use server";

// Server action për konfigurimin e Nummernkreis-eve (format, gjatësi, numri i radhës, rifillim vjetor).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { holeKreis } from "./nummern";
import { NR_STANDARD, type NrTyp } from "./nrtext";

const TYPEN = Object.keys(NR_STANDARD) as NrTyp[];
// Lejohen shkronja, shifra, shenja të zakonshme dhe placeholder-ët; jo shenja rreziku
const FORMAT_OK = /^[A-Za-z0-9 ._\-/#{}ÄÖÜäöüß]+$/;

export async function saveNummernkreise(formData: FormData) {
  const { betrieb, mitarbeiter } = await sitzungErforderlich("EINSTELLUNGEN");
  if (mitarbeiter.rolle !== "CHEF" && mitarbeiter.rolle !== "BUERO") {
    redirect("/einstellungen?fehler=recht");
  }
  for (const typ of TYPEN) {
    const format = String(formData.get(`format_${typ}`) ?? "").trim();
    if (!format.includes("{NR}") || !FORMAT_OK.test(format) || format.length > 40) {
      redirect(`/einstellungen?fehler=nummernformat&typ=${typ}`);
    }
    const laenge = Math.min(10, Math.max(1, parseInt(String(formData.get(`laenge_${typ}`) ?? "")) || 1));
    const naechste = Math.max(1, parseInt(String(formData.get(`naechste_${typ}`) ?? "")) || 1);
    await holeKreis(betrieb.id, typ); // sigurohu që rreshti ekziston
    await db.nummernkreis.update({
      where: { betriebId_typ: { betriebId: betrieb.id, typ } },
      data: {
        format,
        laenge,
        naechste,
        startNummer: Math.max(1, parseInt(String(formData.get(`start_${typ}`) ?? "")) || 1),
        jaehrlichNeu: formData.get(`jaehrlich_${typ}`) === "1",
      },
    });
  }
  revalidatePath("/einstellungen");
  redirect("/einstellungen?gespeichert=1");
}
