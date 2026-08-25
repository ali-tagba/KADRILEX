const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.membre.findMany().then(m => console.log(JSON.stringify(m, null, 2))).finally(() => prisma.$disconnect());
