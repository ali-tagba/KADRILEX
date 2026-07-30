"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { AUDIENCE_NATURES, AUDIENCE_STATUTS } from "@/lib/constants/legal"
import { audienceClientLabel, type MockAudience } from "@/lib/mock/audiences"

interface CalendarViewProps {
    audiences: MockAudience[]
    onAudienceClick?: (a: MockAudience) => void
}

const WEEKDAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"]
const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]
const MAX_VISIBLE_PER_DAY = 3

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatHM(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`
}

function dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

interface CalendarCell {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    isWeekend: boolean
}

function buildCalendarMatrix(year: number, month: number): CalendarCell[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const firstOfMonth = new Date(year, month, 1)
    const dayOfWeek = (firstOfMonth.getDay() + 6) % 7 // 0 = lundi
    const start = new Date(firstOfMonth)
    start.setDate(start.getDate() - dayOfWeek)

    const cells: CalendarCell[] = []
    for (let i = 0; i < 42; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        const dow = d.getDay()
        cells.push({
            date: d,
            isCurrentMonth: d.getMonth() === month,
            isToday: isSameDay(d, today),
            isWeekend: dow === 0 || dow === 6,
        })
    }
    const lastRowAllOutOfMonth = cells.slice(35, 42).every((c) => !c.isCurrentMonth)
    return lastRowAllOutOfMonth ? cells.slice(0, 35) : cells
}

/* ============================================================
   Composant principal
   ============================================================ */

export function CalendarView({ audiences, onAudienceClick }: CalendarViewProps) {
    const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
        const d = new Date()
        return { year: d.getFullYear(), month: d.getMonth() }
    })
    /** Jour ouvert dans le popover "voir tout" */
    const [openDayKey, setOpenDayKey] = useState<string | null>(null)

    const matrix = useMemo(() => buildCalendarMatrix(cursor.year, cursor.month), [cursor])
    const rows = matrix.length / 7

    const audiencesByDay = useMemo(() => {
        const map = new Map<string, MockAudience[]>()
        for (const a of audiences) {
            const d = new Date(a.dateDebut)
            const key = dayKey(d)
            const arr = map.get(key) ?? []
            arr.push(a)
            map.set(key, arr)
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
        }
        return map
    }, [audiences])

    const monthAudienceCount = useMemo(() => {
        let n = 0
        for (const cell of matrix) {
            if (!cell.isCurrentMonth) continue
            n += audiencesByDay.get(dayKey(cell.date))?.length ?? 0
        }
        return n
    }, [matrix, audiencesByDay])

    const goPrev = () => {
        setOpenDayKey(null)
        const d = new Date(cursor.year, cursor.month - 1, 1)
        setCursor({ year: d.getFullYear(), month: d.getMonth() })
    }
    const goNext = () => {
        setOpenDayKey(null)
        const d = new Date(cursor.year, cursor.month + 1, 1)
        setCursor({ year: d.getFullYear(), month: d.getMonth() })
    }
    const goToday = () => {
        setOpenDayKey(null)
        const d = new Date()
        setCursor({ year: d.getFullYear(), month: d.getMonth() })
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Header navigation */}
            <header className="flex-none bg-surface-container border-b border-outline-variant px-density-medium py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-3 min-w-0">
                    <h2 className="font-h2 text-h2 text-primary-container">
                        {MONTHS_FR[cursor.month]} {cursor.year}
                    </h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant inline-flex items-center px-2 py-0.5 rounded bg-surface border border-outline-variant">
                        <span className="font-mono-num text-mono-num mr-1.5 text-primary-container">
                            {monthAudienceCount}
                        </span>
                        audience{monthAudienceCount > 1 ? "s" : ""}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToday}
                        className="px-3 py-1.5 bg-white border border-outline-variant rounded text-primary-container font-body-sm text-body-sm font-medium hover:bg-surface-container-low transition-colors"
                    >
                        Aujourd&apos;hui
                    </button>
                    <div className="flex border border-outline-variant rounded overflow-hidden bg-white">
                        <button
                            onClick={goPrev}
                            className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-low transition-colors text-primary-container border-r border-outline-variant"
                            aria-label="Mois précédent"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <button
                            onClick={goNext}
                            className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-low transition-colors text-primary-container"
                            aria-label="Mois suivant"
                        >
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* En-tête jours de la semaine — uniforme, pas de couleur weekend */}
            <div className="flex-none grid grid-cols-7 border-b border-outline-variant bg-surface-container-low">
                {WEEKDAYS.map((d) => (
                    <div
                        key={d}
                        className="py-2 text-center font-label-caps text-label-caps tracking-wider text-on-surface-variant"
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Grille du mois — tous les carreaux ont le même fond blanc.
                Seul le numéro du jour change (cercle plein si aujourd'hui, gris pâle si hors mois). */}
            <div
                className="flex-1 grid gap-px bg-outline-variant/70 overflow-y-auto scrollbar-thin"
                style={{
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gridAutoRows: `minmax(${rows === 6 ? "108px" : "128px"}, 1fr)`,
                }}
            >
                {matrix.map((cell) => {
                    const key = dayKey(cell.date)
                    const dayAudiences = audiencesByDay.get(key) ?? []
                    const visibleAudiences = dayAudiences.slice(0, MAX_VISIBLE_PER_DAY)
                    const overflow = dayAudiences.length - visibleAudiences.length
                    const isOpen = openDayKey === key

                    return (
                        <div
                            key={cell.date.toISOString()}
                            className="relative bg-surface-container-lowest p-1.5 flex flex-col gap-1 hover:bg-surface-container-low/40 transition-colors"
                        >
                            {/* Numéro du jour : cercle plein si today, sinon texte */}
                            <div className="flex items-center justify-start px-0.5">
                                <span
                                    className={cn(
                                        "font-mono-num text-[12px] w-6 h-6 inline-flex items-center justify-center rounded-full leading-none transition-colors",
                                        cell.isToday
                                            ? "bg-primary text-on-primary font-semibold"
                                            : cell.isCurrentMonth
                                                ? "text-on-surface"
                                                : "text-outline-variant"
                                    )}
                                >
                                    {cell.date.getDate()}
                                </span>
                            </div>

                            {/* Pills audience */}
                            <div className="flex flex-col gap-0.5 min-h-0">
                                {visibleAudiences.map((a) => (
                                    <CalendarAudiencePill
                                        key={a.id}
                                        audience={a}
                                        muted={!cell.isCurrentMonth}
                                        onClick={() => onAudienceClick?.(a)}
                                    />
                                ))}
                                {overflow > 0 && (
                                    <button
                                        onClick={() => setOpenDayKey(isOpen ? null : key)}
                                        className={cn(
                                            "text-left text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors",
                                            isOpen
                                                ? "bg-accent/15 text-primary"
                                                : "text-on-surface-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        +{overflow} autre{overflow > 1 ? "s" : ""}
                                    </button>
                                )}
                            </div>

                            {/* Popover "voir tout" pour la cellule */}
                            {isOpen && (
                                <DayPopover
                                    date={cell.date}
                                    audiences={dayAudiences}
                                    onClose={() => setOpenDayKey(null)}
                                    onAudienceClick={(aud) => {
                                        setOpenDayKey(null)
                                        onAudienceClick?.(aud)
                                    }}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ============================================================
   CalendarAudiencePill — pill compacte dans une cellule du mois
   ============================================================ */

function CalendarAudiencePill({
    audience,
    muted,
    onClick,
}: {
    audience: MockAudience
    /** True si l'audience est dans une cellule hors-mois — on l'estompe sans toucher au carreau */
    muted?: boolean
    onClick: () => void
}) {
    const nature = AUDIENCE_NATURES[audience.nature]
    /* `now` figé au mount pour éviter l'appel impur Date.now() en render */
    const [now] = useState(() => Date.now())
    const isPast = new Date(audience.dateDebut).getTime() < now - audience.dureeMinutes * 60_000
    const cancelled = audience.statut === "ANNULEE"
    const reported = audience.statut === "REPORTEE"

    return (
        <button
            onClick={onClick}
            title={`${formatHM(new Date(audience.dateDebut))} · ${audience.titre}\n${audienceClientLabel(audience)}`}
            className={cn(
                "text-left text-[10px] leading-tight px-1.5 py-1 rounded-sm border-l-[3px] transition-colors hover:bg-surface-container flex items-center gap-1.5 min-w-0 overflow-hidden",
                cancelled && "line-through",
                reported && "italic",
                (cancelled || reported || isPast || muted) && "opacity-60"
            )}
            style={{ borderLeftColor: nature.color }}
        >
            <span
                className="font-mono-num text-[10px] font-semibold flex-shrink-0"
                style={{ color: nature.color }}
            >
                {formatHM(new Date(audience.dateDebut))}
            </span>
            <span className="truncate font-medium text-on-surface">{audience.titre}</span>
        </button>
    )
}

/* ============================================================
   DayPopover — affiche toutes les audiences d'un jour surchargé
   ============================================================ */

interface DayPopoverProps {
    date: Date
    audiences: MockAudience[]
    onClose: () => void
    onAudienceClick: (a: MockAudience) => void
}
function DayPopover({ date, audiences, onClose, onAudienceClick }: DayPopoverProps) {
    const ref = useRef<HTMLDivElement | null>(null)
    /* On garde une ref interne synchronisée dans un effet pour ne pas réattacher
       les listeners à chaque render, sans muter ref.current pendant le render. */
    const closeRef = useRef(onClose)
    useEffect(() => {
        closeRef.current = onClose
    })

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeRef.current()
        }
        // setTimeout évite que le clic d'ouverture déclenche immédiatement la fermeture
        const tid = window.setTimeout(() => {
            window.addEventListener("mousedown", onClick)
            window.addEventListener("keydown", onKey)
        }, 0)
        return () => {
            window.clearTimeout(tid)
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onKey)
        }
    }, [])

    const dayLabel = date
        .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        .replace(/^\w/, (m) => m.toUpperCase())

    return (
        <div
            ref={ref}
            className="absolute left-1/2 top-full -translate-x-1/2 mt-1 z-30 w-72 max-h-[320px] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl overflow-hidden flex flex-col"
        >
            <header className="flex-none px-3 py-2 border-b border-outline-variant flex items-center justify-between bg-surface-container">
                <div className="min-w-0">
                    <div className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                        {dayLabel}
                    </div>
                    <div className="font-mono-num text-[10px] text-outline">
                        {audiences.length} audience{audiences.length > 1 ? "s" : ""}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-outline hover:text-on-surface transition-colors p-0.5 rounded"
                    aria-label="Fermer"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            </header>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                <ul className="divide-y divide-outline-variant/40">
                    {audiences.map((a) => {
                        const nature = AUDIENCE_NATURES[a.nature]
                        const statut = AUDIENCE_STATUTS[a.statut]
                        return (
                            <li key={a.id}>
                                <button
                                    onClick={() => onAudienceClick(a)}
                                    className="w-full text-left px-3 py-2 hover:bg-surface-container-low transition-colors flex items-start gap-2"
                                >
                                    <div
                                        className="w-1 self-stretch rounded flex-shrink-0"
                                        style={{ backgroundColor: nature.color }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span
                                                className="font-mono-num text-[11px] font-semibold"
                                                style={{ color: nature.color }}
                                            >
                                                {formatHM(new Date(a.dateDebut))}
                                            </span>
                                            <span
                                                className={cn(
                                                    "font-label-caps text-[9px] px-1 py-0.5 rounded uppercase",
                                                    statut.chip
                                                )}
                                            >
                                                {statut.label}
                                            </span>
                                        </div>
                                        <div className="font-body-sm text-[12px] font-medium text-on-surface line-clamp-2 leading-snug">
                                            {a.titre}
                                        </div>
                                        <div className="font-body-sm text-[11px] text-outline truncate mt-0.5">
                                            {audienceClientLabel(a)}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-[14px] text-outline flex-shrink-0 mt-1">
                                        chevron_right
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
