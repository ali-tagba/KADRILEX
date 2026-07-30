/**
 * State et helpers pour les filtres avancés du module Tâches.
 * Calqué sur components/clients/filters-state.ts pour cohérence UX.
 */

import type { MockTache } from "@/lib/mock/audiences"
import type { TachePrioriteKey, TacheStatutKey } from "@/lib/constants/legal"

export type ViewMode = "list" | "kanban"

export type EcheancePreset =
    | "ALL"
    | "OVERDUE"
    | "TODAY"
    | "WEEK"
    | "MONTH"
    | "NO_DEADLINE"
    | "CUSTOM"

/** Type de liaison sans le sentinel "ALL" — utilisé en multi-select */
export type LiaisonKey = "CLIENT" | "DOSSIER" | "AUDIENCE" | "NONE"

export interface TachesFiltersState {
    search: string
    /** Multi-select statuts — vide = tous */
    statuts: TacheStatutKey[]
    /** Multi-select priorités — vide = toutes */
    priorites: TachePrioriteKey[]
    /** Multi-select avocats assignés — vide = tous (string libre pour anticiper juristes) */
    avocats: string[]
    /** Preset d'échéance ; "CUSTOM" active dateStart/dateEnd */
    echeancePreset: EcheancePreset
    echeanceStart: string | null
    echeanceEnd: string | null
    /** Multi-select types de liaison — vide = toutes */
    liaisons: LiaisonKey[]
    /** Afficher les tâches FAIT/ANNULE dans la vue */
    showDone: boolean
    viewMode: ViewMode
}

export const INITIAL_FILTERS: TachesFiltersState = {
    search: "",
    statuts: [],
    priorites: [],
    avocats: [],
    echeancePreset: "ALL",
    echeanceStart: null,
    echeanceEnd: null,
    liaisons: [],
    showDone: false,
    viewMode: "list",
}

/**
 * Compte les filtres actifs (différents du défaut).
 * search et viewMode ne comptent PAS comme filtres (toujours visibles dans la toolbar).
 * `showDone` n'est compté qu'en vue Liste car en Kanban il est forcé à true (les colonnes
 * Fait/Annulé sont la vue elle-même).
 */
export function countActiveFilters(s: TachesFiltersState): number {
    let n = 0
    if (s.statuts.length > 0) n += 1
    if (s.priorites.length > 0) n += 1
    if (s.avocats.length > 0) n += 1
    if (s.echeancePreset !== "ALL") n += 1
    if (s.liaisons.length > 0) n += 1
    if (s.viewMode === "list" && s.showDone) n += 1
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
function endOfDay(d: Date): Date {
    const r = new Date(d)
    r.setHours(23, 59, 59, 999)
    return r
}
function startOfWeek(now: Date): Date {
    const r = startOfDay(now)
    const dow = (now.getDay() + 6) % 7 // lundi = 0
    r.setDate(r.getDate() - dow)
    return r
}
function endOfWeek(now: Date): Date {
    const r = startOfWeek(now)
    r.setDate(r.getDate() + 7)
    return r
}
function startOfMonth(d: Date): Date {
    return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}
function endOfMonth(d: Date): Date {
    return startOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

function isOverdue(t: MockTache): boolean {
    if (!t.echeance) return false
    if (t.statut === "FAIT" || t.statut === "ANNULE") return false
    return new Date(t.echeance).getTime() < Date.now()
}

function matchesEcheance(t: MockTache, s: TachesFiltersState): boolean {
    if (s.echeancePreset === "ALL") return true
    if (s.echeancePreset === "NO_DEADLINE") return !t.echeance
    if (!t.echeance) return false

    const now = new Date()
    const e = new Date(t.echeance)

    if (s.echeancePreset === "OVERDUE") return isOverdue(t)
    if (s.echeancePreset === "TODAY") return e >= startOfDay(now) && e <= endOfDay(now)
    if (s.echeancePreset === "WEEK") return e >= startOfWeek(now) && e < endOfWeek(now)
    if (s.echeancePreset === "MONTH") return e >= startOfMonth(now) && e < endOfMonth(now)
    if (s.echeancePreset === "CUSTOM") {
        const okStart = s.echeanceStart ? e >= new Date(s.echeanceStart) : true
        const okEnd = s.echeanceEnd ? e < addDays(new Date(s.echeanceEnd), 1) : true
        return okStart && okEnd
    }
    return true
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}

/* ============================================================
   Liaison matching
   ============================================================ */

function getLiaisonType(t: MockTache): LiaisonKey {
    if (t.audienceId) return "AUDIENCE"
    if (t.dossierId) return "DOSSIER"
    if (t.clientId) return "CLIENT"
    return "NONE"
}

/* ============================================================
   Apply all filters
   ============================================================ */

export function applyFilters(taches: MockTache[], s: TachesFiltersState): MockTache[] {
    const q = s.search.trim().toLowerCase()
    return taches.filter((t) => {
        if (!s.showDone && (t.statut === "FAIT" || t.statut === "ANNULE")) return false
        if (s.statuts.length > 0 && !s.statuts.includes(t.statut)) return false
        if (s.priorites.length > 0 && !s.priorites.includes(t.priorite)) return false
        if (s.avocats.length > 0 && !s.avocats.includes(t.assigneA)) return false
        if (s.liaisons.length > 0 && !s.liaisons.includes(getLiaisonType(t))) return false
        if (!matchesEcheance(t, s)) return false
        if (q) {
            const haystack = [t.titre, t.description ?? "", t.assigneA].join(" ").toLowerCase()
            if (!haystack.includes(q)) return false
        }
        return true
    })
}
