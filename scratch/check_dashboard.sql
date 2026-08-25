\echo '--- FACTURES ---'
SELECT COUNT(*) as total_factures FROM "Facture";
\echo '--- DEPENSES ---'
SELECT id, libelle, statut, "montantTTC", date FROM "Depense" ORDER BY date;
\echo '--- COMPTE SEQUESTRE ---'
SELECT COUNT(*) as total_sequestres, COALESCE(SUM("montantRecu"),0) as total_recu FROM "CompteSequestre";
\echo '--- PAIEMENTS ---'
SELECT COUNT(*) FROM "Paiement";
\echo '--- Date du jour serveur ---'
SELECT now();
