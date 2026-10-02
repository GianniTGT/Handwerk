-- AlterTable
ALTER TABLE "Mitarbeiter" ADD COLUMN     "aktiv" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rechte" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MailVorlage" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "betreff" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "MailVorlage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailVorlage_betriebId_typ_key" ON "MailVorlage"("betriebId", "typ");

-- AddForeignKey
ALTER TABLE "MailVorlage" ADD CONSTRAINT "MailVorlage_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
