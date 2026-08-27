/**
 * Données mockées pour le module Dossiers — utilisées tant que la DB n'est pas branchée.
 *
 * Architecture : chaque dossier transporte ses sub-collections (factures, audiences, files, activity)
 * pour simuler l'agrégation côté API. Quand on connectera Prisma, ces sub-collections viendront
 * de queries séparées (voir ARCHITECTURE_FINANCE_DOSSIER.md §6).
 */

import type {
    DossierKindKey,
    DossierStatutKey,
    DossierTypeKey,
    NatureAffaire,
    PhaseHonoraires,
    ModeHonoraire,
} from "@/lib/constants/legal"
import { mockClients, type MockClient } from "@/lib/mock/clients"

export interface DossierFacture {
    id: string
    numero: string
    direction: "EMISE" | "RECUE"
    date: string
    dateEcheance: string | null
    montantHT: number
    montantTVA: number
    montantTTC: number
    montantPaye: number
    statut: "PAYEE" | "PARTIELLE" | "IMPAYEE"
    fournisseur: string | null // pour reçues
    description: string
}

export interface DossierAudience {
    id: string
    date: string
    heure: string | null
    titre: string
    juridiction: string | null
    statut: "A_VENIR" | "TERMINEE" | "REPORTEE" | "ANNULEE"
}

export type FolderColorKey = "blue" | "red" | "green" | "orange" | "purple" | "yellow" | "pink" | "gray"

export interface DossierFile {
    id: string
    parentId: string | null
    name: string
    type: "FOLDER" | "FILE"
    mimeType: string | null
    size: number | null
    updatedAt: string
    /** Couleur sémantique du dossier (8 options). Ignorée pour les fichiers. */
    couleur?: FolderColorKey
    /** URL de téléchargement (signed URL en prod, mock null pour l'instant). */
    url?: string | null
}

export interface DossierActivity {
    id: string
    label: string
    sublabel: string | null
    at: string
    important: boolean
}

export interface DossierHonoraire {
    id: string
    phase: PhaseHonoraires
    type: ModeHonoraire
    montant: number
}

export interface DossierProvision {
    id: string
    date: string
    montant: number
    description: string
}

export interface DossierRetrocession {
    beneficiaire: string
    type: ModeHonoraire
    montant: number
}

export interface MockDossier {
    id: string
    numero: string // DOS-YY-NNNN ou ADM-YY-NNNN
    kind: DossierKindKey
    type: DossierTypeKey
    nature: NatureAffaire
    titre: string // intitulé court de l'affaire
    statut: DossierStatutKey
    etatProcedure: string | null // texte libre court ("En attente de jugement")
    juridiction: string | null
    clientId: string | null // null si kind = ADMIN
    partiesAdverses: string[] // noms des parties adverses
    dateOuverture: string
    dateCloture: string | null
    description: string | null
    /** Liste des honoraires convenus par phase */
    honoraires: DossierHonoraire[]
    /** Liste des provisions versées (PV) */
    provisionsVersees: DossierProvision[]
    /** Rétrocession optionnelle d'honoraires */
    retrocession: DossierRetrocession | null
    /**
     * Membre référent du dossier. Quand null, hérité du `client.responsableId`.
     * Apparaît sur la ligne table en avatar.
     */
    responsableId: string | null
    /**
     * Équipe partagée — membres autorisés en plus du responsable. Hérité du
     * client à la création par défaut.
     */
    equipeIds: string[]
    factures: DossierFacture[]
    audiences: DossierAudience[]
    files: DossierFile[]
    activity: DossierActivity[]
}

/* ============================================================
   Calculs financiers — exposés pour la section finance
   ============================================================ */

export interface DossierFinance {
    honoraires: DossierHonoraire[]
    retrocession: DossierRetrocession | null
    totalHonorairesForfait: number
    facturesEmises: number
    facturesRecues: number
    montantFactureHT: number
    montantFactureTTC: number
    montantPaye: number
    montantImpaye: number
    fraisEngages: number
    resteAFacturer: number | null
    tauxFacturation: number | null
    tauxRecouvrement: number
    margeBrute: number
    totalProvisionsVersees: number
}

export function computeFinance(dossier: MockDossier): DossierFinance {
    // Guards : factures et honoraires peuvent être null/undefined depuis l'API
    const factures = Array.isArray(dossier.factures) ? dossier.factures : []
    const honos: DossierHonoraire[] = Array.isArray(dossier.honoraires) ? dossier.honoraires as DossierHonoraire[] : []
    const retrocession: DossierRetrocession | null =
        dossier.retrocession && typeof dossier.retrocession === "object" && !Array.isArray(dossier.retrocession)
            ? dossier.retrocession as DossierRetrocession
            : null

    const emises = factures.filter((f) => f.direction === "EMISE")
    const recues = factures.filter((f) => f.direction === "RECUE")

    const montantFactureHT = emises.reduce((s, f) => s + f.montantHT, 0)
    const montantFactureTTC = emises.reduce((s, f) => s + f.montantTTC, 0)
    const montantPaye = emises.reduce((s, f) => s + f.montantPaye, 0)
    const montantImpaye = montantFactureTTC - montantPaye

    const fraisEngages = recues.reduce((s, f) => s + f.montantTTC, 0)

    const provisions = Array.isArray(dossier.provisionsVersees) ? dossier.provisionsVersees : []
    const totalProvisionsVersees = provisions.reduce((acc, p) => acc + p.montant, 0)

    const totalHonorairesForfait = honos
        .filter(h => h.type === "FORFAIT")
        .reduce((acc, h) => acc + h.montant, 0)

    const hasForfait = honos.some(h => h.type === "FORFAIT")

    const resteAFacturer =
        hasForfait && totalHonorairesForfait > 0
            ? Math.max(0, totalHonorairesForfait - montantFactureHT)
            : null

    const tauxFacturation =
        hasForfait && totalHonorairesForfait > 0
            ? Math.min(1, montantFactureHT / totalHonorairesForfait)
            : null

    const tauxRecouvrement = montantFactureTTC > 0 ? montantPaye / montantFactureTTC : 0
    const margeBrute = montantPaye - fraisEngages

    return {
        honoraires: honos,
        retrocession,
        totalHonorairesForfait,
        facturesEmises: emises.length,
        facturesRecues: recues.length,
        montantFactureHT,
        montantFactureTTC,
        montantPaye,
        montantImpaye,
        fraisEngages,
        resteAFacturer,
        tauxFacturation,
        tauxRecouvrement,
        margeBrute,
        totalProvisionsVersees,
    }
}

/* ============================================================
   Helpers
   ============================================================ */

function dateAt(year: number, month: number, day: number, hour = 10, minute = 0): string {
    return new Date(year, month - 1, day, hour, minute, 0).toISOString()
}

function daysAgo(d: number): string {
    const dt = new Date()
    dt.setDate(dt.getDate() - d)
    return dt.toISOString()
}

function daysFromNow(d: number, hour = 10, minute = 0): string {
    const dt = new Date()
    dt.setDate(dt.getDate() + d)
    dt.setHours(hour, minute, 0, 0)
    return dt.toISOString()
}

/** Récupère le client lié pour exposer son nom */
export function getClientForDossier(dossier: MockDossier): MockClient | null {
    // Préfère la relation embarquée par l'API (/api/dossiers inclut client), fallback sur les mocks (dev local).
    const embedded = (dossier as unknown as { client?: MockClient | null }).client
    if (embedded !== undefined) return embedded
    if (!dossier.clientId) return null
    return mockClients.find((c) => c.id === dossier.clientId) ?? null
}

/* ============================================================
   Mocks
   ============================================================ */

export const mockDossiers: MockDossier[] = []

export function getDossierById(id: string): MockDossier | null {
    return mockDossiers.find((d) => d.id === id) ?? null
}
