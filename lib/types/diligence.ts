/**
 * Type d'une diligence tel que renvoyé par /api/diligences (shape serveur).
 * Une diligence = un acte / une démarche de procédure avec un délai (échéance).
 */

import type {
    DiligenceTypeKey,
    DiligenceStatutKey,
    TachePrioriteKey,
} from "@/lib/constants/legal"
import type { MockClient } from "@/lib/mock/clients"

export interface DiligenceRefDossier {
    id: string
    numero: string
    titre: string
}

export interface DiligenceRefAudience {
    id: string
    numero: string
    titre: string
}

export interface DiligenceRecord {
    id: string
    numero: string
    titre: string
    description: string | null
    type: DiligenceTypeKey
    statut: DiligenceStatutKey
    priorite: TachePrioriteKey
    /** Délai / date butoir (ISO) — cœur de l'agenda */
    dateEcheance: string | null
    dateAccomplie: string | null
    dossierId: string | null
    clientId: string | null
    audienceId: string | null
    responsableId: string | null
    equipeIds: string[]
    notes: string | null
    client: MockClient | null
    dossier: DiligenceRefDossier | null
    audience: DiligenceRefAudience | null
    createdAt: string
    updatedAt: string
}

/** Brouillon émis par le formulaire de création/édition */
export interface DiligenceFormDraft {
    titre: string
    description: string
    type: DiligenceTypeKey
    statut: DiligenceStatutKey
    priorite: TachePrioriteKey
    /** Date locale yyyy-mm-dd (ou "" si pas d'échéance) */
    dateEcheance: string
    dossierId: string | null
    clientId: string | null
    audienceId: string | null
    responsableId: string | null
    equipeIds: string[]
}

export type DiligenceBucket =
    | "EN_RETARD"
    | "AUJOURDHUI"
    | "CETTE_SEMAINE"
    | "PLUS_TARD"
    | "SANS_ECHEANCE"
    | "ACCOMPLIES"

/**
 * Range une diligence dans un bucket d'agenda selon son échéance et son statut.
 * Les diligences accomplies/annulées vont dans le bucket ACCOMPLIES.
 */
export function bucketForDiligence(d: DiligenceRecord, now = new Date()): DiligenceBucket {
    if (d.statut === "ACCOMPLIE" || d.statut === "ANNULEE") return "ACCOMPLIES"
    if (!d.dateEcheance) return "SANS_ECHEANCE"

    const ech = new Date(d.dateEcheance)
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startEch = new Date(ech.getFullYear(), ech.getMonth(), ech.getDate())
    const diffDays = Math.round((startEch.getTime() - startToday.getTime()) / 86_400_000)

    if (diffDays < 0) return "EN_RETARD"
    if (diffDays === 0) return "AUJOURDHUI"
    if (diffDays <= 7) return "CETTE_SEMAINE"
    return "PLUS_TARD"
}

/** Nb de jours restants avant échéance (négatif = en retard). null si pas d'échéance. */
export function daysUntil(dateEcheance: string | null, now = new Date()): number | null {
    if (!dateEcheance) return null
    const ech = new Date(dateEcheance)
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startEch = new Date(ech.getFullYear(), ech.getMonth(), ech.getDate())
    return Math.round((startEch.getTime() - startToday.getTime()) / 86_400_000)
}
