const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Applying manual SQL fixes to DB...");
    
    // Pour éviter que prisma ne drop les colonnes enum
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "ClientType" ADD VALUE IF NOT EXISTS 'PERSONNE_MORALE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "ClientType" ADD VALUE IF NOT EXISTS 'PERSONNE_PHYSIQUE'`);
    } catch(e) { console.log("Enum ClientType err:", e.message) }

    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentCategorie" ADD VALUE IF NOT EXISTS 'PIECE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentCategorie" ADD VALUE IF NOT EXISTS 'ACTE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentCategorie" ADD VALUE IF NOT EXISTS 'CORRESPONDANCE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentCategorie" ADD VALUE IF NOT EXISTS 'NOTE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentCategorie" ADD VALUE IF NOT EXISTS 'FACTURE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DocumentCategorie" ADD VALUE IF NOT EXISTS 'AUTRE'`);
    } catch(e) { console.log("Enum DocumentCategorie err:", e.message) }

    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'CIVIL'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'COMMERCIAL'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'PENAL'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'ADMINISTRATIF'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'SOCIAL'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'COUTUMIERE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "DossierType" ADD VALUE IF NOT EXISTS 'AUTRE'`);
    } catch(e) { console.log("Enum DossierType err:", e.message) }

    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "CategorieDepense" ADD VALUE IF NOT EXISTS 'SOUS_TRAITANCE'`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "CategorieDepense" ADD VALUE IF NOT EXISTS 'HONORAIRES'`);
    } catch(e) { console.log("Enum CategorieDepense err:", e.message) }
    
    console.log("Fixes applied successfully.");
  } catch (e) {
    console.error("Error applying SQL:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
