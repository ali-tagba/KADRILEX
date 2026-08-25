BEGIN;

\echo '--- Reassignation des dossiers RAZAK vers RAZACK ---'
UPDATE "Dossier"
SET "responsableId" = 'cms7s58ck0005132cft53rjeq'
WHERE "responsableId" = 'cms7s58cw0006132cr6nadp9h';

\echo '--- Verification : 0 dossier ne devrait plus pointer vers RAZAK ---'
SELECT COUNT(*) AS reste FROM "Dossier" WHERE "responsableId" = 'cms7s58cw0006132cr6nadp9h';

\echo '--- Suppression du compte RAZAK ---'
DELETE FROM "Membre" WHERE id = 'cms7s58cw0006132cr6nadp9h';

\echo '--- Verification finale : total dossiers RAZACK ---'
SELECT COUNT(*) AS total_dossiers_razack FROM "Dossier" WHERE "responsableId" = 'cms7s58ck0005132cft53rjeq';

COMMIT;
