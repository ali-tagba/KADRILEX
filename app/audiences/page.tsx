"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/toaster"
import { AgendaView } from "@/components/audiences/agenda-view"
import { GalleryView } from "@/components/audiences/gallery-view"
import { CalendarView } from "@/components/audiences/calendar-view"
import { TasksSidebar } from "@/components/audiences/tasks-sidebar"
import {
    AudienceToolbar,
    type AudienceViewMode,
} from "@/components/audiences/audience-toolbar"
import {
    AudienceFilterDrawer,
    INITIAL_AUDIENCE_FILTERS,
    countAudienceFilters,
    type AudienceFilters,
} from "@/components/audiences/audience-filter-drawer"
import {
    audienceClientLabel,
    type MockAudience,
    type MockTache,
} from "@/lib/mock/audiences"
import type { MockDossier } from "@/lib/mock/dossiers"
import { usePersistedFilters } from "@/lib/hooks/use-persisted-filters"
import type { MockClient } from "@/lib/mock/clients"
import {
    AudienceFormDialog,
    type AudienceFormDraft,
} from "@/components/audiences/audience-form-dialog"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { PageGate } from "@/components/auth/require-permission"

export default function AudiencesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const presetDossierId = searchParams.get("dossierId")
    const openOnMount = searchParams.get("new") === "1"
    const { filterByVisibility } = useCurrentUser()
    const [audiences, setAudiences] = useState<MockAudience[]>([])
    const [taches, setTaches] = useState<MockTache[]>([])
    const [formDossiers, setFormDossiers] = useState<MockDossier[]>([])
    const [formClients, setFormClients] = useState<MockClient[]>([])
    const [createOpen, setCreateOpen] = useState(openOnMount)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [viewMode, setViewMode] = useState<AudienceViewMode>("agenda")
    const [search, setSearch] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [advFilters, setAdvFilters] = usePersistedFilters<AudienceFilters>("audiences", INITIAL_AUDIENCE_FILTERS)

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch("/api/audiences").then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<MockAudience[]>
            }),
            fetch("/api/taches")
                .then((r) => (r.ok ? (r.json() as Promise<MockTache[]>) : []))
                .catch(() => [] as MockTache[]),
            fetch("/api/dossiers", { credentials: "include" })
                .then((r) => (r.ok ? (r.json() as Promise<MockDossier[]>) : []))
                .catch(() => [] as MockDossier[]),
            fetch("/api/clients", { credentials: "include" })
                .then((r) => (r.ok ? (r.json() as Promise<MockClient[]>) : []))
                .catch(() => [] as MockClient[]),
        ])
            .then(([aud, tac, dos, cli]) => {
                if (!alive) return
                setAudiences(aud)
                setTaches(tac)
                setFormDossiers(dos)
                setFormClients(cli)
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

    /* Compteurs header */
    const counters = useMemo(() => {
        const today = new Date()
        const startOfWeek = new Date(today)
        const dow = (today.getDay() + 6) % 7 // 0 = lundi
        startOfWeek.setDate(today.getDate() - dow)
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)

        const isSameDay = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

        const aujourdhui = audiences.filter((a) => isSameDay(new Date(a.dateDebut), today)).length
        const cetteSemaine = audiences.filter((a) => {
            const d = new Date(a.dateDebut)
            return d >= startOfWeek && d < endOfWeek
        }).length
        const enAttenteCR = audiences.filter(
            (a) => a.statut === "TERMINEE" && (a.compteRendu === null || a.compteRendu === "")
        ).length

        return { aujourdhui, cetteSemaine, enAttenteCR }
    }, [audiences])

    /* Filtrage RBAC d'abord, puis filtre search */
    const visibleAudiences = useMemo(
        () => filterByVisibility(audiences, "audiences.view"),
        [audiences, filterByVisibility]
    )
    const filteredAudiences = useMemo(() => {
        const q = search.trim().toLowerCase()
        return visibleAudiences.filter((a) => {
            if (advFilters.statuts.size > 0 && !advFilters.statuts.has(a.statut)) return false
            if (advFilters.natures.size > 0 && !advFilters.natures.has(a.nature)) return false
            if (q) {
                const haystack = [
                    a.numero,
                    a.titre,
                    a.juridiction ?? "",
                    a.salleAudience ?? "",
                    audienceClientLabel(a),
                ]
                    .join(" ")
                    .toLowerCase()
                if (!haystack.includes(q)) return false
            }
            return true
        })
    }, [visibleAudiences, search, advFilters])

    const handleAudienceClick = (a: MockAudience) => {
        router.push(`/audiences/${a.id}`)
    }

    const handleCreateAudience = async (draft: AudienceFormDraft) => {
        try {
            const dateDebut = new Date(`${draft.date}T${draft.heure}`).toISOString()
            const res = await fetch("/api/audiences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    titre: draft.titre,
                    nature: draft.nature,
                    statut: draft.statut,
                    dateDebut,
                    dureeMinutes: draft.dureeMinutes,
                    juridiction: draft.juridiction || null,
                    salleAudience: draft.salleAudience || null,
                    dossierId: draft.dossierId,
                    clientId: draft.clientId,
                    responsableId: draft.responsableId,
                    equipeIds: draft.equipeIds ?? [],
                    notes: draft.notes || null,
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const created: MockAudience = await res.json()
            setAudiences((prev) => [created, ...prev])
            setCreateOpen(false)
        } catch (e) {
            toast.error("Échec création audience : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    return (
        <PageGate perm="audiences.view" moduleName="Audiences">
        <div className="flex flex-col h-full overflow-hidden p-container-margin gap-density-medium">
            {/* Header compact */}
            <header className="flex-none flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-baseline gap-3 flex-wrap min-w-0">
                    <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                        Agenda
                    </p>
                    <h1 className="font-h1 text-h1 text-primary-container">Audiences</h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant font-medium">
                            <span className="font-mono-num text-mono-num mr-1.5 text-primary-container">
                                {counters.aujourdhui}
                            </span>
                            aujourd&apos;hui
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface border border-outline-variant text-on-surface-variant">
                            <span className="font-mono-num text-mono-num mr-1.5">{counters.cetteSemaine}</span>
                            cette semaine
                        </span>
                        {counters.enAttenteCR > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-tertiary-fixed-dim/40 border border-outline-variant text-on-tertiary-fixed-variant">
                                <span className="font-mono-num text-mono-num mr-1.5">{counters.enAttenteCR}</span>
                                en attente de CR
                            </span>
                        )}
                    </p>
                </div>

                <button
                    onClick={() => setCreateOpen(true)}
                    className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded font-body-sm text-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98] duration-150 ease-out"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Programmer audience
                </button>
            </header>

            {/* Toolbar */}
            <div className="flex-none">
                <AudienceToolbar
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    search={search}
                    onSearchChange={setSearch}
                    activeFiltersCount={countAudienceFilters(advFilters)}
                    onOpenFilters={() => setDrawerOpen(true)}
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
                            Impossible de charger les audiences ({error})
                        </p>
                    </div>
                ) : viewMode === "agenda" ? (
                    /* Vue Agenda : layout 8/4 avec sidebar tâches */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full min-h-0">
                        <div className="lg:col-span-8 min-h-0">
                            <AgendaView
                                audiences={filteredAudiences}
                                onAudienceClick={handleAudienceClick}
                            />
                        </div>
                        <div className="lg:col-span-4 min-h-0 hidden lg:block">
                            <TasksSidebar taches={taches} />
                        </div>
                    </div>
                ) : viewMode === "gallery" ? (
                    <GalleryView audiences={filteredAudiences} pageSize={12} />
                ) : (
                    <CalendarView
                        audiences={filteredAudiences}
                        onAudienceClick={handleAudienceClick}
                    />
                )}
            </div>

            {/* Dialog création audience */}
            {createOpen && (
                <AudienceFormDialog
                    presetDossierId={presetDossierId}
                    dossiers={formDossiers}
                    clients={formClients}
                    onSave={handleCreateAudience}
                    onClose={() => setCreateOpen(false)}
                />
            )}

            {/* Drawer filtres avancés */}
            <AudienceFilterDrawer
                open={drawerOpen}
                filters={advFilters}
                onChange={setAdvFilters}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
        </PageGate>
    )
}
