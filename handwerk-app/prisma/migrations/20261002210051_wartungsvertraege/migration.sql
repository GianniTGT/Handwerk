-- CreateTable
CREATE TABLE "Wartungsvertrag" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "objektId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "titel" TEXT NOT NULL DEFAULT 'Jahreswartung Heizung',
    "intervallMonate" INTEGER NOT NULL DEFAULT 12,
    "naechsteWartung" TIMESTAMP(3) NOT NULL,
    "preis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bemerkung" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'AKTIV',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wartungsvertrag_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Wartungsvertrag" ADD CONSTRAINT "Wartungsvertrag_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wartungsvertrag" ADD CONSTRAINT "Wartungsvertrag_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wartungsvertrag" ADD CONSTRAINT "Wartungsvertrag_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "Objekt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
