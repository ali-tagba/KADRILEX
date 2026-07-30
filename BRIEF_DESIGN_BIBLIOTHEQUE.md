# BRIEF DESIGN — Module Bibliothèque

**Cabinet** : SCPA Kadri Legal (Niamey, Niger)
**Module** : Bibliothèque documentaire juridique
**Statut actuel** : MVP fonctionnel mais hors DA, design générique non-orienté métier
**Objectif du brief** : refonte complète, alignement DA + valeur métier cabinet

---

## 1. Contexte & vision

La Bibliothèque n'est **pas un drive de stockage**. C'est un **outil de travail quotidien** pour un avocat qui doit :

- **Argumenter** un dossier en cours → retrouver une jurisprudence applicable en < 30s
- **Rédiger** un acte → partir d'un modèle existant (assignation, conclusions, requête, contrat-type)
- **Capitaliser** sur les affaires passées → réutiliser une plaidoirie, une note, une recherche déjà faite
- **Veiller** sur la doctrine → suivre les évolutions de l'OHADA, du droit nigérien
- **Former** les juniors → consulter les décisions marquantes du cabinet

**Spécificité Niger** : le module doit nativement gérer le contexte juridique local — droit OHADA (CCJA), droit coutumier, codes nigériens, juridictions régionales.

---

## 2. Audit de l'existant — à conserver / à supprimer / à refaire

### ✅ À conserver (concept)

- Modèle de données Prisma (déjà OK : `Document` avec `categorie`, `type`, `juridiction`, `reference`, `auteur`, `source`, `tags`)
- Routes API CRUD (`/api/documents` GET/POST/PUT/DELETE + `/api/documents/stats`)
- Soft delete via `statut: ACTIF | ARCHIVE`

### ❌ À supprimer (inutile / contre-productif)

- **Stats cards arc-en-ciel en haut de page** (bleu/violet/vert/orange avec gradients) — bling-bling sans valeur métier, prend 25% de l'écran pour afficher 4 chiffres. Remplacer par une simple ligne de compteurs textuels comme dans les autres modules (cf. Clients, Dossiers).
- **lucide-react** (`Plus`, `Search`, `Filter`, `FileText`, `Scale`, `BookOpen`, `FileCheck`, `Folder`) → utiliser `material-symbols-outlined` comme partout ailleurs dans l'app.
- **Composants `Button` / `Input` / `Label` / `Badge` custom** → utiliser les patterns Tailwind directement (cf. clients/dossiers).
- **Couleurs bleu/violet/vert/orange** → tout doit être dans la DA sépia/doré/crème (`primary`, `tertiary`, `accent`, `surface-container-*`).
- **Toggle inline `Filtres`** qui déploie un panel à 2 selects → remplacer par drawer latéral (pattern Clients/Dossiers).
- **Catégorie `AUTRE`** dans le formulaire — si on choisit "Autre", on ne classe pas. Forcer une catégorie utile.
- **Champ `notes` séparé de `description`** dans le form — confus, fusionner ou clarifier.

### ⚠️ À refaire intégralement

- **Toolbar** : adopter le pattern Clients (`search large + bouton Filtres avec badge + toggle vues`)
- **Filtres** : drawer latéral droit avec multi-select, calqué sur `client-filter-drawer.tsx`
- **Vue principale** : 3 vues commutables (Table dense, Galerie cards, Veille chronologique)
- **Form dialog** : DA conforme + nouveaux champs métier (domaine juridique, articles cités, décision favorable, niveau de juridiction)

---

## 3. Personas & cas d'usage prioritaires

### P1 — Me Oumarou prépare une plaidoirie commerciale (use case n°1)

**Contexte** : audience demain au Tribunal de Commerce, dossier SONITEL c/ État.
**Besoin** : trouver 2-3 décisions CCJA récentes sur la rupture abusive de contrat administratif.
**Workflow attendu** :
1. Ouvre la bibliothèque
2. Filtre : Catégorie = Jurisprudence · Domaine = OHADA · Juridiction = CCJA · Mot-clé "rupture contrat"
3. Trie par pertinence/date
4. Clique sur une décision → preview PDF s'ouvre dans un panel droit
5. Clic "Joindre à dossier" → choisit DOS-2026-041 → la jurisprudence apparaît dans les pièces du dossier
6. Marque la décision en ★ favori pour réutilisation

### P2 — Me Mariama crée un nouveau contrat (use case n°2)

**Contexte** : nouveau client, besoin d'un contrat de bail commercial.
**Workflow attendu** :
1. Ouvre la bibliothèque · onglet **Modèles**
2. Filtre : Type = Contrat · Domaine = Commercial · Tag "bail"
3. Trouve "Contrat-type bail commercial v3"
4. Clic "Dupliquer pour nouveau dossier" → ouvre le form de création de dossier avec le modèle pré-attaché

### P3 — Me Ali fait une veille doctrinale (use case n°3)

**Contexte** : suit la réforme OHADA des sociétés.
**Workflow attendu** :
1. Bibliothèque · onglet **Veille** (chronologique récents)
2. Filtre : Catégorie = Doctrine · Tag "OHADA" · Date ≥ 6 derniers mois
3. Liste antéchronologique des derniers articles ajoutés

### P4 — Junior cherche un précédent (use case n°4)

**Contexte** : nouveau collaborateur, doit comprendre une affaire similaire passée.
**Besoin** : retrouver "ce qu'on avait fait l'année dernière sur un dossier de divorce contentieux".
**Workflow attendu** :
1. Bibliothèque · recherche libre "divorce contentieux"
2. Filtre : Catégorie = Document Interne (mémoires, conclusions internes)
3. Trouve les pièces archivées du dossier Maïga 2024 → consulte → s'inspire

---

## 4. Architecture cible

### 4.1 Modèle de données — extensions à apporter

Ajouter au modèle Prisma `Document` :

```prisma
domaineJuridique String?  // "CIVIL" | "COMMERCIAL" | "PENAL" | "OHADA" | "TRAVAIL"
                          // | "ADMINISTRATIF" | "FONCIER" | "FISCAL" | "COUTUMIER"
                          // | "CONSTITUTIONNEL" | "INTL" | "AUTRE"

niveauJuridiction String? // "INSTANCE" | "GRANDE_INSTANCE" | "APPEL" | "ETAT"
                          // | "SUPREME" | "CCJA" | "ARBITRAL" | "AUTRE"
                          // (uniquement pour catégorie JURISPRUDENCE/DECISION_JUSTICE)

issue            String?  // "FAVORABLE" | "DEFAVORABLE" | "MIXTE" | "NA"
                          // (jurisprudence : la décision a-t-elle été favorable au demandeur ?)

articlesCites    String?  // CSV libre des articles cités (ex: "Art. 1382 C.civ, Art. 90 AUDCG")

estFavori        Boolean  @default(false)  // Marqué ★ par un utilisateur
nbConsultations  Int      @default(0)      // Compteur usage (pour tri "popularité")
derniereConsultation DateTime?

dossierIdsLies   String?  // CSV des dossier.id auxquels ce doc est attaché
```

**Tags** : passer d'un `String` virgule-séparée à un système structuré côté front (chips avec autocomplete), même si stocké en CSV en backend. Auto-suggérer les tags existants.

### 4.2 Header de page — sobre, aligné DA

Comme Clients / Dossiers :

```
PRODUCTIVITÉ                                                 [+ Nouveau document]
Bibliothèque
12 jurisprudences  ·  4 doctrines  ·  8 modèles  ·  3 documents internes  ·  ★ 5 favoris
```

- Pas de cards à gradient
- Pas de compteurs en grosse typographie
- Juste une ligne de chips comptant chaque catégorie en `text-on-surface-variant`

### 4.3 Toolbar — calque Clients

```
[🔍 Rechercher (titre, référence, tags, juridiction…)]   ✕ │ ⚙ Filtres 3 │ [📋 | ⊞ | 🕐]
                                                                              ↑     ↑   ↑
                                                                            Table Galerie Veille
```

3 vues commutables :
- **Table** : dense, info-rich, par défaut → lignes triables/clickables
- **Galerie** : cards 3 colonnes avec preview thumbnail PDF + métadonnées résumées
- **Veille** : timeline antéchronologique groupée par mois (cf. agenda de Audiences)

### 4.4 Drawer Filtres — drawer latéral droit (pattern Clients)

Sections empilées :

1. **Catégorie** (multi-checkbox) : Jurisprudence · Décision · Doctrine · Modèle · Doc. Interne
2. **Domaine juridique** (multi-checkbox) : Civil · Commercial · Pénal · OHADA · Travail · Administratif · Foncier · Fiscal · Coutumier · Constitutionnel · International
3. **Type de document** (multi-checkbox) : Arrêt · Jugement · Ordonnance · Article · Mémoire · Contrat · Procédure · Note
4. **Juridiction** (multi-checkbox) : peuplé depuis `JURIDICTIONS_NIGER` (lib/constants/legal.ts) — TGI Niamey · CCJA · Cour d'État · etc.
5. **Niveau** (multi-checkbox) : Instance · Grande Instance · Appel · État · Suprême · CCJA · Arbitral
6. **Issue** (radio, jurisprudence uniquement) : Toutes · Favorable · Défavorable · Mixte
7. **Date du document** (radio + sub-options) : Toutes · Cette année · Année précise · Période personnalisée (Du / Au)
8. **Auteur** (multi-checkbox) : peuplé depuis les valeurs distinctes en base
9. **Tags** (chip multi-select avec autocomplete) : tags les plus utilisés en suggestion
10. **Visibilité** : afficher les archivés (toggle) · Mes favoris uniquement (toggle)

Footer drawer : "Réinitialiser" · "Voir les résultats"

### 4.5 Vue Table — dense pro

Colonnes (cf. `client-table.tsx` pour le style) :

| Col | Contenu | Largeur |
|---|---|---|
| ★ | Toggle favori | 32px |
| Titre + référence | Titre 1 ligne + ref + filename | 40% |
| Catégorie | Chip coloré DA (sépia pour Jurisp., gold pour Doctrine, etc.) | auto |
| Domaine | Chip texte | auto |
| Juridiction | Texte tronqué + niveau en sous-titre | auto |
| Date doc. | `15 janv. 2024` | 120px |
| Tags | 2 chips + `+N` | auto |
| Statut | Issue (✓ favorable / ✕ défavorable / =) si jurisp. | 80px |
| Actions | 3-dot menu sticky right | 48px |

Row hover → bg `surface-container-low/40`. Click row → ouvre **side panel détail** (pas modal — l'user veut garder le contexte de la liste).

### 4.6 Vue Galerie — cards visuels

Grid responsive `1 / 2 / 3 / 4` colonnes. Card structure :

```
┌──────────────────────────────────┐
│ [PDF thumbnail 16:9]             │  ← preview première page si PDF
│                                  │
├──────────────────────────────────┤
│ [JURISPRUDENCE] [OHADA]    ★ ⋮  │  ← chip catégorie + domaine + favori + 3-dot
│                                  │
│ Arrêt CCJA n°042/2024            │  ← titre 2 lignes
│ rupture contrat fournitures      │
│                                  │
│ ⚖ CCJA · 15 janv. 2024           │  ← juridiction + date
│ #ohada #commercial #rupture      │  ← tags inline
│                                  │
│ ✓ Décision favorable             │  ← issue (si jurisp.)
└──────────────────────────────────┘
```

Click card → ouvre side panel détail.

### 4.7 Vue Veille — timeline chronologique

Groupé par mois, antéchronologique. Pour chaque doc :
- Date · catégorie chip · titre · auteur
- Description tronquée 2 lignes
- Tags

Sticky headers de mois. Idéal pour scanner rapidement les ajouts récents.

### 4.8 Side panel détail (slide-in droite, 480px)

S'ouvre au clic sur une row/card. Conserve la liste visible à gauche.

```
┌─────────────────────────────────┐
│ ← Retour                    ⋮  │  ← header (back arrow + actions)
├─────────────────────────────────┤
│ [PREVIEW PDF iframe / image]    │  ← preview 50% hauteur
│                                 │
├─────────────────────────────────┤
│ Arrêt CCJA n°042/2024           │  ← titre H2
│ ★ Favori                        │
│                                 │
│ [JURISP.] [OHADA] [✓ Favorable] │  ← chips
│                                 │
│ Métadonnées                     │
│ Juridiction : CCJA              │
│ Niveau : Cour communautaire     │
│ Date : 15 janv. 2024            │
│ Référence : Arrêt n°042/2024    │
│ Auteur : —                      │
│ Source : Recueil CCJA T.32      │
│                                 │
│ Description                     │
│ La CCJA réaffirme le principe…  │
│                                 │
│ Articles cités                  │
│ Art. 90 AUDCG · Art. 134 AUS    │
│                                 │
│ Tags                            │
│ #ohada #commercial #rupture     │
│                                 │
│ Dossiers liés (3)               │
│ • DOS-2026-041 SONITEL          │
│ • DOS-2025-098 Renégoc.         │
│                                 │
│ Statistiques                    │
│ Consulté 24 fois ·              │
│ Dernière consult. : il y a 2j   │
└─────────────────────────────────┘
│ [Joindre à dossier] [Télécharger]│  ← footer actions
└─────────────────────────────────┘
```

### 4.9 Modèles — onglet ou vue dédiée

Dans la galerie, un toggle **"Modèles uniquement"** ou un onglet dédié dans la nav du module.
Action card supplémentaire : **"Dupliquer dans un dossier"** → ouvre un picker de dossier (existant ou nouveau) → le modèle est copié et attaché.

### 4.10 Liaison documents ↔ dossiers/audiences

**Depuis la bibliothèque** : action "Joindre à dossier" sur la fiche détail → picker dossier (search + select) → ajoute l'id à `dossierIdsLies`.

**Depuis un dossier** : nouvelle section "Bibliothèque" dans la fiche dossier → liste des docs liés + bouton "Citer une jurisprudence" qui ouvre la bibliothèque en modale picker.

**Depuis une audience** : équivalent "Documents de référence" dans la fiche audience.

---

## 5. Composants UI à produire

À créer dans `components/bibliotheque/` (remplace l'existant) :

| Fichier | Rôle |
|---|---|
| `filters-state.ts` | State + INITIAL_FILTERS + countActiveFilters + applyFilters (calque clients) |
| `bibliotheque-toolbar.tsx` | Search + bouton Filtres + toggle 3 vues |
| `bibliotheque-filter-drawer.tsx` | Drawer latéral droit (calque client-filter-drawer) |
| `bibliotheque-table-view.tsx` | Vue table dense |
| `bibliotheque-gallery-view.tsx` | Vue galerie cards |
| `bibliotheque-veille-view.tsx` | Vue timeline chronologique |
| `document-detail-panel.tsx` | Side panel détail slide-in droite |
| `document-form-dialog.tsx` | Form CRUD (refonte DA) |
| `document-attach-picker.tsx` | Picker pour "Joindre à dossier" |
| `tag-input.tsx` | Input tags avec autocomplete |
| `pdf-thumbnail.tsx` | Composant preview PDF (page 1) |

---

## 6. Layout & DA — règles strictes

- **Couleurs** : exclusivement les tokens `@theme` de `app/globals.css` (`primary`, `tertiary`, `accent`, `surface-container-*`, `outline-*`). Aucun hex direct sauf cas exceptionnels documentés.
- **Catégories visuelles** :
  - Jurisprudence → `bg-primary-fixed text-primary` (sépia)
  - Décision de Justice → `bg-tertiary-fixed-dim text-on-tertiary-fixed-variant` (warm)
  - Doctrine → `bg-[#e8f5e9] text-[#166534]` (vert juridique)
  - Modèle → `bg-accent/10 text-primary` (doré)
  - Document Interne → `bg-surface-container-high text-on-surface-variant`
- **Domaines juridiques** : palette neutre + icône Material (gavel, business, balance, etc.)
- **Issue jurisprudence** : ✓ favorable (vert), ✕ défavorable (error), = mixte (outline)
- **Typographie** : Newsreader pour titres documents, Manrope pour body, Space Grotesk pour références/dates/n° d'arrêts
- **Icônes** : Material Symbols Outlined exclusivement
- **Layout page** : `flex flex-col h-full overflow-hidden p-container-margin gap-density-medium` (cf. taches/page.tsx)
- **Hiérarchie header** : `font-label-caps` (kicker) + `font-h1` (titre) + ligne de compteurs textuels
- **Drawer** : `max-w-[420px]`, slide-in 300ms ease-out, backdrop semi-opaque, ESC + outside-click + body scroll-lock
- **Side panel détail** : `max-w-[520px]`, même mécanique que le drawer mais persiste au clic sur autres rows (highlight la row active)

---

## 7. Roadmap d'implémentation (séquence proposée)

### Sprint 1 — Fondations
1. Étendre le modèle Prisma (`domaineJuridique`, `niveauJuridiction`, `issue`, `articlesCites`, `estFavori`, `nbConsultations`, `dossierIdsLies`)
2. Migration + seed avec données réalistes Niger (5-10 décisions CCJA, 3 jurisprudences TGI, 2 doctrines OHADA, 5 modèles cabinet)
3. Refonte des constantes (`lib/constants/biblio.ts`) : DOMAINES_JURIDIQUES, NIVEAUX_JURIDICTION, ISSUES_JURIS

### Sprint 2 — Toolbar + Drawer + Vue Table
4. `filters-state.ts` (state + applyFilters)
5. `bibliotheque-toolbar.tsx` (calque clients)
6. `bibliotheque-filter-drawer.tsx` (calque clients)
7. `bibliotheque-table-view.tsx` (dense, sticky thead)
8. Refonte `app/bibliotheque/page.tsx` (header sobre + toolbar + table)

### Sprint 3 — Galerie + Veille + Détail
9. `bibliotheque-gallery-view.tsx` (cards)
10. `bibliotheque-veille-view.tsx` (timeline)
11. `document-detail-panel.tsx` (side panel)
12. `pdf-thumbnail.tsx`

### Sprint 4 — Form + Tags + Liaisons
13. Refonte `document-form-dialog.tsx` (DA + nouveaux champs)
14. `tag-input.tsx` avec autocomplete
15. `document-attach-picker.tsx` + intégration dans fiche dossier
16. Compteur consultations + favoris

### Sprint 5 — Modèles & polish
17. Onglet/section Modèles avec action "Dupliquer dans dossier"
18. Recherche full-text côté API (LIKE sur titre + description + tags)
19. Tri par pertinence (poids favori + nbConsultations + récence)

---

## 8. Hors scope (à NE PAS faire)

- ❌ **Upload réel de fichiers** (storage S3/Vercel Blob) — pour plus tard, prévoir le hook mais ne pas implémenter
- ❌ **OCR de PDF** — phase ultérieure
- ❌ **Versioning des documents** — pas pour ce sprint
- ❌ **Annotations/surlignage PDF** — Phase 3
- ❌ **Partage public de documents** — pas demandé
- ❌ **Conversion automatique de format** (Word → PDF) — non
- ❌ **IA pour résumer une jurisprudence** — pas avant que la base soit propre
- ❌ **Stats avancées (graphiques)** — pas de dashboard analytics dans la bibliothèque
- ❌ **Notifications "nouveau document"** — viendra avec le module de notifications global

---

## 9. Critères de validation

Le module est livré quand :

1. ✅ Aucune trace de bleu/violet/vert/orange générique — 100% DA Kadri Legal
2. ✅ Toolbar identique en pattern à Clients/Dossiers
3. ✅ Drawer filtres avec ≥ 8 critères dont multi-select catégorie/domaine/juridiction/auteur/tags
4. ✅ 3 vues fonctionnelles (Table, Galerie, Veille)
5. ✅ Side panel détail avec preview PDF + actions Joindre/Télécharger
6. ✅ Système de favoris ★ + tri par pertinence
7. ✅ Liaison bidirectionnelle document ↔ dossier visible dans les 2 modules
8. ✅ Onglet Modèles avec action "Dupliquer dans dossier"
9. ✅ Recherche full-text fonctionnelle
10. ✅ Aucune card à gradient bling-bling — header sobre conforme aux autres modules
11. ✅ Mobile responsive (toolbar wrap, drawer plein écran sur mobile)
12. ✅ `npx tsc --noEmit` → EXIT=0

---

## 10. Inspirations / références

- **Westlaw / Lexis Nexis** pour la densité d'info et les filtres juridiques
- **Notion** pour la galerie de templates
- **Linear** pour le side panel détail qui ne casse pas la liste
- **Trello** pour la fluidité d'attachement à un autre objet (dossier)

L'app KadriLex actuelle (modules Clients/Dossiers/Audiences/Tâches) **EST** la référence DA. Tout doit visuellement appartenir à la même app.
