\echo '--- MEMBRES CORRESPONDANTS ---'
SELECT id, prenom, nom, email, role, actif, fonction FROM "Membre"
WHERE nom ILIKE '%batonnier%' OR prenom ILIKE '%batonnier%' OR email ILIKE '%batonnier%'
   OR nom ILIKE '%kadri%' OR prenom ILIKE '%kadri%' OR email ILIKE '%kadri%'
   OR nom ILIKE '%sanda%' OR prenom ILIKE '%sanda%';
\echo '--- TOUS LES MEMBRES (pour contexte) ---'
SELECT id, prenom, nom, email, role, actif FROM "Membre" ORDER BY nom;
