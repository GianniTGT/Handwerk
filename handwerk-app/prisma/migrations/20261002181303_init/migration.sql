-- CreateTable
CREATE TABLE "Betrieb" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strasse" TEXT NOT NULL DEFAULT '',
    "plz" TEXT NOT NULL DEFAULT '',
    "ort" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "mwstNr" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "telefon" TEXT NOT NULL DEFAULT '',
    "bank" TEXT NOT NULL DEFAULT '',
    "bic" TEXT NOT NULL DEFAULT '',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Betrieb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mitarbeiter" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rolle" TEXT NOT NULL DEFAULT 'MONTEUR',
    "email" TEXT,
    "passwortHash" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Mitarbeiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sitzung" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "mitarbeiterId" TEXT NOT NULL,
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gueltigBis" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sitzung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kunde" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strasse" TEXT NOT NULL DEFAULT '',
    "plz" TEXT NOT NULL DEFAULT '',
    "ort" TEXT NOT NULL DEFAULT '',
    "telefon" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Kunde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objekt" (
    "id" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "strasse" TEXT NOT NULL DEFAULT '',
    "plz" TEXT NOT NULL DEFAULT '',
    "ort" TEXT NOT NULL DEFAULT '',
    "bemerkung" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Objekt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auftrag" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "objektId" TEXT,
    "nummer" INTEGER NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auftrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "mitarbeiterId" TEXT,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bemerkung" TEXT NOT NULL DEFAULT '',
    "unterschrift" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Rapport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportPosition" (
    "id" TEXT NOT NULL,
    "rapportId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "einheit" TEXT NOT NULL DEFAULT 'Std.',
    "ansatz" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "RapportPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artikel" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "artikelNr" TEXT NOT NULL DEFAULT '',
    "bezeichnung" TEXT NOT NULL,
    "einheit" TEXT NOT NULL DEFAULT 'Stk.',
    "preis" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Artikel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rechnung" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "totalNetto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mwstSatz" DOUBLE PRECISION NOT NULL DEFAULT 8.1,
    "totalBrutto" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Rechnung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mitarbeiter_email_key" ON "Mitarbeiter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sitzung_token_key" ON "Sitzung"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Rechnung_auftragId_key" ON "Rechnung"("auftragId");

-- AddForeignKey
ALTER TABLE "Mitarbeiter" ADD CONSTRAINT "Mitarbeiter_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sitzung" ADD CONSTRAINT "Sitzung_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "Mitarbeiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kunde" ADD CONSTRAINT "Kunde_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objekt" ADD CONSTRAINT "Objekt_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auftrag" ADD CONSTRAINT "Auftrag_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "Objekt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rapport" ADD CONSTRAINT "Rapport_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rapport" ADD CONSTRAINT "Rapport_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "Mitarbeiter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportPosition" ADD CONSTRAINT "RapportPosition_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "Rapport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artikel" ADD CONSTRAINT "Artikel_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rechnung" ADD CONSTRAINT "Rechnung_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rechnung" ADD CONSTRAINT "Rechnung_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
