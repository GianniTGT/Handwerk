-- CreateTable
CREATE TABLE "Offerte" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "objektId" TEXT,
    "nummer" INTEGER NOT NULL,
    "titel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "auftragId" TEXT,

    CONSTRAINT "Offerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferteGruppe" (
    "id" TEXT NOT NULL,
    "offerteId" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "titel" TEXT NOT NULL,

    CONSTRAINT "OfferteGruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffertePosition" (
    "id" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "bezeichnung" TEXT NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "einheit" TEXT NOT NULL DEFAULT 'Stk.',
    "ansatz" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "OffertePosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offerte_auftragId_key" ON "Offerte"("auftragId");

-- AddForeignKey
ALTER TABLE "Offerte" ADD CONSTRAINT "Offerte_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offerte" ADD CONSTRAINT "Offerte_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offerte" ADD CONSTRAINT "Offerte_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "Objekt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offerte" ADD CONSTRAINT "Offerte_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferteGruppe" ADD CONSTRAINT "OfferteGruppe_offerteId_fkey" FOREIGN KEY ("offerteId") REFERENCES "Offerte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffertePosition" ADD CONSTRAINT "OffertePosition_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "OfferteGruppe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
