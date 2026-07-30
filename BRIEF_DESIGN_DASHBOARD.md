# Brief Design — Dashboard KadriLex (Cabinet d'avocats)

> Document à transmettre à l'éditeur de maquettes UI/UX. Contient le contexte projet, la direction artistique à appliquer, les principes UI/UX exigés, les sections à concevoir, les états à couvrir, et les anti-patterns à éviter.

---

## 1. Contexte projet

**KadriLex** est le SaaS interne du cabinet d'avocats **SCPA Kadri Legal** (Niamey, Niger — site corporate : kadrilegal.net). C'est l'outil de gestion quotidien du cabinet, utilisé par le **gestionnaire principal** (l'avocat associé / administrateur ayant accès à tout).

L'utilisateur cible n'est pas un client final : c'est un avocat débordé qui ouvre l'app plusieurs fois par jour pour savoir, en moins de 10 secondes :
- ce qui m'attend aujourd'hui (audiences, échéances) ;
- ce qui me bloque ou me ralentit (factures impayées, dossiers stagnants) ;
- où en est l'activité du cabinet (CA encaissé, dossiers récents).

L'app gère 5 modules : **Clients**, **Dossiers**, **Audiences**, **Bibliothèque** (jurisprudence/doctrine), **Facturation**. Le dashboard est la page d'atterrissage — sa fonction est d'orienter l'attention, pas de tout afficher.

### Stack technique (à respecter dans les maquettes)

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Composants Radix UI / shadcn (déjà en place — Button, Card, Badge, Table, Dialog, etc.)
- Icônes : Lucide React
- Pas de bibliothèque de charts pour l'instant (data-viz simple, à designer en CSS pur si nécessaire)

---

## 2. Direction artistique à appliquer (changement majeur)

L'app utilise actuellement une DA bleu royal + slate, **trop SaaS générique**. On bascule sur la **DA du cabinet** : marron sépia + doré + crème, sobre et premium, cohérente avec l'identité juridique du client.

### Source de la DA — site kadrilegal.net

- Bandeau supérieur du site : marron sépia profond
- Item de menu actif "Accueil" : doré-orange
- Fond logo : crème pâle, presque blanc cassé
- Logo : pictogramme sépia (deux personnages stylisés sous un arc) + script "Law firm" + capitales serrées "SCPA KADRI LEGAL"

### Palette proposée (tokens à valider)

| Token | Hex (proposition) | Rôle |
|---|---|---|
| `--color-primary` | `#6B4423` | Sidebar, navigation active, en-têtes principaux |
| `--color-primary-soft` | `#8B6F47` | Hover sur primary, bandeaux secondaires |
| `--color-accent` | `#C8772F` | CTA, liens actifs, indicateurs positifs, focus ring |
| `--color-accent-soft` | `#E8B27D` | Hover/disabled de l'accent |
| `--color-background` | `#FBF7F0` | Fond de l'app (crème pâle) |
| `--color-surface` | `#FFFFFF` | Cartes, panneaux, modales |
| `--color-foreground` | `#1F1A14` | Texte principal (noir teinté, jamais `#000`) |
| `--color-muted` | `#9C8B73` | Texte secondaire, métadonnées |
| `--color-border` | `#E8DCC8` | Séparateurs, bordures, lignes de tableau |
| `--color-warning` | `#B45309` | Retards modérés (30–60j), avertissements |
| `--color-danger` | `#991B1B` | Retards critiques (≥ 60j), erreurs, suppressions |
| `--color-success` | `#166534` | Paiements à jour, statuts terminés |

**Le designer peut ajuster les hex au pixel près tant que les rôles restent identiques.**

### Typographie

- **Police d'affichage (titres, gros chiffres)** : un serif éditorial premium — *Cormorant Garamond*, *Playfair Display*, ou *DM Serif Display*. Idéal pour incarner le "cabinet d'avocats classique".
- **Police de corps (UI, tableaux)** : une sans-serif sobre — *Sora*, *Manrope*, ou *DM Sans*. **Pas Inter, Roboto, Open Sans, Arial.**
- **Mono** : *JetBrains Mono* ou *IBM Plex Mono*, mais uniquement pour les numéros de dossier/facture. Pas de mono décoratif.

Hiérarchie typographique attendue (tailles indicatives, à fluidifier en `clamp()`) :
- H1 page : 28–32px, serif, weight 600, tracking -0.02em
- H2 section : 14px, sans-serif, weight 600, uppercase, letter-spacing 0.06em, color muted
- Métriques principales : 28–36px, serif, weight 700, tabular-nums
- Body / tableaux : 13–14px, sans-serif, weight 400–500
- Métadonnées : 11–12px, sans-serif, color muted

---

## 3. Principes UI/UX exigés (non-négociables)

Inspirés du guide *"Créez un tableau de bord personnalisé"* (Robin Sloan / Sherwood approach). Le designer doit explicitement appliquer ces principes :

1. **Densité d'information > espace blanc**. Si l'utilisateur doit scroller pour comprendre l'état du cabinet, le dashboard a échoué.
2. **Chaque élément est cliquable et mène à du détail**. Une métrique → la liste filtrée. Une ligne de tableau → la fiche. Une icône → l'action.
3. **Tous les en-têtes de tableau sont triables**. ▲▼ visible quand inactif, coloré accent quand actif.
4. **Filtres en pills, pas en dropdowns**. Visibles en permanence, surlignés quand actifs.
5. **Refresh par carte**. Chaque section a son icône `↻` dans son en-tête, indépendante des autres.
6. **Variations de mise en page**. Pas 4 cartes identiques en grille. Mélanger : bandeau / table / liste / timeline / chips. Le rythme visuel matérialise la hiérarchie.
7. **Lignes de tableau plafonnées à 5–10**, "Afficher plus" en dessous. Jamais 500 lignes au chargement.
8. **Aucune donnée falsifiée**. État vide → "aucune audience programmée", pas un placeholder ou une fausse valeur.
9. **Étiquettes partout**. Pas d'icônes seules sans label, pas d'infobulle qui cache du contexte critique.

### Anti-patterns IA à refuser explicitement

| ❌ Ne fais pas | ✅ Fais plutôt |
|---|---|
| Glassmorphism (flou, verre, bordures lumineuses) | Fonds unis, bordures sépia subtiles `1px solid var(--color-border)` |
| Cartes dans des cartes | Aplatir la hiérarchie. Une seule couche de carte par contexte. |
| Grilles de 4 KPI cards identiques (icône + grand chiffre + label + delta) | Bandeau intégré : 4 métriques alignées, séparateurs verticaux fins, pas de cartes individuelles |
| Texte en dégradé sur titres ou chiffres | Couleur unie tirée de la palette |
| Ombres portées génériques `shadow-lg` | Ombres très subtiles `0 1px 2px rgba(31,26,20,0.04)` ou pas d'ombre du tout |
| Noir pur `#000` ou blanc pur `#fff` partout | `#1F1A14` pour le texte, `#FBF7F0` pour le fond — teintés par la palette |
| Coins arrondis exagérés (`rounded-2xl` partout) | Radius modéré : 6–10px sur les cartes, 4–6px sur les inputs/badges |
| Icônes décoratives géantes au-dessus de chaque titre | Titres seuls. Icône dans le contexte de l'élément (bouton, badge), pas en hero. |
| Texte gris terne `text-gray-500` sur fond coloré | Nuance de la couleur de fond (`color-muted` qui est sépia désaturé) |
| Modales pour tout | Préférer panneaux glissants, expansion in-line, navigation directe |
| Couleurs fluo / cyan / violet-bleu (palette IA) | S'en tenir strictement à la palette définie ci-dessus |
| Polices système (Inter, Roboto, Arial) | Couple serif éditorial + sans-serif sobre tel que défini en §2 |

**Test final** : si on montre la maquette à un avocat de 55 ans en disant "c'est une IA qui a fait ça", il doit dire "non, c'est trop sobre et trop pensé pour une IA". Si oui, recommencer.

---

## 4. Architecture du dashboard à dessiner

### 4.1 Header de page

- À gauche : surtitre "TABLEAU DE BORD" en uppercase tracking large + H1 "Bonjour Maître [Nom]" en serif + date du jour ("vendredi 1 mai 2026") en body color muted
- À droite : deux boutons en ligne
  - `↻ Tout actualiser` (variant outline, sépia)
  - `+ Nouveau dossier` (variant primary, fond accent doré, texte blanc cassé)

### 4.2 Bandeau "Pulse" (4 métriques actionnables, intégrées)

Une seule rangée horizontale, séparateurs verticaux fins entre les 4 cellules, **pas de cartes individuelles**. Chaque cellule est cliquable, hover subtil sur le fond. Sur mobile : grille 2×2.

| Cellule | Valeur principale | Sous-info |
|---|---|---|
| Audiences aujourd'hui | nombre (ex: `3`) | "Prochaine : Aujourd'hui · 14h30" |
| À recouvrer | montant (ex: `2.4M FCFA`) en couleur warning si > 0 | "5 factures impayées" |
| Dossiers actifs | nombre + delta vs début du mois (ex: `42 ↑ +3`) | "Évolution depuis le 1er du mois" |
| Encaissé ce mois | montant + delta % vs mois précédent | "Mois précédent : 3.1M FCFA" |

**Important** : ces 4 métriques sont actionnables (chaque cellule mène vers la page filtrée correspondante). Ce ne sont **pas** des KPI vanité de type "total clients = 248".

### 4.3 Section "Audiences à venir"

- En-tête : titre + description "Programmées sur 7 jours" + à droite : pills `7j | 30j | 90j` (active = fond surface + ombre légère) + lien "Tout voir →" + icône refresh
- Tableau, colonnes :
  1. **Date** (cellule riche : badge sépia avec mois/jour en relief + jour de semaine + heure)
  2. **Affaire** (titre en bold + ligne meta : nom client · n° dossier en mono)
  3. **Juridiction**
  4. **Avocat assigné**
  5. **Statut** (chip : À venir / Reportée / Annulée — couleurs sobres tirées de la palette)
- Toutes les colonnes triables, indicateur ▲▼ visible
- Empty state : icône calendrier ligne (Lucide), "Aucune audience programmée" + sous-texte muted

### 4.4 Section "Factures à recouvrer"

- En-tête : titre + description dynamique "5 factures · 2.4M FCFA" + lien "Facturation →" + refresh
- Tableau, colonnes triables :
  1. **Facture** (numéro mono + nom client en sous-ligne)
  2. **Retard** (chip gradué : jaune < 30j, orange 30–60j, rouge ≥ 60j) — *trié par défaut desc*
  3. **Échéance** (date)
  4. **Reste dû** (montant tabulaire + "sur 3.5M FCFA" si paiement partiel)
  5. **Statut** (chip Impayée / Partielle)
- Empty state : icône check, "Tout est à jour", sous-texte sépia clair

### 4.5 Section "Dossiers actifs"

- Format **liste compacte** (pas de tableau — variation volontaire). Chaque ligne :
  - Badge type de dossier (CIVIL / COMMERCIAL / PENAL / ADMINISTRATIF) — palette de teintes douces différentes
  - N° dossier (mono) + nom client
  - Ligne meta : avocat + nb audiences + nb factures + "Maj il y a 2j"
  - Chevron à droite, hover surfacé
- 8 lignes max, lien "Tous les dossiers →" en footer

### 4.6 Section "Activité récente" (timeline verticale)

- Format timeline : axe vertical sépia clair à gauche, chaque événement = pastille colorée + contenu
- Chaque ligne : type (Client / Dossier / Audience / Facture / Document) + label + meta + horodatage relatif ("il y a 5min", "2h", "hier")
- 12 derniers événements, ordre antéchronologique
- Pastilles colorées par type (réutiliser palette modules : sépia, doré, crème teintée…)

### 4.7 Quick links (sous le bandeau pulse)

Petits chips horizontaux : `Clients · Dossiers · Audiences · Facturation · Bibliothèque`. Style minimal : texte sans-serif color muted, icône Lucide 14px, fond transparent, hover = fond crème + texte primary. **Pas un menu mais des raccourcis discrets**, pour redonder utile avec la sidebar.

### 4.8 Disposition générale

- Layout 12 colonnes
- Desktop (≥1024px) : pulse pleine largeur, puis grille 8 / 4 → colonne gauche (Audiences, Factures, Dossiers actifs) + colonne droite (Activité récente)
- Tablet (768–1023px) : tout pleine largeur, sections empilées
- Mobile (< 768px) : pulse 2×2, sections empilées, tableaux scrollables horizontalement, filtres pills accessibles en sticky

---

## 5. États à designer (pour chaque section)

| État | Description |
|---|---|
| **Initial loading** | Skeleton cohérent avec la structure finale (rectangles crème, animation pulse douce). Pas de spinner unique au centre. |
| **Refreshing** | L'icône `↻` tourne, opacity du contenu à 0.7. Le contenu reste visible et utilisable. |
| **Empty** | Icône Lucide ligne fine + titre court + sous-texte muted. Sans message commercial. Aucune fausse donnée. |
| **Error** | Bandeau rouge subtil en haut de la carte + bouton "Réessayer". Le reste de la carte reste navigable si possible. |
| **Hover ligne** | Fond crème teinté, chevron passe à doré, légère élévation (sans `translateY`) |
| **Tri actif** | En-tête de colonne + flèche ▲ ou ▼ en couleur accent doré |
| **Filtre pill actif** | Fond surface, ombre 1px, texte foreground. Inactifs = fond transparent, texte muted |
| **Focus clavier** | Outline accent doré, 2px, offset 2px, sur tous les éléments interactifs |

---

## 6. Composants réutilisables à designer (design system)

Le designer livre ces tokens et composants en plus du dashboard :

1. **Boutons** : primary (fond doré), secondary (fond sépia), outline (bord sépia), ghost. Tailles sm / md / lg. États : default / hover / active / disabled / loading.
2. **Inputs** : text, search, select. États : default / focus (ring doré) / error / disabled.
3. **Badges/Chips** : statuts (success/warning/danger/info/neutral), types de dossier (4 variants).
4. **Cards** : surface blanche, bordure sépia 1px, radius 8px, ombre `0 1px 2px rgba(31,26,20,0.04)`. Header avec titre + actions à droite.
5. **Tables** : en-tête sépia clair + texte uppercase muted, lignes alternées (très subtil ou aucune), hover crème, séparateurs sépia ultra clairs.
6. **Tabs** : style "underline" sobre, soulignement doré sur actif.
7. **Avatars** : initiales sur fond sépia teinté, anneau crème.
8. **Tooltips** : fond sépia profond, texte crème.
9. **Modales / Drawers** : overlay sépia 30% transparence, panneau surface, header sticky.
10. **Empty states génériques** : icône + titre + CTA.

---

## 7. Livrables attendus

1. **Tokens design** (Figma variables ou JSON) : palette + typo + spacing + radius + shadows
2. **Maquettes haute-fidélité du dashboard** :
   - Desktop 1440px (état chargé avec data réaliste Niger : noms nigériens, montants FCFA, juridictions Niamey)
   - Tablet 768px
   - Mobile 375px
   - Tous les états : loading, empty (au moins une section), error (au moins une section)
3. **Library de composants** : version interactive des composants du §6
4. **Maquettes additionnelles** (bonus si possible) : aperçu cohérent des autres pages (Clients, Dossiers, Audiences, Facturation, Bibliothèque) en appliquant la même DA — au moins l'état "liste"
5. **Document d'accompagnement** : règles d'usage, do/don't, couples typographiques, cas d'extension

---

## 8. Données réalistes pour les maquettes (contexte Niger)

Pour que les maquettes ne sonnent pas faux :

- **Clients fictifs** : SONITEL, Banque Islamique du Niger, SONICHAR, Niger Lait SARL, ou particuliers (Amadou Issoufou, Aïssata Maïga, Fati Oumarou)
- **Téléphones** : `+227 20 73 45 67`, `+227 96 12 34 56`
- **Adresses** : Quartier Plateau Niamey, Quartier Yantala, Koira Kano
- **Juridictions** : Tribunal de Commerce de Niamey, Tribunal de Grande Instance de Niamey, Cour d'Appel de Niamey, Tribunal Administratif, Cour Suprême du Niger
- **Montants** : en FCFA (XOF) — exemples 350 000 FCFA, 2 400 000 FCFA, 12 750 000 FCFA
- **Numéros de dossier** : format `DOS-2026-NN` ou similaire
- **Numéros de facture** : format `FAC-2026-NNN`

---

## 9. Notes pour le designer

- **Le module "Flash CR" sera retiré** de l'app dans la prochaine itération. Ne pas l'inclure dans la sidebar ni les maquettes. Modules à conserver : Tableau de Bord, Clients, Dossiers, Audiences, Bibliothèque, Facturation, Paramètres.
- L'app est **mono-utilisateur** côté gestionnaire principal (pas de multi-tenant ni de gestion de rôles complexe à représenter pour l'instant — juste un avatar + nom dans la sidebar).
- La langue est le **français** (dates, libellés, formats nombres `1 234,56`).
- Le projet est en phase **focus frontend** : la base de données passe en local pour itérer vite, plus tard sur Supabase + VPS. Le designer ne livre pas de spécifications backend.
- Référence visuelle : prendre un screenshot du site **kadrilegal.net** pour caler la DA (couleurs exactes, esprit du logo, sobriété générale).

---

## 10. Critères d'acceptation

La maquette est validée si elle coche ces points :

- [ ] La palette dérivée du site kadrilegal.net est appliquée partout (zéro bleu royal résiduel)
- [ ] Les 4 métriques du bandeau pulse sont **intégrées** (pas en cartes individuelles)
- [ ] Toutes les colonnes des tableaux affichent un indicateur de tri
- [ ] Les filtres période sont des pills, pas des dropdowns
- [ ] Chaque section a son bouton refresh dans son en-tête
- [ ] Aucun élément n'utilise glassmorphism, gradient sur texte, ou ombres exagérées
- [ ] La typographie est un duo serif + sans-serif (pas Inter/Roboto/Open Sans)
- [ ] Les états loading / empty / error sont conçus pour chaque section
- [ ] Le dashboard est **lisible en moins de 10 secondes** par un avocat pressé
- [ ] Le test "IA-fait" : l'interface ne sent pas le template. Sobre, dense, professionnelle.

---

*Brief rédigé le 2026-05-01 sur la base de l'audit de l'app existante (Next.js 16 + Prisma + Tailwind 4) et du guide "Créez un tableau de bord personnalisé" appliqué au contexte cabinet d'avocats.*
