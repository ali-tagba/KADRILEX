BEGIN;

\echo '--- Reassignation des 64 dossiers vers Oumarou Sanda KADRI ---'
UPDATE "Dossier"
SET "responsableId" = 'aaaaaaaa-0001-0001-0001-000000000001'
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');

\echo '--- Verification : 0 dossier ne devrait plus pointer vers Batonnier ---'
SELECT COUNT(*) AS reste FROM "Dossier"
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');

\echo '--- Suppression des deux comptes Batonnier ---'
DELETE FROM "Membre" WHERE id IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');

\echo '--- Verification finale : total dossiers Oumarou ---'
SELECT COUNT(*) AS total_dossiers_oumarou FROM "Dossier"
WHERE "responsableId" = 'aaaaaaaa-0001-0001-0001-000000000001';

COMMIT;
