"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import { PageGate } from "@/components/auth/require-permission"
import {
    DILIGENCE_TYPES,
    DILIGENCE_STATUTS,
    TACHE_PRIORITES,
} from "@/lib/constants/legal"
import {
    bucketForDiligence,
    daysUntil,
    type DiligenceBucket,
    type DiligenceFormDraft,
    type DiligenceRecord,
} from "@/lib/types/diligence"
import { clientDisplayName, type MockClient } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"
import { DiligenceFormDialog } from "@/components/diligences/diligence-form-dialog"

const BUCKET_META: Record<DiligenceBucket, { label: string; tone: string; icon: string }> = {
    EN_RETARD: { label: "En retard", tone: "text-error", icon: "warning" },
    AUJOURDHUI: { label: "Aujourd'hui", tone: "text-[#f57f17]", icon: "today" },
    CETTE_SEMAINE: { label: "Cette semaine", tone: "text-primary-container", icon: "date_range" },
    PLUS_TARD: { label: "Plus tard", tone: "text-on-surface-variant", icon: "event_upcoming" },
    SANS_ECHEANCE: { label: "Sans échéance", tone: "text-outline", icon: "event_busy" },
    ACCOMPLIES: { label: "Accomplies / clôturées", tone: "text-[#166534]", icon: "task_alt" },
}

const BUCKET_ORDER: DiligenceBucket[] = [
    "EN_RETARD",
    "AUJOURDHUI",
    "CETTE_SEMAINE",
    "PLUS_TARD",
    "SANS_ECHEANCE",
    "ACCOMPLIES",
]

export default function DiligencesPage() {
    const searchParams = useSearchParams()
    const presetDossierId = searchParams.get("dossierId")
    const openOnMount = searchParams.get("new") === "1"

    const [diligences, setDiligences] = useState<DiligenceRecord[]>([])
    const [dossiers, setDossiers] = useState<MockDossier[]>([])
    const [clients, setClients] = useState<MockClient[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(openOnMount)
    const [editTarget, setEditTarget] = useState<DiligenceRecord | null>(null)
    const [search, setSearch] = useState("")
    const [showDone, setShowDone] = useState(false)

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch("/api/diligences", { credentials: "include" }).then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<DiligenceRecord[]>
            }),
            fetch("/api/dossiers", { credentials: "include" })
                .then((r) => (r.ok ? (r.json() as Promise<MockDossier[]>) : []))
                .catch(() => [] as MockDossier[]),
            fetch("/api/clients", { credentials: "include" })
                .then((r) => (r.ok ? (r.json() as Promise<MockClient[]>) : []))
                .catch(() => [] as MockClient[]),
        ])
            .then(([dil, dos, cli]) => {
                if (!alive) return
                setDiligences(dil)
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

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return diligences
        return diligences.filter((d) =>
            [d.numero, d.titre, d.description ?? "", d.dossier?.titre ?? "", d.client ? clientDisplayName(d.client) : ""]
                .join(" ")
                .toLowerCase()
                .includes(q)
        )
    }, [diligences, search])

    const grouped = useMemo(() => {
        const map: Record<DiligenceBucket, DiligenceRecord[]> = {
            EN_RETARD: [],
            AUJOURDHUI: [],
            CETTE_SEMAINE: [],
            PLUS_TARD: [],
            SANS_ECHEANCE: [],
            ACCOMPLIES: [],
        }
        for (const d of filtered) map[bucketForDiligence(d)].push(d)
        return map
    }, [filtered])

    const counters = useMemo(() => {
        const enRetard = grouped.EN_RETARD.length
        const aujourdhui = grouped.AUJOURDHUI.length
        const aFaire = filtered.filter((d) => d.statut !== "ACCOMPLIE" && d.statut !== "ANNULEE").length
        return { enRetard, aujourdhui, aFaire }
    }, [grouped, filtered])

    /* ---- Mutations ---- */
    function draftToPayload(draft: DiligenceFormDraft) {
        return {
            titre: draft.titre,
            description: draft.description || null,
            type: draft.type,
            statut: draft.statut,
            priorite: draft.priorite,
            dateEcheance: draft.dateEcheance ? new Date(`${draft.dateEcheance}T09:00`).toISOString() : null,
            dossierId: draft.dossierId,
            clientId: draft.clientId,
            audienceId: draft.audienceId,
            responsableId: draft.responsableId,
            equipeIds: draft.equipeIds ?? [],
        }
    }

    async function handleCreate(draft: DiligenceFormDraft) {
        try {
            const res = await fetch("/api/diligences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(draftToPayload(draft)),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const created: DiligenceRecord = await res.json()
            setDiligences((prev) => [created, ...prev])
            setCreateOpen(false)
            toast.success("Diligence créée")
        } catch (e) {
            toast.error("Échec création : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    async function handleEdit(draft: DiligenceFormDraft) {
        if (!editTarget) return
        try {
            const res = await fetch(`/api/diligences/${editTarget.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(draftToPayload(draft)),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const updated: DiligenceRecord = await res.json()
            setDiligences((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
            setEditTarget(null)
            toast.success("Diligence modifiée")
        } catch (e) {
            toast.error("Échec modification : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    async function patchStatut(d: DiligenceRecord, statut: DiligenceRecord["statut"]) {
        try {
            const res = await fetch(`/api/diligences/${d.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ statut }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const updated: DiligenceRecord = await res.json()
            setDiligences((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
        } catch (e) {
            toast.error("Échec mise à jour : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    async function handleDelete(d: DiligenceRecord) {
        if (!confirm(`Supprimer la diligence « ${d.titre} » ?`)) return
        try {
            const res = await fetch(`/api/diligences/${d.id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setDiligences((prev) => prev.filter((x) => x.id !== d.id))
            toast.success("Diligence supprimée")
        } catch (e) {
            toast.error("Échec suppression : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const visibleBuckets = BUCKET_ORDER.filter(
        (b) => b !== "ACCOMPLIES" || showDone
    )

    return (
        <PageGate perm="diligences.view" moduleName="Diligences">
            <div className="flex flex-col h-full overflow-hidden p-container-margin gap-density-medium">
                {/* Header */}
                <header className="flex-none flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-baseline gap-3 flex-wrap min-w-0">
                        <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                            Agenda
                        </p>
                        <h1 className="font-h1 text-h1 text-primary-container">Diligences</h1>
                        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                            {counters.enRetard > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-error-container/60 border border-error/30 text-on-error-container font-medium">
                                    <span className="font-mono-num text-mono-num mr-1.5">{counters.enRetard}</span>
                                    en retard
                                </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant font-medium">
                                <span className="font-mono-num text-mono-num mr-1.5 text-primary-container">
                                    {counters.aujourdhui}
                                </span>
                                aujourd&apos;hui
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface border border-outline-variant text-on-surface-variant">
                                <span className="font-mono-num text-mono-num mr-1.5">{counters.aFaire}</span>
                                à traiter
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded font-body-sm text-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98] duration-150 ease-out"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nouvelle diligence
                    </button>
                </header>

                {/* Toolbar */}
                <div className="flex-none flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <span className="material-symbols-outlined text-[18px] text-outline absolute left-2.5 top-1/2 -translate-y-1/2">
                            search
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher une diligence…"
                            className="w-full bg-white border border-outline-variant rounded pl-9 pr-3 py-1.5 font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </div>
                    <button
                        onClick={() => setShowDone((s) => !s)}
                        className={cn(
                            "px-3 py-1.5 rounded border font-body-sm text-body-sm transition-colors inline-flex items-center gap-1.5",
                            showDone
                                ? "border-accent bg-accent/10 text-on-surface"
                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                        )}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {showDone ? "visibility" : "visibility_off"}
                        </span>
                        Accomplies
                    </button>
                </div>

                {/* Contenu */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                    {loading ? (
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant">
                            Chargement…
                        </div>
                    ) : error ? (
                        <div className="bg-error-container border border-outline-variant rounded-lg p-6 text-center">
                            <p className="font-body-sm text-on-error-container">
                                Impossible de charger les diligences ({error})
                            </p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                            <span className="material-symbols-outlined text-[40px] text-outline-variant">checklist</span>
                            <p className="font-body-md text-body-md text-on-surface mt-2 font-medium">
                                Aucune diligence pour l&apos;instant
                            </p>
                            <button
                                onClick={() => setCreateOpen(true)}
                                className="mt-3 text-accent font-body-sm font-medium hover:underline"
                            >
                                Créer la première diligence
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-6">
                            {visibleBuckets.map((b) => {
                                const items = grouped[b]
                                if (items.length === 0) return null
                                const meta = BUCKET_META[b]
                                return (
                                    <section key={b}>
                                        <div className="flex items-center gap-2 mb-2 sticky top-0 bg-surface py-1 z-10">
                                            <span className={cn("material-symbols-outlined text-[18px]", meta.tone)}>
                                                {meta.icon}
                                            </span>
                                            <h2 className={cn("font-label-caps text-label-caps uppercase tracking-wider", meta.tone)}>
                                                {meta.label}
                                            </h2>
                                            <span className="font-mono-num text-[11px] text-outline">({items.length})</span>
                                        </div>
                                        <div className="space-y-2">
                                            {items.map((d) => (
                                                <DiligenceCard
                                                    key={d.id}
                                                    d={d}
                                                    onToggleDone={() =>
                                                        patchStatut(d, d.statut === "ACCOMPLIE" ? "A_FAIRE" : "ACCOMPLIE")
                                                    }
                                                    onEdit={() => setEditTarget(d)}
                                                    onDelete={() => handleDelete(d)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {createOpen && (
                <DiligenceFormDialog
                    presetDossierId={presetDossierId}
                    dossiers={dossiers}
                    clients={clients}
                    onSave={handleCreate}
                    onClose={() => setCreateOpen(false)}
                />
            )}
            {editTarget && (
                <DiligenceFormDialog
                    initial={editTarget}
                    dossiers={dossiers}
                    clients={clients}
                    onSave={handleEdit}
                    onClose={() => setEditTarget(null)}
                />
            )}
        </PageGate>
    )
}

interface DiligenceCardProps {
    d: DiligenceRecord
    onToggleDone: () => void
    onEdit: () => void
    onDelete: () => void
}

function DiligenceCard({ d, onToggleDone, onEdit, onDelete }: DiligenceCardProps) {
    const typeMeta = DILIGENCE_TYPES[d.type as keyof typeof DILIGENCE_TYPES] || DILIGENCE_TYPES.AUTRE
    const statutMeta = DILIGENCE_STATUTS[d.statut as keyof typeof DILIGENCE_STATUTS] || DILIGENCE_STATUTS.A_FAIRE
    const prioMeta = TACHE_PRIORITES[d.priorite as keyof typeof TACHE_PRIORITES] || TACHE_PRIORITES.MOYENNE
    const isDone = d.statut === "ACCOMPLIE" || d.statut === "ANNULEE"
    const jours = daysUntil(d.dateEcheance)

    let echeanceLabel = "Sans échéance"
    let echeanceTone = "text-outline"
    if (jours !== null) {
        if (jours < 0) {
            echeanceLabel = `En retard de ${Math.abs(jours)} j`
            echeanceTone = "text-error font-semibold"
        } else if (jours === 0) {
            echeanceLabel = "Aujourd'hui"
            echeanceTone = "text-[#f57f17] font-semibold"
        } else if (jours === 1) {
            echeanceLabel = "Demain"
            echeanceTone = "text-[#f57f17]"
        } else if (jours <= 7) {
            echeanceLabel = `Dans ${jours} j`
            echeanceTone = "text-primary-container"
        } else {
            echeanceLabel = new Date(d.dateEcheance!).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
            })
            echeanceTone = "text-on-surface-variant"
        }
    }

    return (
        <div
            className={cn(
                "group bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-surface-container-low transition-colors",
                isDone && "opacity-60"
            )}
        >
            {/* Checkbox accompli */}
            <button
                type="button"
                onClick={onToggleDone}
                title={isDone ? "Rouvrir" : "Marquer accomplie"}
                className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isDone
                        ? "bg-[#166534] border-[#166534] text-white"
                        : "border-outline hover:border-accent"
                )}
            >
                {isDone && <span className="material-symbols-outlined text-[14px]">check</span>}
            </button>

            {/* Type icon */}
            <div className="w-9 h-9 rounded bg-surface-container border border-outline-variant flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] text-primary-container">
                    {typeMeta.icon}
                </span>
            </div>

            {/* Corps */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("font-body-md text-body-md font-medium text-on-surface truncate", isDone && "line-through")}>
                        {d.titre}
                    </span>
                    <span className="font-mono-num text-[10px] text-outline">{d.numero}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5 font-body-sm text-[11px] text-outline">
                    <span>{typeMeta.label}</span>
                    {d.dossier && (
                        <>
                            <span className="text-outline-variant">·</span>
                            <Link
                                href={`/dossiers/${d.dossier.id}`}
                                className="text-primary-container hover:underline truncate max-w-[180px]"
                            >
                                {d.dossier.numero}
                            </Link>
                        </>
                    )}
                    {!d.dossier && d.client && (
                        <>
                            <span className="text-outline-variant">·</span>
                            <span className="truncate max-w-[180px]">{clientDisplayName(d.client)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Priorité */}
            <span className={cn("hidden sm:inline-flex items-center gap-1 font-body-sm text-[11px]", prioMeta.chip)}>
                <span className="material-symbols-outlined text-[14px]">{prioMeta.icon}</span>
                {prioMeta.label}
            </span>

            {/* Échéance */}
            <span className={cn("font-body-sm text-[12px] whitespace-nowrap min-w-[90px] text-right", echeanceTone)}>
                {echeanceLabel}
            </span>

            {/* Statut chip */}
            <span className={cn("hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold", statutMeta.chip)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", statutMeta.dot)} />
                {statutMeta.label}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={onEdit}
                    title="Modifier"
                    className="p-1.5 rounded text-outline hover:text-primary hover:bg-surface-container transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    title="Supprimer"
                    className="p-1.5 rounded text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
            </div>
        </div>
    )
}
