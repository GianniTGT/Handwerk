"use server";

// Server action për shabllonet e email-it (Mailvorlagen)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { MAIL_TYPEN } from "./mailvorlagen";

export async function saveMailvorlagen(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("EINSTELLUNGEN");
  for (const { typ } of MAIL_TYPEN) {
    const betreff = String(formData.get(`betreff_${typ}`) ?? "").trim();
    const text = String(formData.get(`text_${typ}`) ?? "").replace(/\r/g, "").trim();
    if (betreff.length > 200 || text.length > 5000) redirect("/einstellungen?fehler=mail-zu-lang");
    if (!betreff && !text) {
      // bosh = kthehu te standardi
      await db.mailVorlage.deleteMany({ where: { betriebId: betrieb.id, typ } });
      continue;
    }
    await db.mailVorlage.upsert({
      where: { betriebId_typ: { betriebId: betrieb.id, typ } },
      update: { betreff, text },
      create: { betriebId: betrieb.id, typ, betreff, text },
    });
  }
  revalidatePath("/einstellungen");
  redirect("/einstellungen?gespeichert=1");
}
