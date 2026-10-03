// Legt den ersten Betrieb samt Chef-Benutzer an (Bootstrap im Produktivsystem, da die Registrierung geschlossen ist).
// Das Start-Passwort wird zufällig erzeugt, einmal ausgegeben und muss beim ersten Login geändert werden.
//
// Aufruf (im Server, im Ordner handwerk-app):
//   docker compose -f docker-compose.prod.yml --env-file .env.prod exec app \
//     npm run admin:anlegen -- "TIFF Software Solutions" "Gianni T." gianni@beispiel.ch
//
// Danach diese E-Mail in .env.prod bei TIFF_ADMIN_EMAILS eintragen, damit unter «Kunden-Betriebe verwalten»
// weitere Betriebe angelegt werden können.

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [firma, name, emailRoh] = process.argv.slice(2);
const email = (emailRoh ?? "").trim().toLowerCase();

if (!firma || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Aufruf: npm run admin:anlegen -- "Firmenname" "Name" email@beispiel.ch');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  if (await prisma.mitarbeiter.findUnique({ where: { email } })) {
    console.error(`Abbruch: ${email} existiert bereits.`);
    process.exit(1);
  }
  const passwort = randomBytes(12).toString("base64url"); // 16 Zeichen, zufällig
  const betrieb = await prisma.betrieb.create({ data: { name: firma } });
  await prisma.mitarbeiter.create({
    data: {
      betriebId: betrieb.id,
      name,
      email,
      rolle: "CHEF",
      passwortHash: await bcrypt.hash(passwort, 10),
      passwortAendern: true,
    },
  });
  console.log(`\nBetrieb «${firma}» und Chef-Benutzer angelegt.`);
  console.log(`  E-Mail:         ${email}`);
  console.log(`  Start-Passwort: ${passwort}`);
  console.log("\nDas Passwort wird nur jetzt angezeigt und muss beim ersten Login geändert werden.");
  console.log("Nicht vergessen: E-Mail bei TIFF_ADMIN_EMAILS in .env.prod eintragen und die App neu starten.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
