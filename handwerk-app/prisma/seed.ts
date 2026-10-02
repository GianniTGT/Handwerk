import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.betrieb.findFirst();
  if (existing) {
    console.log("Seed übersprungen — Betrieb existiert bereits.");
    return;
  }

  // Demo-tenant: firma e parë pilote. Të dhënat janë placeholder — zëvendësohen
  // me të dhënat reale të firmës kur të fillojë piloti.
  const betrieb = await prisma.betrieb.create({
    data: {
      name: "Demo Haustechnik GmbH",
      strasse: "Musterstrasse 1",
      plz: "8000",
      ort: "Zürich",
      // IBAN shembulli zyrtar i SIX për teste — jo llogari reale
      iban: "CH5800791123000889012",
      email: "info@demo-haustechnik.ch",
      telefon: "044 000 00 00",
      bank: "Demo Bank AG",
      bic: "DEMOCHZZ",
      mwstNr: "CHE-000.000.000 MWST",
      mitarbeiter: {
        create: [
          {
            name: "Chef (Büro)",
            rolle: "CHEF",
            email: "chef@demo.ch",
            passwortHash: await bcrypt.hash("demo1234", 10),
          },
          {
            name: "Monteur 1",
            rolle: "MONTEUR",
            email: "monteur@demo.ch",
            passwortHash: await bcrypt.hash("demo1234", 10),
          },
        ],
      },
      artikel: {
        create: [
          { artikelNr: "A-100", bezeichnung: "Monteurstunde", einheit: "Std.", preis: 110 },
          { artikelNr: "A-101", bezeichnung: "Servicetechniker-Stunde", einheit: "Std.", preis: 125 },
          { artikelNr: "M-200", bezeichnung: "Boiler-Anode 230mm", einheit: "Stk.", preis: 85 },
          { artikelNr: "M-201", bezeichnung: "Dichtungssatz 3/4\"", einheit: "Stk.", preis: 12.5 },
          { artikelNr: "P-300", bezeichnung: "Anfahrtspauschale", einheit: "pauschal", preis: 60 },
        ],
      },
    },
  });

  const kunde = await prisma.kunde.create({
    data: {
      betriebId: betrieb.id,
      name: "Familie Muster",
      strasse: "Seestrasse 12",
      plz: "8942",
      ort: "Oberrieden",
      telefon: "044 123 45 67",
      objekte: {
        create: [
          {
            bezeichnung: "Heizung Keller — Viessmann Vitodens 200",
            strasse: "Seestrasse 12",
            plz: "8942",
            ort: "Oberrieden",
          },
        ],
      },
    },
    include: { objekte: true },
  });

  await prisma.auftrag.create({
    data: {
      betriebId: betrieb.id,
      kundeId: kunde.id,
      objektId: kunde.objekte[0].id,
      nummer: 1001,
      titel: "Boiler entkalken & Anode ersetzen",
      beschreibung: "Kunde meldet wenig Warmwasser. Service gemäss Absprache.",
      status: "OFFEN",
    },
  });

  // Klientë shembull shtesë (realistë për demo)
  await prisma.kunde.create({
    data: {
      betriebId: betrieb.id,
      name: "Immobilien AG Seeblick",
      strasse: "Bahnhofstrasse 4",
      plz: "8800",
      ort: "Thalwil",
      telefon: "044 720 11 22",
      email: "verwaltung@seeblick-demo.ch",
      objekte: {
        create: [
          { bezeichnung: "MFH Seestrasse 40 — Heizzentrale Hoval UltraGas", strasse: "Seestrasse 40", plz: "8800", ort: "Thalwil" },
          { bezeichnung: "MFH Seestrasse 42 — Boileranlage 500l", strasse: "Seestrasse 42", plz: "8800", ort: "Thalwil" },
        ],
      },
    },
  });
  await prisma.kunde.create({
    data: {
      betriebId: betrieb.id,
      name: "Restaurant Linde GmbH",
      strasse: "Dorfplatz 2",
      plz: "8942",
      ort: "Oberrieden",
      telefon: "044 721 33 44",
      objekte: {
        create: [
          { bezeichnung: "Küche — Fettabscheider & Sanitärinstallation", strasse: "Dorfplatz 2", plz: "8942", ort: "Oberrieden" },
        ],
      },
    },
  });
  await prisma.kunde.create({
    data: {
      betriebId: betrieb.id,
      name: "Keller, Markus & Anna",
      strasse: "Rebbergweg 11",
      plz: "8820",
      ort: "Wädenswil",
      telefon: "079 555 66 77",
      objekte: {
        create: [
          { bezeichnung: "EFH — Wärmepumpe Stiebel Eltron (2024)", strasse: "Rebbergweg 11", plz: "8820", ort: "Wädenswil" },
        ],
      },
    },
  });

  console.log("Seed fertig: Demo-Betrieb, Kunde, Objekt, Auftrag, Artikel erstellt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
