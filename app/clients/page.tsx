"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toaster"
import { ClientToolbar } from "@/components/clients/client-toolbar"
import { ClientFormDialog, type ClientFormDraft } from "@/components/clients/client-form-dialog"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { PageGate } from "@/components/auth/require-permission"
import { usePersistedFilters } from "@/lib/hooks/use-persisted-filters"
import { ClientFilterDrawer } from "@/components/clients/client-filter-drawer"
import { ClientTable } from "@/components/clients/client-table"
import { ClientGallery } from "@/components/clients/client-gallery"
import {
    INITIAL_FILTERS,
    applyFilters,
    countActiveFilters,
    type ClientFiltersState,
} from "@/components/clients/filters-state"
import type { MockClient } from "@/lib/mock/clients"

export default function ClientsPage() {
    const router = useRouter()
    const { filterByVisibility } = useCurrentUser()
    const [clients, setClients] = useState<MockClient[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = usePersistedFilters<ClientFiltersState>("clients", INITIAL_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)

    useEffect(() => {
        let alive = true
        fetch("/api/clients", { credentials: "include" })
            .then((r) => {
                if (r.status === 401) {
                    router.push("/login")
                    return null
                }
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then((data: MockClient[] | null) => {
                if (!alive || !data) return
                setClients(data)
            })
            .catch((e) => {
                if (!alive) return
                setError(e instanceof Error ? e.message : "Erreur inconnue")
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [router])

    const availableYears = useMemo(() => {
        const years = new Set<string>()
        for (const c of clients) {
            years.add(new Date(c.createdAt).getFullYear().toString())
        }
        return Array.from(years).sort((a, b) => Number(b) - Number(a))
    }, [clients])

    const counters = useMemo(() => {
        /* Compteurs basés sur la liste visible (respecte le scope RBAC) */
        const list = filterByVisibility(clients, "clients.view")
        const total = list.length
        const pm = list.filter((c) => c.type === "PERSONNE_MORALE").length
        const pp = total - pm
        return { total, pm, pp }
    }, [clients, filterByVisibility])

    /* Filtrage RBAC : si scope OWN, on ne montre que les clients du membre */
    const visibleClients = useMemo(
        () => filterByVisibility(clients, "clients.view"),
        [clients, filterByVisibility]
    )
    const filteredClients = useMemo(
        () => applyFilters(visibleClients, filters),
        [visibleClients, filters]
    )

    const activeCount = countActiveFilters(filters)
    const hasActiveContext = activeCount > 0 || filters.search.length > 0

    const resetAll = () => setFilters(INITIAL_FILTERS)

    const handleCreateClient = async (draft: ClientFormDraft) => {
        const isPM = draft.type === "PERSONNE_MORALE"
        try {
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    type: draft.type,
                    raisonSociale: isPM ? (draft.raisonSociale || null) : null,
                    formeJuridique: isPM ? (draft.formeJuridique || null) : null,
                    numeroRCCM: isPM ? (draft.numeroRCCM || null) : null,
                    nif: isPM ? (draft.nif || null) : null,
                    conventionnee: draft.conventionnee,
                    siegeSocial: isPM ? (draft.siegeSocial || null) : null,
                    representantLegal: isPM ? (draft.representantLegal || null) : null,
                    nom: !isPM ? (draft.nom || null) : null,
                    prenom: !isPM ? (draft.prenom || null) : null,
                    profession: !isPM ? (draft.profession || null) : null,
                    pieceIdentite: !isPM ? (draft.pieceIdentite || null) : null,
                    nationalite: !isPM ? (draft.nationalite || null) : null,
                    dateNaissance: !isPM && draft.dateNaissance
                        ? new Date(draft.dateNaissance + "T10:00").toISOString()
                        : null,
                    lieuNaissance: !isPM ? (draft.lieuNaissance || null) : null,
                    whatsapp: !isPM ? (draft.whatsapp || null) : null,
                    email: draft.email || null,
                    telephone: draft.telephone || null,
                    adresse: draft.adresse || null,
                    ville: draft.ville || null,
                    pays: draft.pays || "Niger",
                    notes: draft.notes || null,
                    actif: draft.actif,
                    honorairesConvenus: draft.honorairesConvenus || null,
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const created: MockClient = await res.json()
            setClients((prev) => [created, ...prev])
            setCreateOpen(false)
        } catch (e) {
            toast.error("Échec création client : " + (e instanceof Error ? e.message : "Erreur inconnue"))
        }
    }

    return (
        <PageGate perm="clients.view" moduleName="Clients">
        <div className="flex flex-col h-full overflow-hidden p-container-margin gap-density-medium">
            {/* Header — compact 1 ligne */}
            <header className="flex-none flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3 flex-wrap min-w-0">
                    <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                        Portefeuille
                    </p>
                    <h1 className="font-h1 text-h1 text-primary-container">Clients</h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                        <span className="text-on-surface font-medium">{counters.total}</span> au total
                        <span className="text-outline-variant mx-1.5">·</span>
                        <span className="text-on-surface">{counters.pm}</span> sociétés
                        <span className="text-outline-variant mx-1.5">·</span>
                        <span className="text-on-surface">{counters.pp}</span> particuliers
                        {hasActiveContext && (
                            <>
                                <span className="text-outline-variant mx-1.5">·</span>
                                <span className="text-accent font-medium">
                                    {filteredClients.length} filtré{filteredClients.length > 1 ? "s" : ""}
                                </span>
                            </>
                        )}
                    </p>
                </div>

                <button
                    className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded font-body-sm text-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98] duration-150 ease-out"
                    onClick={() => setCreateOpen(true)}
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nouveau client
                </button>
            </header>

            {/* Toolbar compact : recherche + filtres + vue */}
            <div className="flex-none">
                <ClientToolbar
                    filters={filters}
                    onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
                    onClearSearch={() => setFilters((f) => ({ ...f, search: "" }))}
                    onOpenFilters={() => setDrawerOpen(true)}
                    onViewModeChange={(viewMode) => setFilters((f) => ({ ...f, viewMode }))}
                />
            </div>

            {/* Zone contenu — scroll interne */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {loading ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant h-full flex items-center justify-center">
                        Chargement…
                    </div>
                ) : error ? (
                    <div className="bg-error-container border border-outline-variant rounded-lg p-6 text-center">
                        <p className="font-body-sm text-on-error-container">
                            Impossible de charger les clients ({error})
                        </p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                        <span className="material-symbols-outlined text-[40px] text-outline-variant">
                            search_off
                        </span>
                        <p className="font-body-md text-body-md text-on-surface mt-2 font-medium">
                            Aucun client ne correspond à ces filtres
                        </p>
                        <button
                            onClick={resetAll}
                            className="mt-3 text-accent font-body-sm font-medium hover:underline"
                        >
                            Réinitialiser tous les filtres
                        </button>
                    </div>
                ) : filters.viewMode === "table" ? (
                    <ClientTable clients={filteredClients} pageSize={10} />
                ) : (
                    <ClientGallery clients={filteredClients} />
                )}
            </div>

            {/* Drawer filtres */}
            <ClientFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                availableYears={availableYears}
            />

            {/* Dialog création client */}
            {createOpen && (
                <ClientFormDialog
                    existingClients={clients}
                    onSave={handleCreateClient}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </div>
        </PageGate>
    )
}
