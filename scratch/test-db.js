const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const clients = await prisma.client.count();
    console.log("Connected! Clients count:", clients);
  } catch (e) {
    console.error("Connection error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
