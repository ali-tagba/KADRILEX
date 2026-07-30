/**
 * State et helpers des filtres avancés du module Finance — onglet Facturation.
 * Calqué sur components/clients/filters-state.ts pour cohérence UX.
 */

import type {
    DirectionFactureKey,
    ModePaiementKey,
    StatutFactureKey,
} from "@/lib/constants/finance"
import type { MockFacture } from "@/lib/mock/invoices"

export type ViewMode = "table" | "gallery" | "grouped"

export type DatePreset =
    | "ALL"
    | "CURRENT_MONTH"
    | "CURRENT_QUARTER"
    | "CURRENT_YEAR"
    | "CUSTOM"

export interface FactureFiltersState {
    search: string
    /** Direction (single radio) */
    direction: DirectionFactureKey | "ALL"
    /** Multi-select statuts */
    statuts: StatutFactureKey[]
    /** Multi-select clients */
    clientIds: string[]
    /** Multi-select dossiers */
    dossierIds: string[]
    /** Multi-select fournisseurs (factures reçues) */
    fournisseurIds: string[]
    /** Multi-select modes de paiement */
    modes: ModePaiementKey[]
    /** Période date émission */
    datePreset: DatePreset
    dateStart: string | null
    dateEnd: string | null
    /** Montant min/max */
    montantMin: number | null
    montantMax: number | null
    /** Visibilité */
    inclureBrouillons: boolean
    inclureAnnulees: boolean
    refacturablesOnly: boolean
    viewMode: ViewMode
}

export const INITIAL_FACTURE_FILTERS: FactureFiltersState = {
    search: "",
    direction: "ALL",
    statuts: [],
    clientIds: [],
    dossierIds: [],
    fournisseurIds: [],
    modes: [],
    datePreset: "ALL",
    dateStart: null,
    dateEnd: null,
    montantMin: null,
    montantMax: null,
    inclureBrouillons: false,
    inclureAnnulees: false,
    refacturablesOnly: false,
    viewMode: "table",
}

export function countActiveFactureFilters(s: FactureFiltersState): number {
    let n = 0
    if (s.direction !== "ALL") n += 1
    if (s.statuts.length > 0) n += 1
    if (s.clientIds.length > 0) n += 1
    if (s.dossierIds.length > 0) n += 1
    if (s.fournisseurIds.length > 0) n += 1
    if (s.modes.length > 0) n += 1
    if (s.datePreset !== "ALL") n += 1
    if (s.montantMin !== null || s.montantMax !== null) n += 1
    if (s.inclureBrouillons) n += 1
    if (s.inclureAnnulees) n += 1
    if (s.refacturablesOnly) n += 1
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
function startOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3)
    return startOfDay(new Date(d.getFullYear(), q * 3, 1))
}
function endOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3)
    return startOfDay(new Date(d.getFullYear(), q * 3 + 3, 1))
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}

function matchesDate(iso: string, s: FactureFiltersState): boolean {
    if (s.datePreset === "ALL") return true
    const d = new Date(iso)
    const now = new Date()
    if (s.datePreset === "CURRENT_MONTH") return d >= startOfMonth(now) && d < endOfMonth(now)
    if (s.datePreset === "CURRENT_QUARTER") return d >= startOfQuarter(now) && d < endOfQuarter(now)
    if (s.datePreset === "CURRENT_YEAR") return d.getFullYear() === now.getFullYear()
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

export function applyFactureFilters(
    factures: MockFacture[],
    s: FactureFiltersState,
    /** Si non null, ne renvoie que les factures dont au moins un paiement utilise un mode listé */
    matchModeViaPaiement = false
): MockFacture[] {
    const q = s.search.trim().toLowerCase()
    return factures.filter((f) => {
        if (!s.inclureBrouillons && f.statut === "BROUILLON") return false
        if (!s.inclureAnnulees && f.statut === "ANNULEE") return false
        if (s.direction !== "ALL" && f.direction !== s.direction) return false
        if (s.statuts.length > 0 && !s.statuts.includes(f.statut)) return false
        if (s.clientIds.length > 0 && (!f.clientId || !s.clientIds.includes(f.clientId))) return false
        if (s.dossierIds.length > 0 && (!f.dossierId || !s.dossierIds.includes(f.dossierId))) return false
        if (s.fournisseurIds.length > 0 && (!f.fournisseurId || !s.fournisseurIds.includes(f.fournisseurId))) return false
        if (s.modes.length > 0 && matchModeViaPaiement) {
            // Guard : paiements peut être undefined si l'API n'a pas inclus la
            // relation (ex: liste rapide sans include)
            const paiements = f.paiements ?? []
            const has = paiements.some((p) => s.modes.includes(p.mode))
            if (!has) return false
        }
        if (!matchesDate(f.date, s)) return false
        if (s.montantMin !== null && f.montantTTC < s.montantMin) return false
        if (s.montantMax !== null && f.montantTTC > s.montantMax) return false
        if (s.refacturablesOnly && !(f.refacturable && !f.refactureeViaFactureId)) return false
        if (q) {
            const haystack = [
                f.numero,
                f.description ?? "",
                f.notes ?? "",
                f.fournisseurNomLibre ?? "",
                f.lignes.map((l) => l.libelle).join(" "),
            ].join(" ").toLowerCase()
            if (!haystack.includes(q)) return false
        }
        return true
    })
}
