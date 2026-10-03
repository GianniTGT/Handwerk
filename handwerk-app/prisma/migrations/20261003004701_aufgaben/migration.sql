-- CreateTable
CREATE TABLE "Aufgabe" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL DEFAULT '',
    "kategorie" TEXT NOT NULL DEFAULT '',
    "faelligAm" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "zugewiesenAnId" TEXT,
    "kundeId" TEXT,
    "projektId" TEXT,
    "auftragId" TEXT,
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigtAm" TIMESTAMP(3),

    CONSTRAINT "Aufgabe_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_zugewiesenAnId_fkey" FOREIGN KEY ("zugewiesenAnId") REFERENCES "Mitarbeiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
