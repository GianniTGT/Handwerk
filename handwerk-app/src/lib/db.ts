import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// MVP: një tenant i vetëm aktiv. Kur të vijë auth-i, kjo zëvendësohet
// me betriebId nga sesioni i përdoruesit.
export async function aktuellerBetrieb() {
  const betrieb = await db.betrieb.findFirst();
  if (!betrieb) throw new Error("Kein Betrieb vorhanden — bitte `npx prisma db seed` ausführen.");
  return betrieb;
}
