\echo '--- AUDIENCES responsable = Batonnier ---'
SELECT id, numero, titre, "responsableId" FROM "Audience"
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- TACHES responsable = Batonnier ---'
SELECT id, titre, "responsableId", "assigneA" FROM "Tache"
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- TACHES assigneA texte mentionnant batonnier ---'
SELECT id, titre, "responsableId", "assigneA" FROM "Tache"
WHERE "assigneA" ILIKE '%batonnier%' OR "assigneA" ILIKE '%btonnier%';
\echo '--- DEPENSE employeId = Batonnier ---'
SELECT id, libelle, "employeId" FROM "Depense"
WHERE "employeId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
\echo '--- DILIGENCE responsable = Batonnier ---'
SELECT id, "responsableId" FROM "Diligence"
WHERE "responsableId" IN ('cms7s58by0003132cnozg0xue','cms7s58cb0004132c47pdujzo');
