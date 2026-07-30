// Types pour le module Bibliothèque Documentaire

export type DocumentCategorie =
    | 'JURISPRUDENCE'
    | 'DECISION_JUSTICE'
    | 'DOCTRINE'
    | 'MODELE'
    | 'INTERNE'
    | 'AUTRE'

export type DocumentType =
    | 'ARRET'
    | 'JUGEMENT'
    | 'ORDONNANCE'
    | 'ARTICLE'
    | 'OUVRAGE'
    | 'THESE'
    | 'MEMOIRE'
    | 'NOTE'
    | 'COMMENTAIRE'
    | 'CHRONIQUE'
    | 'CONTRAT'
    | 'PROCEDURE'
    | 'FORMULAIRE'
    | 'AUTRE'

export type FilterValue = DocumentCategorie | DocumentType | 'ALL'

export interface DocumentStats {
    JURISPRUDENCE: number
    DECISION_JUSTICE: number
    DOCTRINE: number
    INTERNE: number
}

export interface Document {
    id: string
    titre: string
    categorie: DocumentCategorie
    type: DocumentType | null
    juridiction: string | null
    reference: string | null
    dateDocument: Date | null
    description: string | null
    tags: string | null
    fileName: string | null
    fileSize: number | null
    statut: string
    createdAt: Date
    updatedAt: Date
}
