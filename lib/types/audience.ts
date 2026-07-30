
export type AudienceStatus = "UPCOMING" | "COMPLETED" | "CANCELLED" | "POSTPONED"

/**
 * Type d'aperçu utilisé par les routes API legacy.
 * Le modèle riche est `MockAudience` dans `lib/mock/audiences.ts`.
 */
export interface AudienceClientPreview {
    id: string
    numeroClient?: string
    raisonSociale?: string | null
    nom?: string | null
    prenom?: string | null
}

export interface AudienceDossierPreview {
    id: string
    numero: string
    titre: string
}

export interface Audience {
    id: string
    titre: string | null
    date: string
    heure?: string | null
    juridiction: string | null
    avocat: string | null
    clientId: string
    dossierId: string
    statut: string // "A_VENIR" | "TERMINEE" | "REPORTEE" | "ANNULEE"
    notes?: string | null
    client?: AudienceClientPreview
    dossier?: AudienceDossierPreview
}
