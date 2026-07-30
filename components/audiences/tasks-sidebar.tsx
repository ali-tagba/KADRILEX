"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { MockTache } from "@/lib/mock/audiences"

interface TasksSidebarProps {
    /** Toutes les tâches du cabinet (depuis /api/taches) */
    taches: MockTache[]
}

type Filter = "ALL" | "TODAY" | "URGENT"

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayDiff(target: Date, ref: Date): number {
    const a = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    const b = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
    return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function formatEcheance(iso: string | null): { label: string; className: string } {
    if (!iso) return { label: "", className: "text-on-surface-variant" }
    const d = new Date(iso)
    const now = new Date()
    if (isSameDay(d, now)) {
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        return { label: `Auj. ${hh}h${mm}`, className: "text-primary-container font-medium" }
    }
    const diff = dayDiff(d, now)
    if (diff === 1) return { label: "Demain", className: "text-on-surface-variant" }
    if (diff < 0) return { label: `${Math.abs(diff)}j de retard`, className: "text-error font-semibold" }
    if (diff <= 7) return { label: `Dans ${diff}j`, className: "text-on-surface-variant" }
    return {
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        className: "text-on-surface-variant",
    }
}

/** Score de tri : plus petit = plus prioritaire en haut */
function sortScore(t: MockTache): number {
    const now = Date.now()
    if (t.echeance) {
        const e = new Date(t.echeance).getTime()
        const diffDays = (e - now) / 86_400_000
        if (diffDays < -0.001) return -1000 + diffDays // en retard d'abord (plus rétrograde = plus prioritaire)
        if (diffDays < 1) return -100 + diffDays // aujourd'hui (encore prioritaire mais après retard)
        if (diffDays < 7) return diffDays // semaine
        return 100 + diffDays // futur
    }
    // Pas d'échéance : trié par priorité (URGENTE = haut)
    return t.priorite === "URGENTE" ? 50 : t.priorite === "HAUTE" ? 60 : 80
}

export function TasksSidebar({ taches }: TasksSidebarProps) {
    /* Toggle local pour démo (perdu au refresh tant que la DB n'est pas branchée) */
    const [localStatus, setLocalStatus] = useState<Record<string, "FAIT" | "A_FAIRE">>({})
    const [filter, setFilter] = useState<Filter>("ALL")

    const isDone = useCallback(
        (t: MockTache): boolean => {
            if (localStatus[t.id]) return localStatus[t.id] === "FAIT"
            return t.statut === "FAIT"
        },
        [localStatus]
    )

    const toggleDone = (t: MockTache) => {
        setLocalStatus((prev) => ({ ...prev, [t.id]: isDone(t) ? "A_FAIRE" : "FAIT" }))
    }

    /**
     * Liste consolidée — UNE seule section "Mes tâches".
     * Inclut :
     *  - Toutes les tâches non terminées (A_FAIRE / EN_COURS) ayant une échéance d'aujourd'hui ou avant
     *  - + toutes les tâches priorité URGENTE/HAUTE non terminées (peu importe l'échéance)
     * Triées par urgence : en retard → aujourd'hui → demain → semaine → urgentes futures.
     */
    const tachesConsolidees = useMemo(() => {
        const now = new Date()
        return taches
            .filter((t) => t.statut !== "ANNULE")
            .filter((t) => {
                const done = isDone(t)
                if (done) return false
                // Doit avoir échéance imminente OU priorité haute/urgente
                if (t.echeance) {
                    const d = new Date(t.echeance)
                    const isPastOrToday = d <= now || isSameDay(d, now)
                    if (isPastOrToday) return true
                    // Échéance future : on garde uniquement si urgente/haute
                    return t.priorite === "URGENTE" || t.priorite === "HAUTE"
                }
                return t.priorite === "URGENTE" || t.priorite === "HAUTE"
            })
            .sort((a, b) => sortScore(a) - sortScore(b))
    }, [taches, isDone])

    /** Pour l'affichage avec filtre rapide */
    const visibles = useMemo(() => {
        const now = new Date()
        if (filter === "TODAY") {
            return tachesConsolidees.filter((t) => {
                if (!t.echeance) return false
                const d = new Date(t.echeance)
                return isSameDay(d, now) || d < now
            })
        }
        if (filter === "URGENT") {
            return tachesConsolidees.filter((t) => t.priorite === "URGENTE" || t.priorite === "HAUTE")
        }
        return tachesConsolidees
    }, [tachesConsolidees, filter])

    /* Compteurs pour les pills */
    const counts = useMemo(() => {
        const now = new Date()
        const today = tachesConsolidees.filter((t) => {
            if (!t.echeance) return false
            const d = new Date(t.echeance)
            return isSameDay(d, now) || d < now
        }).length
        const urgent = tachesConsolidees.filter(
            (t) => t.priorite === "URGENTE" || t.priorite === "HAUTE"
        ).length
        return { all: tachesConsolidees.length, today, urgent }
    }, [tachesConsolidees])

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header */}
            <header className="flex-none bg-surface-container border-b border-outline-variant px-density-medium py-2.5 flex justify-between items-center gap-2">
                <h3 className="font-h2 text-base text-primary-container flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px]">task_alt</span>
                    <span className="truncate">Mes tâches</span>
                    <span className="font-mono-num text-mono-num text-[12px] px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">
                        {counts.all}
                    </span>
                </h3>
                <Link
                    href="/audiences"
                    className="text-accent hover:bg-surface-container-low p-1 rounded transition-colors flex-shrink-0"
                    title="Toutes les tâches"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
            </header>

            {/* Filtres pills */}
            <div className="flex-none px-density-medium py-2 border-b border-outline-variant/60 flex gap-1 bg-surface-container-lowest">
                {(
                    [
                        { v: "ALL", label: "Toutes", count: counts.all },
                        { v: "TODAY", label: "Aujourd'hui", count: counts.today },
                        { v: "URGENT", label: "Urgentes", count: counts.urgent },
                    ] as { v: Filter; label: string; count: number }[]
                ).map((opt) => {
                    const isActive = filter === opt.v
                    return (
                        <button
                            key={opt.v}
                            onClick={() => setFilter(opt.v)}
                            className={cn(
                                "px-2.5 py-1 rounded font-body-sm text-[12px] transition-colors flex items-center gap-1.5",
                                isActive
                                    ? "bg-accent/15 text-primary font-medium"
                                    : "text-on-surface-variant hover:bg-surface-container-low"
                            )}
                        >
                            {opt.label}
                            <span className="font-mono-num text-[10px] opacity-70">({opt.count})</span>
                        </button>
                    )
                })}
            </div>

            {/* Liste tâches */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {visibles.length === 0 ? (
                    <div className="p-density-loose text-center font-body-sm text-body-sm text-on-surface-variant flex flex-col items-center justify-center h-full">
                        <span className="material-symbols-outlined text-[40px] text-outline-variant block mb-2">
                            task_alt
                        </span>
                        {filter === "ALL"
                            ? "Aucune tâche à traiter"
                            : filter === "TODAY"
                                ? "Aucune tâche pour aujourd'hui"
                                : "Aucune tâche urgente"}
                    </div>
                ) : (
                    <ul className="divide-y divide-outline-variant/40">
                        {visibles.map((t) => (
                            <TaskRow key={t.id} t={t} done={isDone(t)} onToggle={() => toggleDone(t)} />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}

/* ============================================================
   TaskRow
   ============================================================ */

interface TaskRowProps {
    t: MockTache
    done: boolean
    onToggle: () => void
}

function TaskRow({ t, done, onToggle }: TaskRowProps) {
    const echeance = formatEcheance(t.echeance)
    const isLate = t.echeance ? new Date(t.echeance) < new Date() && !isSameDay(new Date(t.echeance), new Date()) : false

    return (
        <li
            className={cn(
                "px-density-medium py-2.5 hover:bg-surface-container-low transition-colors group",
                isLate && !done && "bg-error-container/15"
            )}
        >
            <div className="flex gap-3 items-start">
                <button
                    onClick={onToggle}
                    aria-label={done ? "Marquer comme à faire" : "Marquer comme fait"}
                    className={cn(
                        "mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0",
                        done
                            ? "bg-accent border-accent text-white"
                            : isLate
                                ? "bg-white border-error hover:border-error"
                                : "bg-white border-outline-variant hover:border-accent"
                    )}
                >
                    {done && <span className="material-symbols-outlined text-[12px]">check</span>}
                </button>
                <div className={cn("flex-1 min-w-0", done && "opacity-50")}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <span
                            className={cn(
                                "font-body-sm text-body-sm font-medium text-on-surface line-clamp-2 leading-snug",
                                done && "line-through"
                            )}
                        >
                            {t.titre}
                        </span>
                        {!done && t.priorite === "URGENTE" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-[10px] uppercase whitespace-nowrap flex-shrink-0">
                                Urgent
                            </span>
                        )}
                        {!done && t.priorite === "HAUTE" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant font-label-caps text-[10px] uppercase whitespace-nowrap flex-shrink-0">
                                Haute
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 font-body-sm text-[11px] text-on-surface-variant flex-wrap">
                        {echeance.label && (
                            <span className={cn("inline-flex items-center gap-1", echeance.className)}>
                                <span className="material-symbols-outlined text-[12px]">
                                    {isLate ? "warning" : "schedule"}
                                </span>
                                {echeance.label}
                            </span>
                        )}
                        {t.audienceId && (
                            <Link
                                href={`/audiences/${t.audienceId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                            >
                                <span className="material-symbols-outlined text-[12px]">gavel</span>
                                Audience
                            </Link>
                        )}
                        {t.dossierId && !t.audienceId && (
                            <Link
                                href={`/dossiers/${t.dossierId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                            >
                                <span className="material-symbols-outlined text-[12px]">folder</span>
                                {t.dossierId.toUpperCase()}
                            </Link>
                        )}
                        <span className="inline-flex items-center gap-1 truncate ml-auto">
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            {t.assigneA.replace(/^Me /, "")}
                        </span>
                    </div>
                </div>
            </div>
        </li>
    )
}
