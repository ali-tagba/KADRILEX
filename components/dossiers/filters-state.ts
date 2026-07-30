/**
 * State et helpers pour les filtres avancés du module Dossiers.
 * Architecture extensible : ajouter un filtre = ajouter une clé + une condition dans applyFilters.
 */

import type { MockDossier } from "@/lib/mock/dossiers"
import type {
    AvocatCabinet,
    DossierKindKey,
    DossierStatutKey,
    DossierTypeKey,
    NatureAffaire,
} from "@/lib/constants/legal"
import { mockClients } from "@/lib/mock/clients"

export type DatePreset =
    | "ALL"
    | "CURRENT_MONTH"
    | "CURRENT_QUARTER"
    | "CURRENT_YEAR"
    | "YEAR"
    | "CUSTOM"

export type ViewMode = "table" | "gallery"

export interface DossierFiltersState {
    search: string
    kind: "ALL" | DossierKindKey
    types: DossierTypeKey[] // multi
    natures: NatureAffaire[] // multi
    statuts: DossierStatutKey[] // multi
    avocats: AvocatCabinet[] // multi (filtre dérivé via client.avocatEnCharge)
    clientIds: string[] // multi
    juridictions: string[] // multi
    datePreset: DatePreset
    dateYear: string | null
    dateStart: string | null
    dateEnd: string | null
    viewMode: ViewMode
}

const CURRENT_YEAR = new Date().getFullYear().toString()

export const INITIAL_DOSSIER_FILTERS: DossierFiltersState = {
    search: "",
    kind: "CLIENT", // par défaut : focus dossiers client (cf. brief)
    types: [],
    natures: [],
    statuts: [],
    avocats: [],
    clientIds: [],
    juridictions: [],
    // Le registre doit afficher l'historique complet par défaut.
    datePreset: "ALL",
    dateYear: null,
    dateStart: null,
    dateEnd: null,
    viewMode: "table",
}

export function countActiveDossierFilters(s: DossierFiltersState): number {
    let n = 0
    if (s.kind !== "CLIENT") n += 1
    if (s.types.length > 0) n += 1
    if (s.natures.length > 0) n += 1
    if (s.statuts.length > 0) n += 1
    if (s.avocats.length > 0) n += 1
    if (s.clientIds.length > 0) n += 1
    if (s.juridictions.length > 0) n += 1
    if (s.datePreset !== "ALL" && s.datePreset !== "CURRENT_YEAR") n += 1
    return n
}

/* ------------------------------------------------------------------
   Date matching (réutilise la logique du module Clients)
   ------------------------------------------------------------------ */

function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
function startOfMonth(d: Date): Date { return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)) }
function endOfMonth(d: Date): Date { return startOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
function startOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3)
    return startOfDay(new Date(d.getFullYear(), q * 3, 1))
}
function endOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3)
    return startOfDay(new Date(d.getFullYear(), q * 3 + 3, 1))
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function matchesDate(iso: string, s: DossierFiltersState): boolean {
    if (s.datePreset === "ALL") return true
    const d = new Date(iso)
    const now = new Date()
    if (s.datePreset === "CURRENT_MONTH") return d >= startOfMonth(now) && d < endOfMonth(now)
    if (s.datePreset === "CURRENT_QUARTER") return d >= startOfQuarter(now) && d < endOfQuarter(now)
    if (s.datePreset === "CURRENT_YEAR") return d.getFullYear().toString() === CURRENT_YEAR
    if (s.datePreset === "YEAR" && s.dateYear) return d.getFullYear().toString() === s.dateYear
    if (s.datePreset === "CUSTOM") {
        const okStart = s.dateStart ? d >= new Date(s.dateStart) : true
        const okEnd = s.dateEnd ? d < addDays(new Date(s.dateEnd), 1) : true
        return okStart && okEnd
    }
    return true
}

/* ------------------------------------------------------------------
   Apply all filters
   ------------------------------------------------------------------ */

export function applyDossierFilters(
    dossiers: MockDossier[],
    s: DossierFiltersState
): MockDossier[] {
    const q = s.search.trim().toLowerCase()

    return dossiers.filter((d) => {
        // Catégorie (CLIENT vs ADMIN vs ALL)
        if (s.kind !== "ALL" && d.kind !== s.kind) return false
        // Type
        if (s.types.length > 0 && !s.types.includes(d.type)) return false
        // Nature
        if (s.natures.length > 0 && !s.natures.includes(d.nature)) return false
        // Statut
        if (s.statuts.length > 0 && !s.statuts.includes(d.statut)) return false
        // Client
        if (s.clientIds.length > 0) {
            if (!d.clientId || !s.clientIds.includes(d.clientId)) return false
        }
        // Juridiction (matching contient)
        if (s.juridictions.length > 0) {
            if (!d.juridiction || !s.juridictions.some((j) => d.juridiction!.toLowerCase().includes(j.toLowerCase()))) {
                return false
            }
        }
        // Avocat (dérivé du client lié)
        if (s.avocats.length > 0) {
            const client = d.clientId ? mockClients.find((c) => c.id === d.clientId) : null
            if (!client?.avocatEnCharge || !s.avocats.includes(client.avocatEnCharge)) return false
        }
        // Date d'ouverture
        if (!matchesDate(d.dateOuverture, s)) return false

        // Recherche texte
        if (!q) return true
        const client = d.clientId ? mockClients.find((c) => c.id === d.clientId) : null
        const haystack = [
            d.numero,
            d.titre,
            d.juridiction ?? "",
            d.etatProcedure ?? "",
            d.partiesAdverses.join(" "),
            client?.raisonSociale ?? "",
            client?.nom ?? "",
            client?.prenom ?? "",
            client?.numeroClient ?? "",
        ]
            .join(" ")
            .toLowerCase()
        return haystack.includes(q)
    })
}
