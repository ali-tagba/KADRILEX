# Brief Design — Module Dossiers KadriLex

> Document à transmettre à l'éditeur de maquettes UI/UX. Refonte du module **Dossiers** dans la même direction artistique que le dashboard et le CRM Clients (sépia / doré / crème). Couvre la **liste**, les **filtres avancés**, la **fiche détail** complète, et la **GED** (gestion documentaire). La référence DA, typo, tokens et anti-patterns est dans **BRIEF_DESIGN_DASHBOARD.md** + **BRIEF_DESIGN_CLIENTS.md**, à lire en premier.

---

## 1. Contexte

Le module **Dossiers** est le cœur opérationnel du cabinet **SCPA Kadri Legal** : c'est là que l'avocat travaille au quotidien. Chaque dossier représente une affaire (contentieux ou conseil) ouverte pour un client, ou — minoritairement — une affaire administrative interne au cabinet.

**Distinction stratégique : 2 types de dossiers**

| Type | Quand l'utiliser | Exemple |
|---|---|---|
| **Dossier Client** (focus actuel) | Affaire ouverte pour un client du CRM | `DOS-2026-041` : SONITEL c/ État du Niger |
| **Dossier Administratif/Interne** (à venir, structure anticipée) | Affaire interne au cabinet, sans client | `ADM-2026-005` : Renouvellement bail cabinet |

> ⚠️ **Le brief actuel se concentre exclusivement sur les Dossiers Client.** La structure doit anticiper le 2nd type (champ `kind: 'CLIENT' \| 'ADMIN'` dans le modèle, préfixe N° différent, sidebar hint), mais aucune maquette dédiée Admin n'est demandée pour l'instant.

L'utilisateur cible reste le **gestionnaire principal** + tous les avocats du cabinet. Besoins typiques :
- ouvrir un dossier en 1 clic depuis la liste, voir l'état complet en 5 secondes (parties, statut, prochaine audience, dernière facture, derniers documents)
- naviguer dans les **fichiers** du dossier comme dans Drive (sous-dossiers, breadcrumb, recherche)
- créer un nouveau dossier en 30 secondes : choisir un client → type/nature/juridiction → c'est ouvert

---

## 2. Direction artistique (rappel)

**Lire BRIEF_DESIGN_DASHBOARD.md §2-3 + BRIEF_DESIGN_CLIENTS.md §2 pour la palette, la typo et les anti-patterns.** Tout y est valable ici.

Rappels essentiels :
- Palette MD3 sépia (`primary-container #6b4423`, `accent #c8772f`, etc.) — **zéro bleu/violet/emeraude** résiduel
- Polices : **Newsreader** (titres), **Manrope** (body), **Space Grotesk** (numéros DOS-XX, dates, montants)
- Icons : **Material Symbols Outlined**
- Radius : `rounded-lg = 4px` (sobre)
- Anti-patterns : pas de glassmorphism, pas d'élévation au hover, pas de cartes-dans-cartes, pas de polices système

---

## 3. Logique métier inspirée du workflow Excel KADRI

Le template Excel `KADRI_LEGAL_Template.xlsx` (script Python du cabinet) est la **source de vérité** du workflow Dossiers. Colonnes du template :

| # | Colonne Excel | Statut dans le module |
|---|---|---|
| 1 | Date | Date d'ouverture du dossier |
| 2 | Numéro | **Auto-numéroté** (`DOS-YY-NNN` pour client, `ADM-YY-NNN` pour admin) |
| 3 | Client | Lien vers fiche client du CRM (autocomplete) |
| 4 | **Contre** | Parties adverses (multi-valeurs, alimente la détection de conflits CRM) |
| 5 | Nature de l'affaire | Dropdown contrôlé — 14 natures (voir §3.1) |
| 6 | État de la procédure | Texte libre court (ex: "Plaidoirie en cours", "Mise en état", "Délibéré") |
| 7 | ~~Avocat en charge~~ | **HÉRITÉ DU CLIENT** — voir §3.2 ⚠️ |
| 8 | ~~Honoraires convenus~~ | **HÉRITÉ DU CLIENT** — voir §3.2 ⚠️ |
| 9 | Frais d'ouverture / Provision | Champ FCFA (saisie libre, format nombre) |
| 10 | Observations | Textarea libre |

**Logique Excel à traduire dans le module** :
- Auto-numérotation séquentielle stable
- **Onglets par année** (`Dossiers 2022`, `Dossiers 2023`…) → traduire en filtre année dans la liste
- Volets figés sur en-tête + premières colonnes → en-tête sticky, colonne action sticky droite
- Filtres natifs sur toutes les colonnes → filtres avancés via drawer (comme module Clients)
- Couleurs onglet par année → optionnel, peut servir de hint léger sur les badges

### 3.1 Listes contrôlées

**14 natures d'affaire** (extrait du Excel `LISTE_NATURE`) :

| Catégorie | Sous-natures |
|---|---|
| **Familles** | Conseil / Assistance · Contentieux / Judiciaire |
| **Domaines** | Droit des Affaires / Sociétés · Droit Social / Travail · Droit Administratif · Investissement / PPP · Droit des TIC · Droit Fiscal · Droit Bancaire · Recouvrement de créances · Droit Pénal · Propriété Intellectuelle · Droit Minier / Pétrolier · Autre |

Le user choisit **une seule nature par dossier** dans un dropdown groupé (familles + domaines).

**Statuts dossier** (5) :
- `EN_COURS` — actif (par défaut)
- `EN_ATTENTE` — bloqué (pièces manquantes, attente partie adverse, etc.)
- `CLOTURE` — terminé avec décision rendue
- `TERMINE` — terminé sans contentieux (conseil livré, transaction conclue)
- `ARCHIVE` — clôturé depuis > 1 an, retiré de la liste active par défaut

**Types de dossier** (6, complète Excel) :
`CIVIL · COMMERCIAL · PENAL · ADMINISTRATIF · SOCIAL · AUTRE`

### 3.2 Anti-redondance avec le CRM Clients ⚠️ **À RESPECTER STRICTEMENT**

L'avocat en charge et le type d'honoraires sont **déjà saisis sur la fiche client** dans le CRM. Le module Dossiers ne doit **PAS** redemander ces champs lors de la création d'un Dossier Client.

| Champ | Origine | Surchargeable au niveau dossier ? |
|---|---|---|
| Avocat en charge | Hérité automatiquement du `client.avocatEnCharge` | ✅ Oui (cas exceptionnels : co-traitance, transfert ponctuel) |
| Honoraires convenus | Hérité automatiquement du `client.honorairesConvenus` | ✅ Oui (forfait spécifique pour un dossier ponctuel) |

Visuellement dans la fiche dossier :
- Affichage en **lecture seule** par défaut (avec source : "Hérité de la fiche client")
- Petit bouton **"Modifier pour ce dossier"** (très discret) qui débloque l'édition et marque le champ comme "surchargé" (badge léger ou pictogramme)

Pour les **Dossiers Administratifs** (à venir) : l'avocat est saisi manuellement, pas de notion d'honoraires.

---

## 4. Audit du module Dossiers existant

État actuel à refondre :

**Fichiers concernés** :
- `app/dossiers/page.tsx` — page liste avec stats cards + filtres + switch table/galerie
- `app/dossiers/[id]/page.tsx` — fiche détail avec tabs (GED & Fichiers + autres)
- `components/dossiers/file-explorer.tsx` — explorateur Drive-like (folders / files / hiérarchie via `parentId`)
- `components/dossiers/dossier-form-dialog.tsx` — modale création/édition (champs : clientId, type, typeDossier, domaineDroit, avocatAssigne, statut, juridiction, description)
- API : `/api/dossiers`, `/api/dossiers/[id]`, `/api/dossiers/[id]/files`, `/api/dossier-files/[id]`

**Schema Prisma `Dossier`** (à conserver, légèrement étendre) :
- `numero` (unique), `clientId` (à rendre **nullable** pour anticiper Admin)
- `type` : CIVIL / PENAL / COMMERCIAL / ADMINISTRATIF / SOCIAL / AUTRE
- `typeDossier` : CONTENTIEUX / CONSEIL / PRE_CONTENTIEUX / TRANSACTIONNEL
- `domaineDroit` : à mapper vers les 14 natures Excel
- `statut` : EN_COURS / EN_ATTENTE / CLOTURE / TERMINE / ARCHIVE
- `juridiction`, `avocatAssigne`, `dateOuverture`, `dateCloture`, `description`
- **À ajouter** : `kind: 'CLIENT' \| 'ADMIN'` (default CLIENT), `partiesAdverses: string[]`, `provision: number`, `observations: string`

**Schema `DossierFile`** (à conserver tel quel) :
- `id`, `dossierId`, `parentId` (hiérarchie), `name`, `type` FILE/FOLDER, `url`, `mimeType`, `size`

**Problèmes à corriger** :
- DA bleu royal / cyan / violet (à passer en sépia/doré)
- Liste avocats hardcodée Côte d'Ivoire (Maître Konan, etc.) → utiliser `AVOCATS_CABINET` du Niger (déjà dans `lib/constants/legal.ts`)
- Champ "Avocat en charge" demandé à la création — **À retirer** (auto-hérité du client)
- Stats cards en haut (4 KPI) → à intégrer en sub-header compact comme le module Clients
- Filtres en pills statiques + tabs → passer en **drawer latéral** (comme le module Clients)
- Pas de visualisation parties adverses → à ajouter
- File explorer : style à harmoniser avec sépia
- Pas de visualisation directe des audiences/factures liées dans la fiche

---

## 5. Architecture du module à dessiner

```
/dossiers                          → Liste (vue Table OU Galerie)
  ├── header compact (titre + compteurs + CTA "Nouveau dossier")
  ├── toolbar (recherche + bouton Filtres + toggle vue)
  ├── canvas (table ou grille de cards selon vue active)
  └── drawer latéral filtres avancés

/dossiers/[id]                     → Fiche détail
  ├── header (n° dossier mono + titre + statut + actions)
  ├── sub-header (parties + nature + juridiction + dates clés)
  ├── tabs ou sections en colonnes :
  │   ├── Vue d'ensemble (résumé)
  │   ├── Parties (client + parties adverses + détection conflits)
  │   ├── Audiences (liste des audiences liées)
  │   ├── Factures (liste des factures liées + total / restant dû)
  │   ├── GED (file explorer hiérarchique)
  │   ├── Activité (timeline)
  │   └── Notes & Observations (textarea libre)
  └── modale création/édition
```

**Décision UX** : utiliser une mise en page **multi-colonnes** sur desktop plutôt que des tabs (plus dense, tout visible d'un coup) — voir §9.

---

## 6. Vue Liste — TABLE (vue par défaut, dense)

### 6.1 Header de page (1 ligne, compact)

Identique au module Clients :
- Surtitre `label-caps` "GESTION DES DOSSIERS"
- H1 serif "Dossiers"
- Compteurs inline : `42 actifs · 12 en attente · 156 clôturés` (en accent doré quand filtres actifs : `X filtré(s)`)
- À droite : bouton primary `+ Nouveau dossier` (fond accent)

### 6.2 Toolbar (1 ligne, compact)

Identique au module Clients :
- Recherche (placeholder : "Rechercher par n°, client, partie adverse, juridiction…")
- Bouton **"Filtres"** avec icône `tune` + badge compteur sépia
- Toggle vue Tableau / Galerie

### 6.3 Tableau (8 colonnes)

| # | Colonne | Largeur | Contenu | Style |
|---|---|---|---|---|
| 1 | **N° Dossier** | 130px | `DOS-2026-041` | mono Space Grotesk, sépia |
| 2 | **Type** | 100px | Chip type sépia (CIVIL/COMMERCIAL/etc.), couleur stable par type | — |
| 3 | **Client** | 220px | Nom du client (lien vers fiche CRM) + n° client `CLI-YY-NNN` en sub-ligne mono | truncate |
| 4 | **Contre (parties adverses)** | 200px | Si 1 partie : son nom · Si plusieurs : "Niger Telecom +2" avec tooltip | truncate, hover affiche tooltip complet |
| 5 | **Nature** | 200px | Nature d'affaire courte ("Contentieux · Droit Bancaire") | truncate |
| 6 | **État procédure** | 200px | Texte libre court ("Plaidoirie en cours") | italic, on-surface-variant |
| 7 | **Statut** | 130px | Badge coloré : En cours (sépia) / En attente (doré) / Clôturé (vert) / Archivé (gris) | — |
| 8 | **Ouvert le** | 110px | Date FR `DD/MM/YYYY` | mono Space Grotesk, on-surface-variant |
| 9 | **Action** (sticky right) | 100px | Bouton "Ouvrir →" sépia | — |

**⚠️ Pas de colonne Avocat ni Honoraires** dans la table — ces champs sont **dérivés du client**. Pour les voir, ouvrir la fiche dossier ou la fiche client.

**Styles communs** :
- En-têtes : `bg-[#FBF7F0]`, sticky `top-0 z-10`, label-caps
- Lignes : `h-12`, hover `bg-[#E8B27D]/10`, divider `divide-[#E8DCC8]`
- Sticky right shadow sur colonne Action
- Pagination footer (10 lignes / page par défaut)
- Scrollbar fine sépia (cohérent avec autres modules)

---

## 7. Vue Liste — GALERIE (visuelle, alternative)

Grille 3 colonnes (desktop), 2 (tablet), 1 (mobile). Card ≈ 360×260px.

```
┌──────────────────────────────────────────┐
│ DOS-2026-041                  [⏱ En cours]│  ← header card : n° mono + chip statut
│                                            │
│ SONITEL c/ État du Niger                   │  ← titre serif Newsreader 18px
│ ⚖ Tribunal de Commerce de Niamey          │  ← juridiction (icône balance)
│                                            │
│ ───── divider sépia ─────                  │
│                                            │
│ Client    SONITEL · CLI-26-001             │  ← parties (lien)
│ Contre    État du Niger, Niger Telecom +1  │  ← parties adverses
│                                            │
│ Nature    Contentieux · Droit Bancaire     │
│ Ouvert    14 mai 2026 · il y a 12 jours   │
│                                            │
│ ┌─📅 3 audiences┐ ┌─📄 28 fichiers┐        │  ← chips compteurs liés
│ ┌─💰 5 factures┐  ┌─⚠ Conflit┐             │  ← badge alerte si conflit CRM
└──────────────────────────────────────────┘
```

- Fond `surface-container-lowest`, bordure `outline-variant`, radius 4px
- Hover : très léger fond `surface-container-low`, **pas** d'élévation
- Carte entièrement cliquable → ouvre la fiche dossier
- Chip "Conflit" rouge `error-container` si parties adverses contiennent un client du cabinet

---

## 8. Filtres avancés (drawer latéral, identique CRM)

Drawer slide-in droite (max-width 420px), backdrop, ESC pour fermer, body scroll bloqué.

**Sections** :

1. **Type de dossier** (radio) — Tous · CIVIL · COMMERCIAL · PENAL · ADMINISTRATIF · SOCIAL · AUTRE
2. **Nature d'affaire** (multi-select via checkboxes) — les 14 natures Excel, regroupées en 2 sections (Familles / Domaines)
3. **Statut** (radio) — Tous · En cours · En attente · Clôturé · Terminé · Archivé
4. **Date d'ouverture** (radio + sub-controls) — Toutes · Ce mois · Ce trimestre · Cette année · Année précise · Période personnalisée
5. **Avocat en charge** (multi-select) — les 4 avocats du cabinet (filtre dérivé du client lié)
6. **Client** (autocomplete dropdown avec recherche) — liste les clients du CRM, multi-select possible
7. **Juridiction** (autocomplete) — Tribunal de Commerce de Niamey, TGI, Cour d'Appel, Cour Suprême, Tribunal Administratif, etc.
8. **Catégorie dossier** (radio) — `Tous` · `Dossiers Client` · `Dossiers Administratifs` (anticipation §1)

**Footer** : "Réinitialiser" (text link) + "Voir les résultats" (CTA accent).

---

## 9. Fiche détail dossier `/dossiers/[id]`

**Décision** : layout **multi-colonnes** (8/4 sur desktop) avec sections empilées dans la colonne gauche, sidebar info à droite. **Pas de tabs** — tout doit être visible en scroll, comme le dashboard.

### 9.1 Header de la fiche

- **Back link** "← Tous les dossiers"
- **Bandeau d'alerte conflit** (rouge `error-container`) si une partie adverse est aussi cliente du cabinet — réutilise la logique CRM `detectConflits()`. Lien direct vers chaque client en conflit.

- **Bloc principal** :
  - Sub-titre : `DOS-2026-041` mono + chip statut sépia (icône + label)
  - H1 serif "SONITEL c/ État du Niger"
  - Sub-ligne : `Contentieux · Droit Bancaire · Tribunal de Commerce de Niamey`

- **Actions** (à droite) :
  - Bouton outline `Modifier`
  - Bouton outline `Archiver` (avec confirm)
  - Bouton outline danger `Supprimer`
  - Bouton primary accent `+ Programmer audience`
  - Menu kebab pour actions secondaires (Dupliquer dossier, Exporter, Imprimer)

### 9.2 Sub-header (info-rich, 1 ligne sur desktop, multi-lignes sur mobile)

Bandeau dense `surface-container-low` avec 4-5 cellules séparées par dividers verticaux fins :

| Cellule | Contenu |
|---|---|
| **Client** | Avatar PM/PP + nom (lien vers `/clients/cli-X`) + n° CLI mono |
| **Avocat en charge** | Nom + chip "Hérité de la fiche client" (icône `link`) |
| **Honoraires** | Type + chip "Hérité" |
| **Ouvert le** | Date FR + relatif ("il y a 12 jours") |
| **État procédure** | Texte libre éditable au hover |

### 9.3 Layout principal — colonne gauche (`col-span-8`)

#### Section "Parties"
- Client (lien fiche)
- Parties adverses (liste avec icône type PM/PP/INCONNU)
- Pour chaque partie adverse : si elle est aussi cliente → **chip rouge "Conflit — aussi client CLI-XX-XXX"** (cliquable)
- Bouton `+ Ajouter une partie adverse`

#### Section "Audiences liées"
- Header avec compteur `3 audiences · 1 à venir`
- Liste compacte (similaire au dashboard) :
  - Date badge sépia (`Auj. 14h30`, `Demain`, `15 mai`)
  - Titre + juridiction
  - Statut chip (À venir / Reportée / Tenue / Annulée)
  - Lien vers la fiche audience (futur)
- CTA `+ Programmer une audience`
- Empty state : "Aucune audience programmée"

#### Section "Factures liées"
- Header avec compteur `5 factures · 2.4M FCFA encaissés · 1.25M FCFA restant dû`
- Liste compacte (réutilise pattern overdue invoices du dashboard) :
  - N° facture mono
  - Date émission + échéance
  - Montant TTC + reste dû (en rouge si > 0)
  - Chip statut (Payée / Partielle / Impayée)
- CTA `+ Émettre une facture`

#### Section "GED — Documents du dossier" (le file explorer)

Composant central — voir §10 dédiée.

#### Section "Notes & Observations"
- Textarea libre (sauvegarde auto au blur)
- Affichage markdown léger (paragraphes, listes simples)

### 9.4 Colonne droite (`col-span-4`) — sidebar contextuelle

#### Section "Activité récente"
- Timeline verticale (réutilise pattern dashboard)
- Filtrable par type : Documents / Audiences / Factures / Communication
- Pastilles colorées par type d'événement

#### Section "Provision & Frais"
- Bloc résumé : Provision versée (FCFA) · Frais cumulés · Reste à provisionner
- Mini graphe sépia (optionnel) : évolution des montants

#### Section "Métadonnées techniques"
- Date d'ouverture, dernière modif, créé par, n° interne
- En `body-sm text-on-surface-variant`, peu emphatic

---

## 10. GED — Gestion Électronique de Documents (section dédiée)

Le file explorer est **central** — c'est ce que l'avocat utilise le plus souvent. Doit fonctionner comme Google Drive ou Notion.

### 10.1 Architecture

- **Hiérarchie infinie** : dossiers / sous-dossiers / fichiers
- Modèle Prisma `DossierFile` avec `parentId` (existe déjà)
- À l'ouverture d'un dossier : 4 sous-dossiers proposés par défaut (templates) :
  - 📁 **Pièces du dossier** (justificatifs client)
  - 📁 **Conclusions** (rédactions cabinet)
  - 📁 **Correspondances** (mails, courriers)
  - 📁 **Pièces adverses** (documents partie adverse)
  - L'avocat peut en créer d'autres ou les renommer librement

### 10.2 Layout du GED

**Toolbar** (en haut de la section) :
- Breadcrumb cliquable : `📁 Dossier racine > Conclusions > Plaidoirie`
- Recherche (filtre les fichiers à tous les niveaux du dossier courant)
- Toggle vue **Grille / Liste** (par défaut Liste — plus dense)
- Boutons actions :
  - `+ Nouveau dossier` (crée un sub-folder)
  - `↑ Importer fichier` (file picker, drag & drop accepté sur toute la zone)

**Vue Liste** (recommandée par défaut) :

| Icône | Nom | Type/Extension | Taille | Modifié | Action |
|---|---|---|---|---|---|
| 📁 | Conclusions | Dossier (8 éléments) | — | il y a 2j | ⋯ |
| 📄 | Conclusions_v3.pdf | PDF | 1.2 MB | hier | ⋯ |
| 📷 | Pièce_03.jpg | Image | 234 KB | 14 mai | ⋯ |

- Hover ligne : fond `surface-container-low`, action `⋯` apparaît
- Menu kebab : Renommer · Déplacer · Télécharger · Supprimer · Partager (futur)
- Clic sur dossier : navigue dedans (breadcrumb update)
- Clic sur fichier : ouvre une **preview lightbox** (PDF dans iframe, image en plein écran, autres = bouton télécharger)

**Vue Grille** :
- Cards 160×160 avec icône type au centre, nom dessous, taille en sub-ligne
- 4-6 cards par ligne selon largeur
- Même menu kebab + clic actions

### 10.3 Drag & Drop

- Drop fichiers depuis l'OS sur la zone GED → upload direct dans le dossier courant
- Drag interne : déplacer un fichier vers un autre sous-dossier (avec confirm si dossier différent)

### 10.4 Empty states

- Dossier vide : icône `folder_off` + message + CTA `+ Importer un fichier`
- Aucun résultat de recherche : `search_off` + suggestion "Essayer dans la racine du dossier"

### 10.5 Indicateurs visuels

- Type de fichier : icône Material adaptée (`picture_as_pdf`, `image`, `description`, `gavel` pour pièces juridiques, etc.)
- Documents nouveaux (< 24h) : pastille accent doré
- Documents partagés / verrouillés (futur) : icône `lock`, `share`

---

## 11. Distinction visuelle Dossiers Client vs Administratifs

Pour anticiper le 2nd type sans dupliquer le module :

- **Préfixe N° différent** : `DOS-YY-NNN` (client) vs `ADM-YY-NNN` (admin)
- **Badge type discret** dans le header de la fiche : "Dossier client" (sépia) vs "Dossier interne" (tertiaire)
- **Section "Parties"** : invisible/masquée sur les dossiers admin (pas de client, pas de partie adverse)
- **Section "Factures"** : également masquée sur admin (les frais admin transitent par la compta interne du cabinet)
- **Filtre catégorie dans le drawer** : "Dossiers Client" est l'option par défaut active

Le designer livre seulement les maquettes Dossier Client. Une note "Variation Admin" peut figurer en annexe (1 mockup simplifié) si bonus, sinon ignorer.

---

## 12. Formulaire création / édition dossier

### 12.1 Modale "Nouveau dossier" — workflow en 1 page (pas de wizard)

Modale large (max-width 720px). Sections :

#### Section 1 — Catégorie
- Toggle radio cards : "Dossier Client" (par défaut) / "Dossier Administratif"
- Si Admin sélectionné : la section 2 (client) est masquée

#### Section 2 — Client (visible si Dossier Client)
- **Autocomplete** sur les clients du CRM (recherche par nom, RCCM, n° CLI)
- Sélection client → affiche un mini-card avec : avatar + nom + n° CLI + avocat en charge + honoraires
- Information visible : "L'avocat en charge et le type d'honoraires seront automatiquement hérités de la fiche client"
- Lien `Modifier la fiche client →` (ouvre un nouvel onglet)

#### Section 3 — Caractéristiques
- **Type** (dropdown) : CIVIL / PENAL / COMMERCIAL / ADMIN / SOCIAL / AUTRE
- **Nature de l'affaire** (dropdown groupé en 2 sections : Familles / Domaines)
- **Juridiction** (autocomplete avec liste des juridictions du Niger pré-remplies)
- **Date d'ouverture** (date picker, défaut aujourd'hui)
- **Provision versée** (input number FCFA, optionnel)

#### Section 4 — Parties adverses
- Champ "Contre" : multi-input (chips) — l'utilisateur tape un nom, presse Entrée, ça crée un chip. Peut en ajouter plusieurs.
- **Détection conflit en live** : si un nom tapé correspond à un client existant → warning rouge sous le champ avec lien vers la fiche du client en conflit, et bouton "Confirmer quand même" (doit être explicite)

#### Section 5 — État procédure & description
- État procédure (texte libre court, ex: "Mise en état")
- Description / Observations (textarea, optionnel)

#### Footer
- `Annuler` (ghost) + `Créer le dossier` (primary accent)
- Validation : type, nature, juridiction obligatoires (client obligatoire si catégorie = Client)
- Numéro auto-généré côté serveur après création — pas demandé à l'utilisateur

### 12.2 Modale "Modifier dossier"

Identique à la création, mais :
- La catégorie n'est pas modifiable (un dossier ne change pas de type)
- Le numéro est affiché en lecture seule (mono Space Grotesk en haut)
- Bouton supplémentaire "Surcharger l'avocat / les honoraires pour ce dossier" (révèle les champs habituellement hérités)

---

## 13. Composants design system supplémentaires

À designer en plus de ceux du dashboard et du CRM :

1. **Statut badge dossier** — 5 variantes (En cours / En attente / Clôturé / Terminé / Archivé), couleurs cohérentes avec MD3
2. **Type chip dossier** — 6 variantes (Civil / Pénal / Commercial / Admin / Social / Autre), teintes sépia subtiles
3. **Nature dropdown groupé** — sélecteur custom avec 2 sections (Familles + Domaines) et search filter intégré
4. **File explorer toolbar** — breadcrumb + recherche + toggle vue + actions
5. **File row** (vue liste) — icône type + nom + meta + action menu
6. **File card** (vue grille) — icône grande + nom + meta
7. **File preview lightbox** — overlay full-screen avec PDF iframe ou image
8. **Multi-input chips** — pour les parties adverses (saisie + chips supprimables)
9. **Autocomplete dropdown client** — pour le formulaire dossier
10. **Linked entity card** (mini) — affiche un client / une audience / une facture en sub-card cliquable

---

## 14. États à designer

| État | Description |
|---|---|
| **Loading liste** | Skeleton sépia (rectangles `surface-container-high` animation pulse) |
| **Loading fiche** | Skeleton header + skeletons sections |
| **Empty (aucun dossier)** | Icône `folder_off` 48px outline-variant + "Aucun dossier ouvert" + CTA "+ Créer le premier dossier" |
| **Empty (filtres restrictifs)** | Icône `search_off` + "Aucun dossier ne correspond à ces filtres" + bouton "Réinitialiser" |
| **GED vide** | Icône `cloud_upload` + "Glissez vos fichiers ici ou cliquez pour importer" + CTA `+ Importer` |
| **Error** | Bandeau rouge subtil + retry, contenu reste visible |
| **Hover ligne table** | Fond `surface-container-low`, bouton "Ouvrir" passe en accent |
| **Hover carte galerie** | Fond `surface-container-low`, **pas** d'élévation |
| **Conflit détecté** | Bandeau rouge en haut de la fiche + chips rouges sur les parties adverses concernées |
| **Champ surchargé** (avocat/honoraires) | Pictogramme `link_off` + tooltip "Modifié pour ce dossier" |

---

## 15. Notes pour le designer

- **Pas de Flash CR** dans cette app, ni dans aucune maquette future. Confirmé.
- L'app est en **français** intégralement.
- L'**avocat en charge n'est jamais demandé à la création d'un Dossier Client** — il est hérité du CRM. Le designer doit le rendre visible mais en lecture seule par défaut.
- Le **numéro de dossier** est auto-généré côté serveur. Toujours en mono Space Grotesk.
- Le **GED** est la fonctionnalité la plus utilisée par les avocats — elle doit être **rapide d'accès** et **visuellement claire** (peu de friction pour naviguer dans la hiérarchie).
- Les **factures et audiences liées** doivent permettre une navigation directe vers les modules respectifs (le designer prévoit l'intégration future).
- Anticipation **Dossier Administratif** : penser le système comme `kind: 'CLIENT' \| 'ADMIN'` dès le départ, mais ne pas livrer de maquettes Admin sauf bonus.
- Données de remplissage : noms Niger réalistes (SONITEL, BIN, SONICHAR, Niger Lait, AREVA, ORANGE, Air Niger, Brasserie Niger), juridictions Niamey, montants FCFA (`1 234 567 FCFA`), avocats `Me Oumarou Sanda KADRI` / `Me Mahaman Rabiou OUMAROU` / `Me Ali KADRI` / `Me Mariama ABDOU ISSA`.

---

## 16. Critères d'acceptation

La maquette est validée si :

- [ ] La palette sépia/doré/crème est appliquée partout (zéro résidu bleu/violet/emeraude)
- [ ] Les 2 vues (Table & Galerie) partagent le même header, la même toolbar et basculent via le toggle
- [ ] **Aucune mention de l'avocat en charge ni des honoraires dans la création** d'un Dossier Client
- [ ] L'avocat en charge est visible **en lecture seule** dans la fiche détail, avec le tag "Hérité de la fiche client"
- [ ] Le N° dossier `DOS-YY-NNN` est partout en mono Space Grotesk
- [ ] La détection de conflits d'intérêts (depuis le CRM) est affichée dans la fiche dossier (bandeau rouge + chips sur parties adverses)
- [ ] Le GED supporte la hiérarchie infinie + breadcrumb + drag & drop + recherche + 2 vues (liste/grille)
- [ ] La fiche détail rassemble en une seule page : info dossier, parties, audiences liées, factures liées, GED, activité, notes — **sans tabs**
- [ ] Tous les états (loading, empty, error) sont conçus pour les pages liste et détail
- [ ] Le filtre dossier permet de filtrer par : type, nature, statut, date, avocat, client, juridiction, catégorie (client/admin)
- [ ] La typographie est Newsreader + Manrope + Space Grotesk
- [ ] Test "IA-fait" : l'interface ne sent pas le template. Sobre, dense, professionnelle, légitime pour un cabinet juridique haut de gamme.

---

## 17. Données mock à utiliser dans les maquettes

### Dossiers client (12-15 entrées)
- **DOS-2026-041** · SONITEL c/ État du Niger · Contentieux / Droit Administratif · Tribunal de Commerce de Niamey · En cours · Plaidoirie en cours · Ouvert 14 mai 2026
- **DOS-2026-038** · BIN c/ Niger Telecom · Contentieux / Droit Bancaire · TGI Niamey · En cours · Mise en état · Ouvert 22 mars 2026 — ⚠️ **Conflit** (Niger Telecom est aussi client)
- **DOS-2025-098** · SONITEL — Renégociation Convention Mobile c/ Niger Telecom · Transactionnel / TIC · — · En attente · Audit en cours · Ouvert 18 sept 2025 — ⚠️ **Conflit**
- **DOS-2025-112** · SONITEL — Audit Contrats Fournisseurs · Conseil / Droit Affaires · — · Terminé · Rapport livré · Ouvert 4 nov 2025
- **DOS-2026-024** · Niger Lait c/ Distrib SARL · Contentieux / Recouvrement · TGI Niamey · En cours · Citation à comparaître délivrée · Ouvert 8 fév 2026
- **DOS-2026-052** · Référé Mahamane c/ Banque Atlantique · Contentieux / Droit Bancaire · Cour d'Appel de Niamey · En cours · Audience prévue 15 mars · Ouvert 1 mars 2026
- **DOS-2026-031** · Maïga — divorce contentieux · Contentieux / Droit Civil · TGI Niamey · En cours · Mise en état · Ouvert 14 fév 2026
- **DOS-2026-046** · Oumarou — succession · Conseil / Droit Civil · — · En cours · Inventaire en cours · Ouvert 28 fév 2026
- **DOS-2026-061** · Boubacar c/ Société Immobilière du Niger · Contentieux / Droit Civil · TGI Niamey · En attente · Pièces manquantes · Ouvert 12 mars 2026
- **DOS-2026-029** · Recours Hamidou — révocation · Contentieux / Droit Administratif · Tribunal Administratif de Niamey · En cours · Mémoire en réponse à rédiger · Ouvert 5 fév 2026
- **DOS-2025-201** · AREVA c/ Ministère des Mines · Contentieux / Droit Minier · TGI Niamey · En cours · Audience à fixer · Ouvert 12 oct 2025
- **DOS-2026-074** · Issoufou c/ Trésor National · Contentieux / Droit Fiscal · Tribunal Administratif · En cours · Recours hiérarchique en cours · Ouvert 18 avril 2026

### Dossier administratif (1-2 entrées, anticipation §11)
- **ADM-2026-005** · Renouvellement bail cabinet · Administratif · Niamey · En cours · Négociation propriétaire · Ouvert 5 jan 2026
- **ADM-2025-012** · Contrat fournisseur informatique · Administratif · — · Clôturé · Signé · Ouvert 18 nov 2025

### Patterns à représenter dans les états
- Au moins 1 dossier en conflit d'intérêts (DOS-2026-038 ou DOS-2025-098)
- Au moins 1 dossier en attente avec sous-statut explicite
- Au moins 1 dossier avec 0 audience programmée
- Au moins 1 dossier avec 5+ factures
- Au moins 1 GED avec hiérarchie 3 niveaux (dossier > sous-dossier > fichier)

---

*Brief rédigé le 2026-05-02 sur la base de l'audit du module Dossiers existant et du contexte métier extrait du template Excel KADRI. À lire en complément de **BRIEF_DESIGN_DASHBOARD.md** et **BRIEF_DESIGN_CLIENTS.md** pour la DA et les conventions partagées.*
