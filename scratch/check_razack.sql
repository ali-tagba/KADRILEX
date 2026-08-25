\echo '--- MEMBRES RAZACK/RAZAK ---'
SELECT id, prenom, nom, email, role, actif, fonction, "dateEmbauche" FROM "Membre"
WHERE nom ILIKE '%razac%' OR nom ILIKE '%razak%';
\echo '--- DOSSIERS responsable RAZACK/RAZAK ---'
SELECT id, numero, titre, "responsableId" FROM "Dossier"
WHERE "responsableId" IN ('cms7s58ck0005132cft53rjeq','cms7s58cw0006132cr6nadp9h');
\echo '--- CLIENTS responsable RAZACK/RAZAK ---'
SELECT id, nom, prenom, "raisonSociale", "responsableId" FROM "Client"
WHERE "responsableId" IN ('cms7s58ck0005132cft53rjeq','cms7s58cw0006132cr6nadp9h');
\echo '--- EQUIPE DOSSIER RAZACK/RAZAK ---'
SELECT "dossierId","membreId" FROM "EquipeDossier"
WHERE "membreId" IN ('cms7s58ck0005132cft53rjeq','cms7s58cw0006132cr6nadp9h');
\echo '--- AUDIENCES responsable RAZACK/RAZAK ---'
SELECT id, numero, titre, "responsableId" FROM "Audience"
WHERE "responsableId" IN ('cms7s58ck0005132cft53rjeq','cms7s58cw0006132cr6nadp9h');
\echo '--- TACHES responsable RAZACK/RAZAK ---'
SELECT id, titre, "responsableId" FROM "Tache"
WHERE "responsableId" IN ('cms7s58ck0005132cft53rjeq','cms7s58cw0006132cr6nadp9h');
