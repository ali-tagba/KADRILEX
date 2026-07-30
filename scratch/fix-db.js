const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Applying manual SQL fixes to DB...");
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "Audience" ADD COLUMN IF NOT EXISTS "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Audience" ADD COLUMN IF NOT EXISTS "nature" TEXT NOT NULL DEFAULT 'PLAIDOIRIE'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Audience" ADD COLUMN IF NOT EXISTS "numero" TEXT NOT NULL DEFAULT 'AUD-000'`);
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "numeroClient" TEXT NOT NULL DEFAULT 'CLI-000'`);
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "nature" TEXT NOT NULL DEFAULT 'Contentieux'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "titre" TEXT NOT NULL DEFAULT 'Sans titre'`);
    
    // For enums, it's safer to just alter the enum type directly in Postgres
    // "Changed the type of type on the Client table"
    // We add the values if they don't exist
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "ClientType" ADD VALUE IF NOT EXISTS 'PERSONNE_MORALE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "ClientType" ADD VALUE IF NOT EXISTS 'PERSONNE_PHYSIQUE'`);
    } catch(e) { console.log("Enum ClientType err:", e.message) }

    console.log("Fixes applied successfully.");
  } catch (e) {
    console.error("Error applying SQL:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
