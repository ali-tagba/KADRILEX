/**
 * State et helpers pour les filtres avancés du module Clients.
 * Architecture extensible : ajouter un nouveau filtre = ajouter une clé dans
 * ClientFiltersState et une condition dans applyFilters().
 */

import type { MockClient } from "@/lib/mock/clients"
import { clientDisplayName } from "@/lib/mock/clients"
import type { AvocatCabinet, HonorairesType } from "@/lib/constants/legal"

export type DatePreset =
    | "ALL"
    | "CURRENT_MONTH"
    | "CURRENT_QUARTER"
    | "CURRENT_YEAR"
    | "YEAR"
    | "CUSTOM"

export type ClientType = "ALL" | "PERSONNE_MORALE" | "PERSONNE_PHYSIQUE"
export type StatusFacturation = "ALL" | "A_JOUR" | "IMPAYE"
export type ViewMode = "table" | "gallery"
export type SortOrder = "DEFAULT" | "A-Z" | "Z-A"

export interface ClientFiltersState {
    search: string
    type: ClientType
    datePreset: DatePreset
    /** Année sélectionnée si datePreset === 'YEAR' */
    dateYear: string | null
    /** Date début (ISO YYYY-MM-DD) si datePreset === 'CUSTOM' */
    dateStart: string | null
    /** Date fin (ISO YYYY-MM-DD) si datePreset === 'CUSTOM' */
    dateEnd: string | null
    /** Multi-select avocats — vide = tous */
    avocats: AvocatCabinet[]
    /** Multi-select types d'honoraires — vide = tous */
    honoraires: HonorairesType[]
    statut: StatusFacturation
    viewMode: ViewMode
    sortOrder: SortOrder
}

const CURRENT_YEAR = new Date().getFullYear().toString()

export const INITIAL_FILTERS: ClientFiltersState = {
    search: "",
    type: "ALL",
    datePreset: "ALL",
    dateYear: null,
    dateStart: null,
    dateEnd: null,
    avocats: [],
    honoraires: [],
    statut: "ALL",
    viewMode: "table",
    sortOrder: "DEFAULT",
}

/**
 * Compte les filtres actifs (différents du défaut). Utilisé pour le badge sur le bouton "Filtres".
 * La recherche et le viewMode ne comptent pas comme "filtres" (toujours visibles dans la toolbar).
 */
export function countActiveFilters(s: ClientFiltersState): number {
    let n = 0
    if (s.type !== "ALL") n += 1
    if (s.datePreset !== "ALL" && s.datePreset !== "CURRENT_YEAR") n += 1
    if (s.avocats.length > 0) n += 1
    if (s.honoraires.length > 0) n += 1
    if (s.statut !== "ALL") n += 1
    if (s.sortOrder !== "DEFAULT") n += 1
    return n
}

/* ------------------------------------------------------------------
   Date matching
   ------------------------------------------------------------------ */

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

function startOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3)
    return startOfDay(new Date(d.getFullYear(), q * 3, 1))
}

function endOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3)
    return startOfDay(new Date(d.getFullYear(), q * 3 + 3, 1))
}

function matchesDate(createdAt: string, s: ClientFiltersState): boolean {
    if (s.datePreset === "ALL") return true
    const created = new Date(createdAt)
    const now = new Date()

    if (s.datePreset === "CURRENT_MONTH") {
        return created >= startOfMonth(now) && created < endOfMonth(now)
    }
    if (s.datePreset === "CURRENT_QUARTER") {
        return created >= startOfQuarter(now) && created < endOfQuarter(now)
    }
    if (s.datePreset === "CURRENT_YEAR") {
        return created.getFullYear().toString() === CURRENT_YEAR
    }
    if (s.datePreset === "YEAR" && s.dateYear) {
        return created.getFullYear().toString() === s.dateYear
    }
    if (s.datePreset === "CUSTOM") {
        const okStart = s.dateStart ? created >= new Date(s.dateStart) : true
        const okEnd = s.dateEnd ? created < addDays(new Date(s.dateEnd), 1) : true
        return okStart && okEnd
    }
    return true
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}

/* ------------------------------------------------------------------
   Apply all filters
   ------------------------------------------------------------------ */

export function applyFilters(clients: MockClient[], s: ClientFiltersState): MockClient[] {
    const q = s.search.trim().toLowerCase()
    const filtered = clients.filter((c) => {
        if (s.type !== "ALL" && c.type !== s.type) return false
        if (!matchesDate(c.createdAt, s)) return false
        if (s.statut !== "ALL" && c.etatFacturation !== s.statut) return false
        if (s.avocats.length > 0) {
            if (!c.avocatEnCharge || !s.avocats.includes(c.avocatEnCharge)) return false
        }
        if (s.honoraires.length > 0) {
            if (!c.honorairesConvenus || !s.honoraires.includes(c.honorairesConvenus)) return false
        }
        if (!q) return true
        const haystack = [
            clientDisplayName(c),
            c.email,
            c.telephone,
            c.ville,
            c.numeroClient,
            c.numeroRCCM ?? "",
            c.profession ?? "",
        ]
            .join(" ")
            .toLowerCase()
        return haystack.includes(q)
    })

    if (s.sortOrder === "A-Z") {
        filtered.sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)))
    } else if (s.sortOrder === "Z-A") {
        filtered.sort((a, b) => clientDisplayName(b).localeCompare(clientDisplayName(a)))
    }

    return filtered
}
