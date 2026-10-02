-- AlterTable
ALTER TABLE "Artikel" ADD COLUMN     "art" TEXT NOT NULL DEFAULT 'WARE',
ADD COLUMN     "einkaufspreis" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gruppe" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mwstSatz" DOUBLE PRECISION NOT NULL DEFAULT 8.1,
ADD COLUMN     "zuschlagProzent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Auftrag" ADD COLUMN     "projektId" TEXT;

-- AlterTable
ALTER TABLE "Ausgabe" ADD COLUMN     "projektId" TEXT;

-- AlterTable
ALTER TABLE "Betrieb" ADD COLUMN     "mahnfrist1Tage" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "mahnfrist2Tage" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "mahnfrist3Tage" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "offerteFusstext" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "offerteKopftext" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rechnungFusstext" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rechnungKopftext" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Kunde" ADD COLUMN     "archiviert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bemerkung" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kategorie" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mobile" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "typ" TEXT NOT NULL DEFAULT 'FIRMA',
ADD COLUMN     "website" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Mitarbeiter" ADD COLUMN     "stundensatz" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Rechnung" ADD COLUMN     "letzteMahnungAm" TIMESTAMP(3),
ADD COLUMN     "mahnstufe" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Kontaktperson" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "funktion" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "telefon" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Kontaktperson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gutschrift" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "rechnungId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grund" TEXT NOT NULL DEFAULT '',
    "totalNetto" DOUBLE PRECISION NOT NULL,
    "mwstSatz" DOUBLE PRECISION NOT NULL DEFAULT 8.1,
    "totalBrutto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Gutschrift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projekt" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "kundeId" TEXT,
    "nummer" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "typ" TEXT NOT NULL DEFAULT 'KUNDE',
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "substatus" TEXT NOT NULL DEFAULT '',
    "start" TIMESTAMP(3),
    "ende" TIMESTAMP(3),
    "beschreibung" TEXT NOT NULL DEFAULT '',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projekt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zeiteintrag" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "mitarbeiterId" TEXT NOT NULL,
    "projektId" TEXT,
    "auftragId" TEXT,
    "kundeId" TEXT,
    "taetigkeit" TEXT NOT NULL DEFAULT 'Umsetzung',
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minuten" INTEGER NOT NULL,
    "bemerkung" TEXT NOT NULL DEFAULT '',
    "abrechenbar" BOOLEAN NOT NULL DEFAULT true,
    "stundensatz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zeiteintrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bestellung" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "lieferantId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "bemerkung" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Bestellung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestellPosition" (
    "id" TEXT NOT NULL,
    "bestellungId" TEXT NOT NULL,
    "artikelNr" TEXT NOT NULL DEFAULT '',
    "bezeichnung" TEXT NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "einheit" TEXT NOT NULL DEFAULT 'Stk.',
    "preis" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BestellPosition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Kontaktperson" ADD CONSTRAINT "Kontaktperson_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gutschrift" ADD CONSTRAINT "Gutschrift_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gutschrift" ADD CONSTRAINT "Gutschrift_rechnungId_fkey" FOREIGN KEY ("rechnungId") REFERENCES "Rechnung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projekt" ADD CONSTRAINT "Projekt_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projekt" ADD CONSTRAINT "Projekt_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zeiteintrag" ADD CONSTRAINT "Zeiteintrag_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zeiteintrag" ADD CONSTRAINT "Zeiteintrag_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "Mitarbeiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zeiteintrag" ADD CONSTRAINT "Zeiteintrag_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "Projekt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zeiteintrag" ADD CONSTRAINT "Zeiteintrag_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zeiteintrag" ADD CONSTRAINT "Zeiteintrag_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bestellung" ADD CONSTRAINT "Bestellung_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bestellung" ADD CONSTRAINT "Bestellung_lieferantId_fkey" FOREIGN KEY ("lieferantId") REFERENCES "Lieferant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestellPosition" ADD CONSTRAINT "BestellPosition_bestellungId_fkey" FOREIGN KEY ("bestellungId") REFERENCES "Bestellung"("id") ON DELETE CASCADE ON UPDATE CASCADE;
