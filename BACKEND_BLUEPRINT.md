# Backend Blueprint — KadriLex

**Cabinet** : SCPA Kadri Legal (Niamey, Niger)
**Stack frontend** : Next.js 16 + React 19 + TypeScript strict + Tailwind 4 + RBAC custom
**Cible backend** : Prisma 6 + PostgreSQL (Neon ou Supabase) + API REST Next.js + Storage R2/S3 pour pièces jointes
**Date** : 2026-05-05
**Statut** : frontend mock-mode complet, prêt à brancher sur DB réelle

---

## 0. Comment lire ce document

Ce blueprint est la **référence officielle** pour la construction du backend. Il documente, pour chaque module :

1. Le **modèle de données** exact (du frontend, à reproduire en Prisma)
2. Les **relations** vers les autres entités
3. Les **vues** utilisateur (pages, tables, formulaires)
4. Les **endpoints API** attendus (verbe + path + payload)
5. Les **règles métier** (calculs dérivés, cycles de vie, validations)
6. Le **filtrage RBAC** à appliquer côté serveur

À la fin, un **schéma global des relations** + une **matrice RBAC** + un **plan de migration mock → DB**.

> Toute logique métier décrite ici existe **déjà côté frontend** sous forme de fonctions pures dans `lib/mock/*.ts`. Le backend doit **rejouer** ces règles côté serveur (jamais faire confiance au frontend pour la sécurité).

---

## 1. Vue d'ensemble de l'architecture

### 1.1 8 modules métier

```
┌──────────────────────────────────────────────────────────┐
│                   KadriLex — modules                     │
├──────────────────────────────────────────────────────────┤
│  1. Dashboard (page d'accueil — vue agrégée NON-financière)
│  2. Clients (CRM — PM/PP, conventionnée, contacts)
│  3. Dossiers (affaires juridiques — GED + finance)
│  4. Audiences (calendrier judiciaire)
│  5. Tâches (todo list cabinet — Kanban + liste)
│  6. Bibliothèque (jurisprudence + modèles + doctrine)
│  7. Équipe (annuaire + RBAC + cycle de vie membres)
│  8. Finance (6 sous-onglets) :
│     • Tableau de bord financier
│     • Vue d'ensemble (registre unifié)
│     • Facturation (émise + reçue)
│     • Frais externes (refacturables)
│     • Dépenses internes
│     • Paie (Mois en cours / Historique)
└──────────────────────────────────────────────────────────┘
```

### 1.2 Pile technique cible

| Couche | Choix | Raison |
|---|---|---|
| Base de données | **PostgreSQL** (Neon serverless ou Supabase) | Compatible Prisma, transactions, JSON natif |
| ORM | **Prisma 6** | Déjà installé, schema déclaratif, migrations |
| API | **Next.js Route Handlers** (`app/api/...`) | Co-localisé avec le frontend, types partagés |
| Auth | **NextAuth v5** ou custom JWT + cookie httpOnly | Cookie `Secure; SameSite=Lax`, RBAC matrix server-side |
| Storage fichiers | **Cloudflare R2** ou **Supabase Storage** | Signed URLs pour PDF factures, fiches paie, justificatifs |
| Validation payload | **Zod** | Schémas partagés frontend/backend |
| Background jobs | **Inngest** ou **cron Vercel** | Génération auto bulletins paie, rappels échéances |
| Logging | **Logtail** ou **Axiom** | Audit trail des modifications sensibles |

---

## 2. Catalogue des modules

### 2.1 Module Dashboard

**Page** : `/`

**Vues** :
- Header (titre + date + boutons "Tout actualiser" + "Nouveau dossier")
- **Pulse Bar** 4 cellules : Audiences aujourd'hui, Dossiers actifs, Tâches en cours, Équipe (membres actifs)
- Grid 8/4 cols :
  - **Audiences à venir** (8 cols, 30 prochains jours, scroll 10 max)
  - **Tâches en cours** (8 cols, retards en haut, 10 max)
  - **Activité récente** (4 cols, 8-12 derniers événements)

**Décision produit** : **AUCUN chiffre financier**. Le backend ne doit jamais exposer de FCFA, créances, encaissements depuis cet endpoint. Cf. [BRIEF_DESIGN_DASHBOARD_V2.md](BRIEF_DESIGN_DASHBOARD_V2.md).

**Endpoints attendus** :
- `GET /api/dashboard/overview` → `{ audiencesToday, nextAudience, activeDossiers, activeDossiersDelta, activeTasksCount, overdueTasksCount, activeClientsCount, activeTeamCount }`
- `GET /api/dashboard/audiences?days=30` → array audiences à venir
- `GET /api/dashboard/tasks?status=open` → array tâches non terminées
- `GET /api/dashboard/activity?limit=20` → fil d'activité agrégé

**Filtrage RBAC** : si scope `dashboard.global = OWN`, ne retourner que les entités où l'utilisateur est `responsableId` ou dans `equipeIds`.

---

### 2.2 Module Clients (CRM)

**Pages** : `/clients` (table + galerie) · `/clients/[id]` (fiche complète)

#### Modèle de données — `Client`

```prisma
model Client {
  id                  String    @id @default(cuid())
  numeroClient        String    @unique // CLI-YY-NNN auto-généré
  type                ClientType // PERSONNE_MORALE | PERSONNE_PHYSIQUE

  // PM
  raisonSociale       String?
  formeJuridique      String?    // SARL, SA, GIE, … (texte libre + datalist)
  numeroRCCM          String?
  nif                 String?    // requis pour facturer
  conventionnee       Boolean?   // null si PP, true/false si PM
  siegeSocial         String?
  representantLegal   String?

  // PP
  nom                 String?
  prenom              String?
  profession          String?
  pieceIdentite       String?
  nationalite         String?
  dateNaissance       DateTime?
  lieuNaissance       String?
  whatsapp            String?

  // Communs
  email               String
  telephone           String
  adresse             String?
  ville               String
  pays                String

  // Méta cabinet
  iconHint            String     // material-symbols name
  notes               String?
  actif               Boolean    @default(true)
  honorairesConvenus  String?    // type d'accord, pas montant
  /** @deprecated voir responsable */
  avocatEnCharge      String?

  // RBAC
  responsableId       String?
  responsable         Membre?    @relation("ClientResponsable", fields: [responsableId], references: [id])
  equipe              ClientEquipe[]

  // Sub-collections
  contacts            Contact[]
  dossiers            Dossier[]
  partiesAdverses     PartieAdverse[]   // relation inverse via Dossier

  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
}

enum ClientType {
  PERSONNE_MORALE
  PERSONNE_PHYSIQUE
}

model ClientEquipe {
  clientId String
  membreId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  membre   Membre @relation(fields: [membreId], references: [id], onDelete: Cascade)
  addedAt  DateTime @default(now())
  @@id([clientId, membreId])
}

model Contact {
  id          String  @id @default(cuid())
  clientId    String
  client      Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  nom         String
  prenom      String?
  fonction    String  // texte libre + suggestions 100+ via POSTES_SUGGESTIONS
  email       String?
  telephone   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### Vues table (`/clients`)

Colonnes (toutes inline-éditables single-click style Notion) :
| Col | Type | Source |
|---|---|---|
| N° Client | mono read-only | `numeroClient` auto-gen |
| Type | icône | dérivé de `type` |
| Nom / Raison sociale | InlineTextCell | `raisonSociale` ou `nom + prenom` |
| Contact | 2 InlineTextCells | `email` + `telephone` |
| Ville | InlineTextCell + datalist 8 villes Niger | `ville` |
| Créé le | InlineDateCell | `createdAt` |
| Équipe | TeamPicker | `responsableId` + `equipeIds[]` |
| Honoraires | InlineSelectCell | `honorairesConvenus` |
| Dossiers | lien `/dossiers?clientId=…` | count `dossiers` |
| Statut | toggle Actif/Inactif | `actif` |
| Actions | menu 3 points | Voir / Modifier / Dupliquer / Toggle actif / Supprimer |

#### Formulaire création

Dialog `client-form-dialog.tsx` — 5 sections :
1. **Type** : sélecteur visuel PM/PP + sous-sélecteur Conventionnée/Hors-conv (PM uniquement)
2. **Identité** : champs adaptés selon type
3. **Coordonnées** : email, téléphone, adresse, ville, pays
4. **Suivi cabinet** : honoraires + statut actif
5. **Notes**

Validation requise : `raisonSociale` (PM) ou `nom` (PP) + `email` + `telephone`.

#### Endpoints attendus

| Verbe | Path | Payload | Réponse |
|---|---|---|---|
| GET | `/api/clients` | query : search, type, ville, actif | `Client[]` filtré par RBAC |
| GET | `/api/clients/[id]` | — | `Client` avec contacts, dossiers, partiesAdverses |
| POST | `/api/clients` | `ClientFormDraft` | nouveau Client + auto-num |
| PATCH | `/api/clients/[id]` | `Partial<Client>` | Client mis à jour |
| DELETE | `/api/clients/[id]` | — | soft-delete (actif=false) ou cascade selon dossiers |
| POST | `/api/clients/[id]/contacts` | `ContactDraft` | nouveau Contact |
| PATCH | `/api/contacts/[id]` | `Partial<Contact>` | Contact mis à jour |
| DELETE | `/api/contacts/[id]` | — | suppression hard |

#### Règles métier
- **Auto-numérotation** : `CLI-YY-NNN` calculé serveur (compteur PostgreSQL ou max+1)
- **Conflits d'intérêt** : signal SI les 2 clients sont `actif: true`, sinon historique silencieux (cf. `lib/mock/clients.ts:detectConflits` à porter en SQL)
- **Validation NIF** : format Niger (à définir avec le client)
- **Cascade delete** : interdire si dossiers en cours → forcer transfert ou archivage

---

### 2.3 Module Dossiers

**Pages** : `/dossiers` · `/dossiers/[id]` (fiche multi-onglets : Vue, Finance, Audiences, Tâches, Pièces, Notes)

#### Modèle — `Dossier`

```prisma
model Dossier {
  id                  String         @id @default(cuid())
  numero              String         @unique // DOS-YY-NNN ou ADM-YY-NNN
  kind                DossierKind    // CLIENT | ADMIN
  type                DossierType    // CIVIL | COMMERCIAL | PENAL | ADMINISTRATIF | SOCIAL | COUTUMIERE | AUTRE
  nature              String         // texte libre + datalist NATURES_AFFAIRE (combobox + Autre)
  titre               String
  statut              DossierStatut  // EN_COURS | EN_ATTENTE | URGENT | CLOTURE | TERMINE | ARCHIVE
  etatProcedure       String?        // texte libre + datalist ETATS_PROCEDURE_SUGGESTIONS (Combo + Autre)
  juridiction         String?        // texte libre + datalist JURIDICTIONS_NIGER

  clientId            String?        // null si kind=ADMIN
  client              Client?        @relation(fields: [clientId], references: [id])

  partiesAdverses     String[]       // tableau de noms (multi-tags)
  dateOuverture       DateTime
  dateCloture         DateTime?
  description         String?
  honorairesEstimes   Int?           // FCFA, optionnel

  // RBAC
  responsableId       String?
  responsable         Membre?        @relation("DossierResponsable", fields: [responsableId], references: [id])
  equipe              DossierEquipe[]

  // Sub-collections
  factures            Facture[]
  audiences           Audience[]
  taches              Tache[]
  files               DossierFile[]
  notes               DossierNote[]

  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
}

enum DossierKind { CLIENT ADMIN }
enum DossierType { CIVIL COMMERCIAL PENAL ADMINISTRATIF SOCIAL COUTUMIERE AUTRE }
enum DossierStatut { EN_COURS EN_ATTENTE URGENT CLOTURE TERMINE ARCHIVE }

model DossierEquipe {
  dossierId String
  membreId  String
  dossier   Dossier @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  membre    Membre  @relation(fields: [membreId], references: [id], onDelete: Cascade)
  addedAt   DateTime @default(now())
  @@id([dossierId, membreId])
}

model DossierFile {
  id          String  @id @default(cuid())
  dossierId   String
  dossier     Dossier @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  parentId    String?
  parent      DossierFile? @relation("FileTree", fields: [parentId], references: [id])
  children    DossierFile[] @relation("FileTree")
  name        String
  type        FileType    // FOLDER | FILE
  mimeType    String?
  size        Int?         // octets
  url         String?      // signed URL R2/S3
  couleur     String?      // pour les folders : 8 valeurs
  updatedAt   DateTime    @updatedAt
}

enum FileType { FOLDER FILE }

model DossierNote {
  id        String  @id @default(cuid())
  dossierId String
  dossier   Dossier @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  auteurId  String
  auteur    Membre  @relation(fields: [auteurId], references: [id])
  contenu   String  @db.Text
  createdAt DateTime @default(now())
}
```

#### Vues table (`/dossiers`)

Colonnes inline-éditables :
| Col | Type | Notes |
|---|---|---|
| N° dossier | lien fiche | read-only |
| Type | InlineSelectCell | drop-down 7 valeurs |
| Client | lien fiche client | read-only |
| Parties adverses | InlineTextCell (CSV) | array → string CSV |
| Nature | **InlineComboCell** | datalist 14 valeurs + saisie libre via "Autre…" |
| État procédure | **InlineComboCell** | datalist 25 valeurs + "Autre…" |
| Statut | InlineSelectCell coloré | 6 valeurs |
| Équipe | TeamPicker | héritée du client |
| Ouvert le | mono | read-only date |
| Actions | 3 points | Ouvrir / Modifier / Dupliquer / Archiver / Supprimer |

#### Formulaire création

Dialog `dossier-form-dialog.tsx` — 7 sections :
1. **Type** (CLIENT / ADMIN, sélecteur visuel)
2. **Client** : sélecteur recherche live (verrouillé si `?clientId=` URL)
3. **Identité** : titre, type, statut initial, nature (combo + Autre), juridiction (combo + Autre), état procédure (combo + Autre), parties adverses
4. **Engagement financier** : honorairesEstimes (FCFA optionnel)
5. **Équipe** : TeamPickerExpanded (hérité du client)
6. **Description** (textarea)
7. **Notes & observations internes** (textarea)

Validation : `titre` requis + `clientId` requis si kind=CLIENT.

#### Endpoints attendus

| Verbe | Path | Notes |
|---|---|---|
| GET | `/api/dossiers` | + filtres : statut, type, juridiction, dateOuverture, clientId, search |
| GET | `/api/dossiers/[id]` | avec sub-collections |
| POST | `/api/dossiers` | + héritage `equipeIds` du client |
| PATCH | `/api/dossiers/[id]` | partial |
| DELETE | `/api/dossiers/[id]` | refus si factures émises non payées |
| GET | `/api/dossiers/[id]/files` | arbre récursif |
| POST | `/api/dossiers/[id]/files` | upload file ou create folder |
| PATCH | `/api/dossier-files/[id]` | rename, move (parentId) |
| DELETE | `/api/dossier-files/[id]` | cascade pour folder |
| POST | `/api/dossiers/[id]/notes` | nouvelle note avec auteur=current user |

#### Règles métier
- **Héritage équipe** : si `responsableId === null && equipeIds.length === 0`, hérite du client parent (cf. `lib/mock/membre-bridge.ts:resolveTeam`)
- **Calculs financiers** : computed à la volée via `getDossierFinanceFromInvoices(dossierId)` — pas stocké
- **Fichiers** : taille réelle stockée, helper `formatBytes()` côté affichage
- **Filtrage des factures dans la fiche dossier** : strict `WHERE dossierId = ? AND clientId = ?`

---

### 2.4 Module Audiences

**Pages** : `/audiences` (3 vues : Agenda jour / Galerie / Calendrier mois) · `/audiences/[id]`

#### Modèle — `Audience`

```prisma
model Audience {
  id              String           @id @default(cuid())
  numero          String           @unique // AUD-YY-NNN
  titre           String
  nature          AudienceNature   // PLAIDOIRIE | MISE_EN_ETAT | REFERE | CONCILIATION | DELIBERE | RENVOI | AUTRE
  statut          AudienceStatut   // A_VENIR | TERMINEE | REPORTEE | ANNULEE
  dateDebut       DateTime
  dureeMinutes    Int              // 30 | 60 | 90 | 120 | 180 | 240
  juridiction     String?
  salleAudience   String?

  dossierId       String
  dossier         Dossier          @relation(fields: [dossierId], references: [id], onDelete: Cascade)

  // RBAC
  responsableId   String?          // avocat plaidant
  responsable     Membre?          @relation("AudienceResponsable", fields: [responsableId], references: [id])
  equipe          AudienceEquipe[]

  notes           String?
  compteRendu     String?          // rempli après l'audience
  resultat        AudienceResultat? // RENVOI | PLAIDOIRIE | DELIBERE | DELIBERE_RABATTU | DELIBERE_PROROGE | DECISION_RENDUE

  taches          Tache[]          @relation("AudienceTache") // tâches préparatoires

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

enum AudienceNature { PLAIDOIRIE MISE_EN_ETAT REFERE CONCILIATION DELIBERE RENVOI AUTRE }
enum AudienceStatut { A_VENIR TERMINEE REPORTEE ANNULEE }
enum AudienceResultat { RENVOI PLAIDOIRIE DELIBERE DELIBERE_RABATTU DELIBERE_PROROGE DECISION_RENDUE }

model AudienceEquipe {
  audienceId String
  membreId   String
  audience   Audience @relation(fields: [audienceId], references: [id], onDelete: Cascade)
  membre     Membre   @relation(fields: [membreId], references: [id], onDelete: Cascade)
  @@id([audienceId, membreId])
}
```

#### Vues
- **Agenda jour** : timeline 8h-19h avec blocs absolutes positionnés selon `dateDebut + dureeMinutes`. Multi-colonnes pour audiences chevauchantes. Menu 3 points par bloc (Modifier / Supprimer).
- **Galerie** : cards 3-4 colonnes avec date badge, statut, nature, dossier lié, compteur tâches restantes. Menu 3 points dans le header.
- **Calendrier mois** : grille 7×6 avec pills compactes. Click jour → popover des audiences.

#### Formulaire création

Dialog `audience-form-dialog.tsx` — 6 sections :
1. **Dossier rattaché** (recherche live, verrouillé si `?dossierId=` URL ; auto-pré-remplit juridiction + responsable)
2. **Audience** : titre, nature (chips), statut (chips)
3. **Quand** : date + heure + durée
4. **Lieu** : juridiction (datalist) + salle
5. **Avocat plaidant & équipe** (TeamPickerExpanded)
6. **Notes**

#### Endpoints attendus

| Verbe | Path | Notes |
|---|---|---|
| GET | `/api/audiences` | + filtres date, statut, juridiction, dossierId |
| GET | `/api/audiences/[id]` | avec dossier + client + tâches |
| POST | `/api/audiences` | auto-num AUD-YY-NNN |
| PATCH | `/api/audiences/[id]` | + transition statuts (A_VENIR → TERMINEE oblige `compteRendu` non vide) |
| DELETE | `/api/audiences/[id]` |  |

#### Règles métier
- Transition `A_VENIR → TERMINEE` doit forcer `resultatAudience` + `compteRendu` non null
- Pré-création de tâches préparatoires (ex : "Dépôt conclusions J-7") — option côté backend ou job

---

### 2.5 Module Tâches

**Pages** : `/taches` (Liste + Kanban)

#### Modèle — `Tache`

```prisma
model Tache {
  id            String          @id @default(cuid())
  titre         String
  description   String?
  statut        TacheStatut     // A_FAIRE | EN_COURS | FAIT | ANNULE
  priorite      TachePriorite   // BASSE | MOYENNE | HAUTE | URGENTE
  echeance      DateTime?

  // RBAC
  responsableId String?
  responsable   Membre?         @relation("TacheResponsable", fields: [responsableId], references: [id])
  equipe        TacheEquipe[]
  /** @deprecated assigneA texte libre — sera retiré quand responsableId sera systématique */
  assigneA      String?

  // Liaisons (1 obligatoire ou 0 = tâche libre)
  clientId      String?
  client        Client?         @relation(fields: [clientId], references: [id])
  dossierId     String?
  dossier       Dossier?        @relation(fields: [dossierId], references: [id])
  audienceId    String?
  audience      Audience?       @relation("AudienceTache", fields: [audienceId], references: [id])

  createdAt     DateTime        @default(now())
  completedAt   DateTime?
}

enum TacheStatut { A_FAIRE EN_COURS FAIT ANNULE }
enum TachePriorite { BASSE MOYENNE HAUTE URGENTE }

model TacheEquipe {
  tacheId  String
  membreId String
  tache    Tache  @relation(fields: [tacheId], references: [id], onDelete: Cascade)
  membre   Membre @relation(fields: [membreId], references: [id], onDelete: Cascade)
  @@id([tacheId, membreId])
}
```

#### Vues
- **Liste** : table avec date, titre, priorité, échéance, statut, assigné. Filtre statut + priorité + échéance + assigné.
- **Kanban** : 4 colonnes (A_FAIRE / EN_COURS / FAIT / ANNULE) avec drag&drop.

#### Formulaire création

Dialog `tache-form-dialog.tsx` — déjà complet et conforme.

#### Endpoints attendus

| Verbe | Path |
|---|---|
| GET | `/api/taches` |
| POST | `/api/taches` |
| PATCH | `/api/taches/[id]` (notamment transitions statut) |
| DELETE | `/api/taches/[id]` |

#### Règles métier
- Transition vers FAIT doit setter `completedAt = now()`
- Si `audienceId` présent, héritage automatique `dossierId` et `clientId` (audience.dossier.client)

---

### 2.6 Module Bibliothèque

**Pages** : `/bibliotheque` (3 vues : Table / Galerie / Veille)

#### Modèle — `Document`

```prisma
model Document {
  id                  String       @id @default(cuid())
  titre               String
  categorie           DocCategorie // JURISPRUDENCE | DECISION_JUSTICE | DOCTRINE | MODELE | INTERNE | AUTRE
  type                DocType?     // ARRET | JUGEMENT | ORDONNANCE | LOI | DECRET | ARTICLE | ...
  domaineJuridique    DomaineJuridique?  // 20 valeurs (cf. lib/constants/biblio.ts)
  juridiction         String?
  niveauJuridiction   NiveauJuridiction?
  reference           String?
  dateDocument        DateTime?
  description         String?

  /** Tags multi-valeurs (multi-combo avec ajout custom) */
  tags                String[]

  auteur              String?
  source              String?
  notes               String?

  // Fichier
  fileName            String?
  fileSize            Int?
  fileUrl             String?      // signed URL R2/S3
  /** Articles cités CSV : "Art. 28 AUPSRVE, Art. 90 AUDCG" */
  articlesCites       String?

  /** Issue d'une jurisprudence */
  issue               IssueJuris?

  estFavori           Boolean      @default(false)
  nbConsultations    Int          @default(0)
  derniereConsultation DateTime?

  /** Liaison N×N avec dossiers */
  dossiers            DocumentDossier[]

  statut              DocStatut    @default(ACTIF) // ACTIF | ARCHIVE — soft-delete

  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
}

enum DocCategorie { JURISPRUDENCE DECISION_JUSTICE DOCTRINE MODELE INTERNE AUTRE }
enum DocStatut { ACTIF ARCHIVE }
// (DocType, DomaineJuridique, NiveauJuridiction, IssueJuris : voir lib/constants/biblio.ts)

model DocumentDossier {
  documentId String
  dossierId  String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  dossier    Dossier  @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  @@id([documentId, dossierId])
}
```

#### Vues table

Colonnes inline-éditables :
- Favori (toggle), Titre + Référence, **Catégorie** (InlineSelect 6 valeurs), **Domaine** (InlineCombo 20 + Autre), Juridiction (InlineText), Date (InlineDate), **Tags** (InlineMultiCombo + custom), Issue, Actions.

#### Endpoints
- `GET /api/documents` (+ filtres catégorie, domaine, search)
- `POST /api/documents` (avec upload via signed URL pré-générée)
- `PATCH /api/documents/[id]`
- `DELETE /api/documents/[id]` (soft : statut=ARCHIVE)
- `POST /api/documents/[id]/dossiers` (lier à un dossier)

---

### 2.7 Module Équipe

**Pages** : `/equipe` · `/equipe/[id]`

#### Modèle — `Membre` (renommé de l'ancien `Employe`)

```prisma
model Membre {
  id                      String                @id @default(cuid())
  prenom                  String
  nom                     String
  email                   String                @unique
  telephone               String?
  photoUrl                String?

  // RBAC
  role                    Role                  // ASSOCIE_GERANT | ASSOCIE | AVOCAT | JURISTE | STAGIAIRE | SECRETAIRE
  permissionsOverrides    Json?                 // Partial<Record<PermissionKey, "ALL"|"OWN"|"NONE">>

  // Cycle de vie RH
  actif                   Boolean               @default(true)
  dateEmbauche            DateTime
  dateSortie              DateTime?
  motifSortie             String?

  // Auth
  invitationStatut        InvitationStatut      @default(INVITE)
  derniereConnexion       DateTime?
  /** Code d'accès personnel — régénérable, l'ancien devient invalide */
  codeAccesHash           String                // bcrypt côté serveur
  codeAccesGeneAt         DateTime              @default(now())

  // Contrat & paie
  statutContrat           StatutContrat
  fonction                String?
  salaireBaseBrut         Int                   // FCFA mensuel

  // Coordonnées paiement
  rib                     String?
  banque                  String?
  mobileMoney             String?
  modeVersementParDefaut  ModePaiement          @default(VIREMENT)

  /** Bridge legacy — null après migration */
  avocatCabinetKey        String?

  notes                   String?

  // Relations inverses
  clientsResponsable      Client[]              @relation("ClientResponsable")
  dossiersResponsable     Dossier[]             @relation("DossierResponsable")
  audiencesResponsable    Audience[]            @relation("AudienceResponsable")
  tachesResponsable       Tache[]               @relation("TacheResponsable")
  bulletins               Bulletin[]
  notesAuteur             DossierNote[]
  clientsEquipe           ClientEquipe[]
  dossiersEquipe          DossierEquipe[]
  audiencesEquipe         AudienceEquipe[]
  tachesEquipe            TacheEquipe[]

  createdAt               DateTime              @default(now())
  updatedAt               DateTime              @updatedAt
}

enum Role { ASSOCIE_GERANT ASSOCIE AVOCAT JURISTE STAGIAIRE SECRETAIRE }
enum InvitationStatut { ACTIF INVITE JAMAIS_CONNECTE DESACTIVE }
enum StatutContrat { ASSOCIE COLLABORATEUR_CDI COLLABORATEUR_CDD STAGIAIRE SECRETAIRE_CDI }
```

#### Endpoints
- `GET /api/membres` (annuaire)
- `POST /api/membres` (création + génération codeAcces + envoi email invit)
- `PATCH /api/membres/[id]` (modif profil, rôle, override permissions — réservé `equipe.write`)
- `POST /api/membres/[id]/regenerate-code` (invalide l'ancien hash)
- `POST /api/membres/[id]/deactivate` (transition vers `actif=false`, demande choix transfert dossiers)

#### Règles métier critiques
- **Sécurité** : `codeAccesHash` stocké en bcrypt côté serveur. Le code clair n'est jamais stocké, jamais loggé. Affichage frontend = trame mock seulement.
- **Cycle de vie** : la désactivation force le transfert des entités `responsableId === membre.id` vers un autre membre (UI dialog côté frontend, transaction côté backend).
- **Permissions** : matrice `ROLE_PERMISSIONS` côté serveur (cf. `lib/constants/team.ts:ROLE_PERMISSIONS`). `permissionsOverrides` peuvent surcharger ponctuellement.
- **Soft delete** : on n'efface jamais un membre — `actif=false` + `dateSortie`. Préserve l'historique paie + signatures.

---

### 2.8 Module Finance

#### 2.8.1 Modèle — `Facture` (émises + reçues)

```prisma
model Facture {
  id                       String           @id @default(cuid())
  numero                   String           @unique // FAC-YY-NNN ou REC-YY-NNN
  direction                FactureDirection // EMISE (cabinet→client) | RECUE (fournisseur→cabinet)

  date                     DateTime
  dateEcheance             DateTime?

  // Côté EMISE
  clientId                 String?
  client                   Client?          @relation(fields: [clientId], references: [id])
  dossierId                String?
  dossier                  Dossier?         @relation(fields: [dossierId], references: [id])
  audienceId               String?

  // Côté RECUE
  fournisseurId            String?
  fournisseur              Fournisseur?     @relation(fields: [fournisseurId], references: [id])
  fournisseurNomLibre      String?

  // Montants (FCFA)
  montantHT                Int
  tvaRate                  Int              // 19 par défaut Niger, 0 si exonéré
  montantTVA               Int              // calculé
  montantTTC               Int              // calculé
  montantPaye              Int              // somme des paiements

  statut                   FactureStatut    // BROUILLON | EMISE | PARTIELLE | PAYEE | EN_RETARD | ANNULEE
  description              String?
  notes                    String?
  attachmentUrl            String?          // PDF facture (signed URL)

  // Refacturation (pour reçues)
  refacturable             Boolean          @default(false)
  refactureeViaFactureId   String?

  lignes                   FactureLigne[]
  paiements                Paiement[]

  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt
}

enum FactureDirection { EMISE RECUE }
enum FactureStatut { BROUILLON EMISE PARTIELLE PAYEE EN_RETARD ANNULEE }

model FactureLigne {
  id            String  @id @default(cuid())
  factureId     String
  facture       Facture @relation(fields: [factureId], references: [id], onDelete: Cascade)
  libelle       String
  quantite      Decimal @db.Decimal(10, 2)
  prixUnitaire  Int
  total         Int
  audienceId    String?
}

model Paiement {
  id          String        @id @default(cuid())
  factureId   String
  facture     Facture       @relation(fields: [factureId], references: [id], onDelete: Cascade)
  date        DateTime
  montant     Int
  mode        ModePaiement
  reference   String?
  notes       String?
  createdAt   DateTime      @default(now())
}

enum ModePaiement { VIREMENT MOBILE_MONEY ESPECES CHEQUE CARTE PRELEVEMENT }

model Fournisseur {
  id        String  @id @default(cuid())
  nom       String
  type      TypeFournisseur
  nif       String?
  email     String?
  telephone String?
  adresse   String?
  factures  Facture[]
}

enum TypeFournisseur { HUISSIER EXPERT TRADUCTEUR GREFFE FORMATION ABONNEMENT FOURNITURES IMMOBILIER UTILITES BANQUE AUTRE }
```

#### 2.8.2 Modèle — `Depense` (interne)

```prisma
model Depense {
  id                   String              @id @default(cuid())
  libelle              String
  categorie            CategorieDepense    // 14 valeurs (LOYER, ELECTRICITE, INTERNET, ...)
  date                 DateTime

  montantHT            Int
  tvaRate              Int
  montantTVA           Int
  montantTTC           Int

  mode                 ModePaiement
  reference            String?

  recurrent            Boolean             @default(false)
  recurrenceFrequence  FrequenceRecurrence? // MENSUELLE | TRIMESTRIELLE | ANNUELLE
  parentRecurrenceId   String?

  fournisseurId        String?
  fournisseur          Fournisseur?        @relation(fields: [fournisseurId], references: [id])
  fournisseurNomLibre  String?

  attachmentUrl        String?             // justificatif

  notes                String?
  statut               DepenseStatut       @default(PAYEE)  // PAYEE | A_PAYER

  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
}

enum CategorieDepense { LOYER ELECTRICITE EAU INTERNET TELEPHONE FOURNITURES MAINTENANCE ASSURANCE FORMATION DEPLACEMENT REPRESENTATION ABONNEMENT IMPOTS_TAXES AUTRE }
enum DepenseStatut { PAYEE A_PAYER }
enum FrequenceRecurrence { MENSUELLE TRIMESTRIELLE SEMESTRIELLE ANNUELLE }
```

#### 2.8.3 Modèle — `Bulletin` (paie)

```prisma
model Bulletin {
  id                   String          @id @default(cuid())
  employeId            String
  employe              Membre          @relation(fields: [employeId], references: [id])
  annee                Int
  mois                 Int             // 1..12

  salaireBrut          Int
  primes               Int
  retenues             Int
  chargesSalariales    Int             // CNSS Niger 5,25% (calculé)
  chargesPatronales    Int             // CNSS Niger 16,5% (calculé)
  salaireNet           Int             // calculé : brut + primes - retenues - chargesSalariales
  coutTotalEmployeur   Int             // calculé : brut + primes + chargesPatronales

  statut               BulletinStatut  // BROUILLON | VALIDE | VERSE | ANNULE
  dateVersement        DateTime?
  modeVersement        ModePaiement?
  reference            String?

  pdfUrl               String?         // fiche de paie / justificatif (signed URL)
  notes                String?

  lignes               BulletinLigne[]

  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  @@unique([employeId, annee, mois]) // 1 bulletin par employé par mois max
}

enum BulletinStatut { BROUILLON VALIDE VERSE ANNULE }

model BulletinLigne {
  id          String              @id @default(cuid())
  bulletinId  String
  bulletin    Bulletin            @relation(fields: [bulletinId], references: [id], onDelete: Cascade)
  libelle     String
  type        TypeLigneBulletin   // GAIN | RETENUE | CHARGE_SALARIALE | CHARGE_PATRONALE
  montant     Int
}

enum TypeLigneBulletin { GAIN RETENUE CHARGE_SALARIALE CHARGE_PATRONALE }
```

#### 2.8.4 Vues Finance (6 onglets)

1. **Tableau de bord** : KPI + 2 donuts (CA par client, charges par catégorie) + bar chart 6 mois + listes prio. Décisions financières visibles uniquement avec `finance.view`.
2. **Vue d'ensemble** : registre unifié 6 types de mouvements (factures émises + paiements + factures reçues + frais externes + dépenses + bulletins) avec filtres période + chips type + tri.
3. **Facturation** : table 3-col split (table + détail), inline edit date/échéance/statut, dialog création, paiement.
4. **Frais externes** : table avec sélection multiple pour refacturation. Bouton "+ Ajouter un frais".
5. **Dépenses internes** : table avec inline edit catégorie/mode + récurrence.
6. **Paie** : toggle Mois en cours / Historique. Mode historique = filtres année/mois/employé. Bouton "+ Ajouter un salaire" + toggle automatisation.

#### 2.8.5 Endpoints Finance

| Verbe | Path | Notes |
|---|---|---|
| GET | `/api/invoices` | + filtres direction, statut, dateRange, clientId, dossierId |
| POST | `/api/invoices` | auto-num FAC/REC-YY-NNN |
| PATCH | `/api/invoices/[id]` | + recompute statut auto si paiement |
| POST | `/api/invoices/[id]/payments` | enregistre paiement → recalcul `montantPaye` + statut |
| POST | `/api/invoices/refacture-batch` | génère 1 facture émise depuis N factures reçues refacturables |
| GET | `/api/depenses` | + filtres catégorie, période, récurrence |
| POST | `/api/depenses` |  |
| PATCH | `/api/depenses/[id]` |  |
| GET | `/api/bulletins` | + filtres annee, mois, employeId, statut |
| POST | `/api/bulletins` | calcule charges via TAUX_CNSS_SALARIE/EMPLOYEUR |
| PATCH | `/api/bulletins/[id]` |  |
| POST | `/api/bulletins/generate-month` | génère pour tous les employés actifs sans bulletin du mois courant |
| POST | `/api/bulletins/auto-toggle` | active/désactive génération auto mensuelle (cron) |

#### 2.8.6 Règles métier critiques

- **Calculs auto** : montantTVA, montantTTC, montantPaye, statut bulletin, charges CNSS — tous **recalculés serveur** (jamais accepter le calcul du client)
- **Statut facture** : transition automatique selon paiements
  - 0 paiement → EMISE (ou EN_RETARD si dateEcheance dépassée)
  - 0 < paye < TTC → PARTIELLE
  - paye === TTC → PAYEE
- **CNSS Niger** : `chargesSalariales = brut × 0.0525`, `chargesPatronales = brut × 0.165`
- **Auto-paie mensuelle** : cron Vercel le 1er de chaque mois → génère bulletins BROUILLON pour tous les `actif=true && invitationStatut=ACTIF` sans bulletin du mois précédent
- **Refacturation** : 1 facture émise auto-générée à partir de N factures reçues sélectionnées avec `refacturable=true && refactureeViaFactureId=null`. Update `refactureeViaFactureId` sur les sources.
- **Permissions paie** : un membre voit toujours ses propres bulletins (`paie.view = OWN`). Seul Associé gérant voit ceux des autres (`paie.view = ALL`).

---

## 3. Schéma global des relations

```
                              ┌────────────┐
                              │   Membre   │
                              └─────┬──────┘
              ┌─────────┬──────────┼──────────┬───────────┐
              │         │          │          │           │
              ▼         ▼          ▼          ▼           ▼
         responsable responsable responsable responsable employe
              │         │          │          │           │
              ▼         ▼          ▼          ▼           ▼
         ┌────────┐┌─────────┐┌──────────┐┌──────┐┌──────────┐
         │ Client ││ Dossier ││ Audience ││Tache ││ Bulletin │
         └───┬────┘└────┬────┘└────┬─────┘└──┬───┘└──────────┘
             │ 1..N     │ 1..N    │ 1..1    │
             ▼          ▼         ▼         │
         ┌────────┐┌─────────┐┌──────────┐  │
         │Contact ││ Facture ││  Tache   │◀─┘
         └────────┘└────┬────┘└──────────┘
                        │ 1..N
                        ▼
                  ┌──────────┐
                  │ Paiement │
                  └──────────┘

         ┌─────────┐         ┌──────────┐
         │ Document │◀────N×N│  Dossier │
         └──────────┘         └────┬─────┘
                                   │ 1..N
                                   ▼
                              ┌──────────┐
                              │  File    │ (arbre récursif)
                              └──────────┘

         ┌──────────┐                ┌──────────────┐
         │ Depense  │  N..1          │ Fournisseur  │
         └────┬─────┘────────────────└──────────────┘
              │ 0..1                      ▲
              ▼                           │ N..1
                                          │
                                    ┌──────────┐
                                    │ Facture  │ (RECUE)
                                    └──────────┘
```

### Relations multi-personnes (équipe partagée)

Pour chaque entité partageable, **2 niveaux** :
- `responsableId` (1) : le membre owner
- `equipeIds[]` (N) : autres membres autorisés (table de jointure `XEquipe`)

Tables de jointure :
- `ClientEquipe` (clientId, membreId)
- `DossierEquipe` (dossierId, membreId)
- `AudienceEquipe` (audienceId, membreId)
- `TacheEquipe` (tacheId, membreId)

Les Tâches ont aussi `equipeIds` qui sert de "observateurs" (notifs).

### Héritage automatique parent → enfant

À la création d'une entité enfant, **hérite** des `equipeIds` du parent :
- Dossier hérite de Client.equipeIds
- Audience hérite de Dossier.equipeIds (donc indirectement de Client)
- Tâche peut hériter de Audience/Dossier/Client selon liaison principale

Côté backend : reproduire `withResolvedTeam(entity, parent)` (cf. `lib/mock/membre-bridge.ts`).

---

## 4. Matrice RBAC complète (à implémenter côté backend)

Source : `lib/constants/team.ts:ROLE_PERMISSIONS`. Le backend doit **rejouer cette matrice** sur chaque endpoint avant d'autoriser une opération.

| Permission | Gérant | Associé | Avocat | Juriste | Stagiaire | Secrétaire |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| clients.view | ALL | ALL | OWN | OWN | OWN | ALL |
| clients.write | ALL | ALL | OWN | OWN | NONE | ALL |
| dossiers.view | ALL | ALL | OWN | OWN | OWN | ALL |
| dossiers.write | ALL | ALL | OWN | OWN | NONE | OWN |
| audiences.view | ALL | ALL | OWN | OWN | OWN | ALL |
| audiences.write | ALL | ALL | ALL | OWN | NONE | ALL |
| taches.view | ALL | ALL | OWN | OWN | OWN | ALL |
| taches.write | ALL | ALL | ALL | OWN | OWN | ALL |
| bibliotheque.view | ALL | ALL | ALL | ALL | ALL | ALL |
| bibliotheque.write | ALL | ALL | ALL | ALL | NONE | ALL |
| **finance.view** | **ALL** | **ALL** | **NONE** | **NONE** | **NONE** | **NONE** |
| finance.write | ALL | OWN | NONE | NONE | NONE | NONE |
| paie.view | ALL | OWN | OWN | OWN | OWN | OWN |
| paie.write | ALL | NONE | NONE | NONE | NONE | NONE |
| equipe.view | ALL | ALL | ALL | ALL | ALL | ALL |
| equipe.write | ALL | NONE | NONE | NONE | NONE | NONE |
| dashboard.global | ALL | ALL | OWN | OWN | OWN | OWN |

**Logique scope** :
- `ALL` : retourner toutes les entités du tenant
- `OWN` : retourner uniquement où `responsableId === userId OR userId IN equipeIds`
- `NONE` : 403 Forbidden, vue cachée

---

## 5. Authentification

### 5.1 Modèle simple validé par le client

- **Login** : email + `codeAcces` à 12 caractères (format `XXX-XXX-XXXX`, alphabet sans 0/O/1/I)
- **Stockage** : `bcrypt(codeAcces)` — jamais le code clair
- **Régénération** : nouveau code aléatoire crypto-safe → invalide l'ancien hash
- **Session** : cookie `Secure; HttpOnly; SameSite=Lax` avec JWT signé
- **Expiration** : 24h glissantes (refresh à chaque requête)

### 5.2 Endpoints auth

| Verbe | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{ email, codeAcces }` → set cookie |
| POST | `/api/auth/logout` | clear cookie |
| GET | `/api/me` | renvoie le membre courant + permissions résolues |
| POST | `/api/membres/[id]/regenerate-code` | gérant only — renvoie nouveau code en clair (1 fois) |

### 5.3 Middleware Next.js

Tout `/api/*` (sauf `/api/auth/*`) doit vérifier le cookie session, charger le membre, attacher `req.membre` au contexte. Les Server Components peuvent lire `cookies()` directement.

---

## 6. Plan de migration mock → DB (5 phases)

### Phase 1 — Schéma Prisma (1-2 jours)
- Recopier les modèles ci-dessus dans `prisma/schema.prisma`
- `npx prisma migrate dev --name init_full_schema`
- Vérifier que tous les enums sont présents (`legal.ts`, `finance.ts`, `team.ts`, `biblio.ts`)

### Phase 2 — Seeds (1 jour)
- Réutiliser les `mockMembres`, `mockClients`, `mockDossiers`, etc. comme données de seed dans `prisma/seed.ts`
- Hash les codes d'accès en bcrypt
- Lien : tous les `responsableId` vers `mb-1`..`mb-6` doivent matcher les ids créés

### Phase 3 — Endpoints CRUD de base (3-4 jours)
Pour chaque entité (Client, Dossier, Audience, Tache, Document, Membre, Facture, Depense, Bulletin) :
- GET liste + détail
- POST création (avec génération auto numéro)
- PATCH partial update
- DELETE (soft pour entités sensibles)
- Wrap chaque endpoint avec middleware `requirePermission(perm, scope?)`

### Phase 4 — Logiques métier dérivées (2-3 jours)
- `recomputeFacture()` côté serveur
- `recomputeBulletin()` côté serveur
- `getDossierFinance()` exposé via `GET /api/dossiers/[id]/finance`
- Refacturation batch
- Cron paie auto

### Phase 5 — Branchement frontend (2 jours)
- Remplacer les `setX(prev => ...)` locaux par des `mutate()` + revalidation SWR
- Brancher les 11 `alert()` placeholders (cf. BUGS_AUDIT.md §4.8)
- Wrapper l'app dans un `SessionProvider` qui charge le membre depuis `/api/me`
- Tests E2E sur les workflows clés

---

## 7. Workflows métier transverses

### 7.1 Création client → dossier → audience → facture

```
1. POST /api/clients               (CLI-26-015)
   → équipe = [me]
2. POST /api/dossiers               (DOS-26-042)
   ?clientId=cli-15
   → hérite équipe du client
3. POST /api/audiences              (AUD-26-130)
   ?dossierId=dos-42
   → hérite juridiction + responsable du dossier
4. POST /api/invoices               (FAC-26-089)
   { direction:"EMISE", clientId:"cli-15", dossierId:"dos-42" }
   → statut:"EMISE", attente paiement
5. POST /api/invoices/[id]/payments (paiement partiel)
   → recompute statut → "PARTIELLE"
6. POST /api/invoices/[id]/payments (solde)
   → recompute statut → "PAYEE"
```

### 7.2 Frais avancé refacturable

```
1. POST /api/invoices               (REC-26-014)
   { direction:"RECUE", dossierId:"dos-42", refacturable:true }
   → frais huissier 80 000 FCFA
2. POST /api/invoices/refacture-batch
   { ids:["fac-rec-14"] }
   → génère FAC-26-090 émise au client (80 000 FCFA + TVA Niger 19%)
   → met à jour les frais source : refactureeViaFactureId
```

### 7.3 Cycle paie mensuelle

```
1. Cron Vercel le 1er du mois (si auto-paie activé)
   → POST /api/bulletins/generate-month
   → bulletins BROUILLON pour chaque membre actif
2. Gérant ouvre /facturation?tab=paie
   → édite primes / retenues / mode versement
   → PATCH /api/bulletins/[id]
3. Validation lot
   → PATCH statut: VALIDE
4. Versement effectif
   → PATCH statut: VERSE + dateVersement + modeVersement
   → upload optionnel : pdfUrl (signed URL)
```

### 7.4 Onboarding nouveau membre

```
1. POST /api/membres
   → genère codeAcces aléatoire 12 chars
   → POST hash bcrypt → DB
   → renvoie { membre, codeAccesClair } (1 seule fois !)
   → invitationStatut: INVITE
2. (optionnel) POST email d'invitation avec codeAccesClair
3. Membre se connecte : POST /api/auth/login { email, codeAcces }
   → bcrypt.compare(codeAcces, hash)
   → invitationStatut: ACTIF
   → derniereConnexion: now()
```

### 7.5 Désactivation membre + transfert

```
1. POST /api/membres/[id]/deactivate
   { transfertVers:"mb-3" }
   → transaction atomique :
      - actif = false
      - dateSortie = now
      - invitationStatut = DESACTIVE
      - UPDATE Client SET responsableId='mb-3' WHERE responsableId='mb-X'
      - UPDATE Dossier SET responsableId='mb-3' WHERE responsableId='mb-X'
      - UPDATE Audience SET responsableId='mb-3' WHERE responsableId='mb-X'
      - UPDATE Tache SET responsableId='mb-3' WHERE responsableId='mb-X'
      - DELETE FROM XEquipe WHERE membreId='mb-X'
   → bulletins paie historiques préservés (pour conformité légale Niger)
```

---

## 8. Sécurité backend obligatoire

1. **Toute** mutation passe par `requirePermission(perm, resource?)` avant la query Prisma
2. **Toute** lecture filtre par `filterByVisibility(membre, items, perm)` ou WHERE équivalent
3. **Validation Zod** sur 100 % des payloads POST/PATCH
4. **Rate limiting** sur `/api/auth/login` (5 tentatives / 15 min / IP)
5. **Audit log** pour : création/suppression membre, changement permissions, validation paie, transfert dossiers
6. **Signed URLs** pour tous les fichiers (expiration 1h pour PDF facture, 24h pour fiches paie)
7. **CSP headers** stricts dans `next.config.ts`
8. **HTTPS strict** + `X-Frame-Options: DENY` + `Strict-Transport-Security`
9. **Backups** PostgreSQL : automatiques quotidiens (Neon le fait nativement)
10. **Pas de secret dans le code** — tout via `.env` chiffré (Vercel Encrypted)

---

## 9. Reste à définir (questions ouvertes)

1. **Multi-tenant ?** Le cabinet KadriLex est mono-cabinet. Si demain on vend la solution à d'autres cabinets, prévoir un `tenantId` partout (pas critique pour V1).
2. **Conservation légale Niger** : durée de rétention obligatoire pour bulletins de paie ? Conformité OHADA ?
3. **TVA exonération** : certains clients (PM conventionnée ?) sont-ils exonérés de TVA ? Si oui, ajouter flag `exonereTva` sur Client.
4. **Email transactionnel** : SendGrid / Resend / Mailtrap ? Pour invitations, rappels, factures.
5. **PDF facture** : génération côté serveur (puppeteer / @react-pdf) ou template envoyé au client ?
6. **Numérotation factures réinitialisée chaque année** ou continue ? (pratique cabinet : continue dans l'année, nouveau compteur au 1er janvier)
7. **Devise** : 100% FCFA ou prévoir multi-devise pour clients internationaux ? (frontend tout en FCFA aujourd'hui)

---

## 10. Inventaire complet — fichiers de référence

### Frontend → modèles Mock (à porter en Prisma)
- `lib/mock/clients.ts` — `MockClient` + `Contact` + `PartieAdverse`
- `lib/mock/dossiers.ts` — `MockDossier` + `DossierFile` + `DossierFacture` (sub-collection)
- `lib/mock/audiences.ts` — `MockAudience` + `MockTache`
- `lib/mock/documents.ts` — `MockDocument`
- `lib/mock/employes.ts` — `MockMembre` (= MockEmploye legacy)
- `lib/mock/invoices.ts` — `MockFacture` + `MockLigneFacture` + `MockPaiement` + `MockFournisseur`
- `lib/mock/depenses.ts` — `MockDepense`
- `lib/mock/bulletins.ts` — `MockBulletin` + `MockBulletinLigne`

### Constantes (à recopier en enums Prisma)
- `lib/constants/legal.ts` — natures, juridictions, statuts dossier/audience/tâche
- `lib/constants/finance.ts` — directions, statuts facture/bulletin, modes paiement, catégories dépense
- `lib/constants/team.ts` — rôles, permissions, statuts invitation
- `lib/constants/biblio.ts` — catégories, types, domaines juridiques
- `lib/constants/postes.ts` — 110 postes pour combobox contacts

### Logiques métier déjà écrites (à porter serveur)
- `lib/mock/invoices.ts:recomputeFacture` — calcul TTC, statut, montantPaye
- `lib/mock/bulletins.ts:recomputeBulletin` + `calcChargesSociales`
- `lib/mock/dossiers.ts:computeFinance` — agrégation finance dossier
- `lib/mock/membre-bridge.ts:resolveTeam` + `withResolvedTeam`
- `lib/mock/membre-stats.ts` — charge stratégique d'un membre
- `lib/mock/client-activity.ts:computeClientActivity` — activité dérivée fiche client
- `lib/auth/permissions.ts` — `can`, `hasAccess`, `filterByVisibility`

### Briefs design existants
- `BRIEF_DESIGN_DASHBOARD.md` (V1) + `BRIEF_DESIGN_DASHBOARD_V2.md` (sans-money)
- `BRIEF_DESIGN_CLIENTS.md`
- `BRIEF_DESIGN_DOSSIERS.md`
- `BRIEF_DESIGN_AUDIENCES.md`
- `BRIEF_DESIGN_BIBLIOTHEQUE.md`
- `BRIEF_DESIGN_FINANCE.md`
- `BRIEF_DESIGN_EQUIPE.md`
- `BRIEF_FORMULAIRES_APP.md` — récap formulaires + roadmap I1-I7
- `ARCHITECTURE_FINANCE_DOSSIER.md` — architecture finance par dossier

---

## Fin du blueprint

Ce document est la **source unique de vérité** pour la construction du backend.

**Ordre d'implémentation recommandé** :
1. Schéma Prisma + migrations
2. Seeds depuis mocks
3. Auth + middleware permissions
4. Endpoints CRUD module par module (commencer par Clients → Dossiers → Audiences → Tâches → Bibliothèque → Membres → Finance)
5. Logiques métier dérivées
6. Branchement frontend (remplacer les state locaux par des mutations API)
7. Tests E2E
8. Déploiement Vercel + Neon

Toute évolution future du frontend doit se refléter dans ce document. Aucun nouveau modèle ne doit être ajouté côté DB sans avoir été spec ici.
