# BRIEF DESIGN — Module Équipe (RBAC + Membres)

**Cabinet** : SCPA Kadri Legal (Niamey, Niger)
**Module** : Équipe — gestionnaire de membres unifié, contrôle d'accès, partage multi-modules
**Statut actuel (Sprint A livré)** : modèle `MockMembre` étendu, page `/equipe` table + galerie, fiche membre `/equipe/[id]`, dialog invitation, sidebar mise à jour. Aucune logique RBAC active à ce stade — Sprint B en cours.
**Objectif du brief** : poser l'architecture cible du module Équipe + RBAC + équipe partagée par module, pour livrer une plateforme cohérente où chaque collaborateur (avocat / juriste / stagiaire / secrétaire) a son périmètre exact, ses dossiers, ses tâches, et où le propriétaire du cabinet contrôle finement les accès.

> 📌 Ce brief succède aux briefs `BRIEF_DESIGN_FINANCE`, `BRIEF_DESIGN_DOSSIERS`, `BRIEF_DESIGN_CLIENTS`. Il bénéficie de tous les patterns établis (DA sépia/doré/crème, drawer filtres, vues table/galerie, header compact, dropdown via `createPortal`).

---

## 1. Contexte & vision

Un cabinet d'avocats n'est pas une organisation plate : c'est une hiérarchie où chaque rôle a un périmètre métier ET un périmètre de visibilité différents.

L'avocat associé gérant veut tout voir. La stagiaire ne doit voir que les 3 dossiers sur lesquels on l'a affectée. La secrétaire gère l'agenda et les clients mais n'a aucun droit sur la finance. Le juriste fait la recherche sur ses dossiers, sans toucher aux salaires.

Le module Équipe résout 7 questions opérationnelles :

- **Qui travaille avec moi ?** (annuaire interne, contacts, ancienneté)
- **Qui fait quoi en ce moment ?** (charge stratégique : N dossiers / N tâches / N audiences)
- **Qui peut voir / modifier quoi ?** (matrice de permissions par rôle, override par membre)
- **Comment ajouter quelqu'un de manière sécurisée ?** (workflow d'invitation par email avec rôle pré-affecté)
- **Comment retirer quelqu'un proprement ?** (désactivation + transfert des entités assignées)
- **Comment partager un dossier ou un client à plusieurs personnes ?** (équipe attribuée, héritage automatique)
- **Comment payer l'équipe chaque mois sans gérer 2 listes ?** (un seul modèle membre = paie + accès)

→ La règle d'or : **personne ne voit l'application complète par défaut**. C'est le propriétaire qui ouvre les portes, module par module, depuis la page Équipe.

---

## 2. Vocabulaire — clarification

| Terme | Sens technique | Notes |
|---|---|---|
| **Membre** | Personne enregistrée dans l'application avec un compte (potentiel) et un rôle | Remplace le terme "employé" qui ne couvrait que la paie |
| **Rôle** | Profil applicatif qui détermine la matrice de permissions par défaut | 6 valeurs : `ASSOCIE_GERANT`, `ASSOCIE`, `AVOCAT`, `JURISTE`, `STAGIAIRE`, `SECRETAIRE` |
| **Permission** | Capacité élémentaire (`module.action`) — `clients.view`, `finance.write`… | 17 permissions au total |
| **Scope** | Étendue de la permission : `ALL` (tous les enregistrements) / `OWN` (ceux dont je suis responsable ou membre de l'équipe) / `NONE` (UI cachée) | Filtre la donnée à l'affichage |
| **Override** | Exception manuelle au profil de rôle pour un membre précis | Permet d'ouvrir ponctuellement un module à un stagiaire pour un projet |
| **Responsable** | Owner d'une entité (dossier, client, tâche…) — apparaît sur la ligne | 1 seul, obligatoire |
| **Équipe** | Membres autorisés sur l'entité (en plus du responsable) | 0..N, héritée du parent par défaut |
| **Charge stratégique** | Compteurs en ligne (📁 12 · 🧑 8 · ✓ 23 · 📅 4) + barre de saturation | Calculée à la volée, jamais stockée |
| **Invitation** | Statut de connexion d'un membre : ACTIF / INVITE / JAMAIS_CONNECTE / DESACTIVE | Indépendant du flag `actif` (cycle RH) |

Distinction critique : **`actif` (RH)** ≠ **`invitationStatut` (auth)**. Un membre peut être actif RH sans avoir activé son compte (`INVITE`). Un membre peut être archivé RH (`actif: false`) avec son compte définitivement désactivé (`DESACTIVE`).

---

## 3. Audit existant

### ✅ Déjà en place (à conserver)

- **`lib/mock/employes.ts`** — modèle `MockEmploye` × 5 entrées, lien `bulletins.employeId` côté Paie. **Étendu en `MockMembre`** sans casser la rétrocompat (alias `MockEmploye = MockMembre`, `mockEmployes = mockMembres`).
- **`lib/constants/legal.ts` `AVOCATS_CABINET`** — liste contrôlée des avocats du cabinet. Sert de **bridge** pendant la phase de migration (le modèle `MockMembre.avocatCabinetKey` pointe vers cette liste).
- **DA sépia** établie (Newsreader / Manrope / Space Grotesk + Material Symbols + couleurs `#502e0f` / `#7f5533` / `#c8772f` / `#83746b`).

### ❌ Manques absolus

- **Aucune notion de membre persisté avec ID dans les modules.** Tous les liens vers une personne sont des **strings libres** :
  - `MockClient.avocatEnCharge: AvocatCabinet | null` (string)
  - `MockAudience.avocatPlaidant: AvocatCabinet | null` (string)
  - `MockTache.assigneA: string` (texte libre, peut contenir n'importe quoi)
  - `MockDocument.auteur: string | null` (string libre)
  - `MockDossier` n'a même **pas** de champ assigné → hérite via `client.avocatEnCharge`
- **Aucun champ "équipe partagée"** sur aucune entité — impossible aujourd'hui de mettre 2 avocats sur le même dossier.
- **Aucune infrastructure RBAC** : pas de provider, pas de hook `useCurrentUser()`, pas de middleware, pas de gate sur les pages.
- **Aucun mécanisme d'invitation** — les "membres" sont créés manuellement dans le mock.
- **Aucun système de transfert** — désactiver un membre orpheline ses dossiers/tâches.

### ⚠️ Incohérences à corriger

#### Incohérence 1 — Identité fragmentée
La même personne peut apparaître sous 3 formes :
- `MockEmploye.avocatCabinetKey: "Me Ali KADRI"` (paie)
- `MockClient.avocatEnCharge: "Me Ali KADRI"` (string libre — risque typo)
- `MockTache.assigneA: "Ali Kadri"` (string sans préfixe — pas de match exact)

→ **Action** : tout passer par `MockMembre.id` (sprint C). Pendant la transition (sprint A → C), un helper `matchesMembreInText()` fait le pont via `avocatCabinetKey` et le nom complet.

#### Incohérence 2 — Pas de cycle de vie
Aucun champ `dateSortie`, `motifSortie`, `invitationStatut` aujourd'hui. Un employé qui démissionne reste `actif: true` indéfiniment.

→ **Action** : `MockMembre` ajoute ces champs. Le formulaire de désactivation force la saisie d'une date de sortie + motif.

#### Incohérence 3 — Bulletin de paie sans contrôle d'accès
N'importe qui ayant accès à `/facturation?tab=paie` voit tous les salaires, y compris ceux de l'associé gérant. Aucun filtre par rôle.

→ **Action** : sprint B — gate `paie.view` avec scope `OWN` pour tous sauf `ASSOCIE_GERANT`. Un membre voit son propre bulletin uniquement.

#### Incohérence 4 — Sidebar uniforme pour tous
Tous les items (Clients, Dossiers, Audiences, Tâches, Bibliothèque, Équipe, Finance) sont visibles pour tout le monde aujourd'hui. Une stagiaire qui se connecterait verrait Finance en clair.

→ **Action** : sprint B — chaque item Sidebar wrappé par `<RequirePermission>`. L'item disparaît si l'utilisateur n'a pas le `view` du module (pas grisé : disparu).

---

## 4. Modèle de données cible

### 4.1 Entité `Membre` (la table centrale)

```ts
interface MockMembre {
    /* Identité */
    id: string                    // "mb-1", "mb-local-1714..."
    prenom: string
    nom: string
    email: string                 // unique, sert d'identifiant de connexion
    telephone: string | null
    photoUrl: string | null

    /* Rôle applicatif (RBAC) */
    role: RoleKey                 // ASSOCIE_GERANT | ASSOCIE | AVOCAT | JURISTE | STAGIAIRE | SECRETAIRE
    /* Override des permissions par défaut du rôle (sprint B+) */
    permissionsOverrides: Partial<Record<PermissionKey, PermissionScope>> | null

    /* Cycle de vie RH */
    actif: boolean
    dateEmbauche: string          // ISO
    dateSortie: string | null
    motifSortie: string | null    // "Démission" | "Fin de contrat" | "Autre"

    /* Cycle de vie applicatif */
    invitationStatut: InvitationStatutKey  // ACTIF | INVITE | JAMAIS_CONNECTE | DESACTIVE
    derniereConnexion: string | null

    /* Contrat & paie (déjà existants, conservés) */
    statutContrat: StatutContratKey
    fonction: string | null
    salaireBaseBrut: number       // FCFA mensuel

    /* Coordonnées paiement */
    rib: string | null
    banque: string | null
    mobileMoney: string | null    // numéro Airtel/Moov
    modeVersementParDefaut: ModePaiementKey

    /* Bridge legacy avec AVOCATS_CABINET (string) */
    avocatCabinetKey: AvocatCabinet | null

    /* Méta */
    notes: string | null          // notes internes du gérant
    createdAt: string
    updatedAt: string
}
```

### 4.2 Champs ajoutés aux entités existantes (sprint C)

Pattern unifié sur **4 modèles** : `MockClient`, `MockDossier`, `MockAudience`, `MockTache`.

```ts
/* Owner principal — affiché en avatar + nom sur la ligne */
responsableId: string | null

/* Membres autorisés en plus du responsable — affichés en avatar stack */
equipeIds: string[]
```

Règles métier :

- **À la création** d'une entité enfant, on hérite de `equipeIds` du parent (dossier hérite du client, audience hérite du dossier, tâche hérite de son client/dossier/audience parent).
- **Le responsable est implicitement dans l'équipe** : `equipeIds` peut ne pas le contenir, il est ajouté dynamiquement à la lecture.
- **Ajouter un membre à un dossier** propage automatiquement à `client.equipeIds` (sauf opt-out explicite). Pas l'inverse — on n'ouvre jamais un dossier sans intention.
- **Retirer le responsable** force le choix d'un nouveau responsable parmi `equipeIds`.

### 4.3 Schéma Prisma cible (sprint A bis ou plus tard)

```prisma
model Membre {
    id                  String    @id @default(cuid())
    prenom              String
    nom                 String
    email               String    @unique
    telephone           String?
    photoUrl            String?

    role                String    // RoleKey
    permissionsOverrides Json?    // Partial<Record<PermissionKey, PermissionScope>>

    actif               Boolean   @default(true)
    dateEmbauche        DateTime
    dateSortie          DateTime?
    motifSortie         String?

    invitationStatut    String    @default("INVITE")
    derniereConnexion   DateTime?

    statutContrat       String
    fonction            String?
    salaireBaseBrut     Int       // FCFA

    rib                 String?
    banque              String?
    mobileMoney         String?
    modeVersementParDefaut String  @default("VIREMENT")

    avocatCabinetKey    String?

    notes               String?

    /* Relations inverses */
    clientsResponsable  Client[]   @relation("ClientResponsable")
    dossiersResponsable Dossier[]  @relation("DossierResponsable")
    audiencesResponsable Audience[] @relation("AudienceResponsable")
    tachesAssignees     Tache[]    @relation("TacheAssignee")
    bulletinsPaie       Bulletin[]

    /* Many-to-many : équipe partagée */
    clientsEquipe       ClientEquipe[]
    dossiersEquipe      DossierEquipe[]
    audiencesEquipe     AudienceEquipe[]
    tachesObservateur   TacheObservateur[]

    createdAt           DateTime   @default(now())
    updatedAt           DateTime   @updatedAt
}

model ClientEquipe {
    clientId   String
    membreId   String
    addedAt    DateTime @default(now())
    addedById  String?
    @@id([clientId, membreId])
}

/* Idem DossierEquipe, AudienceEquipe, TacheObservateur */
```

---

## 5. Hiérarchie des rôles & matrice permissions

### 5.1 Les 6 rôles (du plus haut au plus bas)

| Rang | Rôle | Cas d'usage | Couleur DA |
|---|---|---|---|
| 1 | **Associé gérant** | Le propriétaire. Voit tout, gère l'équipe. | `#502e0f` |
| 2 | **Associé** | Co-propriétaire. Voit tout sauf gestion équipe. | `#7f5533` |
| 3 | **Avocat collaborateur** | Plaide ses dossiers, voit ses clients. Pas de finance. | `#c8772f` |
| 4 | **Juriste** | Recherche, rédaction sur dossiers attribués. | `#a08152` |
| 5 | **Stagiaire** | Lecture seule + tâches qui lui sont confiées. | `#d3a96a` |
| 6 | **Secrétaire** | Gère agenda, clients, biblio. Aucune finance. | `#83746b` |

### 5.2 Matrice complète (17 permissions × 6 rôles)

> Légende : ✅ ALL = total · 👁 OWN = limité (ce dont je suis responsable / membre) · ❌ NONE = caché

| Permission | Gérant | Associé | Avocat | Juriste | Stagiaire | Secrétaire |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `clients.view` | ✅ | ✅ | 👁 | 👁 | 👁 | ✅ |
| `clients.write` | ✅ | ✅ | 👁 | 👁 | ❌ | ✅ |
| `dossiers.view` | ✅ | ✅ | 👁 | 👁 | 👁 | ✅ |
| `dossiers.write` | ✅ | ✅ | 👁 | 👁 | ❌ | 👁 |
| `audiences.view` | ✅ | ✅ | 👁 | 👁 | 👁 | ✅ |
| `audiences.write` | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ |
| `taches.view` | ✅ | ✅ | 👁 | 👁 | 👁 | ✅ |
| `taches.write` | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ |
| `bibliotheque.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `bibliotheque.write` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `finance.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `finance.write` | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ |
| `paie.view` | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 |
| `paie.write` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `equipe.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `equipe.write` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `dashboard.global` | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 |

Notes :

- `paie.view` est **toujours** au moins `OWN` : tout le monde a le droit de voir **son propre** bulletin de salaire. Seul le gérant voit ceux des autres.
- `equipe.view` est **toujours** ouvert : l'annuaire des collègues est public en interne (sans les salaires).
- `bibliotheque.view` est public à tout le monde (jurisprudence partagée).

### 5.3 Mécanisme d'override

Pour chaque membre, le gérant peut surcharger ponctuellement la matrice :

```ts
membre.permissionsOverrides = {
    "finance.view": "OWN",  // exception : on ouvre la finance à ce stagiaire
}
```

L'évaluation finale est : `permission = override ?? rolePermissions[role][key]`.

L'UI de la fiche membre (onglet "Permissions") montre la matrice avec, pour chaque cellule, la valeur calculée + un indicateur si elle vient d'un override (icône ✱).

---

## 6. Architecture RBAC (sprint B)

### 6.1 3 briques techniques

**6.1.a — `lib/auth/permissions.ts`**

```ts
export const ROLE_PERMISSIONS: Record<RoleKey, Record<PermissionKey, PermissionScope>>

export function resolvePermissions(membre: MockMembre): Record<PermissionKey, PermissionScope> {
    const base = ROLE_PERMISSIONS[membre.role]
    if (!membre.permissionsOverrides) return base
    return { ...base, ...membre.permissionsOverrides }
}

export function can(
    membre: MockMembre,
    permission: PermissionKey,
    /* Si fourni, vérifie OWN par appartenance à l'entité */
    resource?: { responsableId?: string | null; equipeIds?: string[] }
): boolean

export function filterByVisibility<T extends { responsableId?: string | null; equipeIds?: string[] }>(
    membre: MockMembre,
    items: T[],
    permission: PermissionKey
): T[]
```

**6.1.b — `lib/auth/current-user-context.tsx`**

Provider client qui expose le membre courant. Wrappé une fois dans `app/layout.tsx`.

```tsx
<CurrentUserProvider initialMembre={???}>
    {children}
</CurrentUserProvider>

const { membre, can, canAny } = useCurrentUser()
```

Pour la phase mock (avant auth réelle), un **`<UserSwitcher>`** flottant en bas-droite (visible uniquement en dev) permet de basculer entre les 6 rôles et tester l'UI complète. Disparaît en production.

**6.1.c — Composants de contrôle d'accès**

```tsx
{/* 1. Sidebar — masque l'item sans bruit */}
<RequirePermission perm="finance.view">
    <Sidebar.Item href="/facturation" icon="account_balance_wallet" name="Finance" />
</RequirePermission>

{/* 2. Page complète — écran "Pas d'accès" + lien retour */}
<RequirePermission perm="finance.view" fallback={<NoAccessScreen module="Finance" />}>
    <FinancePage />
</RequirePermission>

{/* 3. Bouton ou champ — disabled + tooltip */}
<button disabled={!can("finance.write")} title={!can("finance.write") ? "Permission requise" : undefined}>
    Refacturer
</button>

{/* 4. Filtrage de liste — filterByVisibility */}
const factures = filterByVisibility(membre, allFactures, "finance.view")
```

### 6.2 Stratégies d'affichage

| Cas | Comportement |
|---|---|
| Item de menu non autorisé | **Disparaît silencieusement** (pas grisé, pas masqué CSS — non rendu) |
| Page non autorisée (URL tapée à la main) | Écran "Vous n'avez pas accès" avec icône + bouton "Retour au tableau de bord" |
| Bouton non autorisé | `disabled` + curseur `not-allowed` + tooltip explicatif |
| Liste filtrée (scope OWN) | Items hors périmètre invisibles, pas de "...et 12 autres masqués" |
| Détail filtré (scope OWN) | Champs sensibles cachés (ex: salaireBaseBrut → "—") |

### 6.3 Dashboard global filtré

Le tableau de bord principal `/` doit s'adapter au scope de l'utilisateur :

- `dashboard.global = ALL` : tous les KPI cabinet
- `dashboard.global = OWN` : KPI calculés sur les seules entités où le membre est responsable ou dans l'équipe (mes dossiers / mes audiences à venir / mes tâches en retard / etc.)

Aucune métrique financière n'apparaît si `finance.view = NONE`.

---

## 7. Système d'équipe partagée (sprint C)

### 7.1 Composant unique : `<TeamPicker>`

Réutilisé partout où on assigne 1+ membres : fiche client, fiche dossier, fiche audience, formulaire tâche.

**Variante compacte** (dans tables et cards) :
```
[👤👤👤 +2]
```
Pile d'avatars (`<MembreAvatarStack>`) cliquable, ouvre le sélecteur en popover.

**Variante étendue** (dans formulaires de fiche) :
```
Responsable :  [Avatar] Me Ali KADRI                              [Changer]
Équipe :       [Avatar] Me Mariama ABDOU ISSA  · Avocate          [×]
              [Avatar] Fatima SOULEY · Stagiaire                  [×]
              [+ Ajouter un membre]
```

Le sélecteur :
- Multi-select avec recherche
- Filtre par rôle
- Restreint aux membres `actif: true && invitationStatut !== "DESACTIVE"`
- Indique si le membre est déjà responsable du parent (chevron 🪜 + tooltip "hérité du dossier")

### 7.2 Compteurs en ligne sur les tables d'équipe

L'utilisateur a explicitement demandé : pas de graphes ni de pop-ins. Tout sur **une seule ligne** :

```
[Avatar]  Me Ali KADRI                Avocat collaborateur · 8 ans
          📁 12 dossiers · 🧑 8 clients · ✓ 23 tâches · 📅 4 audiences
          ━━━━━━━━━━━━━━━━━━━━━━━━━ Charge : 67%
```

Compteurs calculés à la volée par `computeMembreStats(membre)` (sprint A déjà livré). Couleurs :
- Vert si charge < 50 %
- Jaune si 50-80 %
- Rouge si > 80 %

Si `tachesEnRetard > 0` → le compteur tâches passe en rouge avec ⚠.

### 7.3 Héritage automatique des permissions

Quand on **ajoute** un membre à un dossier :

```
Action utilisateur : Ajouter Mariama au dossier DOS-26-041
Effet immédiat :
  ✅ dossier.equipeIds = [...existant, "mb-4"]
  ✅ Mariama voit le dossier dans /dossiers
  ✅ Mariama voit le client SONITEL parent dans /clients (héritage automatique)
  ✅ Mariama voit les audiences du dossier dans /audiences
  ✅ Mariama voit les tâches du dossier dans /taches
```

Au **retrait**, on demande confirmation : « Mariama va perdre l'accès à ce dossier et ses sous-éléments. Continuer ? »

### 7.4 Visibilité des compteurs

Les compteurs `clients/dossiers/tâches/audiences` sur la table Équipe respectent le scope du visiteur :

- Le gérant voit les vrais chiffres pour tous.
- Un avocat voit son propre détail mais pour ses pairs il voit "—" sur les compteurs (pas d'espionnage).
- L'objectif est l'auto-organisation, pas la surveillance.

---

## 8. UI/UX — page Équipe

### 8.1 Page liste `/equipe`

Header **compact** (pattern unifié avec Finance/Dépenses/Paie) :

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 👥 Équipe   TOTAL 6 · ACTIFS 5 · INVITÉS 1 · 1 Gérant · 1 Associé · 2 Avocat · 1 Stagiaire · 1 Secrétaire   [+ Inviter] │
└──────────────────────────────────────────────────────────────────────────┘
```

Toolbar (deuxième ligne) :
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [🔍 Rechercher]  [Actifs|Tous|Archivés]  [Tous rôles|Gérant|Associé|...]  [Table|Galerie] │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Vue Table (par défaut)

Colonnes :
1. **Membre** : avatar + nom + ancienneté (sublabel)
2. **Rôle & contrat** : chip rôle coloré + fonction
3. **Contact** : email + téléphone (cliquable)
4. **Charge stratégique** : compteurs inline + barre
5. **Statut** : chip invitation + date sortie si archivé
6. **Actions** : menu 3 points

Tri par défaut : actifs avant archivés, puis par rang de rôle, puis nom alphabétique.

### 8.3 Vue Galerie

Cards 4 colonnes (md/xl) avec :
- Bandeau coloré du rôle en haut
- Avatar L + nom + fonction + chip rôle court
- 3 lignes contact (email / tel / ancienneté)
- Grille 4 stats au pied
- Barre de charge + chip invitation

### 8.4 Fiche membre `/equipe/[id]` — 2 colonnes

**Header** : avatar XL + nom + chips (rôle, invitation, archivé) + chips infos clés à droite (embauché·e, contrat, dernière connexion).

**Bandeau** : 5 cards stratégiques (Dossiers, Clients, Tâches, Audiences, Charge). Clic ancre vers section.

**Colonne gauche (5/12)** :
- Section **Profil** : email, tel, dates, contrat
- Section **Paie** : salaire brut, RIB, banque, mode → lien vers bulletins
- Section **Permissions du rôle** : matrice avec scope chips (Total / Limité / Aucun)
- Section **Notes internes** (si présentes)

**Colonne droite (7/12) scrollable indépendamment** :
- Section **Clients suivis** (avec lien → fiche client)
- Section **Dossiers** (10 + " + N autres")
- Section **Audiences** (8 dernières)
- Section **Tâches** (12, retards en rouge)

### 8.5 Formulaire d'invitation (dialog modal)

4 sections :
1. **Identité** : prénom*, nom*, email*, téléphone
2. **Rôle applicatif** : 6 boutons-cards radio avec description (sélection visuelle, pas dropdown)
3. **Contrat & paie** : statut contrat, fonction, salaire base, date embauche, mode versement, mobile money, RIB, banque
4. **Notes internes** : textarea

Validation : `prenom + nom + email` obligatoires. Le bouton CTA dit **"Inviter"** en création, **"Enregistrer"** en édition. Le membre créé démarre `invitationStatut: INVITE`.

### 8.6 Workflow de désactivation

Menu actions → "Désactiver" → confirmation 2 étapes inline :
```
┌─ Confirmer ─ Annuler ─┐
│ Désactiver ce membre ?│
│ Il ne pourra plus     │
│ se connecter.         │
└───────────────────────┘
```

→ Effet : `actif: false`, `invitationStatut: DESACTIVE`, `dateSortie: now()`.

**Sprint E (à venir)** : étape supplémentaire de **transfert** des entités assignées :
```
3 dossiers · 8 tâches · 1 audience à venir vont devenir orphelins.

Transférer à : [Sélecteur membre actif]   [Transférer]   [Plus tard]
```

---

## 9. Composants techniques (sprint A → C)

| Composant | Sprint | Rôle |
|---|---|---|
| `<MembreAvatar>` | A ✅ | Cercle coloré par rôle, initiales ou photo, taille xs→xl |
| `<MembreAvatarStack>` | A ✅ | Pile -space-x-1.5 avec ring, "+N" si débord |
| `<MembreActionsMenu>` | A ✅ | createPortal, Voir/Modifier/Inviter/Désactiver/Supprimer |
| `<MembreTableView>` | A ✅ | Lignes avec compteurs inline + barre de charge |
| `<MembreGalleryView>` | A ✅ | Cards 4 colonnes |
| `<MembreFormDialog>` | A ✅ | Dialog invitation/édition |
| `<TeamPicker>` | C | Sélecteur multi compact + étendu |
| `<RequirePermission>` | B | Gate UI (children\|fallback) |
| `<NoAccessScreen>` | B | Écran d'erreur 403 propre |
| `<UserSwitcher>` | B | Bascule de rôle dev only |
| `<RoleChip>` | B | Chip rôle réutilisable (déjà inline aujourd'hui) |
| `<MembreTransferDialog>` | E | Réassignation à la désactivation |

---

## 10. Workflows clés

### 10.1 Inviter un nouveau membre

```
Gérant clique [+ Inviter]
  → Dialog formulaire
  → Saisit prénom/nom/email/rôle
  → Saisit contrat + salaire
  → Bouton "Inviter"
    → Création membre {actif:true, invitationStatut:"INVITE"}
    → Email d'invitation envoyé (sprint F)
    → Toast "Mariama a été invitée"
    → Apparaît dans la liste avec chip INVITE orange
  → Le membre reçoit l'email
  → Clic sur le lien → écran de bienvenue → définit son mot de passe
    → invitationStatut passe à ACTIF
    → derniereConnexion mise à jour
```

### 10.2 Affecter un membre à un dossier

```
Avocat ouvre fiche dossier DOS-26-041
  → Section "Équipe du dossier" (sprint C)
  → Clic sur [+ Ajouter un membre]
    → Popover TeamPicker avec recherche
    → Sélectionne 2 collaborateurs
    → Confirme
  → dossier.equipeIds += ["mb-4", "mb-6"]
  → Avatars apparaissent sur la ligne du dossier dans /dossiers
  → Les 2 collaborateurs voient le dossier au prochain refresh
```

### 10.3 Désactivation propre

```
Gérant ouvre Équipe → menu actions sur Mariama → "Désactiver"
  → Confirmation 2 étapes inline
  → "Confirmer"
    → actif:false, invitationStatut:DESACTIVE, dateSortie:now()
  [Sprint E]
  → Détecte 3 dossiers, 8 tâches, 1 audience assignés
  → Dialog "Transférer à un autre membre"
    → Sélectionne Me Ali KADRI
    → "Transférer"
      → responsableId mis à jour sur les 12 entités
      → equipeIds retire mb-4 et ajoute mb-3 si pas déjà présent
  → Mariama disparaît des sélecteurs futurs
  → Reste visible dans Équipe filtre "Archivés"
  → Bulletins paie historiques conservés
```

### 10.4 Bascule de rôle (dev / test)

```
Tu es connecté Gérant
  → UserSwitcher en bas-droite : [Gérant ▾]
  → Sélectionnes "Stagiaire (Fatima)"
    → Sidebar perd Finance + Équipe.write
    → Dashboard ne montre que SES tâches/dossiers
    → Tente d'aller sur /facturation à la main → écran "Pas d'accès"
  → Reviens à Gérant pour la démo client
```

---

## 11. Intégration avec le module Paie

**Source unique** : `MockMembre` est aussi utilisé pour la paie (`bulletin.employeId` pointe sur `membre.id`). Plus de double saisie.

### 11.1 Flux paie ↔ équipe (sprint E)

| Événement Équipe | Effet Paie |
|---|---|
| Création membre actif | Bulletin BROUILLON pré-rempli pour le mois courant |
| Modification `salaireBaseBrut` | Pas de propagation rétroactive ; impacte les bulletins futurs |
| Désactivation | Aucun nouveau bulletin généré ; les BROUILLON du mois en cours sont supprimés |
| Réactivation | Reprise des bulletins au mois suivant |
| Transfert d'entités | Aucun effet sur l'historique paie |

### 11.2 Visibilité des bulletins

| Rôle | Bulletins visibles |
|---|---|
| Gérant | Tous les bulletins de l'équipe |
| Associé | Le sien uniquement (sauf override) |
| Avocat / Juriste / Stagiaire / Secrétaire | Le sien uniquement |

Le tableau Paie filtre automatiquement avec `filterByVisibility(membre, bulletins, "paie.view")`.

---

## 12. Plan d'exécution par sprints

| Sprint | Périmètre | Livrable | Statut |
|---|---|---|:-:|
| **A — Fondations** | `MockMembre`, mock × 6, `lib/constants/team.ts`, `lib/mock/membre-stats.ts`, page `/equipe` table+galerie+toolbar, fiche `/equipe/[id]`, dialog invitation, menu actions, sidebar | Lister, voir, éditer, inviter, désactiver, supprimer un membre | ✅ |
| **B — RBAC actif** | `permissions.ts`, `<CurrentUserProvider>`, `<UserSwitcher>` dev, `<RequirePermission>`, filtrage Sidebar, écran NoAccess, dashboard global filtré, paie filtrée par scope | Bascule de rôle change l'UI complète | ⏳ |
| **C — TeamPicker + équipe partagée** | `<TeamPicker>` compact + étendu, ajout `responsableId` / `equipeIds` aux 4 modèles (clients/dossiers/audiences/taches), migration string→ID, héritage automatique au lien parent→enfant, retrait avec confirmation | Partage multi-personnes opérationnel sur tous les modules | ⏳ |
| **D — Visibilité fine** | `filterByVisibility` injecté dans chaque page, compteurs Équipe filtrés selon visiteur, masquage des champs sensibles (salaire) en scope OWN | Stagiaire voit uniquement ses dossiers, juriste pas la finance | ⏳ |
| **E — Cycle de vie complet** | Génération bulletin auto à l'ajout membre, dialog transfert à la désactivation, archivage et bulletins historiques préservés | Workflow on/off-boarding complet et sans orphelins | ⏳ |
| **F — Authentification réelle** | Email d'invitation, écran de bienvenue, login/logout, persistance session, journal connexions | Prêt production | ⏳ |

Chaque sprint reste autonome : typecheck passe, build passe, démo possible à la fin.

---

## 13. Schéma de connexion entre modules

```
                    ┌─────────────────────────┐
                    │      MockMembre         │
                    │  (source de vérité)     │
                    └──────────┬──────────────┘
                               │ id
        ┌──────────────────────┼──────────────────────────────┐
        │                      │                              │
   responsableId           equipeIds[]                  employeId
   (1 owner)             (N membres)                  (1 bulletin)
        │                      │                              │
   ┌────┴────┬────────┬────────┴───────┐               ┌──────┴──────┐
   ▼         ▼        ▼                ▼               ▼             ▼
┌─────┐  ┌──────┐  ┌────────┐  ┌──────────┐    ┌──────────┐  ┌──────────────┐
│Client│ │Dossier│ │Audience│  │  Tâche   │    │ Bulletin │  │RBAC permissions│
└──┬──┘  └──┬───┘  └────────┘  └──────────┘    └──────────┘  └────────────────┘
   │ équipe ↘                                                    │
   │   héritage                                                  │
   │  parent→enfant                                              │
   ↓                                                             ↓
   Dossier hérite de l'équipe Client                 filterByVisibility
   Audience hérite de l'équipe Dossier               sur toutes les listes
   Tâche hérite de l'équipe Dossier/Client
```

Toute lecture passe par `filterByVisibility(membre, items, permission)`.
Toute écriture passe par `can(membre, permission, resource)`.

---

## 14. Hors scope V1

Reportés post-V1 (sprint G+) :

- **Photo de profil upload** (ImagePicker + crop + storage) — Sprint A utilise initiales sur fond coloré
- **Org-chart visuel** (organigramme avec lignes de rapport) — utile mais pas vital
- **Congés / planning d'équipe** — module dédié
- **Évaluations / objectifs** — module RH étendu
- **Notifications inter-équipe** (mention @membre dans une note)
- **Audit log** des changements de permission — ajout sprint F+
- **2FA / SSO**
- **Pages publiques pour avocats** (site vitrine du cabinet) — hors app interne

---

## 15. Critères d'acceptation V1 (sprints A → E)

Le module est livrable quand :

- [ ] **A** : 6 membres listés. Recherche + filtre rôle + filtre actif/archivé fonctionnels. Vue table et galerie permutables. Fiche détail accessible avec stats à jour.
- [ ] **A** : Inviter un nouveau membre passe le formulaire et apparaît dans la liste avec chip INVITE.
- [ ] **A** : Désactiver/réactiver/supprimer fonctionnent avec confirmation 2 étapes.
- [ ] **B** : Bascule de rôle via UserSwitcher change Sidebar + dashboard + autorisations. Tentative d'accès URL non autorisée → écran NoAccess.
- [ ] **B** : Stagiaire ne voit ni Finance ni les bulletins des autres.
- [ ] **C** : Sur dossier, ajouter 2 membres à l'équipe les fait apparaître en avatar stack sur la ligne.
- [ ] **C** : Membre ajouté à un dossier voit automatiquement le client parent.
- [ ] **D** : Avocat se connectant ne voit que SES dossiers, ses clients, ses tâches dans toutes les listes.
- [ ] **E** : Désactivation propose le transfert ; les entités ne deviennent jamais orphelines.
- [ ] **Toujours** : typecheck passe, lint passe, aucune `console.error`, aucune régression sur les modules existants.

---

## 16. Annexes design

### 16.1 Couleurs des rôles (DA sépia/doré/crème)

```ts
ASSOCIE_GERANT  : #502e0f  // brun foncé profond
ASSOCIE         : #7f5533  // brun moyen chaleureux
AVOCAT          : #c8772f  // ocre orangé
JURISTE         : #a08152  // taupe doré
STAGIAIRE       : #d3a96a  // doré clair sable
SECRETAIRE      : #83746b  // gris-brun neutre
```

Un dégradé subtil de couleur par rang de hiérarchie, qui reste 100 % dans la palette KadriLex (sépia/crème). Le gérant est le plus foncé (autorité), le stagiaire le plus clair (encore en formation).

### 16.2 Iconographie Material Symbols

| Rôle | Icône |
|---|---|
| ASSOCIE_GERANT | `shield_person` |
| ASSOCIE | `verified` |
| AVOCAT | `balance` |
| JURISTE | `menu_book` |
| STAGIAIRE | `school` |
| SECRETAIRE | `support_agent` |

| Action | Icône |
|---|---|
| Voir fiche | `visibility` |
| Modifier | `edit` |
| Inviter | `mail` ou `send` |
| Désactiver | `block` |
| Réactiver | `check_circle` |
| Supprimer | `delete` |
| Ajouter membre | `person_add` |
| Module Équipe | `groups` |

| Stat charge | Icône |
|---|---|
| Dossiers | `folder_open` |
| Clients | `account_circle` |
| Tâches | `task_alt` |
| Audiences | `gavel` |
| Charge composite | `bolt` |

### 16.3 Typographie & densité

- **Header titre** : `font-h2` Newsreader sépia
- **Compteur stat** : `font-mono-num` Space Grotesk
- **Label** : `font-label-caps` uppercase tracking-wider
- **Body** : `font-body-sm` Manrope

Densité : header 40 px, lignes de table 56 px, padding cards 16 px (`p-density-medium`).

### 16.4 Avatars — règle d'usage

- **xs (20 px)** : compteurs ultra-compacts dans badges
- **sm (28 px)** : AvatarStack dans tables de listes
- **md (36 px)** : avatar de ligne dans table Équipe
- **lg (48 px)** : card galerie + en-tête de fiche client/dossier
- **xl (72 px)** : header de fiche membre

Toujours **ring coloré du rôle** sur les versions xs/sm/md utilisées en stack ou contexte mixte. Sans ring sur md/lg/xl en standalone.

---

## 17. Décisions d'implémentation actées (Sprint A)

- ✅ `MockMembre` étend `MockEmploye` sans le casser : alias `MockEmploye = MockMembre` exporté.
- ✅ `mockMembres = [...]` est la nouvelle constante. `mockEmployes` reste exportée comme alias direct.
- ✅ 6 membres mockés (les 5 originaux + Fatima SOULEY stagiaire pour montrer le statut INVITE).
- ✅ Bridge legacy via `avocatCabinetKey` dans `computeMembreStats` — sera retiré au sprint C.
- ✅ Pas de fetch API au sprint A : la page lit directement `mockMembres` et le state local. API REST viendra avec la migration Prisma.
- ✅ Tous les compteurs en `useMemo` → recalculés à chaque mutation (ajout/désactivation membre).
- ✅ `<MembreActionsMenu>` utilise `createPortal` + sous-composant `MenuPanel` pour éviter les setState dans `useEffect` (conforme `react-hooks/set-state-in-effect`).

---

## Fin du brief

Document vivant — mise à jour à chaque fin de sprint. Référence pour les revues de design et la cohérence inter-modules.
