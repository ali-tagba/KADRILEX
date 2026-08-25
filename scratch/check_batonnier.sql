\echo '--- DOSSIERS responsable = Batonnier (les deux) ---'
SELECT id, numero, titre, "responsableId" FROM "Dossier"
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- CLIENTS responsable = Batonnier (les deux) ---'
SELECT id, nom, prenom, "raisonSociale", "responsableId" FROM "Client"
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- EQUIPE DOSSIER (membre = Batonnier) ---'
SELECT "dossierId","membreId" FROM "EquipeDossier"
WHERE "membreId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- EQUIPE CLIENT (membre = Batonnier) ---'
SELECT "clientId","membreId" FROM "EquipeClient"
WHERE "membreId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- AUDIENCES avocatId/responsable = Batonnier ---'
SELECT column_name FROM information_schema.columns WHERE table_name='Audience';
\echo '--- FACTURES lignes / paiements ref Batonnier (via lignes audienceId not relevant) ---'
\echo '--- BULLETIN / employeId = Batonnier ---'
SELECT id, "employeId", annee, mois FROM "Bulletin"
WHERE "employeId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- TACHE responsable/assigne = Batonnier ---'
SELECT column_name FROM information_schema.columns WHERE table_name='Tache';
