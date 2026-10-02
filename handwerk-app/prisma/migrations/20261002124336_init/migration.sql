-- CreateTable
CREATE TABLE "Betrieb" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "strasse" TEXT NOT NULL DEFAULT '',
    "plz" TEXT NOT NULL DEFAULT '',
    "ort" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "mwstNr" TEXT NOT NULL DEFAULT '',
    "erstellt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mitarbeiter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "betriebId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rolle" TEXT NOT NULL DEFAULT 'MONTEUR',
    CONSTRAINT "Mitarbeiter_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kunde" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "betriebId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strasse" TEXT NOT NULL DEFAULT '',
    "plz" TEXT NOT NULL DEFAULT '',
    "ort" TEXT NOT NULL DEFAULT '',
    "telefon" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Kunde_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Objekt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kundeId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "strasse" TEXT NOT NULL DEFAULT '',
    "plz" TEXT NOT NULL DEFAULT '',
    "ort" TEXT NOT NULL DEFAULT '',
    "bemerkung" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Objekt_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Auftrag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "betriebId" TEXT NOT NULL,
    "kundeId" TEXT NOT NULL,
    "objektId" TEXT,
    "nummer" INTEGER NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Auftrag_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Auftrag_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Auftrag_objektId_fkey" FOREIGN KEY ("objektId") REFERENCES "Objekt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auftragId" TEXT NOT NULL,
    "mitarbeiterId" TEXT,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bemerkung" TEXT NOT NULL DEFAULT '',
    "unterschrift" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Rapport_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rapport_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "Mitarbeiter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RapportPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rapportId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "menge" REAL NOT NULL DEFAULT 1,
    "einheit" TEXT NOT NULL DEFAULT 'Std.',
    "ansatz" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "RapportPosition_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "Rapport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Artikel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "betriebId" TEXT NOT NULL,
    "artikelNr" TEXT NOT NULL DEFAULT '',
    "bezeichnung" TEXT NOT NULL,
    "einheit" TEXT NOT NULL DEFAULT 'Stk.',
    "preis" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Artikel_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rechnung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "betriebId" TEXT NOT NULL,
    "auftragId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "datum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "totalNetto" REAL NOT NULL DEFAULT 0,
    "mwstSatz" REAL NOT NULL DEFAULT 8.1,
    "totalBrutto" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Rechnung_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rechnung_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Auftrag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Rechnung_auftragId_key" ON "Rechnung"("auftragId");
