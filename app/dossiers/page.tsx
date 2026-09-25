"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/toaster"
import { DossierToolbar } from "@/components/dossiers/dossier-toolbar"
import { DossierFilterDrawer } from "@/components/dossiers/dossier-filter-drawer"
import { DossierTable } from "@/components/dossiers/dossier-table"
import { DossierGallery } from "@/components/dossiers/dossier-gallery"
import {
    DossierFormDialog,
    type DossierFormDraft,
} from "@/components/dossiers/dossier-form-dialog"
import {
    INITIAL_DOSSIER_FILTERS,
    applyDossierFilters,
    type DossierFiltersState,
} from "@/components/dossiers/filters-state"
import type { MockDossier } from "@/lib/mock/dossiers"
import type { MockClient } from "@/lib/mock/clients"
import { withResolvedTeam } from "@/lib/mock/membre-bridge"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { PageGate } from "@/components/auth/require-permission"
import { usePersistedFilters } from "@/lib/hooks/use-persisted-filters"

export default function DossiersPage() {
    const { filterByVisibility } = useCurrentUser()
    const searchParams = useSearchParams()
    const presetClientId = searchParams.get("clientId")
    const openOnMount = searchParams.get("new") === "1"
    const [dossiers, setDossiers] = useState<MockDossier[]>([])
    const [clients, setClients] = useState<MockClient[]>([])
    const [createOpen, setCreateOpen] = useState(openOnMount)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // Nouvelle clé : réinitialise l'ancien filtre « année en cours » mémorisé
    // avant l'import de l'historique CRM.
    const [filters, setFilters] = usePersistedFilters<DossierFiltersState>("dossiers-v2", INITIAL_DOSSIER_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch("/api/dossiers", { credentials: "include" }).then((r) => {
                if (!r.ok) throw new Error(`Dossiers HTTP ${r.status}`)
                return r.json() as Promise<MockDossier[]>
            }),
            fetch("/api/clients", { credentials: "include" })
                .then((r) => (r.ok ? (r.json() as Promise<MockClient[]>) : []))
                .catch(() => [] as MockClient[]),
        ])
            .then(([dos, cli]) => {
                if (!alive) return
                setDossiers(dos)
                setClients(cli)
            })
            .catch((e) => {
                if (alive) setError(e instanceof Error ? e.message : "Erreur inconnue")
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [])

    const availableYears = useMemo(() => {
        const set = new Set<string>()
        for (const d of dossiers) set.add(new Date(d.dateOuverture).getFullYear().toString())
        return Array.from(set).sort((a, b) => Number(b) - Number(a))
    }, [dossiers])

    const availableJuridictions = useMemo(() => {
        const set = new Set<string>()
        for (const d of dossiers) if (d.juridiction) set.add(d.juridiction)
        return Array.from(set).sort()
    }, [dossiers])

    /* Filtrage RBAC : un dossier hérite de l'équipe de son client parent.
       On décore avec resolveTeam puis on applique le scope du membre courant. */
    const visibleDossiers = useMemo(() => {
        const decorated = dossiers.map((d) => {
            const parent = d.clientId ? clients.find((c) => c.id === d.clientId) ?? null : null
            return withResolvedTeam(d, parent)
        })
        return filterByVisibility(decorated, "dossiers.view")
    }, [dossiers, clients, filterByVisibility])

    const counters = useMemo(() => {
        const total = visibleDossiers.length
        const actifs = visibleDossiers.filter((d) => d.statut === "EN_COURS" || d.statut === "URGENT").length
        const enAttente = visibleDossiers.filter((d) => d.statut === "EN_ATTENTE").length
        const closed = visibleDossiers.filter((d) => d.statut === "CLOTURE" || d.statut === "TERMINE" || d.statut === "ARCHIVE").length
        return { total, actifs, enAttente, closed }
    }, [visibleDossiers])

    const filtered = useMemo(
        () => applyDossierFilters(visibleDossiers, filters),
        [visibleDossiers, filters]
    )
    const showFilteredCount = filtered.length !== counters.total

    const resetAll = () => setFilters(INITIAL_DOSSIER_FILTERS)

    /* Création locale d'un dossier — sera propagée via POST API plus tard */
    const handleCreateDossier = async (draft: DossierFormDraft) => {
        try {
            const res = await fetch("/api/dossiers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    kind: draft.kind,
                    type: draft.type,
                    nature: draft.nature || "Autre",
                    titre: draft.titre,
                    statut: draft.statut,
                    etatProcedure: draft.etatProcedure || null,
                    juridiction: draft.juridiction || null,
                    clientId: draft.clientId,
                    partiesAdverses: draft.partiesAdverses ?? [],
                    description: draft.description || null,
                    honoraires: draft.honoraires,
                    retrocession: draft.retrocession,
                    responsableId: draft.responsableId,
                    equipeIds: draft.equipeIds ?? [],
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const created: MockDossier = await res.json()
            setDossiers((prev) => [created, ...prev])
            setCreateOpen(false)
        } catch (e) {
            toast.error("Échec création dossier : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    return (
        <PageGate perm="dossiers.view" moduleName="Dossiers">
        <div className="flex flex-col h-full overflow-hidden p-container-margin gap-density-medium">
            {/* Header — compact 1 ligne */}
            <header className="flex-none flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3 flex-wrap min-w-0">
                    <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                        Registre
                    </p>
                    <h1 className="font-h1 text-h1 text-primary-container">Dossiers</h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                        <span className="text-on-surface font-medium">{counters.actifs}</span> actifs
                        <span className="text-outline-variant mx-1.5">·</span>
                        <span className="text-on-surface">{counters.enAttente}</span> en attente
                        <span className="text-outline-variant mx-1.5">·</span>
                        <span className="text-on-surface">{counters.closed}</span> clôturés
                        {showFilteredCount && (
                            <>
                                <span className="text-outline-variant mx-1.5">·</span>
                                <span className="text-accent font-medium">
                                    {filtered.length} filtré{filtered.length > 1 ? "s" : ""}
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
                    Nouveau dossier
                </button>
            </header>

            {/* Toolbar */}
            <div className="flex-none">
                <DossierToolbar
                    filters={filters}
                    onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
                    onClearSearch={() => setFilters((f) => ({ ...f, search: "" }))}
                    onOpenFilters={() => setDrawerOpen(true)}
                    onViewModeChange={(viewMode) => setFilters((f) => ({ ...f, viewMode }))}
                />
            </div>

            {/* Contenu */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {loading ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant h-full flex items-center justify-center">
                        Chargement…
                    </div>
                ) : error ? (
                    <div className="bg-error-container border border-outline-variant rounded-lg p-6 text-center">
                        <p className="font-body-sm text-on-error-container">
                            Impossible de charger les dossiers ({error})
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                        <span className="material-symbols-outlined text-[40px] text-outline-variant">
                            search_off
                        </span>
                        <p className="font-body-md text-body-md text-on-surface mt-2 font-medium">
                            Aucun dossier ne correspond à ces filtres
                        </p>
                        <button
                            onClick={resetAll}
                            className="mt-3 text-accent font-body-sm font-medium hover:underline"
                        >
                            Réinitialiser tous les filtres
                        </button>
                    </div>
                ) : filters.viewMode === "table" ? (
                    <DossierTable dossiers={filtered} pageSize={10} />
                ) : (
                    <DossierGallery dossiers={filtered} clients={clients} />
                )}
            </div>

            <DossierFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                availableYears={availableYears}
                availableJuridictions={availableJuridictions}
                clients={clients}
            />

            {/* Dialog création dossier */}
            {createOpen && (
                <DossierFormDialog
                    presetClientId={presetClientId}
                    clients={clients}
                    onSave={handleCreateDossier}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </div>
        </PageGate>
    )
}
