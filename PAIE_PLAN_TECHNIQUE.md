# Plan technique — Module Paie (à implémenter plus tard)

Statut : **documentation seule, non implémenté**. Ce document capture la logique métier et les paramètres légaux réels du Niger, pour reprise ultérieure sans avoir à re-rechercher les taux.

## Paramètres légaux (Niger, vérifiés par l'utilisateur — sources CLEISS, CNSS Niger)

### CNSS — cotisations sociales

| Branche | Part employeur | Part salarié |
|---|---|---|
| Pensions (vieillesse-invalidité-survivants) | 6,25 % | 5,25 % |
| Prestations familiales et maternité | 8,40 % | 0 % |
| Accidents du travail / maladies professionnelles | 1,75 % | 0 % |
| ANPE | 1,00 % | 0 % |
| **Total** | **17,40 %** | **5,25 %** |

- **Plafond mensuel** de cotisation : 500 000 FCFA (6 000 000 FCFA/an). Au-delà, pas de cotisation sur la fraction excédentaire.
- **Base plancher** : alignée sur le SMIG, 42 000 FCFA/mois. Aucune cotisation calculée sous ce montant, même si le salaire réel est inférieur (rare en cabinet mais à respecter).

### IUTS — Impôt Unique sur les Traitements et Salaires

Barème progressif par tranches de revenu mensuel imposable (après déduction des cotisations sociales salariales et abattement frais professionnels — **le mode de calcul de l'abattement reste à confirmer précisément avant implémentation**, les sources divergent légèrement sur les tranches basses) :

| Tranche mensuelle | Taux |
|---|---|
| 0 – 300 000 FCFA | 0 % |
| 300 001 – 550 000 FCFA | 1 % |
| 550 001 – 1 000 000 FCFA | 10 % |
| 1 000 001 – 1 600 000 FCFA | 15 % |
| 1 600 001 – 4 000 000 FCFA | 25 % |
| Au-delà de 4 000 000 FCFA | 35 % |

⚠️ Une source alternative (nfireport.com) donne un barème différent sur les tranches basses (1%/2%/6%/13%...). **À trancher avec un comptable/expert-comptable nigérien avant mise en production** — une erreur ici a un impact réel sur la paie des employés et la conformité fiscale du cabinet. Ne pas coder sans confirmation définitive du barème officiel en vigueur.

## Architecture technique proposée

### 1. Calcul (`lib/server/finance.ts`)
Étendre `recomputeBulletin()` :
```
salaireBrut → baseCNSS = clamp(salaireBrut, 42_000, 500_000)
           → chargesSalariales = baseCNSS * 5.25%
           → chargesPatronales = baseCNSS * 17.40%
           → revenuImposable = salaireBrut - chargesSalariales (+ primes imposables, - abattement à définir)
           → IUTS = bareme_progressif(revenuImposable)
           → salaireNet = salaireBrut + primes - retenues - chargesSalariales - IUTS
           → coutTotalEmployeur = salaireBrut + primes + chargesPatronales
```

### 2. Comptabilité (`lib/server/accounting.ts`)
Nouvelle fonction `generateBulletinEntries(bulletinId)`, suivant le même pattern que `generateExpenseEntries` :
- Débit 661100 (Salaires de base) — brut
- Débit 664 (Charges sociales patronales, compte à créer si absent)
- Crédit 431 (CNSS à payer) — charges salariales + patronales
- Crédit 447 (IUTS à reverser) — montant IUTS
- Crédit 421000 (Personnel, rémunérations dues) — net à payer
Puis à la mise en paiement effective : Débit 421000 / Crédit Banque (521000).

À appeler dans `POST /api/bulletins` et `POST /api/cron/generate-month` à la validation du bulletin (statut → FAIT/VERSE), symétriquement à ce qui existe déjà pour Facture/Dépense.

### 3. Automatisation (cron)
L'endpoint `/api/cron/generate-month` existe déjà et est sécurisé (JWT). **Il n'est actuellement déclenché par rien** — vérifié en direct sur le VPS (aucun systemd timer, aucun crontab). À faire : créer le timer systemd décrit dans le commentaire du fichier (1er de chaque mois, 3h00) + le script qui génère le JWT avec `CRON_JWT_SECRET`.

### 4. Lien avec Équipe
Le modèle `Membre` a déjà `dateEmbauche`, `dateSortie`, `actif`, `statutContrat`, `salaireBaseBrut`. Pour une génération correcte :
- Exclure les membres avec `statutContrat: 'ASSOCIE'` (déjà fait dans le cron actuel — cohérent avec l'article sur la rémunération des associés : ce n'est pas un salaire classique).
- Gérer le prorata pour une entrée/sortie en cours de mois (`dateEmbauche`/`dateSortie` dans la période) — **pas géré actuellement**.

## Ce qu'on NE fait PAS (décision explicite)
Pas de moteur de règles configurable façon Odoo (structures salariales, règles Python, work entries, conflits de feuilles de temps, configurateur d'avantages). Disproportionné pour la taille du cabinet. Le calcul reste codé en dur mais correct, avec les vrais taux légaux.

## Prochaine étape quand on reprend ce chantier
1. Faire confirmer le barème IUTS exact et la méthode d'abattement par un comptable.
2. Implémenter le calcul étendu + tests sur quelques cas réels (comparer à un bulletin calculé manuellement).
3. Brancher la comptabilité.
4. Câbler le cron.
