import { safeDict } from "./safe-dict"
/**
 * Listes contrôlées du module Bibliothèque.
 * Adapté au contexte juridique nigérien + OHADA.
 */

/* ============================================================
   Catégories (5 + Autre)
   ============================================================ */

export const DOC_CATEGORIES = {
    JURISPRUDENCE: { label: "Jurisprudence", chip: "bg-primary-fixed text-primary" },
    DECISION_JUSTICE: { label: "Décision de Justice", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    DOCTRINE: { label: "Doctrine", chip: "bg-[#e8f5e9] text-[#166534]" },
    MODELE: { label: "Modèle", chip: "bg-accent/10 text-primary" },
    INTERNE: { label: "Document Interne", chip: "bg-surface-container-high text-on-surface-variant" },
    AUTRE: { label: "Autre", chip: "bg-surface-container text-outline" },
} as const

export type DocCategorieKey = keyof typeof DOC_CATEGORIES

/* ============================================================
   Domaine juridique (utilisé comme dimension principale de classement)
   ============================================================ */

/**
 * Domaines juridiques — alignés sur les domaines d'expertise déclarés par le cabinet
 * SCPA Kadri Legal (cf. site kadrilegal.net) + couvre aussi les domaines transverses.
 */
export const DOMAINES_JURIDIQUES = {
    AFFAIRES: { label: "Droit des Affaires / Sociétés", icon: "business_center" },
    SOCIAL: { label: "Droit Social", icon: "groups" },
    ADMINISTRATIF: { label: "Droit Administratif Général", icon: "account_balance" },
    INVESTISSEMENT: { label: "Investissement / PPP", icon: "handshake" },
    TIC: { label: "Droit des TIC", icon: "router" },
    FISCAL: { label: "Droit Fiscal", icon: "receipt_long" },
    BANCAIRE: { label: "Droit Bancaire", icon: "account_balance_wallet" },
    RECOUVREMENT: { label: "Recouvrement de créances", icon: "request_quote" },
    OHADA: { label: "OHADA", icon: "public" },
    CIVIL: { label: "Droit Civil", icon: "balance" },
    COMMERCIAL: { label: "Droit Commercial", icon: "store" },
    PENAL: { label: "Droit Pénal", icon: "gavel" },
    TRAVAIL: { label: "Droit du Travail", icon: "engineering" },
    PROPRIETE_INTELLECTUELLE: { label: "Propriété Intellectuelle", icon: "copyright" },
    MINIER_PETROLIER: { label: "Droit Minier / Pétrolier", icon: "oil_barrel" },
    FONCIER: { label: "Droit Foncier", icon: "landscape" },
    COUTUMIER: { label: "Droit Coutumier", icon: "diversity_3" },
    CONSTITUTIONNEL: { label: "Droit Constitutionnel", icon: "history_edu" },
    INTL: { label: "Droit International", icon: "language" },
    AUTRE: { label: "Autre", icon: "category" },
} as const

export type DomaineJuridiqueKey = keyof typeof DOMAINES_JURIDIQUES

/* ============================================================
   Type de document
   ============================================================ */

export const DOC_TYPES = {
    ARRET: "Arrêt",
    JUGEMENT: "Jugement",
    ORDONNANCE: "Ordonnance",
    AVIS: "Avis",
    DECRET: "Décret",
    LOI: "Loi",
    ARTICLE: "Article",
    OUVRAGE: "Ouvrage",
    THESE: "Thèse",
    MEMOIRE: "Mémoire",
    NOTE: "Note",
    COMMENTAIRE: "Commentaire",
    CHRONIQUE: "Chronique",
    CONTRAT: "Contrat",
    PROCEDURE: "Procédure",
    FORMULAIRE: "Formulaire",
    AUTRE: "Autre",
} as const

export type DocTypeKey = keyof typeof DOC_TYPES

/* ============================================================
   Niveau de juridiction (pour jurisprudences/décisions)
   ============================================================ */

export const NIVEAUX_JURIDICTION = {
    INSTANCE: "Tribunal d'Instance",
    GRANDE_INSTANCE: "Tribunal de Grande Instance",
    COMMERCE: "Tribunal de Commerce",
    ADMIN: "Tribunal Administratif",
    APPEL: "Cour d'Appel",
    ETAT: "Cour d'État",
    SUPREME: "Cour Suprême",
    CCJA: "CCJA (OHADA)",
    ARBITRAL: "Tribunal Arbitral",
    AUTRE: "Autre",
} as const

export type NiveauJuridictionKey = keyof typeof NIVEAUX_JURIDICTION

/* ============================================================
   Issue (favorable / défavorable / mixte) — jurisprudence uniquement
   ============================================================ */

export const ISSUES_JURIS = {
    FAVORABLE: {
        label: "Favorable",
        chip: "text-[#166534] bg-[#e8f5e9] border border-[#bbf7d0]",
        icon: "check_circle",
    },
    DEFAVORABLE: {
        label: "Défavorable",
        chip: "text-error bg-error-container/40 border border-error/30",
        icon: "cancel",
    },
    MIXTE: {
        label: "Mixte",
        chip: "text-on-tertiary-fixed-variant bg-tertiary-fixed-dim/60 border border-outline-variant",
        icon: "rule",
    },
    NA: {
        label: "Non applicable",
        chip: "text-outline bg-surface-container border border-outline-variant",
        icon: "remove",
    },
} as const

export type IssueJurisKey = keyof typeof ISSUES_JURIS
