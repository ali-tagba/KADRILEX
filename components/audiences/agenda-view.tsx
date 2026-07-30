"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AUDIENCE_NATURES, AUDIENCE_STATUTS } from "@/lib/constants/legal"
import {
    audienceClientLabel,
    getAudienceTaches,
    type MockAudience,
} from "@/lib/mock/audiences"
import { AudienceActionsMenu } from "./audience-actions-menu"

/* ============================================================
   Constantes timeline
   ============================================================ */

const HOUR_HEIGHT = 64 // px par heure (= 1 heure)
const START_HOUR = 8 // 8h du matin
const END_HOUR = 19 // 19h (11 lignes : 8h, 9h, …, 18h)
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

/* ============================================================
   Helpers
   ============================================================ */

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

function formatDayLong(d: Date): string {
    return d
        .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        .replace(/^\w/, (m) => m.toUpperCase())
}

function formatHM(d: Date): string {
    const h = String(d.getHours()).padStart(2, "0")
    const m = String(d.getMinutes()).padStart(2, "0")
    return `${h}:${m}`
}

/** Convertit une heure (H + M) en offset en pixels depuis le top du timeline body */
function hourToTopPx(hour: number, minute: number): number {
    return (hour - START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT
}

/* ============================================================
   AgendaView
   ============================================================ */

interface AgendaViewProps {
    audiences: MockAudience[]
    onAudienceClick?: (audience: MockAudience) => void
}

export function AgendaView({ audiences, onAudienceClick }: AgendaViewProps) {
    const [currentDay, setCurrentDay] = useState<Date>(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
    })
    /* Suppression locale en session */
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
    const visibleAudiences = useMemo(
        () => audiences.filter((a) => !hiddenIds.has(a.id)),
        [audiences, hiddenIds]
    )
    const [now, setNow] = useState(new Date())
    const timelineRef = useRef<HTMLDivElement>(null)
    const initialScrollDone = useRef(false)

    // Refresh "now" every minute pour le current-time indicator
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])

    const audiencesOfDay = useMemo(() => {
        return visibleAudiences
            .filter((a) => isSameDay(new Date(a.dateDebut), currentDay))
            .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
    }, [visibleAudiences, currentDay])

    const isToday = isSameDay(now, currentDay)

    const goPrev = () => {
        const d = new Date(currentDay)
        d.setDate(d.getDate() - 1)
        setCurrentDay(d)
    }
    const goNext = () => {
        const d = new Date(currentDay)
        d.setDate(d.getDate() + 1)
        setCurrentDay(d)
    }
    const goToday = () => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        setCurrentDay(d)
    }

    /* ============================================================
       Layout multi-colonnes propre (style Google Calendar)
       1. On regroupe les audiences en "clusters" (groupes transitivement chevauchants)
       2. Pour chaque cluster, on assigne chaque audience à la 1ʳᵉ colonne libre
       3. Toutes les audiences d'un même cluster partagent le même `totalColumns`
          → 3 audiences qui se chevauchent => 3 colonnes 1/3 chacune
       ============================================================ */
    const audienceLayout = useMemo(() => {
        if (audiencesOfDay.length === 0) return []
        type Entry = { audience: MockAudience; column: number; totalColumns: number }
        const result: Entry[] = []

        // 1. Construire les clusters
        type Cluster = { audiences: MockAudience[]; endMax: number }
        const clusters: Cluster[] = []
        for (const a of audiencesOfDay) {
            const start = new Date(a.dateDebut).getTime()
            const end = start + a.dureeMinutes * 60_000
            const last = clusters[clusters.length - 1]
            if (last && start < last.endMax) {
                last.audiences.push(a)
                last.endMax = Math.max(last.endMax, end)
            } else {
                clusters.push({ audiences: [a], endMax: end })
            }
        }

        // 2. Pour chaque cluster, assigner les colonnes greedily
        for (const cluster of clusters) {
            const columnsEnd: number[] = [] // dernier "end" connu par colonne
            const assigned = new Map<string, number>()
            for (const a of cluster.audiences) {
                const start = new Date(a.dateDebut).getTime()
                const end = start + a.dureeMinutes * 60_000
                let col = columnsEnd.findIndex((prevEnd) => prevEnd <= start)
                if (col === -1) {
                    col = columnsEnd.length
                    columnsEnd.push(end)
                } else {
                    columnsEnd[col] = end
                }
                assigned.set(a.id, col)
            }
            const totalColumns = columnsEnd.length
            for (const a of cluster.audiences) {
                result.push({
                    audience: a,
                    column: assigned.get(a.id) ?? 0,
                    totalColumns,
                })
            }
        }
        return result
    }, [audiencesOfDay])

    // Auto-scroll vers l'heure courante au mount (si aujourd'hui)
    useEffect(() => {
        if (initialScrollDone.current || !isToday || !timelineRef.current) return
        const top = hourToTopPx(now.getHours(), now.getMinutes())
        // Centrer environ — scroll un peu avant (200px)
        timelineRef.current.scrollTop = Math.max(0, top - 200)
        initialScrollDone.current = true
    }, [isToday, now])

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col h-full min-h-[520px]">
            {/* Header date */}
            <header className="flex-none bg-surface-container border-b border-outline-variant px-density-medium py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={goPrev}
                        className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-white hover:text-primary-container transition-colors"
                        aria-label="Jour précédent"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <h2 className="font-h2 text-h2 text-primary-container">{formatDayLong(currentDay)}</h2>
                    <button
                        onClick={goNext}
                        className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-white hover:text-primary-container transition-colors"
                        aria-label="Jour suivant"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
                {!isToday && (
                    <button
                        onClick={goToday}
                        className="font-body-sm text-body-sm text-accent font-medium hover:underline"
                    >
                        Aujourd&apos;hui
                    </button>
                )}
                {isToday && (
                    <span className="font-label-caps text-label-caps text-accent uppercase">
                        Aujourd&apos;hui
                    </span>
                )}
            </header>

            {/* Timeline body */}
            <div ref={timelineRef} className="flex-1 overflow-y-auto scrollbar-thin relative">
                <div className="relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT + 16}px` }}>
                    {/* Hour lines + labels */}
                    <div className="absolute left-[60px] right-0 top-0 bottom-0 pointer-events-none">
                        {HOURS.map((h) => (
                            <div
                                key={h}
                                className="border-t border-outline-variant/60 relative"
                                style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                                <span className="absolute -left-[52px] -top-2 font-mono-num text-[11px] text-outline">
                                    {String(h).padStart(2, "0")}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Current time indicator (rouge accent) */}
                    {isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR && (
                        <div
                            className="absolute left-[60px] right-4 z-20 pointer-events-none flex items-center"
                            style={{ top: `${hourToTopPx(now.getHours(), now.getMinutes())}px` }}
                        >
                            <div className="absolute -left-[52px] bg-accent text-white font-mono-num text-[10px] px-1.5 py-0.5 rounded font-medium">
                                {formatHM(now)}
                            </div>
                            <div className="w-2 h-2 rounded-full bg-accent -ml-1 flex-shrink-0" />
                            <div className="flex-1 h-[1.5px] bg-accent" />
                        </div>
                    )}

                    {/* Events absolutes */}
                    <div className="absolute left-[60px] right-0 top-0 bottom-0 px-2">
                        {audienceLayout.map(({ audience, column, totalColumns }) => {
                            const start = new Date(audience.dateDebut)
                            const top = hourToTopPx(start.getHours(), start.getMinutes())
                            const height = Math.max(40, (audience.dureeMinutes / 60) * HOUR_HEIGHT)
                            const nature = AUDIENCE_NATURES[audience.nature]
                            const taches = getAudienceTaches(audience.id)
                            const tachesRestantes = taches.filter((t) => t.statut !== "FAIT" && t.statut !== "ANNULE").length
                            /* Largeur = 1/N de l'espace disponible, avec 4px d'inset à droite et 2px de gouttière entre colonnes */
                            const colW = 100 / totalColumns
                            const widthPct = `calc(${colW}% - ${totalColumns > 1 ? "6px" : "8px"})`
                            const leftPct = `calc(${column * colW}% + 4px)`

                            return (
                                <div
                                    key={audience.id}
                                    onClick={() => onAudienceClick?.(audience)}
                                    style={{
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        width: widthPct,
                                        left: leftPct,
                                    }}
                                    className="absolute bg-white border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex group"
                                >
                                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: nature.color }} />
                                    <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0 overflow-hidden">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-body-sm text-body-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors line-clamp-1">
                                                    {audience.titre}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5 text-on-surface-variant font-body-sm text-[11px] truncate">
                                                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                    <span className="truncate">
                                                        {audience.juridiction ?? "—"}
                                                        {audience.salleAudience && ` · ${audience.salleAudience}`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <div className="font-mono-num text-[11px] text-outline whitespace-nowrap">
                                                    {formatHM(start)}
                                                </div>
                                                <span onClick={(e) => e.stopPropagation()}>
                                                    <AudienceActionsMenu
                                                        size="sm"
                                                        onEdit={() =>
                                                            onAudienceClick?.(audience)
                                                        }
                                                        onDelete={async () => {
                                                            const prev = hiddenIds
                                                            setHiddenIds((s) =>
                                                                new Set(s).add(audience.id)
                                                            )
                                                            try {
                                                                const r = await fetch(
                                                                    `/api/audiences/${audience.id}`,
                                                                    {
                                                                        method: "DELETE",
                                                                        credentials: "include",
                                                                    }
                                                                )
                                                                if (!r.ok) {
                                                                    const body = await r
                                                                        .json()
                                                                        .catch(() => ({}))
                                                                    throw new Error(
                                                                        body.error ?? `HTTP ${r.status}`
                                                                    )
                                                                }
                                                                const { toast } = await import(
                                                                    "@/components/ui/toaster"
                                                                )
                                                                toast.success("Audience supprimée.")
                                                            } catch (e) {
                                                                setHiddenIds(prev)
                                                                const { toast } = await import(
                                                                    "@/components/ui/toaster"
                                                                )
                                                                toast.error(
                                                                    "Échec : " +
                                                                        (e instanceof Error
                                                                            ? e.message
                                                                            : "Erreur")
                                                                )
                                                            }
                                                        }}
                                                    />
                                                </span>
                                            </div>
                                        </div>
                                        {height >= 80 && (
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className={cn(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                    nature.chip
                                                )}>
                                                    {nature.label}
                                                </span>
                                                <span className="font-mono-num text-[10px] text-outline">
                                                    {audience.numero}
                                                </span>
                                                {tachesRestantes > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-error font-medium">
                                                        <span className="material-symbols-outlined text-[12px]">assignment_late</span>
                                                        {tachesRestantes} tâche{tachesRestantes > 1 ? "s" : ""} restante{tachesRestantes > 1 ? "s" : ""}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Empty state */}
                        {audienceLayout.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center pointer-events-auto bg-surface-container-low/60 border border-dashed border-outline-variant/60 rounded-xl px-8 py-6">
                                    <span className="material-symbols-outlined text-[40px] text-outline-variant block mb-2">
                                        event_busy
                                    </span>
                                    <p className="font-body-sm text-body-sm text-on-surface font-medium">
                                        Aucune audience
                                    </p>
                                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                                        Pas d&apos;audience ce jour
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer info légère */}
            <footer className="flex-none border-t border-outline-variant bg-surface-container-low px-density-medium py-2 flex items-center justify-between font-body-sm text-[11px] text-outline">
                <span>
                    {audiencesOfDay.length} audience{audiencesOfDay.length > 1 ? "s" : ""} programmée
                    {audiencesOfDay.length > 1 ? "s" : ""}
                </span>
                <Link href="/audiences" className="hover:text-primary-container transition-colors">
                    Voir toutes les audiences →
                </Link>
            </footer>
        </div>
    )
}
