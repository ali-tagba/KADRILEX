import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const clients = await prisma.client.findMany({
        orderBy: { numeroClient: 'asc' },
        take: 10,
        select: {
            id: true,
            numeroClient: true,
            raisonSociale: true,
            nom: true,
            prenom: true
        }
    })
    console.log("Top 10 clients sorted by numeroClient:")
    console.log(JSON.stringify(clients, null, 2))
    
    const steStar = await prisma.client.findFirst({
        where: { raisonSociale: { contains: 'Sté Star', mode: 'insensitive' } },
        select: { numeroClient: true, raisonSociale: true }
    })
    console.log("\nSté Star:")
    console.log(steStar)
}

main().catch(console.error).finally(() => prisma.$disconnect())
