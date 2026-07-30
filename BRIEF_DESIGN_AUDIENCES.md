# Brief Design — Module Audiences & Tâches KadriLex

> Document à transmettre à l'éditeur de maquettes UI/UX. Refonte du module **Audiences** dans la même direction artistique que le dashboard, le CRM Clients et le module Dossiers (sépia / doré / crème). Couvre la **liste**, le **calendrier**, la **fiche audience**, les **tâches associées**, l'**ajout/édition/suppression**, et l'intégration avec **Dossiers** & **Clients**. La référence DA, typo, tokens et anti-patterns est dans **BRIEF_DESIGN_DASHBOARD.md**, **BRIEF_DESIGN_CLIENTS.md** et **BRIEF_DESIGN_DOSSIERS.md** — à lire en premier.

---

## 1. Contexte

L'avocat travaille au rythme des **audiences** : c'est l'événement structurant de son agenda. Une audience peut être prévue plusieurs semaines à l'avance, peut être reportée, peut nécessiter une préparation spécifique (rédaction de conclusions, collecte de pièces, briefing du client). Autour de chaque audience gravite une **liste de tâches** : "préparer plaidoirie", "convoquer témoin", "déposer conclusions au greffe", etc.

Le module **Audiences & Tâches** est donc à la fois un **agenda** et un **gestionnaire de checklist** : il doit répondre à 3 questions instantanément :

1. **Qu'ai-je aujourd'hui / cette semaine ?** → vue calendrier ou liste
2. **Qu'est-ce qui me reste à préparer pour l'audience X ?** → fiche audience avec tâches
3. **Comment cette audience est-elle liée au dossier ?** → navigation directe vers le dossier client

L'utilisateur cible reste le **gestionnaire principal** + tous les avocats du cabinet. Besoins typiques :
- balayer la semaine en 3 secondes (vue calendrier hebdomadaire ou agenda du jour)
- ouvrir une audience pour voir : dossier lié, parties, lieu, heure, tâches restantes
- créer une audience en 30 secondes (depuis la fiche dossier ou la vue calendrier)
- cocher rapidement une tâche faite (sans changer de page)
- modifier l'heure ou reporter l'audience → notification automatique au client (futur)

---

## 2. Direction artistique (rappel)

**Lire BRIEF_DESIGN_DASHBOARD.md §2-3 pour la palette, typo et anti-patterns.** Tout y est valable.

Rappels essentiels :
- Palette MD3 sépia (`primary-container #6b4423`, `accent #c8772f`, `background #fff8f4`)
- Polices : **Newsreader** (titres), **Manrope** (body), **Space Grotesk** (numéros, dates, heures)
- Icons : **Material Symbols Outlined** (event, gavel, schedule, place, etc.)
- Radius `rounded-lg = 4px`
- Anti-patterns interdits : glassmorphism, gradients, ombres exagérées

---

## 3. Logique métier

### 3.1 Audience = événement à date fixe, lié à un dossier

Une **audience** est un événement judiciaire programmé dans une juridiction, lié à un **dossier client** (ou très rarement à un dossier interne du cabinet — exceptionnel).

**Champs essentiels** :
- `numero` (auto, ex: `AUD-26-127`) — identifiant stable
- `dossierId` (obligatoire) — lien vers le dossier
- `clientId` (auto, hérité du dossier)
- `date` (datetime) + `duree` estimée (optionnel, ex: "1h30")
- `juridiction` (autocomplete depuis la liste des juridictions du Niger)
- `salleAudience` (optionnel, ex: "Salle 3" / "Cour A")
- `titre` (libre, ex: "Plaidoirie sur le fond")
- `nature` (chip type : Plaidoirie / Mise en état / Référé / Conciliation / Délibéré / Renvoi / Autre)
- `avocat` (hérité du dossier client, surchargeable)
- `statut` : `A_VENIR` / `TERMINEE` / `REPORTEE` / `ANNULEE`
- `notes` (textarea libre, prises pendant l'audience)
- `compteRendu` (texte rédigé après — peut devenir un document GED automatiquement)
- `taches[]` — sub-collection (voir §3.2)

### 3.2 Tâche = action à faire, parfois liée à une audience

Une **tâche** est une action concrète qui a un statut (`À FAIRE` / `EN COURS` / `FAIT` / `ANNULÉ`), une date d'échéance, un assigné, et parfois un parent (audience ou dossier).

**Deux types de tâches** :
- **Tâche d'audience** : `audienceId` non null, vit dans la fiche audience (ex: "Préparer plaidoirie", "Réunir pièces #4 à #7")
- **Tâche de dossier** : `audienceId` null, `dossierId` non null, vit dans la fiche dossier (ex: "Relancer client pour pièces", "Demander expertise comptable")

**Champs** :
- `id`, `titre`, `description?`
- `dossierId?`, `audienceId?`
- `statut` : `A_FAIRE` / `EN_COURS` / `FAIT` / `ANNULE`
- `priorite` : `BASSE` / `MOYENNE` / `HAUTE` / `URGENTE`
- `assigneA` (avocat du cabinet, dropdown des 4 avocats)
- `echeance` (date, optionnelle)
- `createdBy`, `createdAt`, `completedAt`

### 3.3 Anti-redondance avec Dossier & Client

| Champ | Origine | Surchargeable au niveau audience ? |
|---|---|---|
| `clientId` | Hérité de `dossier.clientId` | Non (fixe, c'est le client du dossier) |
| `avocat` | Hérité de `client.avocatEnCharge` | Oui (cas où un autre avocat plaide ponctuellement) |
| `juridiction` par défaut | Hérité de `dossier.juridiction` | Oui (audience peut être dans une autre juridiction — ex: appel) |

Les tâches d'audience **n'ont pas** de notion d'avocat hérité — chaque tâche peut être assignée à n'importe lequel des 4 avocats du cabinet (dropdown libre).

---

## 4. Audit du module Audiences existant

État actuel à refondre :

**Fichiers concernés** :
- `app/audiences/page.tsx` — page principale (existe, à refondre)
- `components/audiences/audience-list.tsx` — liste actuelle (vue cards)
- `components/audiences/audience-calendar.tsx` — vue calendrier (à enrichir)
- `components/audiences/audience-form-dialog.tsx` — modale création/édition
- API : `/api/audiences`, `/api/audiences/[id]`

**Schema Prisma `Audience`** (à conserver, étendre) :
- `id`, `clientId`, `dossierId`, `date`, `heure`, `duree`, `juridiction`, `salleAudience`, `titre`, `avocat`, `statut`, `notes`
- **À ajouter** : `numero` (auto), `nature` (Plaidoirie/Mise en état/etc.), `compteRendu` (text), `taches` (relation avec nouveau modèle `Tache`)

**Nouveau modèle `Tache`** (à créer) :
- `id`, `titre`, `description`, `dossierId?`, `audienceId?`, `statut`, `priorite`, `assigneA`, `echeance`, `createdBy`, `createdAt`, `completedAt`

**Problèmes à corriger** :
- DA bleue (à passer en sépia)
- Pas de notion de tâches associées aux audiences
- Vue calendrier basique, à enrichir (semaine / mois / agenda)
- Statuts manquant : nature de l'audience (plaidoirie/mise en état/etc.) à ajouter comme dimension
- Pas de filtres avancés (par avocat, juridiction, période)
- Pas de différenciation visuelle audience à venir / passée / urgente

---

## 5. Architecture du module à dessiner

```
/audiences                          → Liste (3 vues : Agenda du jour / Liste / Calendrier mois)
  ├── header compact (titre + compteurs + CTA "+ Programmer audience")
  ├── toolbar (recherche + filtres + toggle 3 vues)
  └── canvas (selon vue active)

/audiences/[id]                     → Fiche audience
  ├── header (n° AUD + statut + nature + actions)
  ├── sub-header (dossier lié + client + juridiction + date/heure)
  ├── section Tâches (checklist interactive)
  ├── section Notes & Compte-rendu
  └── section Activité

/taches (optionnel — vue transverse)  → Toutes les tâches du cabinet
  ├── filtres (par audience / par dossier / par avocat / par échéance)
  └── kanban ou liste
```

---

## 6. Vue Liste — 3 vues (par défaut : Agenda)

### 6.1 Header (1 ligne compacte)

- Surtitre `label-caps` "AGENDA"
- H1 serif "Audiences"
- Compteurs : `3 aujourd'hui · 12 cette semaine · 8 en attente de CR`
- À droite : bouton primary `+ Programmer audience`

### 6.2 Toolbar (1 ligne)

- **Recherche** (placeholder : "Rechercher par dossier, client, juridiction…")
- **Bouton Filtres** avec badge compteur (drawer latéral)
- **Toggle 3 vues** :
  - 📅 **Agenda du jour** (icône `today`) — vue chronologique du jour, par heure
  - 📋 **Liste** (icône `view_list`) — table compacte
  - 🗓️ **Calendrier mois** (icône `calendar_month`) — grille mensuelle

### 6.3 Vue 1 — AGENDA DU JOUR (par défaut le matin)

**Layout** : timeline verticale par heure (8h → 18h), avec navigation jour précédent/suivant.

```
┌──────────────────────────────────────────────────┐
│ ← lundi 2 mai 2026 →                  [Aujourd'hui]│
├──────────────────────────────────────────────────┤
│ 09:00 ─────────────────────────────────────────  │
│ 09:30 │ ▌▌ Référé Mahamane c/ Banque Atlantique  │  ← bandeau coloré par nature
│ 10:00 │    Cour d'Appel · Salle 3 · 1h30          │
│ 10:30 │    👤 Mahamane · DOS-26-052 · Me Ali KADRI│
│ 11:00 ─────────────────────────────────────────  │
│ 11:30                                            │
│ 12:00 ─────────────────────────────────────────  │
│       ⏸ pause déjeuner                            │
│ 14:00 ─────────────────────────────────────────  │
│ 14:30 │ ▌▌ Plaidoirie SONITEL c/ État du Niger    │  ← rouge si urgent
│ 15:00 │    Tribunal de Commerce · 2h              │
│ 15:30 │    👤 SONITEL · DOS-26-041 · 5 tâches restantes
│ 16:00                                            │
└──────────────────────────────────────────────────┘
```

- Chaque créneau d'audience est une **carte cliquable** (ouvre la fiche)
- Bandeau gauche coloré selon **nature** (Plaidoirie = sépia profond / Mise en état = doré / Référé = rouge / Délibéré = violet sépia)
- Affiche : titre + juridiction + heure + durée + parties + chip "X tâches restantes"
- Si chevauchement de 2 audiences : affichage côte à côte (split column)
- Drag-and-drop pour replanifier (déplacer le bloc à une autre heure → confirm dialog "Reporter l'audience à 16h ?")

### 6.4 Vue 2 — LISTE (table dense)

Table 8 colonnes (tri sur toutes, sticky thead) :

| # | Colonne | Largeur | Style |
|---|---|---|---|
| 1 | **N°** | 110px | mono Space Grotesk · `AUD-26-127` |
| 2 | **Date / Heure** | 130px | Badge sépia avec date + heure mono |
| 3 | **Titre / Affaire** | 280px | Titre principal + dossier mono en sub-ligne |
| 4 | **Client** | 180px | Lien vers fiche client |
| 5 | **Juridiction** | 200px | Texte simple |
| 6 | **Nature** | 120px | Chip coloré (Plaidoirie/Mise en état/etc.) |
| 7 | **Statut** | 110px | Chip (À venir / Tenue / Reportée / Annulée) |
| 8 | **Tâches** | 80px | Pastille `2/5` (faites/total) |
| 9 | **Action** (sticky right) | 80px | Bouton "Ouvrir →" |

Pagination 10 lignes, scrollbar fine.

### 6.5 Vue 3 — CALENDRIER MOIS

Grille classique 7×5 ou 7×6 (selon mois), inspirée Google Calendar mais sobre :

- En-têtes jours `Lun · Mar · Mer · Jeu · Ven · Sam · Dim` en label-caps
- Chaque case jour :
  - Date en haut à gauche (mono, accent sur aujourd'hui)
  - Jusqu'à 3 audiences listées (titre tronqué + heure)
  - Si > 3 : "+2 autres" cliquable (ouvre popover liste)
- Couleur de la case :
  - Aujourd'hui : fond `surface-container-low` + bordure accent
  - Week-end : fond `surface-container/30` (légèrement grisé)
  - Hors mois : opacity 40%
- Navigation : flèches ← → + bouton "Aujourd'hui" + sélecteur mois/année

**Intégrer aussi les échéances de tâches** (sous-points discrets en bas de case) — ex: "✓ Préparer pièces" sur le 14 mai si l'échéance d'une tâche tombe ce jour-là.

---

## 7. Filtres avancés (drawer latéral, identique aux autres modules)

Sections :
1. **Statut** (multi) — À venir / Terminée / Reportée / Annulée
2. **Nature** (multi) — Plaidoirie / Mise en état / Référé / Conciliation / Délibéré / Renvoi / Autre
3. **Période** — Toutes / Aujourd'hui / Cette semaine / Ce mois / Cette année / Personnalisée
4. **Avocat** (multi) — les 4 avocats du cabinet
5. **Juridiction** (multi-autocomplete)
6. **Client** (multi-autocomplete)
7. **Dossier** (multi-autocomplete)
8. **Tâches** — Toutes / Avec tâches en retard / Sans tâche

Footer : Réinitialiser / Voir les résultats.

---

## 8. Fiche audience `/audiences/[id]`

### 8.1 Header

- Back link "← Toutes les audiences"
- Bandeau urgent rouge si l'audience est aujourd'hui ou demain et qu'il reste des tâches non faites
- Bloc principal :
  - `AUD-26-127` mono + chip statut + chip nature
  - H1 "Plaidoirie sur le fond — SONITEL c/ État du Niger"
  - Sub-ligne : "📅 vendredi 14 mai 2026 · 14h30 · 2h estimées"

- Actions à droite :
  - Bouton outline `Modifier`
  - Bouton outline `Reporter` (ouvre dialog avec date picker + motif)
  - Bouton outline danger `Annuler audience`
  - Bouton primary `Marquer comme tenue` (si statut À venir)
  - Menu kebab : Dupliquer / Exporter au format ICS / Imprimer

### 8.2 Sub-header info-rich (4 cellules, ligne horizontale)

| Cellule | Contenu |
|---|---|
| **Dossier** | Lien `DOS-26-041 · SONITEL c/ État du Niger` |
| **Client** | Nom + n° client (lien) |
| **Juridiction** | "Tribunal de Commerce de Niamey · Salle 3" |
| **Avocat plaidant** | Nom + chip "Hérité du dossier" si pas surchargé |

### 8.3 Section Tâches (checklist interactive)

C'est la section centrale de la fiche.

```
┌──────────────────────────────────────────────────────────┐
│ Tâches (3/7)                          [+ Ajouter une tâche]│  ← progression "faites/total"
├──────────────────────────────────────────────────────────┤
│ ☑ Préparer plaidoirie                          🟢 FAIT    │  ← cochée → barré + verte
│   Échéance : hier · Me Oumarou Sanda KADRI · ⚠ HAUTE      │
├──────────────────────────────────────────────────────────┤
│ ☑ Réunir pièces 4 à 7                          🟢 FAIT    │
├──────────────────────────────────────────────────────────┤
│ ☑ Briefer le client                            🟢 FAIT    │
├──────────────────────────────────────────────────────────┤
│ ☐ Vérifier convocation greffe                  🔵 À FAIRE │  ← non cochée
│   Échéance : aujourd'hui · Me Ali KADRI · MOYENNE         │
├──────────────────────────────────────────────────────────┤
│ ☐ Imprimer dossier de plaidoirie               🟡 EN COURS│  ← chip orange
│   Échéance : demain · Me Mahaman Rabiou OUMAROU · HAUTE   │
├──────────────────────────────────────────────────────────┤
│ ☐ Confirmer présence témoin                    🔴 URGENTE │  ← rouge si urgente + en retard
│   ⚠ En retard de 2j · Me Mariama ABDOU ISSA · URGENTE     │
├──────────────────────────────────────────────────────────┤
│ ☐ Récupérer copie certifiée du jugement TC     ⚪ EN ATTENTE
└──────────────────────────────────────────────────────────┘
```

**Comportement** :
- Clic sur la case à cocher → toggle entre `À FAIRE` ↔ `FAIT` (animation rapide)
- Clic sur la ligne (hors case) → ouvre l'**édition inline** (titre, description, échéance, assigné, priorité)
- Bouton kebab `⋮` à droite : Modifier / Changer statut / Réassigner / Supprimer
- Drag-and-drop pour réordonner
- Filtre rapide en haut : `Toutes (7) · À faire (4) · En cours (1) · Faites (3)`
- Tâches en retard surlignées en bandeau rouge léger
- Bouton "+ Ajouter une tâche" ouvre une saisie rapide inline (titre + échéance + assigné)

### 8.4 Section Notes & Compte-rendu

Deux sous-sections :

**Notes** (saisie libre pendant l'audience, accessible avant et pendant) :
- Textarea grande, sauvegarde automatique au blur
- Affichage markdown léger (paragraphes, listes)
- Bouton "Verrouiller" pour figer après l'audience

**Compte-rendu** (post-audience) :
- Visible uniquement si `statut === TERMINEE`
- Textarea + boutons "Enregistrer en PDF" et "Ajouter à la GED du dossier"
- Le PDF généré est automatiquement classé dans le sous-dossier "Comptes-rendus" du dossier client

### 8.5 Section Documents liés à l'audience

Sous-set du GED filtré sur les documents tagués `audience: AUD-26-127`. Affiche en list compacte :
- Plaidoirie_SONITEL_v3.pdf
- Pieces_4_a_7.zip
- Convocation_greffe.pdf

Bouton "+ Joindre un document" ouvre la GED en mode picker.

### 8.6 Section Activité (timeline)

Filtrée sur l'audience : création, modifications, ajouts/complétions de tâches, prise de notes, génération CR.

---

## 9. Création / édition audience

### 9.1 Modale "Nouvelle audience"

Modale large (max 720px). Sections :

#### Section 1 — Lier au dossier (obligatoire pour audience client)

- **Autocomplete dossier** (recherche par numéro, titre, client)
- Sélection → mini-card affiche : numéro + titre + client + juridiction par défaut + avocat hérité
- Affichage : "L'avocat plaidant et la juridiction seront pré-remplis depuis le dossier"

#### Section 2 — Date & lieu

- **Date** (date picker, défaut J+7)
- **Heure** (time picker, défaut 9h00)
- **Durée estimée** (dropdown : 30min / 1h / 1h30 / 2h / 3h / Autre)
- **Juridiction** (autocomplete pré-rempli depuis dossier, surchargeable)
- **Salle** (texte libre, optionnel)

#### Section 3 — Caractéristiques

- **Titre** (libre, ex: "Plaidoirie sur le fond")
- **Nature** (dropdown : Plaidoirie / Mise en état / Référé / Conciliation / Délibéré / Renvoi / Autre)
- **Avocat plaidant** (dropdown des 4 avocats, pré-rempli depuis dossier)

#### Section 4 — Tâches initiales (optionnel, accélère la suite)

Sélecteur de **modèles de tâches** par nature d'audience :
- Plaidoirie → propose : Préparer plaidoirie / Réunir pièces / Briefer client / Vérifier convocation greffe
- Mise en état → propose : Préparer conclusions / Vérifier dépôt pièces adverses
- Référé → propose : Préparer requête / Convoquer témoins
- Custom → l'avocat ajoute librement

L'avocat coche les tâches à créer + définit leur échéance par défaut (J-1, J-2…).

#### Footer

- `Annuler` + `Créer l'audience` (primary accent)
- Validation : dossier + date obligatoires

### 9.2 Modale "Reporter une audience"

Modale plus simple :
- Date picker pour la nouvelle date
- Champ "Motif du report" (libre)
- Checkbox "Notifier le client par email" (futur — gris désactivé pour l'instant)

### 9.3 Modale "Annuler une audience"

- Champ "Motif de l'annulation" (obligatoire pour traçabilité)
- Confirm explicite

---

## 10. Intégration croisée

### 10.1 Depuis fiche dossier

- Section "Audiences liées" déjà existe (cf. brief Dossiers §9.3) — ajoute lien direct vers fiche audience
- CTA "+ Programmer audience" pré-remplit le formulaire avec dossier + client + juridiction

### 10.2 Depuis fiche client

- Section "Audiences à venir" listant toutes les audiences ouvertes liées aux dossiers du client (top 3)

### 10.3 Depuis dashboard

- Le widget "Audiences à venir" actuel reste — affiche les 5 prochaines audiences toutes affaires confondues
- Lien direct vers la fiche audience

### 10.4 Notifications & rappels (futur, à anticiper)

À mentionner dans le brief mais pas à designer maintenant :
- Notification J-1 le matin : "3 audiences demain"
- Email automatique au client J-1 (opt-in)
- SMS rappel à l'avocat 1h avant (opt-in)

---

## 11. Vue dédiée tâches (optionnel — `/taches`)

Vue transverse listant **toutes les tâches du cabinet** (pas seulement celles d'une audience).

**Layout** : 2 vues — **Liste** ou **Kanban**.

### 11.1 Vue Liste (par défaut)

Table 8 colonnes :
- Statut (chip)
- Titre
- Lié à (Audience AUD-XX ou Dossier DOS-XX, lien)
- Assigné à
- Échéance (chip rouge si en retard)
- Priorité (chip Basse/Moyenne/Haute/Urgente)
- Créé le
- Action

Filtres : Statut / Priorité / Assigné / Échéance / Lié à un audience / Lié à un dossier.

### 11.2 Vue Kanban (4 colonnes)

`À FAIRE` · `EN COURS` · `FAIT` · `ANNULÉ`

- Cards de tâche avec : titre + lié à + assigné (avatar) + échéance + chip priorité
- Drag-and-drop entre colonnes pour changer de statut
- Bouton "+ Ajouter une tâche" en haut de chaque colonne

---

## 12. Composants design system supplémentaires

À designer en plus de ceux des modules précédents :

1. **Audience time slot** — bloc d'audience dans la timeline horaire (couleur par nature)
2. **Calendar day cell** — case du calendrier mois avec liste audiences + dépassement
3. **Calendar month nav** — flèches + sélecteur mois + bouton Aujourd'hui
4. **Task row** — ligne checklist : checkbox + titre + sub-ligne meta + dropdown
5. **Task quick-add** — input inline (titre + échéance + assigné) qui se déploie
6. **Task chip statut** — 4 variantes (À FAIRE / EN COURS / FAIT / ANNULÉ)
7. **Task chip priorité** — 4 variantes avec icône (Basse/Moyenne/Haute/Urgente)
8. **Audience nature chip** — 7 variantes (Plaidoirie/Mise en état/etc.) couleurs cohérentes
9. **Time picker** — sélecteur heure/minute, pas de 15 ou 30 min, format français `09h30`
10. **Date range picker** — pour la période personnalisée du filtre
11. **Inline editor** — édition de tâche en place sans modale

---

## 13. États à designer

| État | Description |
|---|---|
| **Loading liste** | Skeleton sépia (rectangles `surface-container-high` pulse) |
| **Loading calendrier** | Squelette grille 7×5 cases vides avec petits placeholders |
| **Empty (aucune audience)** | Icône `event_busy` + "Aucune audience programmée" + CTA "+ Programmer audience" |
| **Empty journée vide** (vue agenda) | "Pas d'audience aujourd'hui" + suggestion "Voir demain →" |
| **Empty tâches** (fiche audience) | "Aucune tâche pour cette audience" + CTA "+ Ajouter une tâche" + "📋 Utiliser un modèle" |
| **Audience tenue** (statut TERMINEE) | Badge vert + texte "Audience tenue le X" + lien vers le compte-rendu |
| **Audience en retard** | Si J-passé et statut À venir → bandeau jaune "Cette audience était prévue il y a X jours, marquer comme tenue ?" |
| **Tâche en retard** | Surlignage rouge + "⚠ En retard de Xj" en sub-ligne |
| **Conflit horaire** | Au moment de la création/report : warning si une autre audience existe déjà sur le même créneau pour le même avocat |

---

## 14. Notes pour le designer

- L'app est en **français** intégralement.
- Le **numéro d'audience** est auto-généré (`AUD-YY-NNN`). Toujours en mono Space Grotesk.
- Les **tâches sont au cœur du module** — leur ergonomie est aussi importante que celle des audiences.
- L'**avocat plaidant est hérité du dossier** par défaut. Mention "Hérité du dossier" cliquable pour surcharger.
- La **vue par défaut est l'Agenda du jour** au matin, **la Liste** quand on cherche, **le Calendrier** pour la planification long terme.
- Les **conflits horaires** d'un avocat doivent être détectés et signalés (un avocat ne peut pas être à 2 audiences en même temps).
- Données de remplissage : juridictions de Niamey (Tribunal de Commerce, TGI, Cour d'Appel, Tribunal Administratif, Cour Suprême), avocats du cabinet, clients/dossiers existants des autres briefs.

---

## 15. Critères d'acceptation

La maquette est validée si :

- [ ] La palette sépia/doré/crème est appliquée partout
- [ ] Les 3 vues (Agenda / Liste / Calendrier) partagent header, toolbar, filtres et basculent via le toggle
- [ ] Le numéro d'audience `AUD-YY-NNN` est partout en mono Space Grotesk
- [ ] L'avocat plaidant est visible avec mention "Hérité du dossier"
- [ ] La fiche audience inclut une section **Tâches interactive** avec checkbox, statut, priorité, échéance, assigné
- [ ] Le statut d'une tâche est cliquable directement (toggle sans modale)
- [ ] Les tâches en retard sont visuellement distinguées (rouge + chip ⚠)
- [ ] Le drag & drop sur la timeline d'agenda fonctionne (replanifier en glissant)
- [ ] La vue calendrier mois affiche aussi les échéances de tâches en sous-points
- [ ] Le formulaire de création propose des **modèles de tâches** par nature d'audience
- [ ] Tous les états (loading, empty, en retard, conflit horaire) sont conçus
- [ ] La typographie est Newsreader + Manrope + Space Grotesk
- [ ] Test "IA-fait" : interface sobre, dense, professionnelle pour cabinet juridique haut de gamme

---

## 16. Données mock à utiliser dans les maquettes

### Audiences (10-15 entrées)

- **AUD-26-127** · Plaidoirie sur le fond — SONITEL c/ État du Niger · Tribunal de Commerce · Vendredi 14 mai 14h30 · DOS-26-041 · 5 tâches dont 3 faites
- **AUD-26-128** · Référé Mahamane c/ Banque Atlantique · Cour d'Appel · Lundi 5 mai 9h30 · DOS-26-052 · URGENT
- **AUD-26-129** · Mise en état BIN c/ Niger Telecom · TGI Niamey · Mercredi 7 mai 11h00 · DOS-26-038
- **AUD-26-130** · Mise en état Niger Lait c/ Distrib SARL · TGI · Vendredi 9 mai 10h00 · DOS-26-024
- **AUD-26-131** · Plaidoirie Boubacar c/ Société Immobilière · TGI · Mardi 12 mai 14h00 · DOS-26-061
- **AUD-26-126** · Mise en état SONITEL — Audience tenue 28 janvier 2026 · TC Niamey · TERMINEE avec compte-rendu rédigé
- + audiences passées (TERMINEE, REPORTEE, ANNULEE) pour les filtres
- + 1-2 audiences avec **conflit horaire** sur Me Oumarou Sanda KADRI

### Tâches (30-40 entrées réparties)

Exemples sur AUD-26-127 (SONITEL plaidoirie) :
- ☑ FAIT · Préparer plaidoirie · Me Oumarou Sanda KADRI · échéance hier · HAUTE
- ☑ FAIT · Réunir pièces 4 à 7 · Me Mariama ABDOU ISSA · MOYENNE
- ☑ FAIT · Briefer le client (M. Sissoko) · Me Oumarou · HAUTE
- ☐ EN COURS · Imprimer dossier de plaidoirie · Me Mahaman Rabiou · échéance demain · HAUTE
- ☐ À FAIRE · Vérifier convocation greffe · Me Ali KADRI · échéance aujourd'hui · MOYENNE
- ☐ URGENTE en retard · Confirmer présence témoin · Me Mariama · échéance avant-hier · URGENTE
- ☐ EN ATTENTE · Récupérer copie certifiée du jugement TC · Me Ali · BASSE

### Patterns à représenter
- Au moins 1 audience aujourd'hui (vue agenda)
- Au moins 1 audience reportée
- Au moins 1 audience avec compte-rendu rédigé
- Au moins 1 conflit horaire (2 audiences sur le même créneau pour le même avocat)
- Au moins 3 tâches en retard
- Au moins 1 tâche urgente non faite
- Au moins 1 audience sans tâche (empty state tâches)

---

*Brief rédigé le 2026-05-02. À lire en complément de **BRIEF_DESIGN_DASHBOARD.md**, **BRIEF_DESIGN_CLIENTS.md** et **BRIEF_DESIGN_DOSSIERS.md** pour la DA et conventions partagées. Anticipation des notifications & rappels (§10.4) à valider produit avant phase 3.*
