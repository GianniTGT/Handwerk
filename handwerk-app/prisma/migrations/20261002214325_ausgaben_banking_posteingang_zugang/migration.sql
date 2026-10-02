-- AlterTable
ALTER TABLE "Sitzung" ADD COLUMN     "aktiverBetriebId" TEXT;

-- CreateTable
CREATE TABLE "BetriebZugang" (
    "mitarbeiterId" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,

    CONSTRAINT "BetriebZugang_pkey" PRIMARY KEY ("mitarbeiterId","betriebId")
);

-- CreateTable
CREATE TABLE "Ausgabe" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "lieferant" TEXT NOT NULL DEFAULT '',
    "beschreibung" TEXT NOT NULL,
    "kategorie" TEXT NOT NULL DEFAULT 'Material',
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faelligAm" TIMESTAMP(3),
    "betragBrutto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mwstSatz" DOUBLE PRECISION NOT NULL DEFAULT 8.1,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ausgabe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zahlung" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL DEFAULT '',
    "betrag" DOUBLE PRECISION NOT NULL,
    "referenz" TEXT NOT NULL DEFAULT '',
    "rechnungId" TEXT,
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zahlung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beleg" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL DEFAULT '',
    "mimeTyp" TEXT NOT NULL DEFAULT '',
    "daten" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NEU',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Beleg_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BetriebZugang" ADD CONSTRAINT "BetriebZugang_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "Mitarbeiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetriebZugang" ADD CONSTRAINT "BetriebZugang_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ausgabe" ADD CONSTRAINT "Ausgabe_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zahlung" ADD CONSTRAINT "Zahlung_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beleg" ADD CONSTRAINT "Beleg_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
