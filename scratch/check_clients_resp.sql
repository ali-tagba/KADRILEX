\echo '--- Total clients avec responsableId NON NULL ---'
SELECT COUNT(*) FROM "Client" WHERE "responsableId" IS NOT NULL;
\echo '--- Total clients (tous) ---'
SELECT COUNT(*) FROM "Client";
\echo '--- Clients d Oumarou via EquipeClient ---'
SELECT COUNT(*) FROM "EquipeClient" WHERE "membreId" = 'aaaaaaaa-0001-0001-0001-000000000001';
\echo '--- Echantillon de 5 clients au hasard ---'
SELECT id, nom, prenom, "raisonSociale", "responsableId" FROM "Client" LIMIT 5;
