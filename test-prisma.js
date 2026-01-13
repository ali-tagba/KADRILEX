const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPrisma() {
    try {
        console.log('Testing Prisma connection...')

        // Test 1: Count clients
        const count = await prisma.client.count()
        console.log('✅ Client count:', count)

        // Test 2: Create a simple client
        const client = await prisma.client.create({
            data: {
                type: 'PERSONNE_MORALE',
                raisonSociale: 'Test Company',
                email: 'test@company.com',
                telephone: '0101010101',
                ville: 'Abidjan',
            }
        })
        console.log('✅ Client created:', client.id)

        // Test 3: Fetch all clients
        const clients = await prisma.client.findMany()
        console.log('✅ Total clients:', clients.length)

        console.log('\n✅ ALL TESTS PASSED - Prisma works correctly!')

    } catch (error) {
        console.error('❌ ERROR:', error.message)
        console.error('Full error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testPrisma()
