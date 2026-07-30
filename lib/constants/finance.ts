import { safeDict } from "./safe-dict"
/**
 * Constantes du module Finance.
 * Couvre : facturation (émises/reçues), paiements, dépenses internes, paie.
 * Adapté au contexte cabinet d'avocats Niger : FCFA, TVA 19%, CNSS, mobile money.
 */

/* ============================================================
   STATUTS DE FACTURE
   ============================================================ */

export const STATUTS_FACTURE = {
    BROUILLON: { label: "Brouillon", chip: "bg-surface-container-high text-on-surface-variant" },
    EMISE: { label: "Émise", chip: "bg-primary-fixed text-primary" },
    PARTIELLE: { label: "Partielle", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    PAYEE: { label: "Payée", chip: "bg-[#e8f5e9] text-[#166534]" },
    EN_RETARD: { label: "En retard", chip: "bg-error-container text-on-error-container" },
    ANNULEE: { label: "Annulée", chip: "bg-surface-container text-outline line-through" },
} as const

export type StatutFactureKey = keyof typeof STATUTS_FACTURE

/* ============================================================
   DIRECTION DE FACTURE (Émise vers client / Reçue d'un fournisseur)
   ============================================================ */

export const DIRECTIONS_FACTURE = {
    EMISE: { label: "Émise", icon: "north_east", chip: "bg-primary-fixed text-primary" },
    RECUE: { label: "Reçue", icon: "south_west", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
} as const

export type DirectionFactureKey = keyof typeof DIRECTIONS_FACTURE

/* ============================================================
   MODES DE PAIEMENT (Niger : virement, mobile money, espèces, chèque, carte, prélèvement)
   ============================================================ */

export const MODES_PAIEMENT = {
    VIREMENT: { label: "Virement bancaire", icon: "account_balance" },
    MOBILE_MONEY: { label: "Mobile Money", icon: "phone_iphone" },
    ESPECES: { label: "Espèces", icon: "payments" },
    CHEQUE: { label: "Chèque", icon: "request_quote" },
    CARTE: { label: "Carte bancaire", icon: "credit_card" },
    PRELEVEMENT: { label: "Prélèvement", icon: "schedule_send" },
    AUTRE: { label: "Autre", icon: "more_horiz" },
} as const

export type ModePaiementKey = keyof typeof MODES_PAIEMENT

/* ============================================================
   TYPES DE FOURNISSEUR (factures reçues)
   ============================================================ */

export const TYPES_FOURNISSEUR = {
    HUISSIER: { label: "Huissier de justice", icon: "gavel" },
    EXPERT: { label: "Expert", icon: "school" },
    GREFFE: { label: "Greffe / Tribunal", icon: "account_balance" },
    BAILLEUR: { label: "Bailleur", icon: "domain" },
    PRESTATAIRE_SERVICE: { label: "Prestataire de services", icon: "work" },
    AUTRE: { label: "Autre", icon: "store" },
} as const

export type TypeFournisseurKey = keyof typeof TYPES_FOURNISSEUR

/* ============================================================
   CATÉGORIES DE DÉPENSES INTERNES (cabinet pures, non refacturables)
   ============================================================ */

export const CATEGORIES_DEPENSE = {
    LOYER: { label: "Loyer cabinet", icon: "domain", recurrentParDefaut: true, tvaSuggeree: 0 },
    ELECTRICITE: { label: "Électricité (NIGELEC)", icon: "bolt", recurrentParDefaut: true, tvaSuggeree: 19 },
    EAU: { label: "Eau (SEEN)", icon: "water_drop", recurrentParDefaut: true, tvaSuggeree: 0 },
    INTERNET: { label: "Internet", icon: "router", recurrentParDefaut: true, tvaSuggeree: 19 },
    TELEPHONE: { label: "Téléphone", icon: "phone", recurrentParDefaut: true, tvaSuggeree: 19 },
    FOURNITURES: { label: "Fournitures bureau", icon: "shopping_cart", recurrentParDefaut: false, tvaSuggeree: 19 },
    CARBURANT: { label: "Carburant / Frais auto", icon: "local_gas_station", recurrentParDefaut: false, tvaSuggeree: 19 },
    REPARATION: { label: "Réparation", icon: "build", recurrentParDefaut: false, tvaSuggeree: 19 },
    ENTRETIEN: { label: "Entretien", icon: "cleaning_services", recurrentParDefaut: false, tvaSuggeree: 19 },
    HOTEL: { label: "Hôtel", icon: "hotel", recurrentParDefaut: false, tvaSuggeree: 19 },
    VOYAGE: { label: "Voyage", icon: "flight", recurrentParDefaut: false, tvaSuggeree: 0 },
    RESTAURATION: { label: "Restauration", icon: "restaurant", recurrentParDefaut: false, tvaSuggeree: 19 },
    FOURNISSEURS: { label: "Fournisseurs", icon: "store", recurrentParDefaut: false, tvaSuggeree: 19 },
    ABONNEMENT_SOFTWARE: { label: "Abonnements logiciels", icon: "cloud", recurrentParDefaut: true, tvaSuggeree: 19 },
    FORMATION: { label: "Formation continue", icon: "school", recurrentParDefaut: false, tvaSuggeree: 0 },
    COTISATIONS: { label: "Cotisations Ordre / Pro", icon: "verified", recurrentParDefaut: true, tvaSuggeree: 0 },
    ASSURANCE: { label: "Assurance", icon: "shield", recurrentParDefaut: true, tvaSuggeree: 0 },
    SALAIRES: { label: "Salaires & Rémunérations", icon: "payments", recurrentParDefaut: true, tvaSuggeree: 0 },
    TAXES: { label: "Taxes", icon: "receipt_long", recurrentParDefaut: false, tvaSuggeree: 0 },
    IMPOTS: { label: "Impôts", icon: "account_balance", recurrentParDefaut: false, tvaSuggeree: 0 },
    FRAIS_BANCAIRES: { label: "Frais bancaires", icon: "account_balance_wallet", recurrentParDefaut: true, tvaSuggeree: 0 },
    DIVERS: { label: "Divers", icon: "widgets", recurrentParDefaut: false, tvaSuggeree: 0 },
    MAINTENANCE: { label: "Maintenance", icon: "build", recurrentParDefaut: false, tvaSuggeree: 19 },
    SOUS_TRAITANCE: { label: "Sous-traitance", icon: "handshake", recurrentParDefaut: false, tvaSuggeree: 19 },
    HONORAIRES: { label: "Honoraires", icon: "gavel", recurrentParDefaut: false, tvaSuggeree: 19 },
    AUTRE: { label: "Autre", icon: "more_horiz", recurrentParDefaut: false, tvaSuggeree: 19 },
} as const

export type CategorieDepenseKey = keyof typeof CATEGORIES_DEPENSE

/* ============================================================
   FRÉQUENCES DE RÉCURRENCE (dépenses, charges)
   ============================================================ */

export const FREQUENCES_RECURRENCE = {
    MENSUEL: { label: "Mensuel", multiplier: 1 },
    TRIMESTRIEL: { label: "Trimestriel", multiplier: 3 },
    SEMESTRIEL: { label: "Semestriel", multiplier: 6 },
    ANNUEL: { label: "Annuel", multiplier: 12 },
} as const

export type FrequenceRecurrenceKey = keyof typeof FREQUENCES_RECURRENCE

/* ============================================================
   PAIE — Statut bulletin + types de contrat + lignes
   ============================================================ */

export const STATUTS_BULLETIN = {
    BROUILLON: { label: "Brouillon", chip: "bg-surface-container-high text-on-surface-variant" },
    VALIDE: { label: "Validé", chip: "bg-primary-fixed text-primary" },
    VERSE: { label: "Versé", chip: "bg-[#e8f5e9] text-[#166534]" },
} as const

export type StatutBulletinKey = keyof typeof STATUTS_BULLETIN

export const STATUTS_CONTRAT = {
    ASSOCIE: { label: "Associé", icon: "stars" },
    COLLABORATEUR_CDI: { label: "Collaborateur CDI", icon: "badge" },
    COLLABORATEUR_CDD: { label: "Collaborateur CDD", icon: "schedule" },
    STAGIAIRE: { label: "Stagiaire", icon: "school" },
    SECRETAIRE_CDI: { label: "Secrétaire CDI", icon: "support_agent" },
    FREELANCE: { label: "Freelance", icon: "work" },
} as const

export type StatutContratKey = keyof typeof STATUTS_CONTRAT

export const TYPES_LIGNE_BULLETIN = {
    GAIN: { label: "Gain", signe: 1 },
    RETENUE: { label: "Retenue", signe: -1 },
    CHARGE_SALARIALE: { label: "Charge salariale", signe: -1 },
    CHARGE_PATRONALE: { label: "Charge patronale", signe: 0 }, // n'impacte pas le net
} as const

export type TypeLigneBulletinKey = keyof typeof TYPES_LIGNE_BULLETIN

/* ============================================================
   TAUX (paramétrables — Niger)
   ============================================================ */

/** TVA standard au Niger */
export const TVA_NIGER = 19

/** Charges sociales CNSS Niger (taux indicatifs — à confirmer avec le cabinet) */
export const TAUX_CNSS_SALARIE = 5.25 // % du brut retenu sur le salarié
export const TAUX_CNSS_EMPLOYEUR = 16.5 // % du brut payé par l'employeur en sus

/* ============================================================
   FORMATTERS — FCFA + dates
   ============================================================ */

/** Format complet : 1 250 000 FCFA */
export function formatFCFA(value: number | null | undefined): string {
    if (value === null || value === undefined) return "—"
    return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA"
}

/** Format compact : 1.2M FCFA, 250K FCFA */
export function formatFCFACompact(value: number | null | undefined): string {
    if (value === null || value === undefined) return "—"
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M FCFA`
    if (abs >= 1_000) return `${Math.round(value / 1_000)}K FCFA`
    return formatFCFA(value)
}

/** Format date courte fr : 12/05/26 */
export function formatDateCourte(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

/** Format date longue fr : 12 mai 2026 */
export function formatDateLongue(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

/** Mois français en toutes lettres : "Mai 2026" */
const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]
export function formatMoisLong(annee: number, mois: number): string {
    return `${MOIS_FR[mois - 1]} ${annee}`
}

/** Calcule TVA depuis HT */
export function calcTVA(montantHT: number, tauxTVA: number = TVA_NIGER): number {
    return Math.round((montantHT * tauxTVA) / 100)
}
/** Calcule TTC depuis HT */
export function calcTTC(montantHT: number, tauxTVA: number = TVA_NIGER): number {
    return montantHT + calcTVA(montantHT, tauxTVA)
}

/* ============================================================
   STATUT FACTURE auto-dérivé selon montants + dates
   ============================================================ */

export function deriveStatutFacture(args: {
    statutBrut: StatutFactureKey
    montantTTC: number
    montantPaye: number
    dateEcheance: string | null
}): StatutFactureKey {
    const { statutBrut, montantTTC, montantPaye, dateEcheance } = args
    if (statutBrut === "BROUILLON" || statutBrut === "ANNULEE") return statutBrut
    if (montantPaye >= montantTTC) return "PAYEE"
    if (dateEcheance && new Date(dateEcheance).getTime() < Date.now()) return "EN_RETARD"
    if (montantPaye > 0) return "PARTIELLE"
    return "EMISE"
}
