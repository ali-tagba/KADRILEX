
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing DB connection...')
        const count = await prisma.client.count()
        console.log('Client count:', count)
        const clients = await prisma.client.findMany({ take: 2 })
        console.log('Sample clients:', clients)
    } catch (e) {
        console.error('DB Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
