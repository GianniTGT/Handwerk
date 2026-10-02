import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const auftrag = await db.auftrag.findFirst({ include: { betrieb: true } });
  if (!auftrag) throw new Error("kein Auftrag");
  let rapport = await db.rapport.findFirst({ where: { auftragId: auftrag.id } });
  if (!rapport) rapport = await db.rapport.create({ data: { auftragId: auftrag.id } });
  await db.rapportPosition.createMany({
    data: [
      { rapportId: rapport.id, typ: "ARBEIT", bezeichnung: "Servicetechniker-Stunde", menge: 2.5, einheit: "Std.", ansatz: 125 },
      { rapportId: rapport.id, typ: "MATERIAL", bezeichnung: "Boiler-Anode 230mm", menge: 1, einheit: "Stk.", ansatz: 85 },
      { rapportId: rapport.id, typ: "MATERIAL", bezeichnung: "Anfahrtspauschale", menge: 1, einheit: "pauschal", ansatz: 60 },
    ],
  });
  const totalNetto = 2.5 * 125 + 85 + 60;
  const totalBrutto = Math.round(totalNetto * 1.081 * 20) / 20;
  const re = await db.rechnung.create({
    data: { betriebId: auftrag.betriebId, auftragId: auftrag.id, nummer: 20260001, totalNetto, totalBrutto },
  });
  console.log("RECHNUNG_ID=" + re.id);
}
main().finally(() => db.$disconnect());
