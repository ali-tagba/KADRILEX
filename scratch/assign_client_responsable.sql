BEGIN;

\echo '--- Assignation des clients via avocat unique deduit de leurs dossiers ---'
WITH client_avocat AS (
  SELECT d."clientId", MIN(d."responsableId") AS avocat_id
  FROM "Dossier" d
  WHERE d."clientId" IS NOT NULL AND d."responsableId" IS NOT NULL
  GROUP BY d."clientId"
  HAVING COUNT(DISTINCT d."responsableId") = 1
)
UPDATE "Client" c
SET "responsableId" = ca.avocat_id
FROM client_avocat ca
WHERE c.id = ca."clientId";

\echo '--- Verification : total clients avec responsableId desormais ---'
SELECT COUNT(*) FROM "Client" WHERE "responsableId" IS NOT NULL;

\echo '--- Verification : clients d Oumarou desormais ---'
SELECT COUNT(*) FROM "Client" WHERE "responsableId" = 'aaaaaaaa-0001-0001-0001-000000000001';

COMMIT;
