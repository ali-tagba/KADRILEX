import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:kadrilex-secure-db-2026@37.59.99.86:5432/postgres")
    cur = conn.cursor()
    
    cur.execute('SELECT "id", "numero", "titre", "clientId" FROM "Dossier" ORDER BY "numero" ASC LIMIT 20')
    rows = cur.fetchall()
    
    for row in rows:
        print(row)
except Exception as e:
    print(e)
finally:
    if 'conn' in locals():
        conn.close()
