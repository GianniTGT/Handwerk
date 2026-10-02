-- DropIndex
DROP INDEX "Rechnung_auftragId_key";

-- AlterTable
ALTER TABLE "Bestellung" ADD COLUMN     "nummerText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Gutschrift" ADD COLUMN     "nummerText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Offerte" ADD COLUMN     "nummerText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Projekt" ADD COLUMN     "nummerText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Rechnung" ADD COLUMN     "abzugNetto" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "art" TEXT NOT NULL DEFAULT 'SCHLUSS',
ADD COLUMN     "bezeichnung" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nummerText" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Nummernkreis" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "laenge" INTEGER NOT NULL DEFAULT 1,
    "jaehrlichNeu" BOOLEAN NOT NULL DEFAULT false,
    "naechste" INTEGER NOT NULL DEFAULT 1,
    "startNummer" INTEGER NOT NULL DEFAULT 1,
    "jahr" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Nummernkreis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nummernkreis_betriebId_typ_key" ON "Nummernkreis"("betriebId", "typ");

-- AddForeignKey
ALTER TABLE "Nummernkreis" ADD CONSTRAINT "Nummernkreis_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
