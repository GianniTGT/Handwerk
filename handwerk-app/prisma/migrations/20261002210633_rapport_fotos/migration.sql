-- CreateTable
CREATE TABLE "RapportFoto" (
    "id" TEXT NOT NULL,
    "rapportId" TEXT NOT NULL,
    "daten" TEXT NOT NULL,
    "bemerkung" TEXT NOT NULL DEFAULT '',
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RapportFoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RapportFoto" ADD CONSTRAINT "RapportFoto_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "Rapport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
