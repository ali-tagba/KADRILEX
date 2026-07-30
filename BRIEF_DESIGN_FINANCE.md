# BRIEF DESIGN — Module Finance

**Cabinet** : SCPA Kadri Legal (Niamey, Niger)
**Module** : Finance — englobe Facturation (émises/reçues/paiements) **+ Dépenses internes + Paie/Salaires**
**Statut actuel** : MVP facturation fonctionnel mais hors DA + références facture éparses dans 4 modules sans source de vérité unique. Aucune gestion des dépenses internes ni des salaires.
**Objectif du brief** : refonte complète + extension métier pour couvrir l'ensemble du flux financier du cabinet, avec source de vérité unifiée et préparation du module Équipe à venir.

> 📌 **Renommage** : l'entrée sidebar "**Facturation**" devient "**Finance**" (icône `account_balance_wallet` ou `payments`). Le terme "Facturation" reste utilisé pour l'**onglet** dédié aux factures à l'intérieur du module.

---

## 1. Contexte & vision

Pour un cabinet d'avocats, la finance **n'est pas un journal comptable**. C'est un **outil opérationnel** qui répond à 6 questions au quotidien :

- **Combien le client X me doit-il ?** (factures émises non encaissées)
- **Combien dois-je à mes prestataires ?** (factures reçues non payées)
- **Sur quel dossier en suis-je par rapport à l'engagement ?** (honoraires convenus vs facturé vs encaissé)
- **Quels frais ai-je avancés que je dois refacturer ?** (frais huissier/expert/greffe payés pour le compte du client)
- **Combien me coûte le cabinet ce mois-ci ?** (loyer, électricité, abonnements, fournitures = dépenses internes)
- **Combien je verse à l'équipe ?** (salaires + charges des associés/juristes/secrétariat)

→ Le module Finance doit donc **englober les 5 flux financiers** du cabinet :

| # | Flux | Direction | Exemple |
|---|---|---|---|
| 1 | **Factures émises** | Cabinet → Client | FAC-26-042 SONITEL |
| 2 | **Paiements reçus** | Client → Cabinet | Virement 500K FCFA acquittant FAC-26-042 |
| 3 | **Factures reçues refacturables** | Fournisseur → Cabinet → Client | Frais huissier 80K à refacturer dossier SONITEL |
| 4 | **Dépenses internes** (= factures reçues NON refacturables ou frais récurrents) | Fournisseur → Cabinet (cabinet absorbe) | Loyer cabinet, abonnement Wifi, fournitures bureau |
| 5 | **Salaires & charges** | Cabinet → Équipe | Bulletin de paie mensuel Me Mariama, juriste Boubacar |

Spécificité Niger : facturation et paie en **FCFA**, TVA à **19%**, charges sociales **CNSS** (à provisionner), modes de paiement courants = virement bancaire, mobile money (Airtel Money / Moov Money), espèces, chèque.

---

## 2. Vocabulaire — clarification fondamentale

L'utilisateur emploie "factures entrantes / sortantes". Ces termes mélangent **2 concepts distincts** qu'il faut séparer dans le modèle :

| Terme métier | Vocabulaire UI | Sens technique | Exemples |
|---|---|---|---|
| **Facture sortante** | Facture **émise** | Le cabinet facture le client (revenu attendu) | Honoraires SONITEL c/ État du Niger, provision Mahamane référé |
| **Facture entrante** (sens 1) | Facture **reçue** | Un fournisseur facture le cabinet (dépense) | Frais de greffe TGI, honoraires huissier, expertise comptable |
| **Facture entrante** (sens 2) | **Paiement reçu** | Le client paie une facture émise (encaissement) | Virement client de 500K FCFA acquitté la facture FAC-26-089 |

→ **3 entités** dans le modèle : `Facture` (avec `direction: EMISE|RECUE`), `Paiement` (rattaché à 1+ factures émises), et optionnellement `Fournisseur` (côté factures reçues).

L'UI ne montre jamais "entrante/sortante" — toujours **Émise / Reçue / Paiement** pour éviter la confusion.

---

## 3. Audit existant — état actuel + incohérences

### ✅ Déjà bien fait (à conserver tel quel)

- **`components/dossiers/dossier-finance-section.tsx`** — section finance de la fiche dossier conforme DA, calculs `computeFinance()` propres, distingue Émises/Reçues, gère refacturation. **Référence pour la refonte du module global.**
- **`ARCHITECTURE_FINANCE_DOSSIER.md`** — modèle de données canonique déjà documenté : direction EMISE/RECUE, OCR pipeline, refacturation. **À suivre.**
- **`computeFinance()`** dans [lib/mock/dossiers.ts](lib/mock/dossiers.ts) — agrégation à la volée, pas de doublons en DB. Pattern à généraliser.
- **Modèle Prisma `Invoice`** — déjà 80% des champs nécessaires (numero, montants HT/TVA/TTC, dateEcheance, montantPaye, statut, attachmentUrl).

### ❌ À supprimer / refaire intégralement

- **`app/facturation/page.tsx`** — actuel : lucide-react + Button/Input/Badge custom + couleurs bleu/rouge/vert/orange (**hors DA**) + une seule vue table + filtres minimaux + recherche basique. **Refonte complète au pattern Clients/Dossiers/Bibliothèque.**
- **`components/facturation/invoice-form-dialog.tsx`** + **`invoice-upload-dialog.tsx`** — DA générique, à reprendre.
- **Imports `lucide-react`** dans le module finance → remplacer par Material Symbols.
- **`statusFilter` actuel** (`PAYEE | IMPAYEE | PARTIELLE`) → enrichir avec EMISE / EN_RETARD / ANNULEE / BROUILLON + drawer multi-select.

### ⚠️ Incohérences à corriger

#### Incohérence 1 — `etatFacturation` côté client est hardcodé
[lib/mock/clients.ts](lib/mock/clients.ts) `etatFacturation: "A_JOUR" | "IMPAYE"` est un champ **figé** dans les mocks. Il devrait être **DÉRIVÉ** des factures liées :

```ts
// ❌ Aujourd'hui : flag manuel non synchronisé
etatFacturation: "IMPAYE"

// ✅ Demain : computed via getClientFinance(clientId)
const { soldeDu } = getClientFinance(clientId)
const etatFacturation = soldeDu > 0 ? "IMPAYE" : "A_JOUR"
```

→ **Action** : retirer le champ de `MockClient`, le calculer depuis les factures liées au client (et indirectement aux dossiers du client).

#### Incohérence 2 — Source de vérité fragmentée
Aujourd'hui :
- Mock dossier porte une sub-collection `factures: DossierFacture[]` (mock)
- Mock client porte un flag `etatFacturation` (hardcoded)
- API `/api/invoices` lit Prisma directement (pas synchro avec mocks)
- Dashboard `/api/dashboard/invoices-overdue` lit également Prisma

→ **Action** : créer **`lib/mock/invoices.ts`** comme **seule source de vérité mock**. Les factures du dossier et l'état du client sont calculés à la volée depuis ce fichier. L'API `/api/invoices` lit ce mock (cohérence avec le reste de l'app frontend-first).

#### Incohérence 3 — Lien dossier → facturation cassé
[components/dossiers/dossier-finance-section.tsx](components/dossiers/dossier-finance-section.tsx) ligne 77 : le bouton "Voir dans Facturation" pointe vers `/facturation?dossier=...` mais la page facturation **ne lit pas le query param**.

→ **Action** : la page facturation parse `?clientId=` et `?dossierId=` au mount et applique automatiquement le filtre.

#### Incohérence 4 — Pas de gestion centralisée des factures reçues
Le modèle Prisma `Invoice` actuel n'a **pas** de champ `direction`. Il ne gère que les émises. Or les fiches dossier exposent déjà les factures reçues via `DossierFacture.direction = "RECUE"`.

→ **Action** : appliquer l'extension Prisma documentée dans `ARCHITECTURE_FINANCE_DOSSIER.md` §2.1 (champs `direction`, `dateReception`, `fournisseurId`, `refacturable`, `refactureeViaInvoiceId`).

#### Incohérence 5 — Honoraires convenus = type, pas montant
[lib/mock/clients.ts](lib/mock/clients.ts) `honorairesConvenus: "Convention annuelle" | "Honoraires au forfait" | …` = **un type d'accord**, pas un montant facturable.

Le **montant convenu** vit au niveau du **dossier** (`honorairesEstimes`), pas du client. Cohérence à maintenir dans la nouvelle UI : sur la fiche client, ne pas afficher de "montant convenu global" — afficher **par dossier** ou en somme dérivée des dossiers.

---

## 4. Modèle de données cible

### 4.1 Entité `Facture` (la table centrale)

```prisma
model Facture {
    id              String    @id @default(cuid())
    numero          String    @unique // FAC-2026-001 (émise) | REC-2026-014 (reçue)
    direction       String    // "EMISE" (cabinet → client) | "RECUE" (fournisseur → cabinet)

    // Dates
    date            DateTime  // émission (émise) OU réception (reçue)
    dateEcheance    DateTime?

    // Émise : qui paie ?
    clientId        String?   // null si reçue de fournisseur externe sans dossier
    dossierId       String?   // dossier rattaché — peut être null pour frais cabinet pur
    audienceId      String?   // optionnel, si la prestation concerne une audience précise

    // Reçue : qui a émis vers nous ?
    fournisseurId   String?
    fournisseurNomLibre String? // si pas dans la table Fournisseur (one-shot)

    // Montants (FCFA, TVA Niger 19%)
    montantHT       Float
    tvaRate         Float     @default(19)
    montantTVA      Float     @default(0)
    montantTTC      Float

    // Paiements (computed, mais aussi stocké pour rapidité de tri)
    montantPaye     Float     @default(0)  // somme des paiements rattachés
    montantRestant  Float     // montantTTC - montantPaye, computed

    // Statut (auto-calculé via trigger ou côté front)
    statut          String    @default("BROUILLON")
    // "BROUILLON" → en cours de saisie, pas envoyée
    // "EMISE"     → envoyée, attente paiement
    // "PARTIELLE" → 0 < montantPaye < montantTTC
    // "PAYEE"     → montantPaye = montantTTC
    // "EN_RETARD" → dateEcheance < now AND montantRestant > 0
    // "ANNULEE"   → invalidée

    // Lignes de facture
    lignes          LigneFacture[]

    // Métadonnées
    description     String?
    notes           String?   // notes internes
    attachmentUrl   String?   // PDF généré ou scan original
    pdfGenereLe     DateTime?

    // Refacturation (pour factures reçues uniquement)
    refacturable    Boolean   @default(false)
    refactureeViaFactureId String? // si déjà refacturée → id de la facture émise correspondante

    // OCR (pour factures reçues importées par scan)
    ocrSource       String?   // "MANUAL" | "SCAN" | "EMAIL"
    ocrConfidence   Float?
    ocrStatus       String    @default("MANUAL") // "MANUAL" | "PENDING_REVIEW" | "VALIDATED"

    paiements       Paiement[]

    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    @@index([clientId])
    @@index([dossierId])
    @@index([direction])
    @@index([statut])
}

model LigneFacture {
    id              String    @id @default(cuid())
    factureId       String
    libelle         String    // "Honoraires plaidoirie audience 14/03/2024"
    quantite        Float     @default(1)
    prixUnitaire    Float
    total           Float
    /** Lien optionnel vers une audience (utile pour audit "facturé pour quelle prestation") */
    audienceId      String?
    facture         Facture   @relation(fields: [factureId], references: [id], onDelete: Cascade)
}
```

### 4.2 Entité `Paiement` (encaissement client)

```prisma
model Paiement {
    id              String    @id @default(cuid())
    factureId       String    // 1 paiement = 1 facture (si un client paie 2 factures d'un coup → 2 paiements)
    date            DateTime
    montant         Float
    mode            String    // "VIREMENT" | "ESPECES" | "CHEQUE" | "MOBILE_MONEY" | "CARTE" | "AUTRE"
    reference       String?   // n° chèque, ref virement, n° transaction MoMo
    notes           String?
    createdAt       DateTime  @default(now())

    facture         Facture   @relation(fields: [factureId], references: [id], onDelete: Cascade)

    @@index([factureId])
    @@index([date])
}
```

### 4.3 Entité `Fournisseur` (factures reçues)

```prisma
model Fournisseur {
    id          String    @id @default(cuid())
    nom         String    // "Maître Issoufou (huissier)" | "TGI Niamey - Greffe"
    type        String    // "HUISSIER" | "EXPERT" | "GREFFE" | "BAILLEUR" | "PRESTATAIRE_SERVICE" | "AUTRE"
    nif         String?   // si applicable
    email       String?
    telephone   String?
    adresse     String?
    factures    Facture[]
    createdAt   DateTime  @default(now())
}
```

### 4.4 Champ ajouté côté `Dossier`

```prisma
model Dossier {
    // ...
    honorairesEstimes Float?  // déjà présent côté mock — à pousser en Prisma
}
```

### 4.5 Calculs dérivés (jamais stockés en DB)

```ts
// Côté client
getClientFinance(clientId): {
    facturesEmises: number          // count
    montantTotalFacture: number     // somme TTC
    montantTotalEncaisse: number
    soldeDu: number                  // = facturé - encaissé
    facturesEnRetard: number         // count
    derniereFacture: { date, montant, statut } | null
}

// Côté dossier (déjà fait dans computeFinance)
getDossierFinance(dossierId): { /* idem brief existant */ }

// Côté global cabinet
getCabinetFinance(): {
    chiffreAffaires: number          // somme TTC factures émises payées (sur période)
    enAttenteEncaissement: number    // somme restant dû factures émises
    enRetardClients: number          // count factures émises en retard
    enRetardFournisseurs: number     // count factures reçues en retard
    fraisAvancesARefacturer: number  // somme reçues refacturable not yet refacturée
}
```

---

## 5. UX — flux utilisateur principaux

### 5.1 Flow "Émettre une facture client" (use case n°1, le plus fréquent)

**Pré-requis** : on est sur un dossier ouvert, ou sur la fiche client, ou on clique "+" depuis la page Facturation.

**Workflow proposé** (le plus ergonomique, comme demandé) :

1. Clic **"+ Nouvelle facture"** → ouvre dialogue
2. Champ **Type** : `Émise` (par défaut) | `Reçue`
3. Si Émise :
   - **Étape 1** — Choisir le **client** (autocomplete depuis liste clients)
   - **Étape 2** — Une fois le client choisi → la liste de **ses dossiers actifs** apparaît automatiquement (cf. demande explicite du user). L'utilisateur choisit le dossier (ou "Aucun dossier — facture client globale")
   - **Étape 3** — Audience optionnelle si le dossier en a (auto-suggestion : audience récente)
   - **Étape 4** — Lignes de facture :
     - Bouton **"Pré-remplir depuis l'engagement"** si le dossier a un `honorairesEstimes` → propose une ligne à hauteur du `resteAFacturer`
     - Sinon, lignes manuelles (libellé + quantité + prix unitaire)
   - **Étape 5** — Date émission (par défaut today), date échéance (par défaut +30j), TVA (par défaut 19%)
   - **Étape 6** — Description, notes internes
   - **Étape 7** — Action finale :
     - **Enregistrer en brouillon** (statut = BROUILLON)
     - **Émettre** (statut = EMISE → numéro auto-généré FAC-2026-NNN, PDF généré)

### 5.2 Flow "Saisir un paiement reçu" (use case n°2)

Le user rentre un règlement client. 2 voies :

**Voie A — Depuis une facture** :
1. Sur la fiche facture, bouton "+ Enregistrer un paiement"
2. Dialogue : montant (pré-rempli avec `montantRestant`), date, mode, référence
3. Save → facture passe en PARTIELLE ou PAYEE selon montant

**Voie B — Depuis l'écran Paiements** (consolidé, à venir) :
1. "+ Nouveau paiement" → choisir le client → liste des factures impayées du client → cocher une ou plusieurs → réparti automatiquement
2. Cas : "Le client a viré 1 200 000 FCFA. Il avait 3 factures impayées (500K, 400K, 700K = 1.6M)" → l'UI propose la répartition (500K + 400K + reste 300K sur la 3ème)

### 5.3 Flow "Importer une facture reçue" (use case n°3)

Frais huissier reçu en PDF.

1. Clic **"Importer une facture reçue"** depuis la page Facturation OU depuis la fiche dossier
2. Upload PDF (drag & drop)
3. **OCR pipeline** (à brancher plus tard) → pré-remplit fournisseur, date, montant
4. Utilisateur valide / corrige → choisit le dossier de rattachement → marque `refacturable = true` si à refacturer au client
5. Save → apparaît dans la liste avec status MANUAL ou VALIDATED

### 5.4 Flow "Refacturer des frais" (use case n°4)

Sur la fiche dossier, le bandeau "X FCFA de frais reçus à refacturer" affiche les reçues `refacturable && !refactureeViaFactureId`.

1. Clic "Refacturer →"
2. Dialogue : sélectionner les factures reçues à inclure (cases cochées par défaut)
3. Crée automatiquement une facture émise avec :
   - Une ligne par facture reçue cochée (libellé = "Refacturation [fournisseur] - [description]")
   - Champ `refactureeViaFactureId` mis à jour sur les reçues
4. La facture émise reste en BROUILLON pour ajustement avant émission

---

## 6. Architecture page Facturation

### 6.1 Header sobre conforme aux autres modules

```
COMPTABILITÉ                                                  [+ Nouvelle facture]
Facturation
12 émises  ·  4 reçues  ·  3 en retard  ·  2.4M FCFA dus  ·  850K FCFA à payer
```

- Même pattern que Clients/Dossiers/Bibliothèque
- Compteurs DÉRIVÉS de la liste filtrée (calcul à la volée, jamais hardcoded)
- "2.4M FCFA dus" en `text-error` si > 0 (somme des factures émises non encaissées)
- "850K FCFA à payer" en `text-error` si > 0 (factures reçues non payées)

### 6.2 Toolbar (calque Bibliothèque)

```
[🔍 Rechercher (n°, client, dossier, fournisseur…)]   ✕ │ ⚙ Filtres 4 │ [📋 | ⊞ | 📊]
                                                                          ↑    ↑    ↑
                                                                      Table Galerie Stats
```

3 vues :
- **Table** dense (par défaut)
- **Galerie** cards (visuel pour browser les factures avec preview)
- **Stats** (dashboard mini : CA mensuel, top clients impayés, factures en retard) — option C ultérieure

### 6.3 Drawer Filtres (multi-select aligné Clients/Bibliothèque)

Sections empilées :

1. **Direction** (radio) : Toutes / Émises uniquement / Reçues uniquement
2. **Statut** (multi-checkbox) : Brouillon · Émise · Partielle · Payée · En retard · Annulée
3. **Client** (multi-checkbox auto-peuplé depuis les factures émises)
4. **Dossier** (multi-checkbox auto-peuplé)
5. **Fournisseur** (multi-checkbox, factures reçues uniquement)
6. **Avocat en charge** (via dossier→avocatEnCharge, multi)
7. **Mode de paiement** (factures payées uniquement)
8. **Date émission** (radio + presets : Toutes / Ce mois / Ce trimestre / Cette année / Personnalisée)
9. **Date échéance** (radio + presets identiques)
10. **Montant** (range slider min/max FCFA)
11. **Visibilité** : Inclure brouillons (toggle) · Inclure annulées (toggle) · Inclure refacturées (toggle)

### 6.4 Vue Table

Colonnes (cf. l'existant comme base de départ) :

| Col | Largeur | Contenu |
|---|---|---|
| Direction | 40px | Icône `north_east` (émise) ou `south_west` (reçue) coloré |
| N° | 120px | `FAC-2026-042` mono-num — clic ouvre side panel détail |
| Date | 100px | Date émission/réception |
| Échéance | 100px | Date échéance + chip "Retard" si dépassée |
| Client / Fournisseur | flex | Nom + dossier en sous-titre |
| Montant TTC | 130px | mono-num right-aligned |
| Encaissé / Payé | 130px | vert si > 0 |
| Restant | 130px | rouge si > 0, gris si = 0 |
| Statut | 120px | chip coloré selon STATUT_FACTURE |
| PDF | 50px | icône `attach_file` cliquable si attachmentUrl |
| Actions | 40px | 3-dot menu sticky right |

Click row → side panel détail (comme Bibliothèque).

3-dot menu :
- Modifier (si BROUILLON ou pas encore payée)
- Enregistrer un paiement (si EMISE/PARTIELLE/EN_RETARD)
- Marquer comme payée (raccourci)
- Télécharger PDF
- Dupliquer
- Annuler la facture (avec confirmation, ne supprime pas — passe en ANNULEE)

### 6.5 Vue Galerie — cards facture

Cards 3 colonnes avec mini-preview PDF + métadonnées résumées + chip statut + 3-dot menu. Style équivalent aux cards Bibliothèque mais info-dense pour finance.

### 6.6 Side panel détail facture

Même mécanique que le panel détail Bibliothèque. Contenu :

```
┌──────────────────────────────────┐
│ ← Détails facture        ★ ⋮ ✕ │
├──────────────────────────────────┤
│ [PDF preview]                    │
│                                  │
├──────────────────────────────────┤
│ FAC-2026-042                     │
│ [ÉMISE] [DOS-2026-041]           │
│ [PARTIELLE] [En retard 12j]      │
│                                  │
│ ── Client ──                     │
│ SONITEL (CLI-26-001)             │
│ Dossier : SONITEL c/ État        │
│ Avocat : Me Oumarou Sanda KADRI  │
│                                  │
│ ── Montants ──                   │
│ Montant HT      : 2 100 000 FCFA │
│ TVA (19%)       :   399 000 FCFA │
│ Montant TTC     : 2 499 000 FCFA │
│ ─────────────────────────────────│
│ Encaissé        : 1 000 000 FCFA │
│ Restant dû      : 1 499 000 FCFA │
│                                  │
│ ── Lignes ──                     │
│ Honoraires plaidoirie 14/03      │
│   1 × 1 500 000 = 1 500 000      │
│ Frais huissier (refac.)          │
│   1 × 600 000   =   600 000      │
│                                  │
│ ── Paiements (1) ──              │
│ 02/04/2024 · Virement BIB        │
│ 1 000 000 FCFA · Réf. VIR-2401   │
│                                  │
│ ── Dates ──                      │
│ Émission : 14/03/2024            │
│ Échéance : 14/04/2024 (en retard)│
│                                  │
│ ── Notes ──                      │
│ Échéancier convenu en 2 fois.    │
└──────────────────────────────────┘
│ [+ Enregistrer un paiement]     │  ← actions principales
│ [Modifier] [PDF] [Annuler]      │
└──────────────────────────────────┘
```

---

## 7. Intégrations cross-modules

### 7.1 Fiche Client — section Facturation

Sur [app/clients/[id]/page.tsx](app/clients/[id]/page.tsx), ajouter une nouvelle section **Facturation** (sous "Dossiers liés") :

```
Facturation                                          [+ Émettre facture]
12 factures · 4.2M FCFA facturé · 3.8M FCFA encaissé · 400K FCFA dus

┌────────────────────────────────────────────────────────────────┐
│ N°            Date     Dossier      Montant   Restant   Statut │
│ FAC-26-042   14/03/24  DOS-…041    2.5M     1.5M     PARTIELLE │
│ FAC-26-038   28/02/24  DOS-…112    900K     0        PAYÉE     │
│ ...                                                            │
└────────────────────────────────────────────────────────────────┘
```

→ Le `etatFacturation` actuel est **dérivé** : `soldeDu > 0 ? "IMPAYE" : "A_JOUR"`.
→ La table client utilise cette dérivation au lieu du champ figé.

### 7.2 Fiche Dossier — section Finance (existant déjà)

Conserver tel quel. Brancher les boutons :
- **"Émettre une facture"** → ouvre le dialogue facture émise pré-rempli avec dossier+client de la fiche
- **"Importer une facture reçue"** → ouvre le dialogue facture reçue pré-rempli avec le dossier
- **"Voir dans Facturation"** → `/facturation?dossierId=...` (à parser dans la page facturation au mount)

### 7.3 Audience — facturation contextuelle (futur léger)

Sur la fiche audience, ajouter une mini-section "À facturer cette audience" avec :
- "Les frais de cette audience seront ajoutés à la prochaine facture du dossier"
- Bouton "Facturer cette prestation maintenant" → pré-remplit une ligne facture avec audience + libellé suggéré

### 7.4 Dashboard — cartes finance

Le dashboard a déjà :
- `OverdueInvoices` — branché sur `/api/dashboard/invoices-overdue`
- `metric-strip.tsx` — affiche compteurs

→ **Action** : brancher tous ces endpoints sur `lib/mock/invoices.ts` pour cohérence (aujourd'hui ils tapent Prisma direct).

### 7.5 Sidebar / Navigation

L'entrée "Facturation" existe déjà dans la sidebar. À conserver. Sur mobile, l'icône `payments` reste pertinente.

---

## 8. Composants UI à produire

À créer/refondre dans `components/facturation/` (remplace l'existant) :

| Fichier | Rôle | Pattern référence |
|---|---|---|
| `lib/mock/invoices.ts` | Source de vérité unique factures (mock) | `lib/mock/documents.ts` |
| `lib/constants/finance.ts` | Statuts, modes paiement, types fournisseurs, helpers FCFA | `lib/constants/biblio.ts` |
| `filters-state.ts` | State + applyFilters + countActiveFilters | `clients/filters-state.ts` |
| `facturation-toolbar.tsx` | Search + Filtres + 3 vues | `bibliotheque-toolbar.tsx` |
| `facturation-filter-drawer.tsx` | Drawer 11 sections | `bibliotheque-filter-drawer.tsx` |
| `facture-table-view.tsx` | Vue table dense | `document-table-view.tsx` |
| `facture-gallery-view.tsx` | Vue cards | `document-gallery-view.tsx` |
| `facture-stats-view.tsx` | Vue stats (CA, top impayés, retards) | nouveau |
| `facture-detail-panel.tsx` | Side panel détail facture | `document-detail-panel.tsx` |
| `facture-form-dialog.tsx` | Form CRUD facture (émise + reçue, lignes dynamiques) | `tache-form-dialog.tsx` |
| `paiement-dialog.tsx` | Dialogue d'enregistrement de paiement | nouveau |
| `client-dossier-picker.tsx` | Picker en 2 étapes : choisir client → liste ses dossiers | nouveau |
| `facture-actions-menu.tsx` | 3-dot menu (Modifier/Paiement/PDF/Dupliquer/Annuler) | `document-actions-menu.tsx` |
| `client-finance-section.tsx` | Section facturation à insérer dans fiche client | nouveau |

Et côté API :
- `app/api/invoices/route.ts` — refondre en mode mock
- `app/api/invoices/[id]/route.ts` — refondre en mode mock
- `app/api/invoices/[id]/payments/route.ts` — nouveau (GET liste paiements, POST nouveau)
- `app/api/invoices/[id]/refacturer/route.ts` — nouveau (action refacturation)

---

## 9. Layout & DA — règles strictes

- **Couleurs** : exclusivement tokens `@theme` (`primary`, `tertiary`, `accent`, `surface-*`, `outline-*`). Aucun `bg-blue-600` / `bg-emerald-50` / `bg-orange-700`.
- **Statut chips** :
  - BROUILLON → `bg-surface-container-high text-on-surface-variant`
  - ÉMISE → `bg-primary-fixed text-primary`
  - PARTIELLE → `bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant`
  - PAYÉE → `bg-[#e8f5e9] text-[#166534]` (vert validé)
  - EN_RETARD → `bg-error-container text-on-error-container`
  - ANNULÉE → `bg-surface-container text-outline line-through`
- **Direction chips** :
  - ÉMISE → `bg-primary-fixed text-primary` (icône `north_east`)
  - REÇUE → `bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant` (icône `south_west`)
- **Modes de paiement** : icônes Material — `account_balance` (virement), `payments` (espèces), `request_quote` (chèque), `phone_iphone` (mobile money), `credit_card` (carte)
- **Format FCFA** : `formatFCFA(2500000)` → `"2 500 000 FCFA"` (espace milliers, suffix unité). Valeurs compactes possibles : `2,5M FCFA` pour les grands chiffres.
- **Format mono-num** sur tous les montants et numéros de facture
- **Layout page** : `flex flex-col h-full overflow-hidden p-container-margin gap-density-medium` (cohérence avec Bibliothèque/Tâches)
- **Drawer** : 420px max, slide-in droite, ESC + outside-click + body scroll-lock
- **Dialog facture** : 720px max (lignes prennent de la place), max-h 92vh
- **TVA Niger** : 19% par défaut, modifiable par ligne (certains services exonérés)

---

## 10. Roadmap d'implémentation (séquence proposée)

### Sprint 1 — Fondations data
1. Créer `lib/constants/finance.ts` (STATUTS_FACTURE, MODES_PAIEMENT, TYPES_FOURNISSEUR, format helpers)
2. Créer `lib/mock/invoices.ts` (15-20 factures Niger réalistes — émises SONITEL/Niger Lait/AREVA + reçues huissiers/greffe + paiements partiels)
3. Refondre `/api/invoices` + créer `/api/invoices/[id]/payments` en mode mock
4. Refondre `/api/dashboard/invoices-overdue` pour lire le mock
5. Créer `getClientFinance()` et `getCabinetFinance()` dans `lib/mock/invoices.ts`
6. Migrer les références `etatFacturation` côté client en computed via `getClientFinance`

### Sprint 2 — Page Facturation refondue
7. `filters-state.ts` (state + 11 filtres + applyFilters)
8. `facturation-toolbar.tsx`
9. `facturation-filter-drawer.tsx`
10. `facture-table-view.tsx`
11. `facture-detail-panel.tsx` (side panel)
12. `facture-actions-menu.tsx` (3-dot)
13. Refondre `app/facturation/page.tsx` (header sobre + parsing query params dossierId/clientId)

### Sprint 3 — CRUD complet
14. `facture-form-dialog.tsx` avec lignes dynamiques (add/remove/calc auto HT→TVA→TTC)
15. `client-dossier-picker.tsx` (2 étapes : client → dossiers du client)
16. `paiement-dialog.tsx` (enregistrer paiement avec mode + référence)
17. Brancher les boutons dans la fiche dossier ("Émettre", "Importer reçue", "Voir dans Facturation")

### Sprint 4 — Intégrations cross-modules
18. `client-finance-section.tsx` à insérer dans `app/clients/[id]/page.tsx`
19. Mini-section "Facturer cette audience" dans `app/audiences/[id]/page.tsx`
20. Vérifier dashboard cards → données cohérentes avec mock central

### Sprint 5 — Vues complémentaires
21. `facture-gallery-view.tsx`
22. `facture-stats-view.tsx` (CA, top clients impayés, retards)

### Sprint 6 — Refacturation + génération PDF
23. Workflow refacturation (frais reçus → facture émise auto)
24. Génération PDF facture (template cabinet) — bibliothèque `@react-pdf/renderer` ou similaire

---

## 11. Hors scope (à NE PAS faire dans cette phase)

- ❌ **OCR réel** — pipeline défini dans architecture mais branchement Google Document AI / OCR.space → phase ultérieure. Bouton "Importer reçue" ouvre un dialogue à saisie manuelle pour le moment.
- ❌ **Génération PDF avec template parfait** — V1 : print to PDF ou bibliothèque légère. Polish typographique cabinet (logo, mentions légales, IBAN) → sprint 6+.
- ❌ **Export comptable SYSCOHADA** — pas demandé
- ❌ **Multi-devises** — uniquement FCFA pour l'instant
- ❌ **Échéanciers complexes** (paiements en N fois pré-programmés) — V1 : l'user enregistre les paiements au fur et à mesure
- ❌ **Rappels automatiques** par email/SMS aux clients en retard — phase ultérieure (module notifications global)
- ❌ **Module Prestations** (suivi du temps passé pour facturation au taux horaire) — phase ultérieure
- ❌ **Réconciliation bancaire** — pas demandé
- ❌ **Stats avancées** (graphiques évolution CA mensuel) — vue Stats minimale en V1, polish plus tard
- ❌ **Refacturation auto à l'audience** (tout audience tenue génère une facture) — V1 manuel uniquement
- ❌ **Acomptes** comme entité distincte → V1 : l'user crée une facture émise typée "Acompte" dans le libellé

---

## 12. Critères de validation

Le module est livré quand :

1. ✅ **Source de vérité unique** : un seul fichier `lib/mock/invoices.ts` centralise toutes les factures. Les fiches client et dossier dérivent leurs montants de là.
2. ✅ **Aucun champ `etatFacturation` hardcoded** côté client — tout est dérivé.
3. ✅ **`?clientId=` et `?dossierId=`** dans l'URL de `/facturation` filtrent automatiquement.
4. ✅ **Distinction Émise / Reçue / Paiement** claire dans l'UI à tous les niveaux.
5. ✅ **Flow "client → liste de ses dossiers" fonctionnel** dans le form de création de facture (cf. demande explicite du user).
6. ✅ **DA conforme** — aucun bleu/vert/rouge générique, exclusivement les tokens `@theme`.
7. ✅ **Toolbar pattern Clients/Bibliothèque** — search + Filtres + view toggle 3 icônes.
8. ✅ **Drawer multi-select** sur ≥ 8 critères dont Direction, Statut (multi), Client (multi), Dossier (multi), Date émission, Date échéance.
9. ✅ **Side panel détail** avec lignes + paiements + actions.
10. ✅ **3 vues fonctionnelles** : Table, Galerie, Stats (la 3e peut être simple en V1).
11. ✅ **Format FCFA partout** + dates `dd/mm/yyyy`.
12. ✅ **Calculs auto** : montantTVA = HT × tvaRate, TTC = HT + TVA, montantRestant = TTC − montantPaye, statut auto-recalculé sur paiement.
13. ✅ **Section facturation dans fiche client** affichant la liste des factures + soldes.
14. ✅ **Mock cohérent** : un client qui apparaît "IMPAYE" l'est parce qu'une vraie facture impayée pointe vers lui.
15. ✅ **`npx tsc --noEmit`** → EXIT=0
16. ✅ **Mobile responsive** : table → scroll horizontal, drawer plein écran, dialog reste utilisable

---

## 13. Inspirations / références

- **Fonction `computeFinance`** déjà excellente dans [lib/mock/dossiers.ts](lib/mock/dossiers.ts) — à généraliser
- **Pattern Bibliothèque** comme référence DA + UX (toolbar / drawer / detail panel)
- **Stripe Invoices** pour la rigueur du modèle facture émise
- **QuickBooks** pour l'ergonomie client→dossier→facture
- **Pennylane / Indy** (FR) pour la gestion factures reçues + refacturation
- **Payfit / Silae** pour la simplicité de la paie (bulletins mensuels, cumul annuel)
- **Notion / Linear** pour la fluidité des onglets sticky de page

L'app KadriLex actuelle (Clients / Dossiers / Audiences / Tâches / Bibliothèque) **EST** la référence DA. Tout le module Finance doit visuellement et structurellement appartenir à la même app.

---

## 14. Architecture globale de la page Finance — multi-onglets

> ⚠️ Cette section **complète** §6. Le §6 décrit l'**onglet Facturation** spécifiquement. La page Finance globale est en réalité **une page avec 5 onglets** persistants pour couvrir tout le périmètre financier du cabinet sans complexité.

### 14.1 Structure de la page

```
┌──────────────────────────────────────────────────────────────────┐
│ COMPTABILITÉ                                                     │
│ Finance                                                          │
│ Trésorerie : 8.4M · CA mois : 3.2M · Charges mois : 1.1M ★      │  ← header global
├──────────────────────────────────────────────────────────────────┤
│ [📊 Tableau de bord] [📑 Facturation] [📥 Frais externes]        │  ← onglets sticky
│ [💸 Dépenses internes] [👥 Paie]                                  │
├──────────────────────────────────────────────────────────────────┤
│ … contenu de l'onglet sélectionné …                              │
└──────────────────────────────────────────────────────────────────┘
```

### 14.2 Les 5 onglets

| Onglet | Icône | Contenu | Section brief |
|---|---|---|---|
| **Tableau de bord** | `dashboard` | Vue synthétique trésorerie / CA / charges / marge / top retards. Période sélectionnable. | §17 |
| **Facturation** | `receipt_long` | Factures **émises** + paiements reçus. C'est l'onglet "revenus". Sous-toggle interne `Toutes / Émises / Paiements`. | §6 |
| **Frais externes** | `inbox` | Factures **reçues refacturables** (huissier, expert, greffe — frais avancés POUR le client). Workflow refacturation. | §6 + §5.4 |
| **Dépenses internes** | `account_balance_wallet` | Charges cabinet pures non refacturables (loyer, abonnements, fournitures, frais auto…). | §15 |
| **Paie** | `groups` | Salaires & charges sociales de l'équipe. Bulletins mensuels. | §16 |

### 14.3 Header global cohérent entre onglets

```
COMPTABILITÉ
Finance
[8.4M FCFA trésorerie] · [3.2M facturé ce mois] · [2.4M dus clients]
                       · [1.1M charges] · [4.5M paie] · ★ Bilan : +1.3M
```

- Compteurs **toujours dérivés** des mocks (jamais hardcoded)
- "Trésorerie" = encaissements totaux − dépenses totales − salaires versés
- "Bilan" en `text-success` si > 0, `text-error` si négatif
- Période par défaut : **mois en cours**, sélecteur dans le tableau de bord pour la changer

### 14.4 Navigation onglets (composant)

```tsx
// components/facturation/finance-tabs.tsx — calque de la nav onglets de fiche dossier
type FinanceTab = "dashboard" | "facturation" | "frais-externes" | "depenses" | "paie"
```

- Style sticky comme un sub-nav (pas un toolbar — on garde le toolbar pour search+filtres dans chaque onglet)
- Indicateur actif : `border-b-2 border-accent text-primary-container font-medium`
- État inactif : `text-on-surface-variant hover:text-primary-container`
- Compteur dans chaque onglet : ex. `Facturation 12` (nombre de factures non payées du mois)
- URL : `/facturation?tab=paie` etc. — partageable et bookmarkable

---

## 15. Extension : Dépenses internes

### 15.1 Définition (vs factures reçues refacturables)

| Concept | Stockage | Refacturable au client ? | Impacte la marge cabinet ? |
|---|---|---|---|
| **Facture reçue refacturable** | `Facture { direction: RECUE, refacturable: true }` | ✅ Oui (workflow refacturation) | Non — neutre |
| **Dépense interne** | `DepenseInterne { ... }` | ❌ Jamais | ✅ Oui — réduit la marge |

Exemples de dépenses internes :
- **Loyer cabinet** (récurrent mensuel)
- **Internet / Téléphonie** (récurrent mensuel)
- **Abonnements logiciels** (Microsoft 365, Westlaw, Lexis…) — récurrent
- **Fournitures bureau** (papier, encre, matériel) — ponctuel
- **Carburant / Frais auto** (déplacements non liés à un dossier précis)
- **Repas affaires / représentation** (sans dossier)
- **Formation continue** des avocats
- **Cotisations Ordre des Avocats**
- **Banque & frais bancaires**

### 15.2 Modèle de données

```prisma
model DepenseInterne {
    id              String    @id @default(cuid())
    libelle         String    // "Loyer cabinet — mai 2026"
    categorie       String    // "LOYER" | "ELECTRICITE" | "INTERNET" | "ABONNEMENT_SOFTWARE"
                              // "FOURNITURES" | "CARBURANT" | "REPAS" | "FORMATION"
                              // "COTISATIONS" | "FRAIS_BANCAIRES" | "AUTRE"
    date            DateTime  // date de la dépense (paiement)

    montantHT       Float
    tvaRate         Float     @default(19)
    montantTVA      Float     @default(0)
    montantTTC      Float

    mode            String    // "VIREMENT" | "ESPECES" | "CHEQUE" | "MOBILE_MONEY" | "CARTE" | "PRELEVEMENT"
    reference       String?

    // Récurrence
    recurrent       Boolean   @default(false)
    recurrenceFrequence String? // "MENSUEL" | "TRIMESTRIEL" | "ANNUEL" — si recurrent
    parentRecurrenceId String? // pour grouper les occurrences générées

    // Fournisseur (optionnel — réutilise le modèle Fournisseur existant)
    fournisseurId   String?
    fournisseurNomLibre String?

    // Justificatif
    attachmentUrl   String?   // facture/reçu PDF ou photo
    notes           String?

    statut          String    @default("PAYEE") // toujours PAYEE par défaut (l'user enregistre quand il a déjà payé)
                                                // sinon "A_PAYER" si on enregistre avant paiement effectif

    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    @@index([categorie])
    @@index([date])
}
```

### 15.3 UX onglet Dépenses internes

**Toolbar identique à Facturation** : search + bouton **+ Nouvelle dépense** + filtres drawer.

**Filtres drawer** :
- Catégorie (multi-checkbox)
- Période (radio + presets : Ce mois / Ce trimestre / Cette année / Personnalisée)
- Mode de paiement (multi)
- Fournisseur (multi auto-peuplé)
- Récurrentes uniquement (toggle)
- Avec/sans justificatif (toggle)

**Vue Table** colonnes :
- Date · Libellé · Catégorie chip · Montant TTC · Mode · Récurrence (icône `event_repeat` si récurrent) · Justificatif (📎 ou —) · Actions

**Vue Galerie** (cards par catégorie avec montant cumul + nb dépenses).

**Form de saisie** ergonomique — 3 modes :
- **Saisie rapide** (cas le plus fréquent) : libellé + montant + catégorie + mode → Save (date = today, TVA auto)
- **Saisie détaillée** : tous les champs (HT, TVA séparée, fournisseur, justificatif, notes)
- **Saisie récurrente** : coche "Récurrente" → fréquence (mensuel/trimestriel/annuel) → l'app génère automatiquement les futures occurrences

**Calcul auto** : la catégorie pré-remplit la TVA (loyer souvent exonéré, électricité 19%, frais bancaires souvent exonérés…).

### 15.4 Calculs dérivés

```ts
getCabinetCharges(periode: { start, end }): {
    total: number
    parCategorie: Record<CategorieKey, number>
    recurrent: number    // somme des récurrentes du mois
    ponctuel: number     // somme des non-récurrentes
    nbDepenses: number
}
```

### 15.5 Intégration dashboard

Sur l'onglet Tableau de bord, card "Charges du mois" affiche :
- Montant total
- Top 3 catégories
- Tendance vs mois précédent (en %)

---

## 16. Extension : Paie / Salaires

> 📌 Ce volet **prépare** le futur module **Équipe / Gestion d'équipe**. Le brief Équipe étendra le modèle `Employe` (photo, fonction, contact, congés, etc.) et fera le pont avec ce volet Paie. Pour l'instant, on crée le modèle minimal nécessaire à la paie.

### 16.1 Vocabulaire

- **Employé** : tout membre de l'équipe rémunéré (avocat associé, juriste collaborateur, secrétaire, stagiaire, freelance régulier)
- **Bulletin de paie** : document mensuel détaillant la rémunération brute, charges, net. **1 bulletin = 1 employé × 1 mois**
- **Salaire brut** : rémunération avant charges patronales/salariales
- **Charges sociales CNSS** : contribution sécurité sociale au Niger (employeur ~16,5% / salarié ~5,25% du brut, taux à confirmer avec le cabinet)
- **Salaire net** : ce que l'employé reçoit effectivement
- **Coût total employeur** : brut + charges patronales (= ce que sort le cabinet)

### 16.2 Modèle de données — entité `Employe` (minimale, à étendre par module Équipe)

```prisma
model Employe {
    id              String    @id @default(cuid())
    nom             String
    prenom          String

    /** Type contractuel — élargira avec le module Équipe */
    statutContrat   String    // "ASSOCIE" | "COLLABORATEUR_CDI" | "COLLABORATEUR_CDD"
                              // "STAGIAIRE" | "SECRETAIRE_CDI" | "FREELANCE"
    fonction        String?   // "Avocat associé" | "Juriste" | "Secrétaire" | "Stagiaire"

    /** Salaire de base contractuel (brut mensuel, FCFA). Peut évoluer dans le temps via avenant. */
    salaireBaseBrut Float
    devise          String    @default("XOF")

    /** Date d'entrée dans le cabinet */
    dateEmbauche    DateTime
    dateSortie      DateTime? // null si toujours employé
    actif           Boolean   @default(true)

    /** Lien vers AvocatCabinet pour les associés/collaborateurs avocats — optionnel */
    avocatCabinetKey String?  // matching avec lib/constants/legal.ts AVOCATS_CABINET

    /** Coordonnées bancaires (à chiffrer en prod) */
    rib             String?
    banque          String?

    /** Mobile money pour les versements (alternative au virement) */
    mobileMoney     String?

    notes           String?

    bulletins       BulletinPaie[]

    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    @@index([statutContrat])
    @@index([actif])
}
```

### 16.3 Modèle de données — entité `BulletinPaie`

```prisma
model BulletinPaie {
    id              String    @id @default(cuid())
    employeId       String
    employe         Employe   @relation(fields: [employeId], references: [id], onDelete: Cascade)

    // Période
    annee           Int       // ex 2026
    mois            Int       // 1-12
    /** Période lisible "Mai 2026" — généré côté front */

    // Montants (FCFA)
    salaireBrut     Float     // peut différer de employe.salaireBaseBrut si primes/retenues
    primes          Float     @default(0)
    retenues        Float     @default(0)
    chargesSalariales Float   @default(0)  // CNSS part salarié, IUTS, etc.
    chargesPatronales Float   @default(0)  // CNSS part employeur — payé par cabinet en plus

    salaireNet      Float     // = brut + primes - retenues - chargesSalariales
    coutTotalEmployeur Float  // = brut + primes + chargesPatronales

    // Lignes détail (optionnel — pour bulletin riche)
    lignes          BulletinLigne[]

    // Versement
    statut          String    @default("BROUILLON")
    // "BROUILLON" | "VALIDE" | "VERSE"
    dateVersement   DateTime?
    modeVersement   String?   // "VIREMENT" | "MOBILE_MONEY" | "ESPECES" | "CHEQUE"
    reference       String?

    // Document
    pdfUrl          String?

    notes           String?

    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    @@unique([employeId, annee, mois])  // 1 seul bulletin par employé/mois
    @@index([annee, mois])
    @@index([statut])
}

model BulletinLigne {
    id            String    @id @default(cuid())
    bulletinId    String
    libelle       String    // "Salaire de base" | "Prime de performance" | "CNSS salarié" | "Avance sur salaire"
    type          String    // "GAIN" | "RETENUE" | "CHARGE_SALARIALE" | "CHARGE_PATRONALE"
    montant       Float
    bulletin      BulletinPaie @relation(fields: [bulletinId], references: [id], onDelete: Cascade)
}
```

### 16.4 UX onglet Paie

**Sous-vues internes** :
- **Bulletins** (par défaut) : liste de tous les bulletins, filtrables par mois/employé
- **Employés** : liste minimale des employés (sera enrichie par le module Équipe)

**Toolbar** : sélecteur de **mois** dominant (ex. "Mai 2026 ▾"), search par nom employé, bouton **+ Nouveau bulletin**, bouton **Générer bulletins du mois** (génère 1 bulletin BROUILLON par employé actif sur la base de leur `salaireBaseBrut`).

**Vue Table** colonnes :
- Employé (nom + fonction) · Mois · Brut · Primes · Retenues · **Net** (en gras) · Coût total · Statut chip · Versé le · Actions

**Statuts bulletin** :
- `BROUILLON` — saisi mais pas validé (chip gris)
- `VALIDE` — validé, prêt à être versé (chip primary)
- `VERSE` — payé à l'employé (chip vert)

**Form de bulletin** (création / édition) :
1. **Étape 1** — Choisir l'employé + mois/année (auto-pré-rempli avec le mois en cours)
2. **Étape 2** — Salaire brut (pré-rempli avec `employe.salaireBaseBrut`)
3. **Étape 3** — Lignes :
   - **Gains** : salaire de base, primes (libellé libre)
   - **Retenues** : avances sur salaire, sanctions, autres
   - **Charges salariales** : CNSS salarié (calculé auto avec taux configurable)
   - **Charges patronales** : CNSS employeur (calculé auto)
4. **Étape 4** — Récap auto :
   - Salaire brut total : X
   - Primes : +Y
   - Retenues : −Z
   - Charges salariales : −W
   - **= NET À VERSER : N**
   - Charges patronales : +P
   - **Coût total cabinet : C**
5. **Action** : Enregistrer en BROUILLON, ou Valider, ou Marquer comme versé

**Bulk action "Générer bulletins du mois"** : pour chaque employé actif → crée un bulletin BROUILLON avec les valeurs par défaut (salaire de base + charges calculées). L'utilisateur valide/ajuste un par un.

### 16.5 Calculs dérivés

```ts
getMassesalariale(periode: { annee, mois }): {
    nbBulletins: number
    nbEmployes: number
    totalBrut: number
    totalNet: number
    totalChargesSalariales: number
    totalChargesPatronales: number
    coutTotalEmployeur: number
    parStatutContrat: Record<string, number>  // ex { ASSOCIE: 8M, COLLABORATEUR_CDI: 3M, ... }
}

getEmployeAnnuel(employeId, annee): {
    bulletins: BulletinPaie[]
    cumulBrut: number
    cumulNet: number
    cumulChargesPatronales: number
}
```

### 16.6 Connexion future module Équipe

Quand le module **Équipe / Gestion d'équipe** sera développé, il viendra :

- **Étendre `Employe`** avec : photo, email, téléphone, adresse, congés, bilan d'objectifs, formations, contrat PDF
- **Ajouter** : suivi des absences/congés, planning, évaluations
- **Le volet Paie reste dans Finance** — l'employé créé dans Équipe est immédiatement disponible pour générer ses bulletins
- **Cohérence avocat ↔ employé** : `Employe.avocatCabinetKey` (existant) lie un employé à la liste contrôlée des avocats. Quand un dossier est attribué à un avocat, on peut tracer les heures travaillées (futur).

→ **Clé pour ne pas se peindre dans un coin** : créer le modèle `Employe` minimal **maintenant** (juste ce qu'il faut pour la paie) et **ne jamais** dupliquer l'info dans `BulletinPaie`. Quand Équipe arrivera, il enrichira `Employe`.

---

## 17. Onglet Tableau de bord Finance

Vue synthétique sur la situation financière du cabinet.

### 17.1 Sélecteur de période (haut de l'onglet)

```
[ Mai 2026 ▾ ]   [Mois ↔ Trimestre ↔ Année ↔ Personnalisé]
```

Toutes les cards et graphiques en dessous reflètent la période choisie.

### 17.2 Cards principales (grid 4 colonnes)

| Card | Contenu | Couleur |
|---|---|---|
| **Trésorerie** | Solde théorique = encaissements − dépenses − salaires versés | Primary container |
| **CA facturé** | Total TTC factures émises période + variation vs période précédente | Accent |
| **Encaissé** | Total paiements reçus période | Vert (`#166534`) si > 80% du facturé |
| **Solde dû clients** | Total restant dû factures émises | Rouge si > 0 |

### 17.3 Cards secondaires (grid 3 colonnes)

| Card | Contenu |
|---|---|
| **Charges fonctionnement** | Total dépenses internes du mois + top 3 catégories |
| **Masse salariale** | Coût total employeur du mois (brut + charges patronales) |
| **Frais à refacturer** | Factures reçues refacturables non encore refacturées (alerte si > X) |

### 17.4 Bilan mensuel (KPI principal)

```
┌──────────────────────────────────────────────────────────────┐
│  📊 Bilan Mai 2026                                           │
│                                                              │
│   Encaissé :   2 800 000 FCFA                                │
│   Charges  : −  650 000                                      │
│   Salaires : − 4 200 000                                     │
│   ──────────────────────────                                 │
│   = Bilan  : −2 050 000  ⚠ déficit                           │
│                                                              │
│   (rouge si négatif, vert si positif)                        │
└──────────────────────────────────────────────────────────────┘
```

### 17.5 Listes prioritaires (en bas)

- **Top 5 clients en retard** (factures émises EN_RETARD triées par montant)
- **Frais externes en attente de refacturation** (action rapide "Refacturer")
- **Bulletins de paie à valider** (BROUILLON en attente de validation)

### 17.6 Pas de graphiques sophistiqués en V1

Pas de courbes / camemberts en V1. Juste des chiffres clairs + barres de progression simples (bar de couleur en dessous de chaque card pour comparer à la période précédente). Si le cabinet veut plus de stats, on pourra ajouter Recharts plus tard.

---

## 18. Mise à jour Roadmap (extension §10)

Roadmap initiale §10 conserve les sprints 1–6 pour le cœur Facturation. **À ajouter** :

### Sprint 7 — Dépenses internes
- `lib/mock/depenses.ts` (12-15 dépenses Niger réalistes : loyer Niamey, électricité, internet, MS365, fournitures…)
- `lib/constants/depenses.ts` (CATEGORIES_DEPENSE)
- `app/api/depenses/route.ts` mock
- `components/facturation/depense-form-dialog.tsx`
- `components/facturation/depense-table-view.tsx`
- Brancher l'onglet "Dépenses internes" dans la page Finance

### Sprint 8 — Paie minimale (volet Finance)
- `lib/mock/employes.ts` (5 employés cabinet : 4 avocats AVOCATS_CABINET + 1 secrétaire)
- `lib/mock/bulletins.ts` (3 mois × 5 employés = 15 bulletins de démonstration)
- `lib/constants/paie.ts` (TAUX_CNSS_SALARIE, TAUX_CNSS_EMPLOYEUR — paramétrables)
- `app/api/employes/route.ts` + `app/api/bulletins/route.ts` mock
- `components/facturation/bulletin-form-dialog.tsx` (avec calcul auto net/coût)
- `components/facturation/bulletin-table-view.tsx`
- Bouton "Générer bulletins du mois" (bulk create BROUILLON)
- Brancher l'onglet "Paie"

### Sprint 9 — Tableau de bord
- `components/facturation/finance-dashboard.tsx`
- Sélecteur période
- Cards principales + bilan mensuel + listes prioritaires
- Calculs `getCabinetTresorerie()`, `getMassesalariale()`, `getCabinetCharges()` consolidés

### Sprint 10 — Multi-onglets + nav
- `components/facturation/finance-tabs.tsx`
- Refactor de `app/facturation/page.tsx` pour orchestrer les 5 onglets
- Renommer entrée sidebar "Facturation" → "Finance" (icône `account_balance_wallet`)
- URL persistante par onglet (`?tab=paie`)

---

## 19. Hors scope (mise à jour §11)

À ajouter aux exclusions :

- ❌ **Génération PDF de bulletin de paie au format légal CNSS** — V1 : mise en page simple non-officielle. Format réglementaire Niger → futur.
- ❌ **Calcul d'IUTS (impôt sur traitements et salaires)** progressif — V1 : champ libre "retenue fiscale" à saisir manuellement
- ❌ **Gestion des congés payés / RTT** — relève du module Équipe à venir
- ❌ **Pointage / suivi du temps de travail** — module Équipe + futur module Prestations (pour facturation au taux horaire)
- ❌ **Versement automatique** des bulletins via API banque/mobile money — V1 : l'utilisateur enregistre le versement après l'avoir effectué manuellement
- ❌ **Avenants de contrat / historique des évolutions de salaire** — V1 : `salaireBaseBrut` est la valeur courante. Historique → module Équipe
- ❌ **Notes de frais avec scan de tickets** + workflow validation hiérarchique — V1 : saisie directe par l'utilisateur autorisé. Workflow → ultérieur
- ❌ **Distinction TVA déductible / non-déductible** sur les dépenses — V1 : on enregistre la TVA mais on ne la traite pas comptablement
- ❌ **Export comptable SYSCOHADA** — pas demandé

---

## 20. Critères de validation supplémentaires

Le module Finance complet est livré quand (en plus des 16 critères §12) :

17. ✅ La page Finance a **5 onglets fonctionnels** (Tableau de bord / Facturation / Frais externes / Dépenses internes / Paie)
18. ✅ Chaque onglet **partage le même header global** (compteurs trésorerie / CA / charges)
19. ✅ Le mock unique **`lib/mock/depenses.ts`** alimente l'onglet Dépenses internes
20. ✅ Le mock unique **`lib/mock/employes.ts` + `bulletins.ts`** alimente l'onglet Paie
21. ✅ La création d'un bulletin **calcule automatiquement** net + coût employeur à partir du brut et des taux configurés
22. ✅ Le **bilan mensuel** sur le tableau de bord agrège correctement encaissements − charges − salaires
23. ✅ La sidebar affiche "**Finance**" (et non plus "Facturation")
24. ✅ L'URL `/facturation?tab=paie` charge directement l'onglet Paie (idem pour les autres)
25. ✅ Le modèle `Employe` est **prêt à être étendu** par le module Équipe sans avoir à dupliquer l'info dans `BulletinPaie`

---

## 21. Schéma de connexion modules (vue d'ensemble)

```
┌──────────────────────────────────────────────────────────────────────┐
│                            MODULE FINANCE                            │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      │
│  │ Tableau de │  │ Facturation│  │  Dépenses  │  │   Paie /   │      │
│  │  bord (KPI)│  │ Émises +   │  │  internes  │  │   Salaires │      │
│  │            │  │ Paiements  │  │            │  │ (Bulletins)│      │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘      │
│        │               │               │               │             │
│        └───────────────┴───────────────┴───────────────┘             │
│                              │                                       │
│                              ▼                                       │
│                  ┌─────────────────────────┐                         │
│                  │  Source de vérité unique │                         │
│                  │   lib/mock/finance/*     │                         │
│                  │   ├ invoices.ts          │                         │
│                  │   ├ paiements.ts         │                         │
│                  │   ├ depenses.ts          │                         │
│                  │   ├ employes.ts          │                         │
│                  │   └ bulletins.ts         │                         │
│                  └─────────────────────────┘                         │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌─────────────┐         ┌─────────────┐       ┌─────────────┐
│   CLIENTS   │         │  DOSSIERS   │       │    ÉQUIPE   │
│             │         │             │       │  (à venir)  │
│ Section     │         │ Section     │       │             │
│ Facturation │         │ Finance     │       │ Étend       │
│ par client  │         │ par dossier │       │ Employe +   │
│ (dérivé)    │         │ (computeFi.)│       │ pilotage    │
└─────────────┘         └─────────────┘       └─────────────┘
```

→ Clé : **un seul module Finance** absorbe tout le périmètre financier. Les autres modules (Clients, Dossiers, Équipe) **lisent** depuis ce module mais n'y dupliquent rien. Cohérence garantie, ergonomie simplifiée.
