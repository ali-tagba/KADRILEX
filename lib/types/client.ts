// Client Types
export type ClientType = "PERSONNE_PHYSIQUE" | "PERSONNE_MORALE"

export type FormeJuridique =
    | "SA" // Société Anonyme
    | "SARL" // Société à Responsabilité Limitée
    | "SAS" // Société par Actions Simplifiée
    | "SASU" // Société par Actions Simplifiée Unipersonnelle
    | "SNC" // Société en Nom Collectif
    | "SCS" // Société en Commandite Simple
    | "GIE" // Groupement d'Intérêt Économique
    | "AUTRE"

export interface Contact {
    id: string
    nom: string
    prenom: string
    fonction: string
    email: string
    telephone: string
    estPrincipal: boolean
}

export interface PersonnePhysique {
    type: "PERSONNE_PHYSIQUE"
    nom: string
    prenom: string
    email: string
    telephone: string
    adresse: string
    ville: string
    profession?: string
}

export interface PersonneMorale {
    type: "PERSONNE_MORALE"
    raisonSociale: string
    formeJuridique: FormeJuridique
    numeroRCCM?: string
    email: string
    telephone: string
    adresse: string
    ville: string
    representantLegal: {
        nom: string
        prenom: string
        fonction: string
    }
}

export type ClientBase = PersonnePhysique | PersonneMorale

export type Client = ClientBase & {
    id: string
    contacts: Contact[]
    dateCreation: string
    dateModification: string
    notes?: string
}

// Form Data Types
export interface ClientFormData {
    type: ClientType
    // Personne Physique
    nom?: string
    prenom?: string
    profession?: string
    // Personne Morale
    raisonSociale?: string
    formeJuridique?: FormeJuridique
    numeroRCCM?: string
    representantLegal?: {
        nom: string
        prenom: string
        fonction: string
    }
    // Commun
    email: string
    telephone: string
    adresse: string
    ville: string
    contacts: Contact[]
    notes?: string
}

// Client Statistics
export interface ClientStats {
    totalDossiers: number
    dossiersActifs: number
    audiencesAVenir: number
    montantAttendu: number
    montantRecu: number
    montantRestant: number
}
