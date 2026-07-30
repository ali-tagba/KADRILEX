const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:kadrilex-secure-db-2026@37.59.99.86:5432/postgres?schema=public",
    },
  },
});

async function main() {
  const clients = await prisma.client.findMany({
    where: { raisonSociale: { contains: 'star', mode: 'insensitive' } },
    select: { id: true, numeroClient: true, raisonSociale: true }
  });
  console.log('CLIENTS STAR:', clients);
}
main().catch(console.error);
