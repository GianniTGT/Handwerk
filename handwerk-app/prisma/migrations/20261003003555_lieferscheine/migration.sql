-- CreateTable
CREATE TABLE "Lieferschein" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "nummerText" TEXT NOT NULL DEFAULT '',
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "bemerkung" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Lieferschein_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LieferscheinPosition" (
    "id" TEXT NOT NULL,
    "lieferscheinId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "einheit" TEXT NOT NULL DEFAULT 'Stk.',

    CONSTRAINT "LieferscheinPosition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lieferschein" ADD CONSTRAINT "Lieferschein_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lieferschein" ADD CONSTRAINT "Lieferschein_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieferscheinPosition" ADD CONSTRAINT "LieferscheinPosition_lieferscheinId_fkey" FOREIGN KEY ("lieferscheinId") REFERENCES "Lieferschein"("id") ON DELETE CASCADE ON UPDATE CASCADE;
