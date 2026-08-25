const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClientDates() {
    const clients = await prisma.client.findMany({
        include: {
            dossiers: {
                orderBy: { dateOuverture: 'asc' },
                take: 1
            }
        }
    });

    let updated = 0;
    for (const c of clients) {
        if (c.dossiers.length > 0) {
            const earliestDate = c.dossiers[0].dateOuverture;
            if (earliestDate && earliestDate < c.createdAt) {
                await prisma.client.update({
                    where: { id: c.id },
                    data: { createdAt: earliestDate }
                });
                updated++;
            }
        }
    }
    console.log(Updated  clients dates.);
}

fixClientDates().catch(console.error).finally(() => prisma.());
