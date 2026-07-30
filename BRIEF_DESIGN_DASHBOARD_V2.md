# BRIEF DESIGN — Tableau de bord global V2

**Cabinet** : SCPA Kadri Legal (Niamey, Niger)
**Module** : Tableau de bord global — page d'accueil de l'application (`/`)
**Statut actuel (2026-05-05)** : V1 livrée avec MetricStrip 4 cellules + 3 sections (Audiences à venir, Factures impayées, Activité récente). **Décision produit critique : retirer toute information financière** du dashboard global.
**Objectif du brief** : refonte V2 du dashboard pour qu'il soit **consultable en présence de tiers** (autorités fiscales, visiteurs, stagiaires) sans exposer les flux financiers du cabinet — tout en restant un outil de pilotage opérationnel quotidien pour le gérant.

> 📌 Les chiffres financiers continuent d'exister, **uniquement à l'intérieur du module Finance**, gated par la permission `finance.view`. Cette permission n'est accordée qu'aux Associés (gérant + co-associés). Tout le reste de l'équipe — y compris quand le gérant montre l'écran à un tiers — voit le tableau de bord *sans* chiffres d'argent.

---

## 1. Contexte & vision

> **Citation client** : « Au niveau des tableaux de bord, on ne doit pas voir les informations à recouvrir et encaisser parce que ça peut porter préjudice lorsque les autorités fiscales entrent dans l'entreprise et puis voient en même temps ça, alors qu'eux-mêmes ils essaient de camoufler certains trucs pour bien les rendre disponibles. »

Le dashboard actuel expose en haut de page un bandeau « 4,8M FCFA à recouvrer · 3,1M FCFA encaissé ce mois » — ces deux métriques sont **stratégiquement sensibles** dans le contexte d'un cabinet juridique nigérien où :

- Les **autorités fiscales** peuvent demander à voir l'écran principal lors d'une inspection
- Les **clients** peuvent jeter un œil par-dessus l'épaule pendant une réunion
- Les **stagiaires et collaborateurs** ouvrent l'app en démarrant leur journée
- La **comptabilité** parallèle (cf. terme « camoufler » du client) doit pouvoir vivre dans le module Finance protégé, sans fuir vers l'écran d'accueil

→ Le dashboard global devient un **tableau de bord opérationnel sans dimension financière**. Il répond à 5 questions d'organisation au quotidien :

1. **Qu'est-ce que je dois faire aujourd'hui ?** (audiences, tâches dues)
2. **Qu'est-ce qui s'est passé récemment ?** (activité de l'équipe, mouvements sur les dossiers)
3. **Quel est le pouls du cabinet ?** (volume d'activité, charge — pas de revenu)
4. **Où dois-je aller ?** (entrée rapide vers les modules)
5. **Qui travaille avec moi ?** (équipe en ligne, charges réparties)

---

## 2. Vocabulaire & règle d'or

| Terme | Sens | Présence dashboard |
|---|---|---|
| **Métrique opérationnelle** | Compteur de volume (audiences, dossiers, tâches, clients) | ✅ Affiché |
| **Métrique financière** | Toute somme en FCFA, taux, soldes, créances, encaissements | ❌ **Interdit** — module Finance uniquement |
| **Métrique RH** | Charge équipe, présence, ancienneté | ✅ Affiché |
| **Métrique d'engagement client** | Nombre dossiers/clients/audiences | ✅ Affiché |
| **Métrique de performance** | Tâches livrées, audiences tenues, taux de complétion | ✅ Affiché |

**Règle d'or absolue** : aucune valeur exprimée en FCFA, en pourcentage de revenu, en nombre de factures, en nombre de retards de paiement, en taux de recouvrement, etc. ne doit apparaître sur cette page.

Test simple : **un fonctionnaire des impôts qui regarderait l'écran ne doit y voir aucun indice de chiffre d'affaires.**

---

## 3. Architecture proposée

### 3.1 Structure 3 zones

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER : Bonjour Maître Kadri · mardi 5 mai 2026               │
│         [Tout actualiser]  [+ Nouveau dossier]                 │
├────────────────────────────────────────────────────────────────┤
│ PULSE BAR — 4 cellules opérationnelles                         │
│ [Audiences 3]  [Dossiers 42]  [Tâches 28]  [Équipe 6]          │
├────────────────────────────────────────────────────────────────┤
│ GRID 8 + 4                                                     │
│ ┌─────────────────────────────────┐ ┌─────────────────────────┐│
│ │ Audiences à venir (8 cols)       │ │ Activité récente (4)    ││
│ │  - Aujourd'hui 14h30 SONITEL    │ │  Plaidoirie tenue       ││
│ │  - Demain 11h00 BIN             │ │  Dossier ouvert         ││
│ │  - Vendredi …                   │ │  Bibliothèque MAJ       ││
│ └─────────────────────────────────┘ │  …                       ││
│ ┌─────────────────────────────────┐ │                          ││
│ │ Tâches en cours (8 cols)         │ │                          ││
│ │  - Auj 17h Préparer plaidoirie  │ │                          ││
│ │  - Demain Rédiger conclusions   │ │                          ││
│ │  - Retard 3j Récupérer expertise│ │                          ││
│ └─────────────────────────────────┘ └─────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Pulse Bar — 4 cellules métier (V2)

**AVANT (V1, à retirer)** :
- ❌ « 4,8M FCFA à recouvrer · 12 factures impayées »
- ❌ « 3,1M FCFA encaissé ce mois »

**APRÈS (V2)** :

| Cellule | Icône | Valeur | Sublabel | Lien |
|---|---|---|---|---|
| **Audiences** | `gavel` | 3 (aujourd'hui) | `Prochaine : 14h30 SONITEL` | `/audiences` |
| **Dossiers actifs** | `folder_open` | 42 | `↑ +3 ce mois` | `/dossiers` |
| **Tâches en cours** | `task_alt` | 28 | `5 en retard` (rouge si > 0) | `/taches` |
| **Équipe** | `groups` | 6 (membres actifs) | `18 clients actifs` | `/equipe` |

Le mot « clients » dans le sublabel d'Équipe est neutre : il indique le **volume relationnel**, pas un chiffre d'affaires.

### 3.3 Sections principales (gauche, 8 cols)

#### A. Audiences à venir (déjà OK, à conserver V1)
- 10 lignes max avec scroll
- Format : `Auj. 14h30 · SONITEL c/ État du Niger · TGI Niamey`
- Chip statut : Plaidoirie / Mise en état / Référé
- Pas de montant

#### B. Tâches en cours (NOUVEAU)
- Remplace la section « Factures impayées »
- 10 lignes max, scrollables
- Tri : retards en haut → échéance asc → priorité
- Format : `[Retard 3j] Récupérer expertise comptable · A. KADRI · Haute`
- Couleur : rouge si retard, secondaire si échéance proche, neutre sinon
- Pas de montant

### 3.4 Section latérale (droite, 4 cols)

#### C. Activité récente (déjà OK, à enrichir)
- 8-12 lignes
- Source unifiée : audiences tenues, dossiers ouverts, tâches accomplies, ajouts biblio, **mouvements équipe** (membre invité, désactivé)
- Pas de mouvement financier visible (ni paiement, ni facture)
- Format : `[14h] Audience tenue · SONITEL c/ État du Niger`

---

## 4. Filtrage RBAC sur le dashboard

Comportement selon le rôle du membre connecté (cohérent avec sprints B/D) :

| Rôle | Pulse Bar | Audiences | Tâches | Activité |
|---|---|---|---|---|
| **Associé gérant** | Tous chiffres globaux | Toutes audiences cabinet | Toutes tâches cabinet | Toute l'activité |
| **Associé** | Idem | Idem | Idem | Idem |
| **Avocat collaborateur** | Audiences à lui, dossiers actifs (siens), tâches (siennes), équipe (constant) | Ses audiences | Ses tâches | Activité de ses dossiers |
| **Juriste** | Idem (filtré) | Ses audiences | Ses tâches | Activité de ses dossiers |
| **Stagiaire** | Idem (filtré) | Ses audiences (souvent vides) | Ses tâches | Activité limitée |
| **Secrétaire** | Tout (scope ALL audiences/tâches/clients) | Toutes audiences | Toutes tâches | Toute l'activité |

Le filtrage utilise déjà `useCurrentUser().filterByVisibility(items, "audiences.view")` côté composant, identique au sprint D.

---

## 5. Spécifications visuelles

### 5.1 DA cohérente avec le reste de l'app

- Couleurs : palette sépia/doré/crème (`#502e0f` / `#7f5533` / `#c8772f` / `#83746b`)
- Typo : Newsreader (titres), Manrope (body), Space Grotesk (mono-num)
- Icônes : Material Symbols Outlined
- Densité : `density-medium` (16 px) pour les espacements internes ; `gutter` (16 px) entre cards
- Cards : `bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_1px_3px_rgba(31,26,20,0.08)]`

### 5.2 Pulse Bar — anatomie d'une cellule

```
┌───────────────────────┐
│ [icône] LABEL         │ ← font-label-caps text-label-caps text-on-surface-variant
│ 28        ↑ +3        │ ← font-mono-num text-2xl text-primary-container
│ 5 en retard           │ ← font-body-sm text-on-surface-variant
└───────────────────────┘
```

- Couleur valeur : `text-primary-container` par défaut, `text-error` si retard, `text-[#166534]` si delta positif vert
- Hover : `bg-surface-container-low` + curseur lien
- Responsive : 4 cellules en flex-row sur md+, stack en column sur mobile

### 5.3 Loading state

- Skeleton 24 px wide × 28 px high `bg-surface-container-high animate-pulse rounded` à la place des valeurs
- Sublabel : « Chargement… »
- Le bouton « Tout actualiser » garde une rotation continue de l'icône `refresh`

### 5.4 Empty states

| Section | Message empty | Icône |
|---|---|---|
| Audiences | « Aucune audience prévue dans les 30 jours » | `event_available` |
| Tâches | « Aucune tâche en cours dans votre périmètre » | `check_circle` |
| Activité | « Aucune activité récente » | `history` |

---

## 6. Maquettes attendues du dev / designer

Le dev / designer crée des wireframes pour ces 3 vues :

### 6.1 État connecté Gérant (dashboard plein)
- Pulse Bar avec les 4 valeurs réelles
- Audiences à venir : 3 lignes du jour mises en évidence
- Tâches en cours : 5 retards en haut, en rouge
- Activité récente : 8-10 entrées des 7 derniers jours

### 6.2 État connecté Avocat (dashboard filtré)
- Mêmes cellules mais valeurs réduites au périmètre
- Indicateur visuel discret « Vue filtrée selon vos affectations » en pied de page (badge informatif `text-[10px] text-outline italic`)

### 6.3 État connecté Stagiaire (dashboard minimal)
- Cellules avec valeurs proches de 0 si peu d'affectations
- Section Audiences potentiellement vide (empty state)
- Section Tâches : ses tâches d'apprentissage uniquement

---

## 7. Cas non-couverts dans cette V2

À reporter en V3 ou modules dédiés :

- **Onboarding nouveau membre** : tutoriel inline les 3 premiers jours
- **Notifications push** : pastilles sur la cellule concernée (« 2 nouvelles audiences depuis votre dernière connexion »)
- **Météo cabinet** : indicateur agrégé sur le pouls de la semaine (mood : calm / busy / overloaded)
- **Quick actions** : raccourcis « +Audience », « +Tâche », « +Client » directement depuis la pulse bar
- **Mode plein écran / présentation** : optimisé pour vidéoprojecteur en réunion

---

## 8. Critères d'acceptation V2

- [ ] **Aucun mot-clé financier** dans le DOM : un grep `FCFA|encaissé|recouvrer|impayé|facture|paiement|salaire|honoraires|montant` sur le HTML rendu retourne 0 résultat (hors module Finance)
- [ ] **Pulse Bar mise à jour** : 4 cellules opérationnelles sans chiffres financiers
- [ ] **Section « Tâches en cours »** remplace « Factures impayées »
- [ ] **Filtrage RBAC** : la bascule via `<UserSwitcher>` change immédiatement les valeurs affichées
- [ ] **Compatibilité mobile** : stack vertical en < 768 px
- [ ] **Performance** : tous les chiffres calculés côté client à partir des mocks, pas de fetch supplémentaire
- [ ] **Tests visuels** : 3 maquettes (Gérant / Avocat / Stagiaire) validées avec le client

---

## Annexe A — Roadmap CRM & Dossiers (Sprint suivant)

L'utilisateur a également listé des améliorations sur les modules Clients et Dossiers. **Hors scope de la V2 dashboard**, mais à intégrer dans un sprint dédié :

### A.1 Fiche client — édition rapide

| Demande | Solution |
|---|---|
| Bouton « edit » à côté des coordonnées (email, tel, adresse) | Icône `edit` cliquable → bascule en mode édition inline pour ce groupe |
| Double-clic sur un champ de l'identité juridique | `onDoubleClick` → InlineTextCell réutilisé du module Finance |
| Bouton « Ajouter » sur chaque section (sauf coordonnées principales qui n'évoluent pas) | Pattern `<SectionHeader actions={<AddButton/>}>` |
| Statut du client : actif / inactif (au lieu de pays/ville) | Champ `actif: boolean` + chip dans le header fiche |

### A.2 Contacts secondaires

- Ajouter le champ **téléphone** (manquant aujourd'hui)
- Le champ **poste** : combobox texte libre + suggestions (liste 100+ postes prédéfinis : DG, DRH, Directeur juridique, Avocat, Notaire, Comptable, Gérant, Associé, Président, Secrétaire général…)
- Bouton « Ajouter contact » dans la section contacts

### A.3 Activités récentes du client

Aujourd'hui : décorrélé des actions réelles. **Demain** : agrégation automatique des événements liés à ce client :
- Création/modification de dossier où il est partie principale
- Création/modification d'audience où il est concerné
- Émission/encaissement de facture (visible UNIQUEMENT dans le module Finance — pas dans le dashboard global ni la fiche client)
- Nouvelle pièce ajoutée à la bibliothèque liée à un de ses dossiers

### A.4 Conflits d'intérêt — clarification

> Citation client : « Un même client peut avoir eu un dossier chez eux mais ne plus être actif aujourd'hui. Donc si ce même client apparaît dans un autre dossier, il n'y a pas forcément de conflit d'intérêt. »

→ **Logique cible** :
- Conflit d'intérêt **signalé** SSI le client est `actif: true` ET partie adverse dans un dossier d'un autre client `actif: true`
- Conflit **historique** (silencieux) si l'un des deux est inactif → noté dans une section discrète « Historique » de la fiche, sans alerte
- Banner d'alerte rouge **uniquement** pour les conflits actifs

### A.5 Drop-downs et double-clic transverses

Pattern systématique sur les tables Clients et Dossiers :
- **Toutes les colonnes éditables** (état, ville, statut, dates, montants, équipe) → drop-down inline ou input direct au double-clic
- **Composant unique** : `<InlineSelect>`, `<InlineDate>`, `<InlineText>` (déjà présents dans le module Finance — à mutualiser dans `components/inline/`)
- **Menu 3 points** sur chaque ligne : `Voir / Modifier / Dupliquer / Supprimer` (avec confirmation 2 étapes pour Supprimer)

### A.6 Dossier depuis fiche client → préfilltrage

Aujourd'hui : un dossier créé depuis la fiche client doit reposer manuellement le `clientId`. **Demain** :
- Bouton « + Nouveau dossier » dans la fiche client → ouvre le dialog dossier avec `clientId` pré-rempli (verrouillé)
- L'équipe du dossier est **héritée** du client (cf. sprint C TeamPicker)

### A.7 Plan d'exécution Sprint H (à venir)

| # | Périmètre | Effort |
|---|---|---|
| H1 | Composants `<InlineSelect/Date/Text>` mutualisés dans `components/inline/` | M |
| H2 | Migration table Clients : drop-downs + dbl-click + menu 3 points | M |
| H3 | Migration table Dossiers : idem | M |
| H4 | Fiche Client : bouton edit coordonnées + section contacts enrichie | S |
| H5 | Champ `actif` sur MockClient + logique conflits revue | S |
| H6 | Préfilltrage Nouveau Dossier depuis fiche client | XS |
| H7 | Activités récentes dérivées (cabinet → fiche) | M |

Chaque item peut être livré indépendamment et testé en mock-mode.

---

## Fin du brief V2

Document à remettre au designer pour les wireframes et au dev pour l'implémentation. Le code V1 actuel a déjà été modifié :
- [components/dashboard/metric-strip.tsx](components/dashboard/metric-strip.tsx) — 2 cellules financières remplacées par Tâches + Équipe
- [components/dashboard/upcoming-tasks.tsx](components/dashboard/upcoming-tasks.tsx) — nouveau composant remplaçant `OverdueInvoices`
- [app/page.tsx](app/page.tsx) — rendu mis à jour
- [lib/mock/dashboard.ts](lib/mock/dashboard.ts) — `mockOverview` sans chiffres financiers

La V2 est utilisable immédiatement, ce brief sert à valider l'orientation et préparer les évolutions.
