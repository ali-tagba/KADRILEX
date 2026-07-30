"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { patchEntity, showApiError } from "@/lib/api/patch"
import { toast } from "@/components/ui/toaster"
import type { TachePrioriteKey, TacheStatutKey } from "@/lib/constants/legal"
import type { MockTache, MockAudience } from "@/lib/mock/audiences"
import type { MockClient } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"
import { TachesToolbar } from "@/components/taches/taches-toolbar"
import { TachesFilterDrawer } from "@/components/taches/taches-filter-drawer"
import {
    INITIAL_FILTERS,
    applyFilters,
    type TachesFiltersState,
} from "@/components/taches/filters-state"
import { TachesListView } from "@/components/taches/taches-list-view"
import { TachesKanbanView } from "@/components/taches/taches-kanban-view"
import { TacheFormDialog, type TacheFormDraft } from "@/components/taches/tache-form-dialog"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { PageGate } from "@/components/auth/require-permission"
import { usePersistedFilters } from "@/lib/hooks/use-persisted-filters"

/* ============================================================
   Helpers
   ============================================================ */

function isOverdue(t: MockTache): boolean {
    if (!t.echeance) return false
    if (t.statut === "FAIT" || t.statut === "ANNULE") return false
    return new Date(t.echeance).getTime() < Date.now()
}

/* ============================================================
   Page
   ============================================================ */

export default function TachesPage() {
    const { filterByVisibility } = useCurrentUser()
    const [taches, setTaches] = useState<MockTache[]>([])
    const [clients, setClients] = useState<MockClient[]>([])
    const [dossiers, setDossiers] = useState<MockDossier[]>([])
    const [audiences, setAudiences] = useState<MockAudience[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    /* État unique pour tous les filtres + recherche + viewMode */
    const [filters, setFilters] = usePersistedFilters<TachesFiltersState>("taches", INITIAL_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)

    /* Mutations locales */
    const [patches, setPatches] = useState<Record<string, Partial<MockTache>>>({})
    const [created, setCreated] = useState<MockTache[]>([])
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

    /* Form dialog */
    const [formOpen, setFormOpen] = useState(false)
    const [editingTache, setEditingTache] = useState<MockTache | null>(null)

    useEffect(() => {
        let alive = true
        setLoading(true)
        setError(null)
        Promise.all([
            fetch("/api/taches").then((r) => {
                if (!r.ok) throw new Error(`HTTP taches ${r.status}`)
                return r.json() as Promise<MockTache[]>
            }),
            fetch("/api/clients").then((r) => (r.ok ? (r.json() as Promise<MockClient[]>) : [])).catch(() => []),
            fetch("/api/dossiers").then((r) => (r.ok ? (r.json() as Promise<MockDossier[]>) : [])).catch(() => []),
            fetch("/api/audiences").then((r) => (r.ok ? (r.json() as Promise<MockAudience[]>) : [])).catch(() => []),
        ])
            .then(([tac, cli, dos, aud]) => {
                if (!alive) return
                setTaches(tac)
                setClients(cli)
                setDossiers(dos)
                setAudiences(aud)
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

    /** Tâches consolidées : (serveur + crées) - supprimées + patches, puis filtrées RBAC */
    const consolidated = useMemo<MockTache[]>(() => {
        const all = [...taches, ...created].filter((t) => !deletedIds.has(t.id))
        const merged = all.map((t) => ({ ...t, ...(patches[t.id] ?? {}) }))
        return filterByVisibility(merged, "taches.view")
    }, [taches, created, deletedIds, patches, filterByVisibility])

    /** Liste de tous les avocats/juristes apparaissant dans les tâches (pour le drawer) */
    const availableAssignees = useMemo(() => {
        const set = new Set<string>()
        for (const t of consolidated) set.add(t.assigneA)
        return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
    }, [consolidated])

    /** Tâches filtrées (search + 5 filtres + showDone).
     *  En Kanban, les colonnes FAIT/ANNULE SONT la vue elle-même : on force `showDone: true`
     *  sinon ces colonnes resteraient vides en permanence. Le toggle "Inclure les faites"
     *  ne s'applique donc qu'à la vue Liste (où il sert à réduire le bruit). */
    const filtered = useMemo(() => {
        const effective =
            filters.viewMode === "kanban" ? { ...filters, showDone: true } : filters
        return applyFilters(consolidated, effective)
    }, [consolidated, filters])

    /** Compteurs (sur consolidated, pas filtered, pour rester globaux) */
    const counters = useMemo(() => {
        let aFaire = 0
        let enCours = 0
        let faites = 0
        let retard = 0
        for (const t of consolidated) {
            if (t.statut === "A_FAIRE") aFaire++
            else if (t.statut === "EN_COURS") enCours++
            else if (t.statut === "FAIT") faites++
            if (isOverdue(t)) retard++
        }
        return { total: consolidated.length, aFaire, enCours, faites, retard }
    }, [consolidated])

    /* ============================================================
       Mutations
       ============================================================ */

    const patchTache = (id: string, changes: Partial<MockTache>) => {
        const before = patches[id] ?? {}
        setPatches((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...changes } }))
        patchEntity(`/api/taches/${id}`, changes as Record<string, unknown>).catch((e) => {
            setPatches((prev) => ({ ...prev, [id]: before }))
            showApiError("Échec sauvegarde tâche")(e)
        })
    }

    const handleChangeStatut = (id: string, statut: TacheStatutKey) => {
        patchTache(id, {
            statut,
            completedAt: statut === "FAIT" ? new Date().toISOString() : null,
        })
    }
    const handleChangePriorite = (id: string, priorite: TachePrioriteKey) => patchTache(id, { priorite })
    const handleChangeAssigne = (id: string, assigne: string) => patchTache(id, { assigneA: assigne })
    const handleChangeEcheance = (id: string, echeance: string | null) => patchTache(id, { echeance })

    const handleToggleDone = (t: MockTache) => {
        handleChangeStatut(t.id, t.statut === "FAIT" ? "A_FAIRE" : "FAIT")
    }

    const openCreateDialog = () => {
        setEditingTache(null)
        setFormOpen(true)
    }
    const openEditDialog = (t: MockTache) => {
        setEditingTache(t)
        setFormOpen(true)
    }

    const handleSaveDraft = async (draft: TacheFormDraft) => {
        if (editingTache) {
            patchTache(editingTache.id, {
                titre: draft.titre.trim(),
                description: draft.description.trim() || undefined,
                statut: draft.statut,
                priorite: draft.priorite,
                responsableId: draft.responsableId,
                equipeIds: draft.equipeIds,
                echeance: draft.echeance,
                clientId: draft.clientId,
                dossierId: draft.dossierId,
                audienceId: draft.audienceId,
            } as Record<string, unknown>)
        } else {
            try {
                const res = await fetch("/api/taches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        titre: draft.titre.trim(),
                        description: draft.description?.trim() || null,
                        statut: draft.statut,
                        priorite: draft.priorite,
                        responsableId: draft.responsableId,
                        equipeIds: draft.equipeIds,
                        echeance: draft.echeance || null,
                        clientId: draft.clientId || null,
                        dossierId: draft.dossierId || null,
                        audienceId: draft.audienceId || null,
                    }),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error ?? `HTTP ${res.status}`)
                }
                const newTache: MockTache = await res.json()
                setCreated((prev) => [newTache, ...prev])
            } catch (e) {
                toast.error("Échec création tâche : " + (e instanceof Error ? e.message : "Erreur"))
                return
            }
        }
        setFormOpen(false)
        setEditingTache(null)
    }

    const handleDuplicate = (t: MockTache) => {
        const copy: MockTache = {
            ...t,
            id: `tac-local-${Date.now()}`,
            titre: `${t.titre} (copie)`,
            statut: "A_FAIRE",
            createdAt: new Date().toISOString(),
            completedAt: null,
        }
        setCreated((prev) => [copy, ...prev])
    }

    const handleDelete = async (id: string) => {
        const prevDeleted = deletedIds
        setDeletedIds((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
        })
        setPatches((prev) => {
            const { [id]: _removed, ...rest } = prev
            return rest
        })
        try {
            const r = await fetch(`/api/taches/${id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            const { toast } = await import("@/components/ui/toaster")
            toast.success("Tâche supprimée.")
        } catch (e) {
            setDeletedIds(prevDeleted)
            const { toast } = await import("@/components/ui/toaster")
            toast.error("Échec : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    return (
        <PageGate perm="taches.view" moduleName="Tâches">
        <div className="flex flex-col h-full overflow-hidden p-container-margin gap-density-medium">
            {/* Header */}
            <header className="flex-none flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-baseline gap-3 flex-wrap min-w-0">
                    <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                        Productivité
                    </p>
                    <h1 className="font-h1 text-h1 text-primary-container">Tâches</h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                        <CounterPill value={counters.aFaire} label="à faire" tone="default" />
                        <CounterPill value={counters.enCours} label="en cours" tone="info" />
                        {counters.retard > 0 && (
                            <CounterPill value={counters.retard} label="en retard" tone="error" />
                        )}
                        <CounterPill value={counters.faites} label="faites" tone="success" />
                    </p>
                </div>

                <button
                    onClick={openCreateDialog}
                    className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded font-body-sm text-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98] duration-150 ease-out"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nouvelle tâche
                </button>
            </header>

            {/* Toolbar */}
            <div className="flex-none">
                <TachesToolbar
                    filters={filters}
                    onSearchChange={(q) => setFilters((f) => ({ ...f, search: q }))}
                    onClearSearch={() => setFilters((f) => ({ ...f, search: "" }))}
                    onOpenFilters={() => setDrawerOpen(true)}
                    onViewModeChange={(m) => setFilters((f) => ({ ...f, viewMode: m }))}
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
                            Impossible de charger les tâches ({error})
                        </p>
                    </div>
                ) : filters.viewMode === "list" ? (
                    <TachesListView
                        taches={filtered}
                        onToggleDone={handleToggleDone}
                        onChangeStatut={handleChangeStatut}
                        onChangePriorite={handleChangePriorite}
                        onChangeAssigne={handleChangeAssigne}
                        onChangeEcheance={handleChangeEcheance}
                        onEdit={openEditDialog}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                    />
                ) : (
                    <TachesKanbanView
                        taches={filtered}
                        onChangeStatut={handleChangeStatut}
                        onChangePriorite={handleChangePriorite}
                        onChangeAssigne={handleChangeAssigne}
                        onChangeEcheance={handleChangeEcheance}
                        onEdit={openEditDialog}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* Drawer filtres */}
            <TachesFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                availableAssignees={availableAssignees}
            />

            {/* Form dialog (create + edit) */}
            {formOpen && (
                <TacheFormDialog
                    initial={editingTache}
                    clients={clients}
                    dossiers={dossiers}
                    audiences={audiences}
                    onSave={handleSaveDraft}
                    onClose={() => {
                        setFormOpen(false)
                        setEditingTache(null)
                    }}
                />
            )}
        </div>
        </PageGate>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

function CounterPill({
    value,
    label,
    tone,
}: {
    value: number
    label: string
    tone: "default" | "info" | "success" | "error"
}) {
    const cls =
        tone === "error"
            ? "bg-error-container/60 border-error/30 text-on-error-container"
            : tone === "success"
                ? "bg-[#e8f5e9] border-[#bbf7d0] text-[#166534]"
                : tone === "info"
                    ? "bg-tertiary-fixed-dim/40 border-outline-variant text-on-tertiary-fixed-variant"
                    : "bg-surface-container-high border-outline-variant text-on-surface-variant"
    return (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded border font-medium", cls)}>
            <span className="font-mono-num text-mono-num mr-1.5">{value}</span>
            {label}
        </span>
    )
}
