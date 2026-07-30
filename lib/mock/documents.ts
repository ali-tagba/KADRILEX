/**
 * Données mockées du module Bibliothèque — utilisées tant que la DB n'est pas branchée.
 * Contexte juridique nigérien + OHADA (CCJA, TGI Niamey, doctrine OHADA, modèles cabinet).
 */

import type {
    DocCategorieKey,
    DocTypeKey,
    DomaineJuridiqueKey,
    IssueJurisKey,
    NiveauJuridictionKey,
} from "@/lib/constants/biblio"

export interface MockDocument {
    id: string
    titre: string
    categorie: DocCategorieKey
    type: DocTypeKey | null
    domaineJuridique: DomaineJuridiqueKey | null
    juridiction: string | null
    niveauJuridiction: NiveauJuridictionKey | null
    reference: string | null
    dateDocument: string | null // ISO
    description: string | null
    /** Tags CSV libre — affichés en chips */
    tags: string | null
    auteur: string | null
    source: string | null
    notes: string | null
    fileName: string | null
    fileSize: number | null
    /** Chemin Supabase Storage du fichier joint (ex: "bibliotheque/timestamp-nom.pdf") */
    fileUrl?: string | null
    /** MIME type pour le viewer (PDF, image, video, audio, office, text…) */
    mimeType?: string | null
    /** Articles cités CSV (ex: "Art. 28 AUPSRVE, Art. 90 AUDCG") */
    articlesCites: string | null
    /** Issue d'une jurisprudence/décision (null si non applicable) */
    issue: IssueJurisKey | null
    estFavori: boolean
    nbConsultations: number
    derniereConsultation: string | null
    /** IDs des dossiers auxquels ce document est rattaché */
    dossierIdsLies: string[]
    statut: "ACTIF" | "ARCHIVE"
    createdAt: string
    updatedAt: string
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

/* ============================================================
   Mock Documents — 18 entrées couvrant les 5 catégories + Niger réaliste
   ============================================================ */

export const mockDocuments: MockDocument[] = []
