import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:kadrilex-secure-db-2026@37.59.99.86:5432/postgres")
    cur = conn.cursor()
    
    cur.execute('SELECT "numeroClient", "raisonSociale" FROM "Client" ORDER BY "numeroClient" ASC LIMIT 5;')
    print("Top 5 by numeroClient:")
    for row in cur.fetchall():
        print(row)
        
    cur.execute('SELECT "numeroClient", "raisonSociale" FROM "Client" WHERE "raisonSociale" ILIKE \'%Star%\';')
    print("\nSté Star:")
    for row in cur.fetchall():
        print(row)
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
