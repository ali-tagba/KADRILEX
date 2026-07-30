import { Client } from 'pg';

async function check() {
    const client = new Client({
        connectionString: 'postgresql://postgres:kadrilex-secure-db-2026@37.59.99.86:5432/postgres'
    });
    
    await client.connect();
    
    try {
        console.log("Top 5 by ID:");
        let res = await client.query('SELECT "numeroClient", "raisonSociale", "createdAt" FROM "Client" ORDER BY id ASC LIMIT 5;');
        console.table(res.rows);
        
        console.log("\nSté Star:");
        res = await client.query(`SELECT "numeroClient", "raisonSociale", "createdAt" FROM "Client" WHERE "raisonSociale" ILIKE '%Star%';`);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
