-- AlterTable
ALTER TABLE "Artikel" ADD COLUMN     "bruttoPreis" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lieferantId" TEXT,
ADD COLUMN     "rabattgruppe" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Lieferant" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Lieferant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kondition" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "lieferantId" TEXT NOT NULL,
    "rabattgruppe" TEXT NOT NULL,
    "rabattProzent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Kondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kondition_betriebId_lieferantId_rabattgruppe_key" ON "Kondition"("betriebId", "lieferantId", "rabattgruppe");

-- AddForeignKey
ALTER TABLE "Lieferant" ADD CONSTRAINT "Lieferant_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artikel" ADD CONSTRAINT "Artikel_lieferantId_fkey" FOREIGN KEY ("lieferantId") REFERENCES "Lieferant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kondition" ADD CONSTRAINT "Kondition_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kondition" ADD CONSTRAINT "Kondition_lieferantId_fkey" FOREIGN KEY ("lieferantId") REFERENCES "Lieferant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
