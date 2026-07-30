# Architecture Finance — Dossier ↔ Facturation

> Document technique destiné à l'équipe back + front.
> Définit la logique de synchronisation entre le module **Dossiers** et le module **Facturation**, les calculs financiers exposés sur la fiche dossier, et la structure anticipée pour la **génération automatique de factures** + l'**ingestion OCR de factures reçues**.
>
> **Statut :** brouillon canonique — à figer avant l'implémentation back.

---

## 1. Principes fondateurs

### 1.1 Source de vérité unique

La **table `Invoice`** (Prisma) est la **source de vérité** de toutes les données financières. Le module Dossiers ne stocke aucun montant agrégé — il les **calcule à la volée** depuis les factures liées.

- ❌ **Ne pas faire** : champ `dossier.totalFacture` qui doit être maintenu en cohérence
- ✅ **Faire** : `getDossierFinance(dossierId)` qui agrège les `Invoice` à chaque lecture (ou cache court côté API)

Conséquence : toute modification d'une facture (statut, paiement reçu, montant ajusté) **se reflète instantanément** dans la fiche dossier sans synchronisation explicite.

### 1.2 Nature des factures

Le cabinet émet et reçoit deux types de factures :

| Direction | Description | Module | Volet OCR ? |
|---|---|---|---|
| **Émise** (vers client) | Facture d'honoraires émise par le cabinet, liée à un dossier client | Facturation → onglet "Émises" | Non (générée par le cabinet) |
| **Reçue** (depuis fournisseur) | Facture refacturable au client (huissier, expert, frais judiciaires) ou frais cabinet pur (loyer, fournitures) | Facturation → onglet "Reçues" | **Oui (OCR)** |

Le modèle `Invoice` actuel ne gère que les factures **émises**. Une extension est nécessaire pour les **reçues**.

### 1.3 Honoraires convenus = engagement, pas un montant fixe

Le champ `client.honorairesConvenus` (issu du CRM) est un **type d'accord**, pas un montant. Le calcul du "montant convenu" dépend du type :

| Type d'honoraires | Montant convenu | Source |
|---|---|---|
| Forfait | Saisi au niveau dossier (`dossier.honorairesForfait`) | Manuel |
| Temps passé | Calculé via les prestations enregistrées × taux horaire | Module Prestations (futur) |
| Résultat | % du montant obtenu (saisi à la clôture) | Manuel |
| Convention mensuelle | Montant × nb de mois écoulés | Calculé |
| Convention trimestrielle | Montant × nb de trimestres | Calculé |
| Convention annuelle | Montant × nb d'années | Calculé |
| Hors convention | Pas de montant prévisionnel — uniquement réel facturé | — |

Pour la **phase mock actuelle**, on simplifie avec un champ `dossier.honorairesEstimes: number | null` (FCFA) qui représente l'engagement total prévisionnel, peu importe le type.

---

## 2. Modèle de données proposé (extension Prisma)

### 2.1 Modifications du modèle `Invoice` existant

Le modèle actuel ([prisma/schema.prisma](prisma/schema.prisma)) gère uniquement les factures émises. À étendre :

```prisma
model Invoice {
    id              String    @id @default(cuid())
    numero          String    @unique
    direction       String    // "EMISE" | "RECUE" — NOUVEAU
    date            DateTime
    dateEcheance    DateTime?
    dateReception   DateTime? // pour les reçues — NOUVEAU
    clientId        String?   // null si reçue avec fournisseur externe — DEVIENT NULLABLE
    fournisseurId   String?   // pour reçues — NOUVEAU (lié à un nouveau modèle Fournisseur)
    dossierId       String?   // dossier rattaché — peut être null pour frais cabinet pur
    audienceId      String?
    montantHT       Float
    montantTVA      Float     @default(0)
    montantTTC      Float
    montantPaye     Float     @default(0)
    statut          String    @default("IMPAYEE")
    methodePaiement String?
    datePaiement    DateTime?
    attachmentUrl   String?   // PDF de la facture (généré ou scan original)
    notes           String?

    // OCR — NOUVEAU
    ocrSource       String?   // "MANUAL" | "SCAN" | "EMAIL_FORWARD"
    ocrRawText      String?   @db.Text // texte brut extrait
    ocrConfidence   Float?    // 0-1
    ocrStatus       String    @default("MANUAL") // "MANUAL" | "PENDING_REVIEW" | "VALIDATED" | "REJECTED"
    ocrExtractedFields Json?  // données pré-remplies par l'OCR pour validation humaine

    // Refacturation — NOUVEAU
    refacturable    Boolean   @default(false) // vrai si une facture reçue doit être refacturée au client
    refactureeViaInvoiceId String? // si refacturée, l'id de la facture émise correspondante

    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    // ... relations existantes ...
}

model Fournisseur {
    id          String    @id @default(cuid())
    nom         String
    type        String    // "HUISSIER" | "EXPERT" | "TRIBUNAL" | "AUTRE"
    email       String?
    telephone   String?
    invoices    Invoice[]
    createdAt   DateTime  @default(now())
}
```

### 2.2 Nouveau champ sur `Dossier`

```prisma
model Dossier {
    // ... champs existants ...
    honorairesEstimes Float?  // engagement prévisionnel en FCFA (null si "au temps passé" sans estimation)
    // ...
}
```

---

## 3. Calculs financiers exposés sur la fiche dossier

Tous calculés à la volée via une fonction `getDossierFinance(dossierId)`.

### 3.1 Formules

```typescript
type DossierFinance = {
    // Engagement
    honorairesEstimes: number | null      // depuis dossier.honorairesEstimes
    honorairesType: string                 // depuis client.honorairesConvenus

    // Factures émises (vers le client)
    facturesEmises: number                 // count
    montantFactureHT: number               // SUM(emises.montantHT)
    montantFactureTTC: number              // SUM(emises.montantTTC)
    montantPaye: number                    // SUM(emises.montantPaye)
    montantImpaye: number                  // SUM(emises.montantTTC - emises.montantPaye)

    // Factures reçues (frais)
    facturesRecues: number
    fraisEngages: number                   // SUM(recues.montantTTC)
    fraisRefacturablesEnAttente: number    // SUM(recues où refacturable=true ET refactureeViaInvoiceId=null)

    // Calculs dérivés
    resteAFacturer: number | null          // honorairesEstimes - montantFactureHT (null si estimation null)
    tauxFacturation: number | null         // montantFactureHT / honorairesEstimes (0-1)
    tauxRecouvrement: number               // montantPaye / montantFactureTTC (0-1)
    margeBrute: number                     // montantPaye - fraisEngages
}
```

### 3.2 Affichage UI sur la fiche dossier (section Finance)

Section structurée en 3 blocs :

#### Bloc 1 — Bandeau résumé (4 cellules intégrées, divide-x)

| Cellule | Valeur | Couleur |
|---|---|---|
| **Honoraires convenus** | `12,0M FCFA` (depuis `honorairesEstimes`) ou `Au temps passé` | sépia primary |
| **Facturé** | `8,5M FCFA` · barre de progression `71%` | sépia + barre accent |
| **Encaissé** | `6,2M FCFA` (`73%` du facturé) | success vert si > 80%, sinon sépia |
| **Restant dû** | `2,3M FCFA` | error rouge si > 0, sinon success |

#### Bloc 2 — Tableau des factures liées (sticky thead + scroll)

| N° | Date | Direction | Montant TTC | Payé | Reste | Statut | Actions |
|---|---|---|---|---|---|---|---|
| `FAC-26-089` | 12/02/26 | 📤 Émise | 1 250 000 | 0 | 1 250 000 | 🔴 Impayée | ⋯ |
| `FAC-26-076` | 28/01/26 | 📤 Émise | 980 000 | 980 000 | 0 | 🟢 Payée | ⋯ |
| `RCU-26-012` | 15/02/26 | 📥 Reçue | 145 000 | 145 000 | 0 | 🟢 Payée · ↪ Refacturée | ⋯ |

- Lignes cliquables → navigation vers la fiche facture dans le module Facturation
- Filtre rapide intégré : "Toutes / Émises / Reçues / Impayées"
- Tri sur toutes les colonnes

#### Bloc 3 — Actions rapides

- **`+ Émettre une facture`** (CTA accent) → ouvre la modale de génération avec le dossier pré-rempli (voir §4)
- **`📥 Importer une facture reçue`** (outline) → upload PDF/image → pipeline OCR (voir §5)
- **`📊 Voir dans Facturation`** (link) → ouvre `/facturation?dossier=DOS-2026-041` (filtré)

---

## 4. Génération automatique de factures émises

### 4.1 Workflow

```
[Avocat clique "+ Émettre une facture" sur fiche dossier]
        ↓
[Modale de génération — tous les champs pré-remplis]
        ↓
   Champs auto :
   - Numéro : auto-généré (FAC-YY-NNN, séquentiel)
   - Date : aujourd'hui
   - Échéance : aujourd'hui + 30j (configurable cabinet)
   - Client : depuis le dossier
   - Dossier : ID courant
   - TVA : taux par défaut Niger (19% en 2026, configurable)
        ↓
   Champs à saisir/choisir :
   - Type de prestation : depuis le dropdown HONORAIRES_TYPES (du CRM)
   - Description (textarea libre, ex: "Plaidoirie audience du 14/05/2026")
   - Montant HT (FCFA)
        ↓
   Sources de pré-remplissage automatique du montant :
   ┌─ Forfait dossier : si dossier.honorairesEstimes existe et 0 facture émise → propose le montant total
   │
   ├─ Convention récurrente : si client a convention mensuelle/trimestrielle/annuelle ET aucune facture
   │                          de la période courante existe → propose le montant de la période
   │
   ├─ Au temps passé : si module Prestations existe → propose la SUM des prestations non-facturées
   │
   └─ Manuel : sinon, montant à saisir
        ↓
[Aperçu PDF généré côté client (template HTML → PDF via @react-pdf/renderer ou serveur)]
        ↓
[Validation finale — création Invoice]
        ↓
[Optionnel : envoi email automatique au client avec PDF en pièce jointe]
```

### 4.2 Numérotation

- Format : `FAC-{YY}-{NNN}` (ex: FAC-26-089)
- Séquentiel global cabinet, pas par client
- Pas de saut, pas de doublon (contrainte DB unique)
- Préfixe différent pour reçues : `RCU-{YY}-{NNN}` (extension)

### 4.3 Templates de prestation (futur)

Pour accélérer la génération, le cabinet aura une bibliothèque de prestations standard :

| Code | Libellé | Honoraire suggéré |
|---|---|---|
| `PLAID-CIVIL` | Plaidoirie audience civile | 350 000 FCFA |
| `PLAID-COMMERCE` | Plaidoirie tribunal de commerce | 500 000 FCFA |
| `CONSULT-1H` | Consultation 1h | 75 000 FCFA |
| `REDAC-CONCLUSIONS` | Rédaction conclusions | 200 000 FCFA |
| `REFERE` | Référé | 800 000 FCFA |

Lors de la génération, l'avocat peut sélectionner un template → montant et description pré-remplis.

---

## 5. OCR sur factures reçues

### 5.1 Cas d'usage

Le cabinet reçoit régulièrement des factures de :
- **Huissiers** (signification d'actes, exécution forcée)
- **Experts** (expertise comptable, médicale, technique)
- **Tribunaux** (timbres, droits d'enregistrement)
- **Fournisseurs cabinet** (loyer, télécom, fournitures, transport)

Certaines sont **refacturables au client** (frais de procédure dans un dossier), d'autres sont des **frais généraux du cabinet**. L'OCR doit aider à les saisir vite et bien.

### 5.2 Pipeline technique

```
[Utilisateur upload un PDF ou image (drag&drop ou bouton "Importer")]
        ↓
[Upload vers stockage temporaire (S3 / Cloudflare R2)]
        ↓
[Job asynchrone : extraction OCR]
   Provider candidats :
   - Mistral Document AI (recommandé pour le français)
   - Google Document AI (Invoice Parser)
   - AWS Textract
   - Anthropic Claude API avec vision (image_url) — extraction prompt-engineered
        ↓
[Extraction structurée : champs JSON]
   {
     "fournisseur": "Huissier de Justice X",
     "numeroFacture": "F-2026-1234",
     "dateEmission": "2026-02-15",
     "dateEcheance": "2026-03-15",
     "montantHT": 145000,
     "montantTVA": 27550,
     "montantTTC": 172550,
     "devise": "FCFA",
     "lignes": [{"description": "...", "montant": 145000}],
     "confidence": 0.94
   }
        ↓
[Création d'une Invoice avec ocrStatus = 'PENDING_REVIEW']
        ↓
[L'avocat reçoit une notif "1 facture à valider"]
        ↓
[Modale de validation OCR]
   - Aperçu PDF côté gauche
   - Formulaire pré-rempli côté droit (champs surlignés en jaune si confiance < 0.8)
   - Choix : "Refacturable au client" → quel dossier ?
   - Boutons : Valider / Corriger / Rejeter
        ↓
[Validation → ocrStatus = 'VALIDATED', Invoice activée]
        ↓
[Si refacturable + dossier choisi : prêt pour refacturation manuelle ou auto via §5.3]
```

### 5.3 Refacturation au client

Une facture reçue marquée `refacturable=true` apparaît dans la fiche dossier (section Finance, sous-tableau "À refacturer"). L'avocat peut :

- Cliquer **"Inclure dans la prochaine facture émise"** → la prestation OCR + montant sont proposés lors de la génération de la prochaine `FAC-YY-NNN`
- Cliquer **"Refacturer immédiatement"** → génère une `FAC-YY-NNN` reprenant exactement le montant de la facture reçue (avec lien `refactureeViaInvoiceId`)

### 5.4 Confiance & validation humaine

L'OCR n'est jamais 100% fiable. Règles :

- **`confidence ≥ 0.95`** : validation automatique possible (si activée par le cabinet) → `ocrStatus = 'VALIDATED'` direct
- **`0.7 ≤ confidence < 0.95`** : `ocrStatus = 'PENDING_REVIEW'` → l'avocat doit valider en 1 clic
- **`confidence < 0.7`** : `ocrStatus = 'PENDING_REVIEW'` + warning + tous les champs en édition obligatoire

---

## 6. Synchronisation UI (temps réel)

### 6.1 Côté fiche dossier

- Les calculs financiers sont **fetchés** au chargement de la fiche
- À chaque action (création facture, marquage paiement, validation OCR, etc.) **dans la même session**, on **invalide le cache local** de `getDossierFinance(dossierId)` et on refetch
- Pas besoin de WebSocket pour le MVP — un simple `mutate()` (style SWR / TanStack Query) suffit après chaque action
- Indicateur visuel "Synchronisé · il y a 5s" en bas de section finance

### 6.2 Côté module Facturation

- La liste des factures côté `/facturation` est elle aussi alimentée par la même table `Invoice`
- Quand une facture est marquée payée dans `/facturation`, la fiche dossier correspondante reflète le changement au prochain refresh
- Pour réduire la friction, exposer un endpoint `GET /api/dossiers/[id]/finance` que la fiche dossier rafraîchit toutes les 60s en arrière-plan (optionnel)

### 6.3 Côté Dashboard

- Le pulse bar du dashboard (overview) consomme les mêmes agrégats globaux : `montantImpayéTotal`, `revenueDuMois`, etc.
- Aucune duplication — tout dérive de la table `Invoice`

---

## 7. Phasage d'implémentation

### Phase 1 — MVP frontend (actuel, mock)
- ✅ Mocks `lib/mock/dossiers.ts` avec sub-collection `factures` par dossier
- ✅ Section finance sur fiche dossier (lecture seule, calculs côté client à partir des mocks)
- ✅ Liste factures cliquables (vers `/facturation/[id]`)
- ❌ Pas de génération auto, pas d'OCR

### Phase 2 — Connexion DB
- Connexion Postgres local + Prisma
- Endpoint `GET /api/dossiers/[id]/finance` qui agrège
- Endpoint `POST /api/invoices` (création manuelle)

### Phase 3 — Génération auto
- Modale `+ Émettre une facture` complète
- Numérotation auto séquentielle
- Génération PDF côté serveur (`@react-pdf/renderer` ou template HTML → Puppeteer)
- Templates de prestations

### Phase 4 — OCR
- Choix du provider OCR (probablement **Mistral Document AI** pour le français + budget raisonnable)
- Pipeline upload → job → extraction → modale validation
- Refacturation au client

### Phase 5 — Sync temps réel (optionnel)
- WebSocket ou polling intelligent pour mises à jour multi-utilisateurs (quand plusieurs avocats du cabinet utilisent l'app simultanément)

---

## 8. Décisions à figer avant implémentation back

1. **Devise** : FCFA uniquement, ou aussi EUR/USD pour clients internationaux ?
2. **TVA** : taux fixe Niger (19%) ou configurable par facture ?
3. **Numérotation** : `FAC-YY-NNN` global ou par cabinet/utilisateur ?
4. **OCR provider** : décision technique + budget mensuel
5. **Stockage PDF** : local serveur, S3, R2, ou Supabase Storage (cohérent avec migration future) ?
6. **Email automatique** : envoi factures aux clients via Resend / SendGrid / SMTP cabinet ?
7. **Validation OCR auto-seuil** : à 0.95 ? Configurable cabinet ?
8. **Module Prestations** : timer intégré pour le suivi temps passé, ou import depuis un fichier externe ?

---

## 9. Récap des contrats d'API à implémenter

```
GET    /api/dossiers/[id]/finance            → DossierFinance (calculé)
GET    /api/dossiers/[id]/factures           → Invoice[] (liées au dossier)
POST   /api/invoices                          → création manuelle (émise OU reçue)
POST   /api/invoices/[id]/payment             → enregistre un paiement
POST   /api/invoices/ocr                      → upload + déclenche OCR (async)
GET    /api/invoices/ocr/[jobId]              → statut du job OCR
POST   /api/invoices/[id]/validate-ocr        → valide les champs après revue humaine
POST   /api/invoices/[id]/refacturer          → crée une facture émise depuis une reçue
GET    /api/facturation?dossierId=...         → liste filtrée (déjà existant à étendre)
```

---

*Document rédigé le 2026-05-02. À mettre à jour après chaque phase. Les phases 3-5 nécessitent une validation produit avant implémentation.*
