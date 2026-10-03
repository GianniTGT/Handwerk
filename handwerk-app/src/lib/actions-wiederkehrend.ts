"use server";

// Wiederkehrende Rechnungen: faturim periodik (pauschal) i kontratave të mirëmbajtjes me një Rechnungslauf.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sitzungErforderlich } from "./auth";
import { vergibNummer } from "./nummern";
import { rechnungNr } from "./nrtext";
import { chf } from "./format";

const MWST = 8.1;
const runde5 = (n: number) => Math.round(n * 20) / 20;
const heuteEnde = () => new Date(new Date().setHours(23, 59, 59, 999));

export async function speichereAbo(formData: FormData) {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const id = String(formData.get("vertragId"));
  const roh = String(formData.get("naechsteRechnung") ?? "");
  const datum = roh ? new Date(roh) : null;
  await db.wartungsvertrag.updateMany({
    where: { id, betriebId: betrieb.id },
    data: {
      pauschalAbrechnung: formData.get("pauschal") === "1",
      naechsteRechnung: datum && !Number.isNaN(datum.getTime()) ? datum : null,
    },
  });
  revalidatePath("/wiederkehrend");
  redirect("/wiederkehrend?gespeichert=1");
}

// Për çdo kontratë aktive me faturim periodik që i erdhi koha: Auftrag (pauschal) + Rechnung (Entwurf);
// data e radhës shtyhet me intervalin. Një faturë për kontratë për ekzekutim.
export async function rechnungslauf() {
  const { betrieb } = await sitzungErforderlich("VERKAUF");
  const kandidaten = await db.wartungsvertrag.findMany({
    where: { betriebId: betrieb.id, status: "AKTIV", pauschalAbrechnung: true, preis: { gt: 0 } },
    include: { objekt: true },
    orderBy: { nummer: "asc" },
  });
  const grenze = heuteEnde();
  const dran = kandidaten.filter((v) => (v.naechsteRechnung ?? v.naechsteWartung) <= grenze);

  const zeilen: string[] = [];
  let summe = 0;
  for (const v of dran) {
    const stichtag = v.naechsteRechnung ?? v.naechsteWartung;
    const letzter = await db.auftrag.findFirst({ where: { betriebId: betrieb.id }, orderBy: { nummer: "desc" } });
    const netto = Math.round(v.preis * 100) / 100;
    const brutto = runde5(netto * (1 + MWST / 100));
    const nr = await vergibNummer(betrieb.id, "RECHNUNG");

    const auftrag = await db.auftrag.create({
      data: {
        betriebId: betrieb.id,
        kundeId: v.kundeId,
        objektId: v.objektId,
        nummer: (letzter?.nummer ?? 1000) + 1,
        titel: `Wartungspauschale ${stichtag.getFullYear()} — ${v.titel} — ${v.objekt.bezeichnung}`,
        beschreibung: `Wiederkehrende Verrechnung aus Wartungsvertrag WV-${v.nummer} (alle ${v.intervallMonate} Monate)`,
        status: "VERRECHNET",
        rapporte: {
          create: [
            {
              bemerkung: "Automatisch aus Rechnungslauf",
              positionen: {
                create: [
                  { typ: "ARBEIT", bezeichnung: `Wartungspauschale ${v.titel}`, menge: 1, einheit: "pauschal", ansatz: netto },
                ],
              },
            },
          ],
        },
      },
    });
    const rechnung = await db.rechnung.create({
      data: {
        betriebId: betrieb.id,
        auftragId: auftrag.id,
        ...nr,
        art: "SCHLUSS",
        faelligAm: new Date(Date.now() + betrieb.zahlungsfristTage * 24 * 60 * 60 * 1000),
        totalNetto: netto,
        mwstSatz: MWST,
        totalBrutto: brutto,
      },
    });
    const naechste = new Date(stichtag);
    naechste.setMonth(naechste.getMonth() + v.intervallMonate);
    await db.wartungsvertrag.update({ where: { id: v.id }, data: { naechsteRechnung: naechste } });

    summe += brutto;
    zeilen.push(`${rechnungNr(rechnung)} · WV-${v.nummer} · CHF ${chf(brutto)}`);
  }

  if (dran.length > 0) {
    await db.rechnungslauf.create({
      data: { betriebId: betrieb.id, anzahl: dran.length, summeBrutto: summe, details: zeilen.join("\n") },
    });
  }
  revalidatePath("/wiederkehrend");
  revalidatePath("/rechnungen");
  redirect(`/wiederkehrend?lauf=${dran.length}`);
}
