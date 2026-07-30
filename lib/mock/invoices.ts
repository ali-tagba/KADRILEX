/**
 * Source de vérité unique des factures du cabinet.
 * Centralise factures émises (cabinet → client) + reçues (fournisseur → cabinet).
 * Les paiements sont inline dans chaque facture (sub-collection).
 */

import type {
    DirectionFactureKey,
    ModePaiementKey,
    StatutFactureKey,
    TypeFournisseurKey,
} from "@/lib/constants/finance"
import { deriveStatutFacture, TVA_NIGER } from "@/lib/constants/finance"

/* ============================================================
   Types
   ============================================================ */

export interface MockLigneFacture {
    id: string
    libelle: string
    quantite: number
    prixUnitaire: number
    /** Total HT = quantite × prixUnitaire (calculé à la création) */
    total: number
    /** Lien optionnel vers une audience (utile pour audit "facturé pour quelle prestation") */
    audienceId?: string | null
}

export interface MockPaiement {
    id: string
    factureId: string
    date: string // ISO
    montant: number
    mode: ModePaiementKey
    reference: string | null
    notes: string | null
    /** Preuve de paiement uploadée (path Supabase Storage) */
    preuveUrl?: string | null
}

export interface MockFournisseur {
    id: string
    nom: string
    type: TypeFournisseurKey
    nif?: string | null
    email?: string | null
    telephone?: string | null
    adresse?: string | null
}

export interface MockFacture {
    id: string
    numero: string
    direction: DirectionFactureKey
    type: "HONORAIRES" | "PROVISION" | "FRAIS" | "AUTRE"

    /** Émission ou réception */
    date: string
    dateEcheance: string | null

    /** Côté ÉMISE : qui paie ? */
    clientId: string | null
    dossierId: string | null
    audienceId: string | null

    /** Côté REÇUE : qui a émis vers nous ? */
    fournisseurId: string | null
    fournisseurNomLibre: string | null

    /** Montants (FCFA) */
    montantHT: number
    tvaRate: number
    montantTVA: number
    montantTTC: number
    /** Calculé depuis paiements (mais persisté pour rapidité de tri) */
    montantPaye: number

    /** Statut brut (auto-dérivé via deriveStatutFacture lors du calcul, mais on le persiste) */
    statut: StatutFactureKey

    lignes: MockLigneFacture[]
    paiements: MockPaiement[]

    description: string | null
    notes: string | null
    /** Pour factures REÇUES : scan PDF uploadé par l'utilisateur */
    attachmentUrl: string | null

    /** Pour factures ÉMISES : URL Storage du PDF généré par le cabinet */
    generatedPdfUrl?: string | null
    /** Date de la dernière génération PDF — sert à savoir si à jour */
    generatedPdfAt?: string | null

    /** Refacturation (pour reçues uniquement) */
    refacturable: boolean
    refactureeViaFactureId: string | null

    createdAt: string
    updatedAt: string

    /**
     * Relations embarquées renvoyées par l'API (/api/invoices inclut client/dossier/
     * fournisseur). Optionnelles — l'affichage les préfère aux lookups mock (vides en prod).
     */
    client?: {
        id: string
        type: string
        raisonSociale: string | null
        nom: string | null
        prenom: string | null
    } | null
    dossier?: { id: string; numero: string; titre: string } | null
    fournisseur?: { id: string; nom: string } | null
}

/** Nom d'affichage d'un client embarqué dans une facture (sans dépendre de MockClient). */
export function factureClientName(c: NonNullable<MockFacture["client"]>): string {
    if (c.raisonSociale) return c.raisonSociale
    return `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "Client"
}

/* ============================================================
   Helpers
   ============================================================ */

function dateAt(year: number, month: number, day: number): string {
    return new Date(year, month - 1, day, 10, 0).toISOString()
}
function daysAgo(d: number): string {
    const dt = new Date()
    dt.setDate(dt.getDate() - d)
    return dt.toISOString()
}
function daysFromNow(d: number): string {
    const dt = new Date()
    dt.setDate(dt.getDate() + d)
    return dt.toISOString()
}

/* ============================================================
   Fournisseurs (factures reçues)
   ============================================================ */

export const mockFournisseurs: MockFournisseur[] = []

/* ============================================================
   Factures (émises + reçues) — données Niger réalistes
   ============================================================ */

export const mockFactures: MockFacture[] = []

/* ============================================================
   Re-export tous les paiements à plat (utile pour /api/paiements)
   ============================================================ */

export const mockPaiements: MockPaiement[] = mockFactures.flatMap((f) => f.paiements)

/* ============================================================
   Helpers pour mutation côté front (mock-mode)
   ============================================================ */

/** Recalcule les champs dérivés d'une facture (montantPaye, statut) après ajout/retrait de paiements */
export function recomputeFacture(f: MockFacture): MockFacture {
    // Guard : paiements peut être undefined si l'API n'a pas inclus la relation
    const paiements = f.paiements ?? []
    const montantPaye = paiements.reduce((s, p) => s + p.montant, 0)
    const statut = deriveStatutFacture({
        statutBrut: f.statut,
        montantTTC: f.montantTTC,
        montantPaye,
        dateEcheance: f.dateEcheance,
    })
    return { ...f, montantPaye, statut, updatedAt: new Date().toISOString() }
}

/* ============================================================
   Calculs dérivés — getClientFinance / getDossierFinance / getCabinetFinance
   ============================================================ */

export interface ClientFinance {
    factures: MockFacture[]
    facturesEmises: number
    montantTotalFacture: number // TTC
    montantTotalEncaisse: number
    soldeDu: number
    facturesEnRetard: number
    derniereFacture: { date: string; montant: number; statut: StatutFactureKey } | null
}

export function getClientFinance(clientId: string): ClientFinance {
    const factures = mockFactures.filter(
        (f) => f.direction === "EMISE" && f.clientId === clientId && f.statut !== "ANNULEE"
    )
    const facturesEmises = factures.filter((f) => f.statut !== "BROUILLON").length
    const montantTotalFacture = factures
        .filter((f) => f.statut !== "BROUILLON")
        .reduce((s, f) => s + f.montantTTC, 0)
    const montantTotalEncaisse = factures.reduce((s, f) => s + f.montantPaye, 0)
    const soldeDu = montantTotalFacture - montantTotalEncaisse
    const facturesEnRetard = factures.filter((f) => f.statut === "EN_RETARD").length
    const sortedByDate = [...factures].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const derniere = sortedByDate[0]
    return {
        factures,
        facturesEmises,
        montantTotalFacture,
        montantTotalEncaisse,
        soldeDu,
        facturesEnRetard,
        derniereFacture: derniere
            ? { date: derniere.date, montant: derniere.montantTTC, statut: derniere.statut }
            : null,
    }
}

export interface DossierFinanceCalc {
    facturesEmises: number
    facturesRecues: number
    montantFactureHT: number
    montantFactureTTC: number
    montantPaye: number
    montantImpaye: number
    fraisEngages: number
    fraisRefacturablesEnAttente: number
}

export function getDossierFinanceFromInvoices(dossierId: string): DossierFinanceCalc {
    const liees = mockFactures.filter(
        (f) => f.dossierId === dossierId && f.statut !== "ANNULEE" && f.statut !== "BROUILLON"
    )
    const emises = liees.filter((f) => f.direction === "EMISE")
    const recues = liees.filter((f) => f.direction === "RECUE")
    const montantFactureHT = emises.reduce((s, f) => s + f.montantHT, 0)
    const montantFactureTTC = emises.reduce((s, f) => s + f.montantTTC, 0)
    const montantPaye = emises.reduce((s, f) => s + f.montantPaye, 0)
    const fraisEngages = recues.reduce((s, f) => s + f.montantTTC, 0)
    const fraisRefacturablesEnAttente = recues
        .filter((f) => f.refacturable && !f.refactureeViaFactureId)
        .reduce((s, f) => s + f.montantTTC, 0)
    return {
        facturesEmises: emises.length,
        facturesRecues: recues.length,
        montantFactureHT,
        montantFactureTTC,
        montantPaye,
        montantImpaye: montantFactureTTC - montantPaye,
        fraisEngages,
        fraisRefacturablesEnAttente,
    }
}

export interface CabinetFinance {
    /** Total TTC factures émises validées (toutes confondues) */
    chiffreAffaires: number
    /** Encaissé total */
    encaisse: number
    /** Reste dû par les clients */
    enAttenteEncaissement: number
    /** Nombre factures en retard côté clients */
    enRetardClients: number
    /** Nombre factures reçues en retard (à payer) */
    enRetardFournisseurs: number
    /** Frais avancés à refacturer */
    fraisAvancesARefacturer: number
    /** Frais reçus non encore payés (dette fournisseurs) */
    detteFournisseurs: number
}

export function getCabinetFinance(): CabinetFinance {
    const emises = mockFactures.filter(
        (f) => f.direction === "EMISE" && f.statut !== "BROUILLON" && f.statut !== "ANNULEE"
    )
    const recues = mockFactures.filter((f) => f.direction === "RECUE" && f.statut !== "ANNULEE")
    const chiffreAffaires = emises.reduce((s, f) => s + f.montantTTC, 0)
    const encaisse = emises.reduce((s, f) => s + f.montantPaye, 0)
    const enAttenteEncaissement = chiffreAffaires - encaisse
    const enRetardClients = emises.filter((f) => f.statut === "EN_RETARD").length
    const enRetardFournisseurs = recues.filter((f) => f.statut === "EN_RETARD").length
    const fraisAvancesARefacturer = recues
        .filter((f) => f.refacturable && !f.refactureeViaFactureId)
        .reduce((s, f) => s + f.montantTTC, 0)
    const detteFournisseurs = recues.reduce((s, f) => s + (f.montantTTC - f.montantPaye), 0)
    return {
        chiffreAffaires,
        encaisse,
        enAttenteEncaissement,
        enRetardClients,
        enRetardFournisseurs,
        fraisAvancesARefacturer,
        detteFournisseurs,
    }
}
