import { db } from './lib/db'
import { clients } from './lib/db/schema'

async function testDrizzle() {
    try {
        console.log('🧪 Testing Drizzle ORM...\n')
        
        // Test 1: Count clients
        const allClients = await db.select().from(clients)
        console.log('✅ Clients in database:', allClients.length)
        
        // Test 2: Create a client
        const newClient = {
            id: crypto.randomUUID(),
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Drizzle Test Corp',
            email: 'drizzle@test.com',
            telephone: '0606060606',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        
        const [created] = await db.insert(clients).values(newClient).returning()
        console.log('✅ Client created with Drizzle:', created.id)
        
        // Test 3: Fetch all again
        const updatedClients = await db.select().from(clients)
        console.log('✅ Total clients now:', updatedClients.length)
        
        console.log('\n🎉 DRIZZLE WORKS PERFECTLY!')
        
    } catch (error) {
        console.error('❌ ERROR:', error)
    }
}

testDrizzle()
