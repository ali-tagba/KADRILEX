# Récapitulatif des formulaires de l'application

**Cabinet** : SCPA Kadri Legal
**Date** : 2026-05-05
**Objectif** : auditer l'état des formulaires de création / édition dans tous les modules de l'application, identifier les écarts avec la charte graphique (DA sépia), et préparer la refonte des dialogs incohérents.

---

## 1. Doctrine d'écriture des formulaires

Tous les formulaires de l'app **doivent** :

1. **Respecter la DA sépia** : palette `#502e0f` / `#7f5533` / `#c8772f` / `#83746b`, typographies Newsreader (titres) / Manrope (body) / Space Grotesk (mono-num), icônes Material Symbols.
2. **Ne pas dépendre de shadcn-ui** (`@/components/ui/dialog`, `@/components/ui/button`, etc.). Les anciens dialogs qui en dépendent sortent du DA et doivent être réécrits.
3. **Couvrir 100 % des champs du modèle Mock** correspondant. Pas de bullshit colonnes, pas de bullshit formulaires.
4. **Pattern unique** :
   - Backdrop overlay `fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm`
   - Dialog blanc `max-w-2xl` (ou `xl` pour formulaires courts) avec `flex flex-col overflow-hidden`
   - Header : titre h3 sépia + sublabel descriptif + bouton ✕ fermeture
   - Sections internes en `<Section title="…">` avec label uppercase
   - `<Field label="X" required>` pour chaque champ
   - Footer fixe : Annuler (border) + CTA accent
5. **Validation client minimale** : au moins le champ identitaire principal requis (nom, raison sociale…).
6. **Escape ferme**, **Click backdrop ferme**, **Enter dans le formulaire soumet**.
7. **CTA primaire désactivé** si `canSave === false`.

---

## 2. État des lieux par module

### ✅ Module **Tâches**
- Dialog : `components/taches/tache-form-dialog.tsx`
- État : **complet, conforme DA, branché**
- Champs : titre, description, statut, priorité, assigneA, échéance, liaison (client/dossier/audience)
- Aucune action requise.

### ✅ Module **Bibliothèque**
- Dialog : `components/bibliotheque/document-form-dialog.tsx`
- État : **complet, conforme DA, branché**
- Champs : titre, catégorie, type, domaine, juridiction, niveau, référence, date, description, tags, auteur, source, notes, articles cités
- ⚠️ **Upload de fichier non branché** (placeholder "à brancher quand le storage sera prêt") — laissé en l'état, le storage R2/S3 viendra plus tard.

### ✅ Module **Équipe**
- Dialog : `components/equipe/membre-form-dialog.tsx`
- État : **complet, conforme DA, branché**
- Champs : prénom, nom, email, téléphone, rôle (sélecteur visuel 6 cards), fonction, statut contrat, salaire, dateEmbauche, RIB, banque, mode versement, notes
- ✅ Génère automatiquement un code d'accès à la création (cf. `BRIEF_DESIGN_EQUIPE.md`).

### ✅ Module **Finance / Facturation**
- Dialog : `components/facturation/facture-form-dialog.tsx`
- État : **complet, conforme DA, branché**
- Couvre direction (Émise/Reçue), dates, client, dossier, fournisseur, lignes, TVA, refacturable.

### ✅ Module **Finance / Paie**
- Dialog 1 : `bulletin-form-dialog.tsx` (édition d'un bulletin existant)
- Dialog 2 : `ajouter-salaire-dialog.tsx` (création manuelle d'un bulletin)
- État : **complets, conformes DA, branchés**

### ✅ Module **Finance / Frais externes**
- Dialog : `ajouter-frais-externe-dialog.tsx`
- État : **complet, conforme DA, branché**
- Couvre date, fournisseur (liste + saisie libre), libellé, dossier optionnel, montant HT + TVA, refacturable, déjà payé, mode versement, notes.

### ✅ Module **Finance / Dépenses internes**
- Dialog : `components/facturation/depense-form-dialog.tsx`
- État : **complet, conforme DA, branché**

### ✅ Module **Clients** ← **branché aujourd'hui**
- Dialog : `components/clients/client-form-dialog.tsx` **réécrit à la DA**
- État : **complet, conforme DA, branché**
- Sélecteur visuel **PM / PP** + sous-sélecteur **Conventionnée / Hors convention** (PM uniquement)
- Champs PM : raison sociale, forme juridique (combobox 13 valeurs), RCCM, NIF, représentant légal, siège social
- Champs PP : prénom, nom, profession, pièce d'identité, nationalité, date naissance, lieu naissance, WhatsApp
- Coordonnées commun : email, téléphone, adresse, ville (combobox 8 villes Niger), pays
- Suivi cabinet : honoraires convenus, **statut Actif / Inactif** (toggle pill)
- Notes
- ⚠️ Le formulaire ne gère pas les **contacts secondaires** ni les **parties adverses** — ces sub-collections sont à ajouter via la fiche après création (déjà branchées : `contact-form-dialog`, parties adverses inline).

### ⚠️ Module **Dossiers** ← **dialog existe mais à réécrire**
- Dialog : `components/dossiers/dossier-form-dialog.tsx`
- État : **présent mais hors DA** (utilise shadcn-ui), bouton « + Nouveau dossier » sur `alert()` page.tsx:115
- **À refaire** :
  1. Réécrire à la DA (template `client-form-dialog`)
  2. Tous les champs du modèle `MockDossier` : numéro (auto), kind, type, **nature (combobox 14 + Autre)**, titre, statut, **état procédure (combobox + Autre)**, juridiction (combobox JURIDICTIONS_NIGER + Autre), clientId (sélecteur OU **préfilltrage `?clientId=` depuis fiche client**), partiesAdverses (multi-tags), dateOuverture (auto = aujourd'hui), description, **honorairesEstimes (FCFA)**, responsableId + equipeIds via `<TeamPicker>`, **notes / observations** (textarea — actuellement absent)
  3. Brancher le bouton « + Nouveau dossier » dans `app/dossiers/page.tsx` ET dans la fiche client (déjà préfille `?clientId=`)
  4. Header dynamique « Nouveau dossier pour [Client] » quand le clientId est préfilltré

### ❌ Module **Audiences** ← **dialog absent**
- État : **aucun dialog**, bouton « + Programmer audience » → `alert()` `app/audiences/page.tsx:141`
- **À créer** : `components/audiences/audience-form-dialog.tsx`
- Champs requis (modèle `MockAudience`) : numéro (auto AUD-YY-NNN), titre, nature (drop-down `AUDIENCE_NATURES`), statut (drop-down — défaut `A_VENIR`), **date + heure début**, durée minutes (slider 30-240), juridiction (combobox + Autre), salle audience (texte libre), dossierId (sélecteur), responsableId (TeamPicker), notes
- Tâches préparatoires : pas dans le formulaire de création, ajoutables après depuis la fiche audience

---

## 3. Récapitulatif tableau de synthèse

| Module | Bouton | Dialog | DA | Modèle complet | Branché |
|---|---|:-:|:-:|:-:|:-:|
| Tâches | + Nouvelle tâche | ✅ | ✅ | ✅ | ✅ |
| Bibliothèque | + Ajouter document | ✅ | ✅ | ✅ | ✅ |
| Équipe | + Inviter | ✅ | ✅ | ✅ | ✅ |
| Finance > Facturation | + Saisir facture | ✅ | ✅ | ✅ | ✅ |
| Finance > Paie | + Ajouter salaire | ✅ | ✅ | ✅ | ✅ |
| Finance > Frais externes | + Ajouter frais | ✅ | ✅ | ✅ | ✅ |
| Finance > Dépenses | + Nouvelle dépense | ✅ | ✅ | ✅ | ✅ |
| **Clients** | **+ Nouveau client** | ✅ | ✅ | ✅ | ✅ ← branché aujourd'hui |
| **Dossiers** | + Nouveau dossier | ⚠️ | ❌ shadcn | ⚠️ partiel | ❌ alert |
| **Audiences** | + Programmer audience | ❌ | ❌ | ❌ | ❌ alert |

**Score actuel : 8 / 10 modules avec formulaires fonctionnels conformes DA.**

---

## 4. Roadmap de finalisation

### Sprint I-1 : Dialog Dossier (M)
- Réécrire `components/dossiers/dossier-form-dialog.tsx` à la DA
- Sélecteur client avec recherche (par défaut le client préfilltré via `?clientId=`)
- Combobox pour nature (`NATURES_AFFAIRE`), juridiction (`JURIDICTIONS_NIGER`), état procédure (`ETATS_PROCEDURE_SUGGESTIONS`)
- Tous avec option **« Autre… »** custom (pattern InlineComboCell)
- Multi-tags pour parties adverses
- TeamPicker intégré pour responsable + équipe
- Branche le bouton « + Nouveau dossier » dans `/dossiers` ET utilise le préfilltrage depuis fiche client
- Section **Notes & observations** (textarea libre)
- Champ **Honoraires estimés** (FCFA)
- À la création, hérite automatiquement de `client.equipeIds`

### Sprint I-2 : Dialog Audience (S)
- Créer `components/audiences/audience-form-dialog.tsx` à la DA
- Sélecteur dossier (auto-charge le client + l'avocat plaidant par défaut)
- Combobox juridiction + salle (texte libre)
- Champs date + heure séparés
- Slider durée
- Brancher le bouton « + Programmer audience »
- Pré-fiche tâches préparatoires automatiques (dépôt conclusions J-7, etc.) — option

### Sprint I-3 : Préfilltrage cross-module (S)
- Vérifier que tous les boutons « + Nouveau X » depuis une fiche parente préfille la liaison :
  - Fiche client → + Nouveau dossier (clientId) ← OK
  - Fiche dossier → + Programmer audience (dossierId) ← À faire
  - Fiche dossier → + Nouvelle tâche (dossierId) ← À vérifier
  - Fiche audience → + Nouvelle tâche (audienceId) ← À faire
- Les liaisons préfilltrées doivent être **verrouillées** dans le dialog (read-only avec chip)

### Sprint I-4 : Sub-collections de la fiche client (S)
- Section « Coordonnées » : déjà éditable inline ✅
- Section « Identité juridique » : déjà éditable inline ✅
- Section « Convention » : déjà éditable via toggle ✅
- Section « Contacts secondaires » : déjà branchée avec dialog dédié ✅
- Section « Parties adverses » : à enrichir avec dialog dédié (actuellement éditable inline mais pas d'ajout multi-champs)

### Sprint I-5 : Notes & observations dans Dossier (XS)
- Section dédiée dans `app/dossiers/[id]/page.tsx`
- Liste de notes datées + auteur (membre courant) + textarea ajout libre
- Persistance locale en attendant l'API

### Sprint I-6 : Vraie taille fichiers Dossier (XS)
- `MockDossier.files[].size` est déjà un nombre — vérifier qu'il est utilisé dans l'explorateur
- Helper `formatBytes(size)` à brancher si pas déjà fait

### Sprint I-7 : Filtrage strict des factures par dossier (XS)
- Dans la fiche dossier, ne montrer que les factures où `f.dossierId === dossier.id`
- Vérifier la requête actuelle, c'est déjà filtré côté `getDossierFinanceFromInvoices`

---

## 5. Patterns réutilisables (déjà disponibles)

Pour matcher le pattern de l'app, **réutiliser** ces composants déjà en place :

| Besoin | Composant | Fichier |
|---|---|---|
| Dialog modal à la DA | (template) | Suivre `client-form-dialog.tsx` ou `ajouter-salaire-dialog.tsx` |
| Drop-down liste fixe | `<InlineSelectCell>` | `components/inline/index.ts` |
| Drop-down liste + Autre… | `<InlineComboCell>` | `components/inline/combo-cell.tsx` |
| Multi-select avec tags + Autre… | `<InlineMultiComboCell>` | `components/inline/multi-combo-cell.tsx` |
| Saisie texte inline | `<InlineTextCell>` | `components/inline/index.ts` |
| Saisie nombre / FCFA | `<InlineNumberCell>` | `components/inline/index.ts` |
| Saisie date | `<InlineDateCell>` | `components/inline/index.ts` |
| Sélecteur équipe (responsable + N membres) | `<TeamPickerCompact>` | `components/equipe/team-picker.tsx` |
| Menu 3 points actions | (template) | Suivre `client-actions-menu.tsx` |
| Datalist suggestions ville | inline `<datalist>` | natif HTML |
| Datalist 100+ postes | `POSTES_SUGGESTIONS` | `lib/constants/postes.ts` |

**Pour les listes contrôlées** : voir `lib/constants/legal.ts` (juridictions, dossiers, audiences) et `lib/constants/biblio.ts` (catégories doc, domaines juridiques).

---

## 6. Points d'attention transverses

- **Bibliothèque** : la table supporte désormais l'édition rapide single-click (titre, catégorie, domaine, tags multi avec custom, juridiction, date, référence). ✅
- **Dossiers** : la table supporte désormais l'édition rapide pour Type / Nature (avec Autre) / État procédure (avec Autre) / Statut. ✅
- **Pattern Notion/Excel/Airtable** appliqué aux tables Clients, Dossiers, Bibliothèque. À étendre à Audiences en sprint suivant.

---

## Fin du brief

Ce document est la référence officielle pour la finalisation des formulaires. Les sprints I-1 et I-2 sont prioritaires car ce sont les seuls modules où le bouton de création reste sur un `alert()`.
