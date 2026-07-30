# Brief Design — Module Clients (CRM) KadriLex

> Document à transmettre à l'éditeur de maquettes UI/UX. Refonte du module **Clients** dans la même direction artistique que le dashboard (sépia / doré / crème). Spécifie deux vues — **Table** et **Galerie** — plus la fiche détail client. La référence DA, typo, tokens et anti-patterns est dans **BRIEF_DESIGN_DASHBOARD.md**, à lire en premier.

---

## 1. Contexte

Le module **Clients** est l'annuaire CRM du cabinet **SCPA Kadri Legal**. Il centralise :
- les **personnes morales** (sociétés clientes : SONITEL, BIN, SONICHAR, Niger Lait, etc.)
- les **personnes physiques** (particuliers : avocats individuels, dirigeants, etc.)

L'utilisateur cible reste le **gestionnaire principal** (avocat associé / admin). Ses besoins quotidiens :
- retrouver rapidement un client par nom, mail, téléphone ou société
- voir d'un coup d'œil la santé de son portefeuille (combien de clients, qui a des dossiers actifs, qui a des impayés)
- ouvrir une fiche client pour voir ses contacts, dossiers liés, état facturation
- créer/modifier un client en quelques secondes

Le module doit gérer aussi bien **5 clients** que **500** sans changer d'expérience.

---

## 2. Direction artistique (rappel court)

**Lire BRIEF_DESIGN_DASHBOARD.md §2-3 pour la palette, la typo et les anti-patterns.** Tout y est valable ici. Rappels essentiels :

- Palette MD3 sépia : `primary-container #6b4423`, `accent #c8772f`, `background #fff8f4`, `surface-container-lowest #ffffff`, `surface-container #f7ece2`, `outline-variant #d5c3b8`, `error #ba1a1a`, `on-surface-variant #50443c`
- Polices : **Newsreader** (titres serif), **Manrope** (body), **Space Grotesk** (numéros, identifiants type CLI-26-NNN)
- Icons : **Material Symbols Outlined** (group, person, business, mail, phone, location_on, folder_open, etc.)
- Radius : `rounded-lg = 4px` (sobre)
- Anti-patterns interdits : glassmorphism, gradients texte, ombres exagérées, couleurs fluo, cartes-dans-cartes, polices système

---

## 3. Logique métier inspirée du workflow Excel actuel

Le cabinet utilise aujourd'hui un **template Excel rigoureusement structuré** (généré par script Python — schéma à respecter dans l'esprit, pas dans les données) :

- **Vocabulaire contrôlé** via dropdowns (jamais de texte libre quand un référentiel existe)
- **Auto-numérotation** de chaque entrée (`01`, `02`, `03`…) — séquentiel et stable
- **Découpage par année** sous forme d'onglets (Dossiers 2022, Dossiers 2023, etc.)
- **Filtres natifs** sur toutes les colonnes
- **Volets figés** : en-tête + premières colonnes restent visibles au scroll
- **Couleurs par catégorie** : code couleur stable pour reconnaître au coup d'œil

**À traduire dans le CRM Clients** (sans copier les données du template) :

| Logique Excel | Traduction CRM |
|---|---|
| Auto-numérotation `TEXT(ROW()-1,"00")` | Identifiant client visible : `CLI-26-001`, `CLI-26-002`… (mono) |
| Distinction stricte Conseil vs Contentieux | Distinction stricte **Société (PM)** vs **Particulier (PP)**, badge couleur dédié |
| Dropdowns contrôlés (avocat, nature, honoraires) | Dropdowns pour `Forme juridique` (SARL/SA/SAS/SAU/SNC/Autre), `Pays` (Niger par défaut), `Ville` |
| Onglets par année | Filtre pill **par année de création** sur la liste (Tous · 2026 · 2025 · 2024…) |
| Volets figés sur 4 premières colonnes | **Colonne action sticky à droite**, en-tête sticky en haut |
| Couleurs par année / type | Badges colorés stables : sépia foncé pour PM, accent doré pour PP, jamais l'inverse |
| Validation numérique (provision FCFA) | Validation côté form (téléphone format `+227 XX XX XX XX`, email parsable) |

**Ce qui n'est PAS importé du template Excel** (parce que ça relève du module **Dossiers**, pas Clients) : liste des avocats du cabinet, natures d'affaire, types d'honoraires, provisions, état de procédure.

---

## 4. Audit du module Clients existant

État actuel à refondre :

**Fichiers concernés** :
- `app/clients/page.tsx` — page liste avec switch Vue Table / Vue Galerie
- `app/clients/[id]/page.tsx` — fiche détail
- `components/clients/client-table.tsx` — tableau 9 colonnes
- `components/clients/client-filters.tsx` — barre filtres (recherche + tabs type + toggle vue)
- `components/clients/client-form-dialog.tsx` — modale création/édition
- `components/clients/contact-form-dialog.tsx` — modale contact secondaire
- API : `/api/clients`, `/api/clients/[id]`, `/api/clients/[id]/contacts`

**Schema Prisma `Client`** (à conserver) :
- Type : `PERSONNE_MORALE` | `PERSONNE_PHYSIQUE`
- PM : `raisonSociale`, `formeJuridique`, `numeroRCCM`, `siegeSocial`, `representantLegal`
- PP : `nom`, `prenom`, `profession`, `pieceIdentite`
- Communs : **`email`**, **`telephone`**, `adresse`, `ville`, `pays` (default Niger), `notes`
- Sub-entité `Contact[]` : `nom`, `prenom`, `fonction`, `email`, `telephone`

**Problèmes actuels à corriger** :
- DA bleu royal au lieu de sépia/doré
- Vue Table : ombres trop marquées, icônes décoratives violet/emeraude (pas dans la palette)
- Vue Galerie : glassmorphism via `hover:scale-1.02 hover:-translate-y-1` exagéré, fond bleu hardcodé
- Filtres : badge "Tous/Entreprises/Particuliers" en bleu, à passer en pills sépia
- Fiche détail : trop de cards-dans-cards
- Pas d'identifiant client visible (CLI-26-NNN)
- Mail et téléphone noyés dans la table, pas mis en valeur sur la fiche détail
- Indicateur "Facturation impayée" basé sur un `Math.random()` à remplacer par vraie logique (côté API plus tard)

---

## 5. Architecture du module à dessiner

```
/clients                          → Liste (vue Table OU Galerie)
  ├── header (titre + compteur + CTA "Nouveau client")
  ├── barre filtres (recherche + type + année + toggle vue)
  └── canvas (table OU grille de cards selon vue active)

/clients/[id]                     → Fiche client
  ├── header (avatar + nom + identifiant CLI-26-NNN + actions Modifier/Supprimer)
  ├── section "Coordonnées" (mail + téléphone mis en avant + adresse)
  ├── section "Identité juridique" (champs PM ou PP selon type)
  ├── section "Contacts secondaires" (sub-tableau)
  ├── section "Dossiers liés" (compteur + liste compacte)
  └── section "Activité récente" (timeline inline)
```

---

## 6. Vue 1 — TABLE (dense, info-rich)

**Quand l'utiliser** : recherche, tri, comparaison rapide, traitement par lot. Vue par défaut.

### 6.1 Header de page

- Surtitre `label-caps` "PORTEFEUILLE CLIENTS"
- H1 serif "Clients" couleur `primary-container`
- Sous-ligne `body-sm` color `on-surface-variant` : `42 clients · 28 sociétés · 14 particuliers` (compteurs dynamiques)
- À droite : bouton primary `+ Nouveau client` (fond accent, texte blanc)

### 6.2 Barre de filtres (sous le header)

Disposition horizontale, fond `surface-container-lowest`, bordure `outline-variant`, padding `px-4 py-3`, radius 4px.

| Élément | Style |
|---|---|
| Champ recherche | Input avec icône `search`, placeholder "Rechercher par nom, mail, téléphone, RCCM…", largeur 320px, fond `surface-container-low`, focus ring `accent` |
| Filtre type | Pills `Tous · Sociétés · Particuliers` (style identique au filtre période du dashboard) |
| Filtre année | Pills `Toutes · 2026 · 2025 · 2024 · …` (basé sur année de création) |
| Filtre ville | Dropdown sépia avec liste villes du Niger (Niamey, Maradi, Zinder, Tahoua, Agadez…) |
| Filtre état | Pills `Tous · À jour · Impayés · Sans dossier actif` |
| Toggle vue | Boutons `Tableau / Galerie` à droite, icônes `view_list` / `grid_view` Material |

### 6.3 Tableau

Colonnes (gauche → droite, **toutes triables** ▲▼ visible quand actif, sticky `<thead>` pendant scroll vertical) :

| # | Colonne | Largeur | Contenu | Style cellule |
|---|---|---|---|---|
| 1 | **N°** | 100px | `CLI-26-001` | mono Space Grotesk, `text-xs`, `on-surface-variant` |
| 2 | **Type** | 60px | Avatar 32px rond avec icône `business` (PM) ou `person` (PP), fond sépia ou doré teinté | — |
| 3 | **Nom / Raison sociale** | 240px | Nom principal en `font-medium`, sous-ligne meta : profession (PP) ou forme juridique (PM) en `text-xs on-surface-variant` | truncate |
| 4 | **Email** | 220px | Mail cliquable (`mailto:`), icône `mail` 14px à gauche en `outline` | truncate, hover `accent` |
| 5 | **Téléphone** | 160px | Format `+227 XX XX XX XX` cliquable (`tel:`), icône `phone` 14px à gauche | mono, hover `accent` |
| 6 | **Ville** | 140px | "Niamey", icône `location_on` 14px à gauche en `outline` | truncate |
| 7 | **Dossiers** | 90px | Pastille count : badge sépia clair `surface-container` avec nombre, ou `—` si zéro | center |
| 8 | **État facturation** | 130px | Chip bordé : vert `À jour`, rouge `Impayé`, ou neutre `—` | — |
| 9 | **Action** (sticky right) | 100px | Bouton outline sépia "Ouvrir →" | — |

**Styles communs** :
- En-têtes en `label-caps` (uppercase 11px) couleur `on-surface-variant`, fond `surface-container-lowest`, bordure basse `outline-variant`, sticky `top-0 z-10`
- Lignes hauteur **48px**, fond alterné optionnel (subtil : `surface-container/30` une ligne sur deux), hover `surface-container-low`
- Bordure inter-ligne `outline-variant/50` (très fin)
- 10 lignes visibles par défaut, scroll vertical avec scrollbar `.scrollbar-thin` sépia, sticky thead
- Dernière colonne (Action) sticky à droite avec ombre subtile `shadow-[-6px_0_12px_-6px_rgba(31,26,20,0.06)]`
- Pagination ou "Charger plus" en bas si > 50 entrées

---

## 7. Vue 2 — GALERIE (visuelle, browse mode)

**Quand l'utiliser** : exploration visuelle, présentation à un tiers, parcours de découverte. Pas la vue par défaut.

### 7.1 Grille

- **3 colonnes** sur écrans `lg` (≥ 1024px)
- **2 colonnes** sur tablet (768-1023px)
- **1 colonne** sur mobile
- Gap : `gap-gutter` (16px)
- Padding du canvas : `p-container-margin` (24px)
- Scroll vertical du canvas avec `.scrollbar-thin`

### 7.2 Anatomie d'une carte client

Dimensions ≈ **320×220px** (responsive).

```
┌─────────────────────────────────────────────┐
│  [Avatar 56×56]                  [Type chip] │
│   fond sépia/doré                            │
│                                              │
│   Nom / Raison sociale                       │  ← serif Newsreader 18px
│   Forme juridique · CLI-26-001               │  ← body-sm muted
│                                              │
│   ─────────────── outline-variant ─────      │
│                                              │
│   [📧] contact@sonitel.ne                    │  ← mail cliquable
│   [📞] +227 20 73 45 67                      │  ← tel cliquable
│   [📍] Niamey, Niger                         │
│                                              │
│   ┌─ 5 dossiers ─┐  ┌─ À jour ─┐             │  ← chips sépia + statut
└─────────────────────────────────────────────┘
```

**Détails** :
- Fond `surface-container-lowest`, bordure `outline-variant`, radius 4px
- Hover : très léger fond `surface-container-low`, **pas** d'élévation/scale
- Avatar : 56×56 rond, fond `primary-container` (sépia foncé) pour PM ou `accent-soft` (doré pâle) pour PP, icône Material `business` ou `person` blanche centrée 28px
- Type chip en haut à droite : "Société" (fond `surface-container`, texte `primary-container`) ou "Particulier" (bordé `accent`, texte `accent`)
- Nom en serif Newsreader 18px font-semibold
- Méta sous-ligne en `body-sm` `on-surface-variant`
- Coordonnées en lignes compactes avec icône Material 14px à gauche, alignement vertical, gap-2
- Mail et téléphone sont **cliquables** (`mailto:`/`tel:`)
- En bas : 2 chips d'état alignés horizontalement (compteur dossiers + état facturation)
- Carte entièrement cliquable → ouvre la fiche détail

---

## 8. Filtres et recherche — comportements

| Action | Effet |
|---|---|
| Saisie dans la recherche | Filtre live (debounced 250ms) sur nom, raison sociale, email, téléphone, RCCM, ville |
| Clic sur pill `Sociétés` | Filtre type, met à jour le compteur du header en temps réel |
| Clic sur pill année `2025` | Filtre par année de `createdAt` du client |
| Clic sur pill `Impayés` | Filtre les clients ayant au moins une facture impayée |
| Combinaison de filtres | Tous additifs (ET logique) ; un état "Aucun résultat" propose un bouton "Réinitialiser les filtres" |
| Toggle vue Table ↔ Galerie | Conserve les filtres actifs |

L'URL doit refléter les filtres (`/clients?type=PM&annee=2026&etat=impaye`) pour partage et reload.

---

## 9. Fiche détail client `/clients/[id]`

Page avec scroll interne, max-width 1100px centré.

### 9.1 Header de la fiche

- **Bouton retour** "← Tous les clients" (lien sépia)
- Bloc principal :
  - Avatar 72×72 (même style que galerie)
  - Bloc texte :
    - Nom / Raison sociale en H1 serif Newsreader
    - Sous-ligne : type (Société/Particulier) + identifiant `CLI-26-001` (mono) + date d'entrée "Client depuis mai 2026"
- À droite : actions
  - Bouton outline `Modifier` (icône `edit`)
  - Bouton outline danger `Supprimer` (icône `delete`, ouvre confirm dialog)
  - Bouton primary `+ Nouveau dossier` (lance le formulaire dossier pré-rempli avec ce client)

### 9.2 Section "Coordonnées" — **mise en évidence**

C'est la section la plus consultée. Elle doit être **lisible en 2 secondes**.

Layout horizontal sur 3 colonnes (desktop), 1 colonne (mobile). Chaque colonne = un bloc avec icône + label + valeur cliquable.

```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│  📧 EMAIL           │  📞 TÉLÉPHONE       │  📍 ADRESSE         │
│  contact@sonitel.ne │  +227 20 73 45 67   │  Quartier Plateau   │
│  [Copier] [Écrire]  │  [Copier] [Appeler] │  Niamey, Niger      │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

- Fond `surface-container-lowest`, bordure `outline-variant`, radius 4px, padding `p-density-medium`
- Label en `label-caps` couleur `on-surface-variant`
- Valeur en `body-md` couleur `on-background`, font-medium
- Boutons d'action sous la valeur : icône Material 16px + label, ghost link sépia, hover `accent`
- Mail et téléphone : cliquer la valeur ouvre `mailto:` / `tel:`
- Bouton "Copier" : copie dans le presse-papier + toast confirmation

### 9.3 Section "Identité juridique"

Bloc en 2 colonnes (desktop), avec titre H2 serif "Identité juridique".

**Si Personne morale** :
- Forme juridique (SARL, SA, SAS, SAU, SNC…)
- Numéro RCCM
- Siège social (multi-ligne)
- Représentant légal

**Si Personne physique** :
- Profession
- Pièce d'identité (CNI / Passeport / autre)
- Date de naissance (champ optionnel à ajouter au schema si demandé)

Chaque champ : label `label-caps` + valeur `body-md`. Champs vides affichent `—` discret.

### 9.4 Section "Contacts secondaires"

Sous-tableau (table compacte) avec en-tête sépia clair :

| Nom | Fonction | Email | Téléphone | Action |
|---|---|---|---|---|
| Aïssata Maïga | Directrice juridique | a.maiga@sonitel.ne | +227 96 12 34 56 | ✏️ |

- Bouton `+ Ajouter un contact` au-dessus du tableau, ghost sépia
- Empty state : "Aucun contact secondaire enregistré" + CTA central
- Ouvrir une ligne → modale d'édition contact

### 9.5 Section "Dossiers liés"

Liste compacte (style des dossiers actifs du dashboard) :
- Badge type (CIVIL/COMMERCIAL/PENAL/ADMINISTRATIF) avec teinte douce
- Numéro dossier mono + intitulé
- Statut (En cours / Terminé / En attente)
- Lien cliquable vers `/dossiers/[id]`
- Header avec compteur "5 dossiers" + lien "Tous les dossiers de ce client →"

### 9.6 Section "Activité récente"

Timeline verticale identique à celle du dashboard, scope "ce client" :
- Création/modification du client
- Création de dossier lié
- Audience programmée
- Facture émise / paiement reçu
- Contact ajouté / modifié

5 derniers événements + lien "Tout voir →" si plus.

---

## 10. Formulaires (création / édition client + contact)

### 10.1 Modale "Nouveau client" / "Modifier client"

- Modale centrée, max-width 640px, fond `surface-container-lowest`, bordure `outline-variant`
- Header sépia clair `surface-container` avec H2 serif "Nouveau client" / "Modifier le client"
- Première section : **toggle Type** (radio cards 2 colonnes : "Société" et "Particulier" — gros choix visuel, pas un radio classique)
- Sections suivantes adaptées au type choisi :
  - **PM** : Raison sociale (oblig) · Forme juridique (dropdown contrôlé) · RCCM (oblig) · Siège social · Représentant légal
  - **PP** : Nom (oblig) · Prénom (oblig) · Profession · Pièce d'identité (type + numéro)
- Section commune : **Email · Téléphone · Adresse · Ville · Pays (default Niger)**
- Section Notes (textarea libre)
- Footer : `Annuler` (ghost) + `Enregistrer` (primary accent)
- Validation : email format, téléphone format `+227 XX XX XX XX` (helper visuel), RCCM obligatoire pour PM
- Erreurs en rouge `error` sous le champ + bordure rouge

### 10.2 Modale "Ajouter un contact" / "Modifier contact"

- Plus petite (max-width 480px)
- Champs : Nom (oblig) · Prénom · Fonction (dropdown : DG, Resp. juridique, Contact admin, Autre) · Email · Téléphone
- Footer : Annuler / Enregistrer

---

## 11. États à designer (chaque vue)

| État | Description |
|---|---|
| **Loading** | Skeleton sépia (rectangles `surface-container-high` animation pulse) — pas de spinner unique |
| **Empty (aucun client)** | Icône `group_off` 48px outline-variant + titre "Aucun client enregistré" + CTA "+ Créer le premier client" |
| **Empty (filtres restrictifs)** | Icône `search_off` + "Aucun client ne correspond à ces filtres" + bouton "Réinitialiser les filtres" |
| **Error** | Bandeau rouge subtil en haut + bouton "Réessayer", contenu reste si possible |
| **Hover ligne table** | Fond `surface-container-low`, bouton "Ouvrir" prend la couleur `accent` |
| **Hover carte galerie** | Fond `surface-container-low`, **pas** d'élévation |
| **Action en cours** (suppression…) | Bouton disabled + spinner inline |

---

## 12. Composants design system (en plus de ceux du dashboard)

À designer en supplément :

1. **Avatar client** : rond 32 / 56 / 72px, 2 variantes (PM sépia foncé / PP doré pâle), avec icône Material centrée
2. **Type chip** : "Société" / "Particulier" — 2 variantes
3. **Coordonnée block** : icône + label-caps + valeur cliquable + actions inline
4. **Filter pill group** : déjà dans le dashboard, à étendre pour multi-groupes (type + année + état)
5. **Confirm dialog** : pour suppression client (titre rouge danger + texte explicatif + boutons Annuler/Confirmer)
6. **Toast notification** : pour confirmer copie presse-papier, sauvegarde, suppression
7. **Field with validation** : input/select avec label, helper, état error

---

## 13. Notes pour le designer

- **Pas de Flash CR** dans cette app, ni dans aucune maquette future. Confirmé.
- L'app est en **français** intégralement (libellés, dates, formats nombres `1 234,56`).
- **Mail et téléphone sont les champs les plus importants** sur la fiche détail. Le designer doit les rendre instantanément lisibles et actionnables (clic = mailto/tel, copier en 1 geste).
- L'identifiant `CLI-26-NNN` (auto-numérotation type Excel) doit toujours être visible dans la table et la fiche, en mono Space Grotesk discret.
- Les **villes du Niger** à proposer dans le dropdown : Niamey, Maradi, Zinder, Tahoua, Agadez, Diffa, Dosso, Tillabéri (les 8 régions principales).
- Données de remplissage des maquettes : utiliser les noms réalistes Niger (SONITEL, Banque Islamique du Niger, SONICHAR, Niger Lait SARL, Amadou Issoufou, Aïssata Maïga, Ibrahim Mahamane, Fati Oumarou, Halimatou Boubacar) et les téléphones format `+227 XX XX XX XX`.
- Actuellement la DB est en pause (frontend pur), le designer ne livre **pas** de spec backend ni de modèle de données.

---

## 14. Critères d'acceptation

La maquette est validée si :

- [ ] La palette sépia/doré/crème est appliquée partout (zéro résidu de bleu/emeraude/violet)
- [ ] Les deux vues (Table & Galerie) partagent le même header, les mêmes filtres, et basculent via un toggle propre
- [ ] Email et téléphone sont visibles dans la table **ET** mis en évidence dans la fiche détail (bloc dédié, cliquables, copiables)
- [ ] L'identifiant client `CLI-26-NNN` est partout (table, galerie card, fiche header)
- [ ] Les filtres sont en pills, pas en dropdowns (sauf ville et forme juridique qui sont des listes longues)
- [ ] Toutes les colonnes de table affichent l'indicateur de tri ▲▼
- [ ] Sticky : `<thead>` en haut, colonne Action à droite
- [ ] Vue Galerie : 3 cards par ligne sur desktop, pas de glassmorphism, pas d'élévation au hover
- [ ] Fiche détail : sections distinctes, pas de cards-dans-cards, hiérarchie claire
- [ ] Tous les états (loading, empty, error, hover) sont conçus pour chaque vue
- [ ] La typographie est Newsreader + Manrope + Space Grotesk (pas de polices système)
- [ ] Test "IA-fait" : l'interface ne sent pas le template. Sobre, dense, professionnelle, légitime pour un cabinet juridique haut de gamme.

---

## 15. Données mock à utiliser dans les maquettes

Le designer peuple ses maquettes avec un mix réaliste Niger (15-20 entrées) :

**Sociétés (PM)** :
- SONITEL (Société Nigérienne des Télécommunications) — SARL, RCCM RCCM-NI-NIA-2018-B-1234, Niamey
- Banque Islamique du Niger (BIN) — SA, Niamey
- SONICHAR (Société Nigérienne du Charbon) — SA, Niamey
- Niger Lait SARL — SARL, Niamey
- Niger Telecom — SAU, Niamey
- AREVA Niger — SAS, Agadez
- Air Niger — SA, Niamey

**Particuliers (PP)** :
- Amadou Issoufou — Avocat, Niamey
- Aïssata Maïga — Médecin, Niamey
- Ibrahim Mahamane — Entrepreneur, Maradi
- Fati Oumarou — Enseignante, Tahoua
- Halimatou Boubacar — Architecte, Niamey
- Moussa Hamidou — Fonctionnaire, Zinder

**Patterns à représenter dans les états** :
- Au moins 1 client avec 0 dossier
- Au moins 2 clients en état "Impayé"
- Au moins 1 client sans email (champ vide → `—`)
- Au moins 1 client avec 3+ contacts secondaires (pour tester le sub-tableau)

---

*Brief rédigé le 2026-05-02 sur la base de l'audit du module Clients existant et du contexte métier extrait du template Excel KadriLex (template Python). À lire en complément de **BRIEF_DESIGN_DASHBOARD.md** pour la DA partagée.*
