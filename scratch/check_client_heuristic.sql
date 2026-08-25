\echo '--- Clients avec un seul avocat responsable distinct sur leurs dossiers ---'
SELECT COUNT(*) FROM (
  SELECT d."clientId", COUNT(DISTINCT d."responsableId") AS nb_avocats
  FROM "Dossier" d
  WHERE d."clientId" IS NOT NULL AND d."responsableId" IS NOT NULL
  GROUP BY d."clientId"
  HAVING COUNT(DISTINCT d."responsableId") = 1
) t;
\echo '--- Clients avec plusieurs avocats differents (ambigu, ne sera pas touche) ---'
SELECT COUNT(*) FROM (
  SELECT d."clientId", COUNT(DISTINCT d."responsableId") AS nb_avocats
  FROM "Dossier" d
  WHERE d."clientId" IS NOT NULL AND d."responsableId" IS NOT NULL
  GROUP BY d."clientId"
  HAVING COUNT(DISTINCT d."responsableId") > 1
) t;
\echo '--- Clients sans aucun dossier rattache (resteront sans responsable) ---'
SELECT COUNT(*) FROM "Client" c
WHERE NOT EXISTS (SELECT 1 FROM "Dossier" d WHERE d."clientId" = c.id AND d."responsableId" IS NOT NULL);
