import { Client } from 'pg';

async function check() {
    const client = new Client({
        connectionString: 'postgresql://postgres:kadrilex-secure-db-2026@37.59.99.86:5432/postgres'
    });
    
    await client.connect();
    
    try {
        const res = await client.query('SELECT id, numero, titre FROM "Dossier" ORDER BY "numero" ASC LIMIT 20');
        console.log("Top 20 Dossiers:");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
