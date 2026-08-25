\echo '--- MEMBRES GROUPES PAR DATEEMBAUCHE (a la seconde pres = doublons potentiels) ---'
SELECT date_trunc('second', "dateEmbauche") AS embauche_sec, COUNT(*), array_agg(prenom || ' ' || nom) AS noms
FROM "Membre"
GROUP BY date_trunc('second', "dateEmbauche")
HAVING COUNT(*) > 1
ORDER BY embauche_sec;
\echo '--- TOUS LES MEMBRES RESTANTS ---'
SELECT id, prenom, nom, email, role, actif FROM "Membre" ORDER BY "dateEmbauche", nom;
