-- CreateTable
CREATE TABLE "PasswortReset" (
    "id" TEXT NOT NULL,
    "mitarbeiterId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "erstellt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswortReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswortReset_tokenHash_key" ON "PasswortReset"("tokenHash");

-- AddForeignKey
ALTER TABLE "PasswortReset" ADD CONSTRAINT "PasswortReset_mitarbeiterId_fkey" FOREIGN KEY ("mitarbeiterId") REFERENCES "Mitarbeiter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
