// Dossier (Case) Types

export type DossierStatus =
    | "EN_COURS"        // Active
    | "EN_ATTENTE"      // Pending
    | "CLOTURE"         // Closed
    | "ARCHIVE"         // Archived

export type DossierPriorite = "HAUTE" | "MOYENNE" | "BASSE"

export type TypeAffaire =
    | "CIVIL"
    | "PENAL"
    | "COMMERCIAL"
    | "ADMINISTRATIF"
    | "SOCIAL"
    | "AUTRE"

export type PartieType = "DEMANDEUR" | "DEFENDEUR" | "TIERS"

export interface Partie {
    id: string
    clientId: string           // Reference to Client
    type: PartieType
    qualite?: string           // e.g., "Plaignant", "Témoin"
}

export interface Juridiction {
    nom: string
    ville: string
    numeroRG?: string          // Numéro de Rôle Général
}

export interface DossierFolder {
    id: string
    name: string
    type: "FOLDER"
    parentId: string | null    // null if root
    createdAt: string
}

export interface Document {
    id: string
    nom: string
    type: string               // e.g., "Assignation", "Jugement", "Pièce"
    folderId: string | null    // null if root
    dateAjout: string
    url?: string               // File path or URL
    taille?: number            // Size in bytes
}

export interface Audience {
    id: string
    date: string
    heure: string
    juridiction: string
    type: string               // e.g., "Plaidoirie", "Mise en état"
    statut: "PLANIFIEE" | "TERMINEE" | "REPORTEE"
    notes?: string
}

export interface Dossier {
    id: string
    numeroDossier: string      // e.g., "DOS-2024-001"
    intitule: string           // Case title
    typeAffaire: TypeAffaire
    statut: DossierStatus
    priorite: DossierPriorite

    // Parties
    parties: Partie[]

    // Juridiction
    juridiction: Juridiction

    // Dates
    dateOuverture: string
    dateCloture?: string
    dateModification: string

    // Content
    folders: DossierFolder[]   // Virtual file system
    documents: Document[]
    audiences: Audience[]

    // Financial
    montantHonoraires?: number
    montantProvision?: number

    // Notes
    description?: string
    notes?: string
}

// Form Data Types
export interface DossierFormData {
    intitule: string
    typeAffaire: TypeAffaire
    priorite: DossierPriorite
    clientIds: string[]        // Multiple clients can be linked
    juridictionNom: string
    juridictionVille: string
    numeroRG?: string
    description?: string
    montantHonoraires?: number
    montantProvision?: number
}

// Statistics
export interface DossierStats {
    total: number
    enCours: number
    enAttente: number
    clotures: number
    prochaineDateAudience?: string
}
