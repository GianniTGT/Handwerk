-- AlterTable
ALTER TABLE "Betrieb" ADD COLUMN     "zahlungsfristTage" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "Rechnung" ADD COLUMN     "faelligAm" TIMESTAMP(3);
