-- CreateTable
CREATE TABLE "LoginVersuch" (
    "id" TEXT NOT NULL,
    "schluessel" TEXT NOT NULL,
    "fehler" INTEGER NOT NULL DEFAULT 0,
    "fensterStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gesperrtBis" TIMESTAMP(3),

    CONSTRAINT "LoginVersuch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginVersuch_schluessel_key" ON "LoginVersuch"("schluessel");
