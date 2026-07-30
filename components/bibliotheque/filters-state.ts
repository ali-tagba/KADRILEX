/**
 * State et helpers des filtres avancés pour le module Bibliothèque.
 * Calqué sur components/clients/filters-state.ts pour cohérence UX.
 */

import type {
    DocCategorieKey,
    DocTypeKey,
    DomaineJuridiqueKey,
    IssueJurisKey,
    NiveauJuridictionKey,
} from "@/lib/constants/biblio"
import type { MockDocument } from "@/lib/mock/documents"

export type ViewMode = "table" | "gallery" | "veille"

export type DatePreset =
    | "ALL"
    | "CURRENT_MONTH"
    | "CURRENT_YEAR"
    | "LAST_YEAR"
    | "CUSTOM"

export interface BibliothequeFiltersState {
    search: string
    /** Multi-select catégories — vide = toutes */
    categories: DocCategorieKey[]
    /** Multi-select domaines juridiques — vide = tous */
    domaines: DomaineJuridiqueKey[]
    /** Multi-select types — vide = tous */
    types: DocTypeKey[]
    /** Multi-select juridictions (chaîne libre, peuplée depuis les docs) */
    juridictions: string[]
    /** Multi-select niveaux de juridiction — vide = tous */
    niveaux: NiveauJuridictionKey[]
    /** Issue (single, jurisprudence uniquement) */
    issue: IssueJurisKey | "ALL"
    /** Période date document */
    datePreset: DatePreset
    dateStart: string | null
    dateEnd: string | null
    /** Multi-select auteurs */
    auteurs: string[]
    /** Mes favoris uniquement */
    favorisOnly: boolean
    /** Inclure les archivés */
    showArchives: boolean
    viewMode: ViewMode
}

export const INITIAL_FILTERS: BibliothequeFiltersState = {
    search: "",
    categories: [],
    domaines: [],
    types: [],
    juridictions: [],
    niveaux: [],
    issue: "ALL",
    datePreset: "ALL",
    dateStart: null,
    dateEnd: null,
    auteurs: [],
    favorisOnly: false,
    showArchives: false,
    viewMode: "table",
}

/**
 * Compte les filtres actifs (différents du défaut).
 * search et viewMode ne comptent PAS comme filtres.
 */
export function countActiveFilters(s: BibliothequeFiltersState): number {
    let n = 0
    if (s.categories.length > 0) n += 1
    if (s.domaines.length > 0) n += 1
    if (s.types.length > 0) n += 1
    if (s.juridictions.length > 0) n += 1
    if (s.niveaux.length > 0) n += 1
    if (s.issue !== "ALL") n += 1
    if (s.datePreset !== "ALL") n += 1
    if (s.auteurs.length > 0) n += 1
    if (s.favorisOnly) n += 1
    if (s.showArchives) n += 1
    return n
}

/* ============================================================
   Date matching
   ============================================================ */

function startOfDay(d: Date): Date {
    const r = new Date(d)
    r.setHours(0, 0, 0, 0)
    return r
}
function startOfMonth(d: Date): Date {
    return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}
function endOfMonth(d: Date): Date {
    return startOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}

function matchesDate(iso: string | null, s: BibliothequeFiltersState): boolean {
    if (s.datePreset === "ALL") return true
    if (!iso) return false
    const d = new Date(iso)
    const now = new Date()

    if (s.datePreset === "CURRENT_MONTH") {
        return d >= startOfMonth(now) && d < endOfMonth(now)
    }
    if (s.datePreset === "CURRENT_YEAR") {
        return d.getFullYear() === now.getFullYear()
    }
    if (s.datePreset === "LAST_YEAR") {
        return d.getFullYear() === now.getFullYear() - 1
    }
    if (s.datePreset === "CUSTOM") {
        const okStart = s.dateStart ? d >= new Date(s.dateStart) : true
        const okEnd = s.dateEnd ? d < addDays(new Date(s.dateEnd), 1) : true
        return okStart && okEnd
    }
    return true
}

/* ============================================================
   Apply all filters
   ============================================================ */

export function applyFilters(
    documents: MockDocument[],
    s: BibliothequeFiltersState
): MockDocument[] {
    const q = s.search.trim().toLowerCase()
    return documents.filter((d) => {
        if (!s.showArchives && d.statut === "ARCHIVE") return false
        if (s.favorisOnly && !d.estFavori) return false
        if (s.categories.length > 0 && !s.categories.includes(d.categorie)) return false
        if (s.domaines.length > 0 && (!d.domaineJuridique || !s.domaines.includes(d.domaineJuridique))) return false
        if (s.types.length > 0 && (!d.type || !s.types.includes(d.type))) return false
        if (s.juridictions.length > 0 && (!d.juridiction || !s.juridictions.includes(d.juridiction))) return false
        if (s.niveaux.length > 0 && (!d.niveauJuridiction || !s.niveaux.includes(d.niveauJuridiction))) return false
        if (s.issue !== "ALL" && d.issue !== s.issue) return false
        if (s.auteurs.length > 0 && (!d.auteur || !s.auteurs.includes(d.auteur))) return false
        if (!matchesDate(d.dateDocument, s)) return false
        if (q) {
            const haystack = [
                d.titre,
                d.reference ?? "",
                d.description ?? "",
                d.tags ?? "",
                d.juridiction ?? "",
                d.auteur ?? "",
                d.articlesCites ?? "",
            ].join(" ").toLowerCase()
            if (!haystack.includes(q)) return false
        }
        return true
    })
}

/* ============================================================
   Tri par pertinence
   ============================================================ */

/** Score : favori (poids fort) + nbConsultations + récence */
export function sortByRelevance(documents: MockDocument[]): MockDocument[] {
    return [...documents].sort((a, b) => {
        const favA = a.estFavori ? 100 : 0
        const favB = b.estFavori ? 100 : 0
        if (favA !== favB) return favB - favA
        if (a.nbConsultations !== b.nbConsultations) return b.nbConsultations - a.nbConsultations
        const tA = a.derniereConsultation ? new Date(a.derniereConsultation).getTime() : 0
        const tB = b.derniereConsultation ? new Date(b.derniereConsultation).getTime() : 0
        return tB - tA
    })
}
