\echo '--- JOURNAUX ---'
SELECT code, libelle FROM "JournalComptable" ORDER BY code;
\echo '--- COMPTES REQUIS PAR ACCOUNTING.TS ---'
SELECT numero, libelle FROM "CompteComptable"
WHERE numero IN ('411000','706100','443100','401000','605100','445200','521000','571000',
'622100','628100','612000','624100','632000','631100','661100','421000')
ORDER BY numero;
\echo '--- EXERCICE COMPTABLE OUVERT ---'
SELECT id, "dateDebut", "dateFin", cloture FROM "ExerciceComptable" ORDER BY "dateDebut" DESC;
