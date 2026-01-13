/*
  Warnings:

  - You are about to drop the column `avocatEnChargeId` on the `Audience` table. All the data in the column will be lost.
  - You are about to drop the column `avocatSignataireId` on the `Audience` table. All the data in the column will be lost.
  - You are about to drop the column `statutEnvoi` on the `FlashCR` table. All the data in the column will be lost.
  - You are about to drop the column `fichierUrl` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `moyenPaiement` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN "formeJuridique" TEXT;
ALTER TABLE "Client" ADD COLUMN "notes" TEXT;
ALTER TABLE "Client" ADD COLUMN "numeroRCCM" TEXT;
ALTER TABLE "Client" ADD COLUMN "profession" TEXT;
ALTER TABLE "Client" ADD COLUMN "representantLegal" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Audience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "heure" TEXT,
    "juridiction" TEXT,
    "titre" TEXT,
    "avocat" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'A_VENIR',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Audience_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Audience_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Audience" ("clientId", "createdAt", "date", "dossierId", "id", "juridiction", "notes", "statut", "titre", "updatedAt") SELECT "clientId", "createdAt", "date", "dossierId", "id", "juridiction", "notes", "statut", "titre", "updatedAt" FROM "Audience";
DROP TABLE "Audience";
ALTER TABLE "new_Audience" RENAME TO "Audience";
CREATE INDEX "Audience_clientId_idx" ON "Audience"("clientId");
CREATE INDEX "Audience_dossierId_idx" ON "Audience"("dossierId");
CREATE INDEX "Audience_date_idx" ON "Audience"("date");
CREATE TABLE "new_FlashCR" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audienceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "destinataires" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashCR_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlashCR_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlashCR_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FlashCR" ("audienceId", "clientId", "contenu", "createdAt", "destinataires", "dossierId", "id", "updatedAt") SELECT "audienceId", "clientId", "contenu", "createdAt", "destinataires", "dossierId", "id", "updatedAt" FROM "FlashCR";
DROP TABLE "FlashCR";
ALTER TABLE "new_FlashCR" RENAME TO "FlashCR";
CREATE UNIQUE INDEX "FlashCR_audienceId_key" ON "FlashCR"("audienceId");
CREATE INDEX "FlashCR_audienceId_idx" ON "FlashCR"("audienceId");
CREATE INDEX "FlashCR_clientId_idx" ON "FlashCR"("clientId");
CREATE INDEX "FlashCR_dossierId_idx" ON "FlashCR"("dossierId");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dateEcheance" DATETIME,
    "clientId" TEXT NOT NULL,
    "dossierId" TEXT,
    "audienceId" TEXT,
    "montantHT" REAL NOT NULL,
    "montantTVA" REAL NOT NULL DEFAULT 0,
    "montantTTC" REAL NOT NULL,
    "montantPaye" REAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'IMPAYEE',
    "methodePaiement" TEXT,
    "datePaiement" DATETIME,
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("audienceId", "clientId", "createdAt", "date", "dateEcheance", "datePaiement", "dossierId", "id", "montantHT", "montantPaye", "montantTTC", "numero", "statut", "updatedAt") SELECT "audienceId", "clientId", "createdAt", "date", "dateEcheance", "datePaiement", "dossierId", "id", "montantHT", "montantPaye", "montantTTC", "numero", "statut", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_numero_key" ON "Invoice"("numero");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_dossierId_idx" ON "Invoice"("dossierId");
CREATE INDEX "Invoice_audienceId_idx" ON "Invoice"("audienceId");
CREATE INDEX "Invoice_date_idx" ON "Invoice"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
