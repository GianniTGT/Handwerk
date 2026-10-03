-- AlterTable
ALTER TABLE "Wartungsvertrag" ADD COLUMN     "naechsteRechnung" TIMESTAMP(3),
ADD COLUMN     "pauschalAbrechnung" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Rechnungslauf" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anzahl" INTEGER NOT NULL,
    "summeBrutto" DOUBLE PRECISION NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Rechnungslauf_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Rechnungslauf" ADD CONSTRAINT "Rechnungslauf_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
