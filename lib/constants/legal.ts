import { safeDict } from "./safe-dict"
/**
 * Listes contrôlées du cabinet KADRI LEGAL.
 * Source : template Excel KADRI_LEGAL_Template.xlsx (script Python du cabinet).
 * Utilisé comme dropdowns dans le CRM Clients et le module Dossiers.
 */

export const AVOCATS_CABINET = [
    "Me Oumarou Sanda KADRI",
    "Me Mahaman Rabiou OUMAROU",
    "Me Ali KADRI",
    "Me Mariama ABDOU ISSA",
    "Me Razak",
] as const

export type AvocatCabinet = (typeof AVOCATS_CABINET)[number]

export const HONORAIRES_TYPES = [
    "Honoraires au temps passé",
    "Honoraires au forfait",
    "Honoraires de résultat",
    "Convention mensuelle",
    "Convention trimestrielle",
    "Convention annuelle",
    "Facturation hors convention",
] as const

export type HonorairesType = (typeof HONORAIRES_TYPES)[number]

export const PHASES_HONORAIRES = [
    "Première instance",
    "Appel",
    "Cassation",
    "Procédures particulières",
    "Unique / Global",
] as const

export type PhaseHonoraires = (typeof PHASES_HONORAIRES)[number]

export const MODE_HONORAIRE = [
    "FORFAIT",
    "POURCENTAGE",
] as const

export type ModeHonoraire = (typeof MODE_HONORAIRE)[number]

export const NATURES_AFFAIRE = [
    "Conseil / Assistance",
    "Contentieux / Judiciaire",
    "Droit des Affaires / Sociétés",
    "Droit Social / Travail",
    "Droit Administratif",
    "Investissement / PPP",
    "Droit des TIC",
    "Droit Fiscal",
    "Droit Bancaire",
    "Recouvrement de créances",
    "Droit Pénal",
    "Propriété Intellectuelle",
    "Droit Minier / Pétrolier",
    "Autre",
] as const

export type NatureAffaire = (typeof NATURES_AFFAIRE)[number]

/**
 * Suggestions d'états de procédure les plus fréquents au Niger.
 * Liste libre — l'utilisateur peut saisir sa propre valeur via InlineComboCell.
 */
export const ETATS_PROCEDURE_SUGGESTIONS: readonly string[] = [
    "En attente de jugement",
    "En cours d'instruction",
    "Mise en état",
    "Conclusions échangées",
    "Conclusions récapitulatives",
    "Audience de plaidoirie fixée",
    "Délibéré en cours",
    "Délibéré rabattu",
    "Décision rendue — appel possible",
    "Appel interjeté",
    "Cassation en cours",
    "Exécution forcée",
    "Recouvrement amiable",
    "Procédure suspendue",
    "Conciliation en cours",
    "Médiation",
    "Expertise judiciaire en cours",
    "Saisie conservatoire en cours",
    "Référé",
    "Phase d'enquête préliminaire",
    "Information judiciaire",
    "Renvoi",
    "Désistement",
    "Transaction négociée",
    "Clos — exécuté",
] as const

/** Types de dossier (codes courts pour badges + labels lisibles) */
export const DOSSIER_TYPES = {
    CIVIL: { code: "CIV", label: "Civil" },
    COMMERCIAL: { code: "COM", label: "Commercial" },
    PENAL: { code: "PEN", label: "Pénal" },
    ADMINISTRATIF: { code: "ADM", label: "Administratif" },
    SOCIAL: { code: "SOC", label: "Social" },
    COUTUMIERE: { code: "COU", label: "Coutumière" },
    AUTRE: { code: "AUT", label: "Autre" },
} as const

export type DossierTypeKey = keyof typeof DOSSIER_TYPES

/**
 * Liste des juridictions du Niger reconnues par le cabinet KADRI LEGAL.
 * Source : organigramme + workflow client.
 */
export const JURIDICTIONS_NIGER = [
    // Tribunaux d'Instance
    "TI Niamey",
    // Tribunaux de Grande Instance
    "TGI Hors-Classe Niamey",
    "TGI Maradi",
    "TGI Agadez",
    "TGI Diffa",
    "TGI Dosso",
    "TGI Tahoua",
    "TGI Tillabéry",
    "TGI Zinder",
    // Tribunal de Commerce
    "Tribunal de Commerce de Niamey",
    // Tribunaux d'Arrondissement Communaux
    "TAC I Niamey",
    "TAC II Niamey",
    "TAC III Niamey",
    "TAC IV Niamey",
    "TAC V Niamey",
    // Tribunal Administratif
    "Tribunal Administratif de Niamey",
    // Cours d'appel
    "Cour d'Appel de Niamey",
    "Cour d'Appel de Zinder",
    "Cour d'Appel de Tahoua",
    // Hautes juridictions
    "Cour d'État du Niger",
    "Cour Suprême du Niger",
    // Juridiction OHADA
    "CCJA (Cour Commune de Justice et d'Arbitrage)",
] as const

export type JuridictionNiger = (typeof JURIDICTIONS_NIGER)[number]

/** Statuts dossier avec labels et couleurs sémantiques */
export const DOSSIER_STATUTS = {
    EN_COURS: { label: "Actif", tone: "success" as const },
    EN_ATTENTE: { label: "Suspendu", tone: "warning" as const },
    URGENT: { label: "Urgent", tone: "error" as const },
    CLOTURE: { label: "Clôturé", tone: "neutral" as const },
    TERMINE: { label: "Terminé", tone: "neutral" as const },
    ARCHIVE: { label: "Archivé", tone: "muted" as const },
} as const

export type DossierStatutKey = keyof typeof DOSSIER_STATUTS

/** Catégories : dossier client (lié à un client) ou administratif/interne */
export const DOSSIER_KIND = {
    CLIENT: { label: "Dossier client", prefix: "DOS" },
    ADMIN: { label: "Dossier interne", prefix: "ADM" },
} as const

export type DossierKindKey = keyof typeof DOSSIER_KIND

/** Natures d'audience — code couleur stable (utilisé sur la timeline + calendrier) */
export const AUDIENCE_NATURES = {
    PLAIDOIRIE: { label: "Plaidoirie", color: "#502e0f", chip: "bg-primary-fixed text-primary" },
    MISE_EN_ETAT: { label: "Mise en état", color: "#614924", chip: "bg-tertiary-fixed text-on-tertiary-fixed" },
    REFERE: { label: "Référé", color: "#ba1a1a", chip: "bg-error-container text-on-error-container" },
    CONCILIATION: { label: "Conciliation", color: "#166534", chip: "bg-[#e8f5e9] text-[#166534]" },
    DELIBERE: { label: "Délibéré", color: "#8b5cf6", chip: "bg-purple-100 text-purple-700" },
    RENVOI: { label: "Renvoi", color: "#83746b", chip: "bg-surface-container-high text-on-surface-variant" },
    AUTRE: { label: "Autre", color: "#914c00", chip: "bg-secondary-fixed text-on-secondary-fixed" },
} as const

export type AudienceNatureKey = keyof typeof AUDIENCE_NATURES

/** Statuts audience (état général du process) */
export const AUDIENCE_STATUTS = {
    A_VENIR: { label: "À venir", chip: "bg-primary-fixed text-primary" },
    TERMINEE: { label: "Tenue", chip: "bg-[#e8f5e9] text-[#166534]" },
    REPORTEE: { label: "Reportée", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    ANNULEE: { label: "Annulée", chip: "bg-error-container text-on-error-container" },
} as const

export type AudienceStatutKey = keyof typeof AUDIENCE_STATUTS

/**
 * Résultat d'une audience tenue (renseigné dans le compte-rendu).
 * Vocabulaire judiciaire du cabinet KADRI LEGAL.
 */
export const RESULTATS_AUDIENCE = {
    RENVOI: { label: "Renvoi", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    PLAIDOIRIE: { label: "Plaidoirie", chip: "bg-primary-fixed text-primary" },
    DELIBERE: { label: "Délibéré", chip: "bg-purple-100 text-purple-700" },
    DELIBERE_RABATTU: { label: "Délibéré rabattu", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    DELIBERE_PROROGE: { label: "Délibéré prorogé", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    DECISION_RENDUE: { label: "Décision rendue", chip: "bg-[#e8f5e9] text-[#166534]" },
} as const

export type ResultatAudienceKey = keyof typeof RESULTATS_AUDIENCE

/** Statuts tâche — simples, 3 états + 1 d'annulation */
export const TACHE_STATUTS = {
    A_FAIRE: { label: "À faire", chip: "bg-surface-container-high text-on-surface-variant", dot: "bg-outline" },
    EN_COURS: { label: "En cours", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant", dot: "bg-tertiary" },
    FAIT: { label: "Fait", chip: "bg-[#e8f5e9] text-[#166534]", dot: "bg-[#166534]" },
    ANNULE: { label: "Annulé", chip: "bg-surface-container text-outline", dot: "bg-outline-variant" },
} as const

export type TacheStatutKey = keyof typeof TACHE_STATUTS

/** Priorités tâche */
export const TACHE_PRIORITES = {
    BASSE: { label: "Basse", chip: "text-outline", icon: "low_priority" },
    MOYENNE: { label: "Moyenne", chip: "text-on-surface-variant", icon: "horizontal_rule" },
    HAUTE: { label: "Haute", chip: "text-error font-semibold", icon: "priority_high" },
    URGENTE: { label: "Urgente", chip: "text-error font-bold", icon: "warning" },
} as const

export type TachePrioriteKey = keyof typeof TACHE_PRIORITES

/* ============================================================
   DILIGENCES — actes & démarches de procédure (agenda de suivi)
   ============================================================ */

/** Nature de l'acte / de la démarche à accomplir */
export const DILIGENCE_TYPES = {
    CONCLUSIONS: { label: "Conclusions", icon: "description" },
    ASSIGNATION: { label: "Assignation", icon: "gavel" },
    ACTE_APPEL: { label: "Acte d'appel", icon: "trending_up" },
    POURVOI_CASSATION: { label: "Pourvoi en cassation", icon: "account_balance" },
    SIGNIFICATION: { label: "Signification", icon: "mark_email_read" },
    REQUETE: { label: "Requête", icon: "post_add" },
    CONSTITUTION: { label: "Constitution d'avocat", icon: "badge" },
    DEPOT_PIECES: { label: "Dépôt de pièces", icon: "folder_open" },
    SOMMATION: { label: "Sommation", icon: "campaign" },
    RELANCE: { label: "Relance", icon: "forward_to_inbox" },
    CONSULTATION: { label: "Consultation / Note", icon: "menu_book" },
    PREPARATION_PLAIDOIRIE: { label: "Préparation plaidoirie", icon: "record_voice_over" },
    RDV_CLIENT: { label: "Rendez-vous client", icon: "handshake" },
    AUTRE: { label: "Autre", icon: "more_horiz" },
} as const

export type DiligenceTypeKey = keyof typeof DILIGENCE_TYPES

/** Statuts diligence — calque sur les tâches mais vocabulaire procédural */
export const DILIGENCE_STATUTS = {
    A_FAIRE: { label: "À faire", chip: "bg-surface-container-high text-on-surface-variant", dot: "bg-outline" },
    EN_COURS: { label: "En cours", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant", dot: "bg-tertiary" },
    ACCOMPLIE: { label: "Accomplie", chip: "bg-[#e8f5e9] text-[#166534]", dot: "bg-[#166534]" },
    ANNULEE: { label: "Annulée", chip: "bg-surface-container text-outline", dot: "bg-outline-variant" },
} as const

export type DiligenceStatutKey = keyof typeof DILIGENCE_STATUTS

/** Priorités diligence — réutilise le vocabulaire des tâches */
export const DILIGENCE_PRIORITES = TACHE_PRIORITES
export type DiligencePrioriteKey = TachePrioriteKey
