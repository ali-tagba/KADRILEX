\echo '--- Clients avec avocatEnCharge renseigne (echantillon) ---'
SELECT id, nom, "raisonSociale", "avocatEnCharge" FROM "Client"
WHERE "avocatEnCharge" IS NOT NULL AND "avocatEnCharge" != ''
LIMIT 15;
\echo '--- Compte de clients avec avocatEnCharge renseigne ---'
SELECT COUNT(*) FROM "Client" WHERE "avocatEnCharge" IS NOT NULL AND "avocatEnCharge" != '';
\echo '--- Valeurs distinctes de avocatEnCharge ---'
SELECT "avocatEnCharge", COUNT(*) FROM "Client" GROUP BY "avocatEnCharge" ORDER BY COUNT(*) DESC LIMIT 20;
\echo '--- avocatCabinetKey des membres ---'
SELECT id, prenom, nom, "avocatCabinetKey" FROM "Membre";
