const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const facturesCount = await prisma.facture.count();
    const facturesByDir = await prisma.facture.groupBy({
        by: ['direction'],
        _count: { direction: true }
    });
    
    const depensesCount = await prisma.depense.count();

    console.log('Factures total:', facturesCount);
    console.log('Factures by direction:', facturesByDir);
    console.log('Depenses total:', depensesCount);
}

main().finally(() => prisma.$disconnect());
