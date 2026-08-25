\echo '--- ECRITURES (toutes) ---'
SELECT e.id, e."numeroPiece", e.libelle, e."dateEcriture", e."dossierId", j.code as journal, e.validee
FROM "Ecriture" e
LEFT JOIN "JournalComptable" j ON j.id = e."journalId"
ORDER BY e."dateEcriture";
\echo '--- LIGNES ECRITURE (toutes) ---'
SELECT le.id, le."ecritureId", c.numero as compte, c.libelle as compte_libelle, le.libelle, le.debit, le.credit
FROM "LigneEcriture" le
LEFT JOIN "CompteComptable" c ON c.id = le."compteId"
ORDER BY le."ecritureId";
\echo '--- DEPENSES (compte) ---'
SELECT COUNT(*) FROM "Depense";
\echo '--- ECRITURES DU DOSSIER GORTSALA ---'
SELECT e.id, e."numeroPiece", e.libelle FROM "Ecriture" e WHERE e."dossierId" = 'cms7s58ea000a132cqp2x38gs';
