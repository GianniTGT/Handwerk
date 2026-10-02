-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Betrieb" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "erstellt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Betrieb" ("erstellt", "iban", "id", "mwstNr", "name", "ort", "plz", "strasse") SELECT "erstellt", "iban", "id", "mwstNr", "name", "ort", "plz", "strasse" FROM "Betrieb";
DROP TABLE "Betrieb";
ALTER TABLE "new_Betrieb" RENAME TO "Betrieb";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
