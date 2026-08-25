const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function peek() {
    const clients = await prisma.client.findMany({
        select: { id: true, createdAt: true, dossiers: { select: { dateOuverture: true } } },
        take: 3
    });
    console.log(JSON.stringify(clients, null, 2));
}

peek().catch(console.error).finally(() => prisma.$disconnect());
