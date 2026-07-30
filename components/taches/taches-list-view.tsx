"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    AVOCATS_CABINET,
    TACHE_PRIORITES,
    TACHE_STATUTS,
    type AvocatCabinet,
    type TachePrioriteKey,
    type TacheStatutKey,
} from "@/lib/constants/legal"
import type { MockTache } from "@/lib/mock/audiences"
import { InlineDropdown, type InlineDropdownOption } from "./inline-dropdown"
import { TacheActionsMenu } from "./tache-actions-menu"

interface TachesListViewProps {
    taches: MockTache[]
    onToggleDone: (t: MockTache) => void
    onChangeStatut: (id: string, statut: TacheStatutKey) => void
    onChangePriorite: (id: string, priorite: TachePrioriteKey) => void
    onChangeAssigne: (id: string, assigne: string) => void
    onChangeEcheance: (id: string, echeance: string | null) => void
    onEdit: (t: MockTache) => void
    onDuplicate: (t: MockTache) => void
    onDelete: (id: string) => void
}

/* ============================================================
   Helpers
   ============================================================ */

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayDiff(a: Date, b: Date): number {
    const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
    const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    return Math.round((da.getTime() - db.getTime()) / 86_400_000)
}

type GroupKey = "RETARD" | "AUJOURDHUI" | "DEMAIN" | "SEMAINE" | "PLUS_TARD" | "SANS_ECHEANCE"

const GROUP_META: Record<GroupKey, { label: string; icon: string; tone: "error" | "warning" | "default" | "muted" }> = {
    RETARD: { label: "En retard", icon: "warning", tone: "error" },
    AUJOURDHUI: { label: "Aujourd'hui", icon: "today", tone: "warning" },
    DEMAIN: { label: "Demain", icon: "event", tone: "default" },
    SEMAINE: { label: "Cette semaine", icon: "date_range", tone: "default" },
    PLUS_TARD: { label: "Plus tard", icon: "schedule", tone: "muted" },
    SANS_ECHEANCE: { label: "Sans échéance", icon: "all_inclusive", tone: "muted" },
}

const GROUP_ORDER: GroupKey[] = ["RETARD", "AUJOURDHUI", "DEMAIN", "SEMAINE", "PLUS_TARD", "SANS_ECHEANCE"]

function classifyTache(t: MockTache, now: Date): GroupKey {
    if (!t.echeance) return "SANS_ECHEANCE"
    const isDone = t.statut === "FAIT" || t.statut === "ANNULE"
    const e = new Date(t.echeance)
    if (!isDone && e.getTime() < now.getTime() && !isSameDay(e, now)) return "RETARD"
    if (isSameDay(e, now)) return "AUJOURDHUI"
    const diff = dayDiff(e, now)
    if (diff === 1) return "DEMAIN"
    if (diff <= 7) return "SEMAINE"
    return "PLUS_TARD"
}

function formatEcheance(iso: string | null, now: Date): string {
    if (!iso) return "Sans échéance"
    const d = new Date(iso)
    if (isSameDay(d, now)) {
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        return `Auj. ${hh}h${mm}`
    }
    const diff = dayDiff(d, now)
    if (diff === 1) return "Demain"
    if (diff === -1) return "Hier"
    if (diff < 0) return `${Math.abs(diff)}j de retard`
    if (diff <= 7) return `Dans ${diff}j`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function toDatetimeLocal(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ============================================================
   Composant principal
   ============================================================ */

export function TachesListView({
    taches,
    onToggleDone,
    onChangeStatut,
    onChangePriorite,
    onChangeAssigne,
    onChangeEcheance,
    onEdit,
    onDuplicate,
    onDelete,
}: TachesListViewProps) {
    const now = useMemo(() => new Date(), [])

    const sortFn = (a: MockTache, b: MockTache) => {
        if (!a.echeance && !b.echeance) {
            const order: Record<string, number> = { URGENTE: 0, HAUTE: 1, MOYENNE: 2, BASSE: 3 }
            return (order[a.priorite] ?? 99) - (order[b.priorite] ?? 99)
        }
        if (!a.echeance) return 1
        if (!b.echeance) return -1
        return new Date(a.echeance).getTime() - new Date(b.echeance).getTime()
    }

    const groups = useMemo(() => {
        const map = new Map<GroupKey, MockTache[]>()
        for (const t of taches) {
            const key = classifyTache(t, now)
            const arr = map.get(key) ?? []
            arr.push(t)
            map.set(key, arr)
        }
        for (const arr of map.values()) arr.sort(sortFn)
        return GROUP_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((k) => ({
            key: k,
            taches: map.get(k)!,
        }))
    }, [taches, now])

    if (taches.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
                    task_alt
                </span>
                <p className="font-body-md text-body-md text-on-surface font-medium">
                    Aucune tâche à afficher
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Ajustez la recherche ou les filtres.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {groups.map((g) => {
                    const meta = GROUP_META[g.key]
                    return (
                        <section key={g.key}>
                            <header
                                className={cn(
                                    "sticky top-0 z-10 px-density-medium py-2 border-b border-outline-variant flex items-center gap-2",
                                    meta.tone === "error"
                                        ? "bg-error-container/30 text-on-error-container"
                                        : meta.tone === "warning"
                                            ? "bg-[#fef3c7] text-[#92400e]"
                                            : meta.tone === "muted"
                                                ? "bg-surface-container-low text-on-surface-variant"
                                                : "bg-surface-container text-primary-container"
                                )}
                            >
                                <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                                <h3 className="font-h2 text-[13px] uppercase tracking-wider">{meta.label}</h3>
                                <span className="font-mono-num text-mono-num text-[11px] opacity-70 ml-1">
                                    {g.taches.length}
                                </span>
                            </header>
                            <ul className="divide-y divide-outline-variant/50">
                                {g.taches.map((t) => (
                                    <TacheRow
                                        key={t.id}
                                        t={t}
                                        now={now}
                                        onToggleDone={() => onToggleDone(t)}
                                        onChangeStatut={(s) => onChangeStatut(t.id, s)}
                                        onChangePriorite={(p) => onChangePriorite(t.id, p)}
                                        onChangeAssigne={(a) => onChangeAssigne(t.id, a)}
                                        onChangeEcheance={(e) => onChangeEcheance(t.id, e)}
                                        onEdit={() => onEdit(t)}
                                        onDuplicate={() => onDuplicate(t)}
                                        onDelete={() => onDelete(t.id)}
                                    />
                                ))}
                            </ul>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

/* ============================================================
   TacheRow — riche, avec inline edits sur tous les chips
   ============================================================ */

interface TacheRowProps {
    t: MockTache
    now: Date
    onToggleDone: () => void
    onChangeStatut: (s: TacheStatutKey) => void
    onChangePriorite: (p: TachePrioriteKey) => void
    onChangeAssigne: (a: string) => void
    onChangeEcheance: (e: string | null) => void
    onEdit: () => void
    onDuplicate: () => void
    onDelete: () => void
}
function TacheRow({
    t,
    now,
    onToggleDone,
    onChangeStatut,
    onChangePriorite,
    onChangeAssigne,
    onChangeEcheance,
    onEdit,
    onDuplicate,
    onDelete,
}: TacheRowProps) {
    const done = t.statut === "FAIT"
    const cancelled = t.statut === "ANNULE"
    const isLate = t.echeance && !done && !cancelled
        ? new Date(t.echeance).getTime() < now.getTime() && !isSameDay(new Date(t.echeance), now)
        : false
    const echeanceLabel = formatEcheance(t.echeance, now)
    const statutMeta = TACHE_STATUTS[t.statut]
    const prioriteMeta = TACHE_PRIORITES[t.priorite]

    /* Options inline */
    const statutOptions: InlineDropdownOption<TacheStatutKey>[] = (
        Object.entries(TACHE_STATUTS) as [TacheStatutKey, { label: string }][]
    ).map(([k, m]) => ({ value: k, label: m.label }))

    const prioriteOptions: InlineDropdownOption<TachePrioriteKey>[] = (
        Object.entries(TACHE_PRIORITES) as [TachePrioriteKey, { label: string; icon: string }][]
    ).map(([k, m]) => ({ value: k, label: m.label, icon: m.icon }))

    const assigneeOptions: InlineDropdownOption<string>[] = (AVOCATS_CABINET as readonly AvocatCabinet[]).map((a) => ({
        value: a,
        label: a,
        icon: "badge",
    }))

    return (
        <li
            className={cn(
                "px-density-medium py-2.5 hover:bg-surface-container-low/40 transition-colors flex items-start gap-3 group",
                isLate && "bg-error-container/10"
            )}
        >
            {/* Checkbox done */}
            <button
                onClick={onToggleDone}
                aria-label={done ? "Marquer comme à faire" : "Marquer comme fait"}
                className={cn(
                    "mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                    done
                        ? "bg-accent border-accent text-white"
                        : isLate
                            ? "bg-white border-error hover:border-error"
                            : "bg-white border-outline-variant hover:border-accent"
                )}
            >
                {done && <span className="material-symbols-outlined text-[14px]">check</span>}
            </button>

            {/* Body */}
            <div className={cn("flex-1 min-w-0", (done || cancelled) && "opacity-60")}>
                <div className="flex items-start justify-between gap-2 mb-1">
                    <button
                        type="button"
                        onClick={onEdit}
                        className={cn(
                            "font-body-md text-body-md font-medium text-on-surface line-clamp-2 leading-snug min-w-0 text-left hover:text-primary-container transition-colors",
                            done && "line-through",
                            cancelled && "italic"
                        )}
                        title="Cliquer pour modifier"
                    >
                        {t.titre}
                    </button>
                    {/* Priorité — inline picker */}
                    <InlineDropdown
                        trigger={<PrioriteChip priorite={t.priorite} />}
                        options={prioriteOptions}
                        selected={t.priorite}
                        onSelect={(v) => onChangePriorite(v)}
                        align="end"
                        title={`Priorité : ${prioriteMeta.label}`}
                    />
                </div>
                {t.description && (
                    <p className="font-body-sm text-[12px] text-on-surface-variant mb-1 line-clamp-1">
                        {t.description}
                    </p>
                )}
                <div className="flex items-center gap-2 font-body-sm text-[11px] text-on-surface-variant flex-wrap">
                    {/* Échéance — date picker */}
                    <EcheancePicker
                        value={t.echeance}
                        label={echeanceLabel}
                        isLate={isLate}
                        onChange={onChangeEcheance}
                    />
                    {/* Statut — inline picker */}
                    <InlineDropdown
                        trigger={
                            <span
                                className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                    statutMeta.chip
                                )}
                            >
                                {statutMeta.label}
                            </span>
                        }
                        options={statutOptions}
                        selected={t.statut}
                        onSelect={(v) => onChangeStatut(v)}
                        title="Changer le statut"
                    />
                    {/* Liaison */}
                    {t.audienceId ? (
                        <Link
                            href={`/audiences/${t.audienceId}`}
                            className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                        >
                            <span className="material-symbols-outlined text-[12px]">gavel</span>
                            Audience
                        </Link>
                    ) : t.dossierId ? (
                        <Link
                            href={`/dossiers/${t.dossierId}`}
                            className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                        >
                            <span className="material-symbols-outlined text-[12px]">folder</span>
                            {t.dossierId.toUpperCase()}
                        </Link>
                    ) : t.clientId ? (
                        <Link
                            href={`/clients/${t.clientId}`}
                            className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                        >
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            Client
                        </Link>
                    ) : null}
                    {/* Assigné — inline picker */}
                    <InlineDropdown
                        trigger={
                            <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">person</span>
                                <span className="truncate max-w-[160px]">{t.assigneA.replace(/^Me /, "")}</span>
                            </span>
                        }
                        options={assigneeOptions}
                        selected={t.assigneA}
                        onSelect={(v) => onChangeAssigne(v)}
                        align="end"
                        menuMinWidth={220}
                        title="Réassigner"
                        triggerClassName="ml-auto"
                    />
                </div>
            </div>

            {/* 3-dot menu */}
            <TacheActionsMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </li>
    )
}

/* ============================================================
   PrioriteChip
   ============================================================ */

function PrioriteChip({ priorite }: { priorite: MockTache["priorite"] }) {
    const meta = TACHE_PRIORITES[priorite]
    if (priorite === "URGENTE") {
        return (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-[10px] uppercase whitespace-nowrap flex-shrink-0">
                <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                Urgente
            </span>
        )
    }
    if (priorite === "HAUTE") {
        return (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant font-label-caps text-[10px] uppercase whitespace-nowrap flex-shrink-0">
                <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                Haute
            </span>
        )
    }
    if (priorite === "MOYENNE") {
        return (
            <span className="inline-flex items-center gap-0.5 text-outline font-label-caps text-[10px] uppercase whitespace-nowrap flex-shrink-0">
                <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                Moy.
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-0.5 text-outline-variant font-label-caps text-[10px] uppercase whitespace-nowrap flex-shrink-0">
            <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
            Basse
        </span>
    )
}

/* ============================================================
   EcheancePicker — chip cliquable + popover fixed-positioned avec presets rapides
   ============================================================ */

const PRESETS: { label: string; compute: () => string }[] = [
    {
        label: "Aujourd'hui 18h",
        compute: () => {
            const d = new Date()
            d.setHours(18, 0, 0, 0)
            return d.toISOString()
        },
    },
    {
        label: "Demain 9h",
        compute: () => {
            const d = new Date()
            d.setDate(d.getDate() + 1)
            d.setHours(9, 0, 0, 0)
            return d.toISOString()
        },
    },
    {
        label: "Dans 3 jours",
        compute: () => {
            const d = new Date()
            d.setDate(d.getDate() + 3)
            d.setHours(18, 0, 0, 0)
            return d.toISOString()
        },
    },
    {
        label: "Semaine prochaine (lundi 9h)",
        compute: () => {
            const d = new Date()
            const dow = (d.getDay() + 6) % 7 // 0 = lundi
            d.setDate(d.getDate() + (7 - dow))
            d.setHours(9, 0, 0, 0)
            return d.toISOString()
        },
    },
]

export function EcheancePicker({
    value,
    label,
    isLate,
    onChange,
    triggerClassName,
}: {
    value: string | null
    label: string
    isLate: boolean
    onChange: (iso: string | null) => void
    triggerClassName?: string
}) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [direction, setDirection] = useState<"down" | "up">("down")
    const [draft, setDraft] = useState(toDatetimeLocal(value))
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const popoverRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        setDraft(toDatetimeLocal(value))
    }, [value])

    /* Position computation — fixed, escape any overflow */
    useEffect(() => {
        if (!open) return
        const compute = () => {
            const t = triggerRef.current
            if (!t) return
            const r = t.getBoundingClientRect()
            const popoverWidth = 280
            const popoverHeight = 280
            const margin = 8
            const goUp = window.innerHeight - r.bottom < popoverHeight + 12 && r.top > popoverHeight
            const left = Math.max(margin, Math.min(r.left, window.innerWidth - popoverWidth - margin))
            const top = goUp ? r.top - popoverHeight - 4 : r.bottom + 4
            setCoords({ top, left })
            setDirection(goUp ? "up" : "down")
        }
        compute()
        const onScrollOrResize = () => setOpen(false)
        window.addEventListener("scroll", onScrollOrResize, true)
        window.addEventListener("resize", onScrollOrResize)
        return () => {
            window.removeEventListener("scroll", onScrollOrResize, true)
            window.removeEventListener("resize", onScrollOrResize)
        }
    }, [open])

    /* Outside-click + Escape */
    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                triggerRef.current?.contains(target) ||
                popoverRef.current?.contains(target)
            ) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        const tid = window.setTimeout(() => {
            window.addEventListener("mousedown", onClick)
            window.addEventListener("keydown", onKey)
        }, 0)
        return () => {
            window.clearTimeout(tid)
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onKey)
        }
    }, [open])

    const handleSave = () => {
        onChange(draft ? new Date(draft).toISOString() : null)
        setOpen(false)
    }
    const handlePreset = (iso: string) => {
        onChange(iso)
        setDraft(toDatetimeLocal(iso))
        setOpen(false)
    }
    const handleClear = () => {
        onChange(null)
        setDraft("")
        setOpen(false)
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((v) => !v)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Modifier l'échéance"
                aria-haspopup="dialog"
                aria-expanded={open}
                className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer",
                    "hover:ring-2 hover:ring-accent/30 focus:outline-none focus:ring-2 focus:ring-accent",
                    open && "ring-2 ring-accent",
                    isLate ? "text-error font-semibold" : value ? "text-on-surface-variant" : "text-outline italic",
                    triggerClassName
                )}
            >
                <span className="material-symbols-outlined text-[12px]">
                    {isLate ? "warning" : value ? "schedule" : "event_busy"}
                </span>
                {label}
            </button>
            {open && coords && (
                <div
                    ref={popoverRef}
                    style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        zIndex: 9999,
                        width: 280,
                    }}
                    className={cn(
                        "bg-surface-container-lowest border border-outline-variant rounded shadow-2xl overflow-hidden",
                        direction === "up" && "shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Presets rapides */}
                    <div className="px-2 py-2 border-b border-outline-variant">
                        <div className="font-label-caps text-label-caps text-outline uppercase mb-1.5 px-1">
                            Échéance rapide
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => handlePreset(p.compute())}
                                    className="text-left px-2 py-1.5 rounded font-body-sm text-[11px] text-on-surface hover:bg-accent/10 hover:text-primary transition-colors"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Date custom */}
                    <div className="px-2 py-2 flex flex-col gap-2">
                        <div className="font-label-caps text-label-caps text-outline uppercase px-1">
                            Date précise
                        </div>
                        <input
                            type="datetime-local"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </div>
                    {/* Footer actions */}
                    <div className="flex items-center justify-between gap-1.5 px-2 py-2 border-t border-outline-variant bg-surface-container-low/40">
                        {value ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-2 py-1 text-error font-body-sm text-[11px] hover:bg-error-container/30 rounded transition-colors inline-flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                                Effacer
                            </button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!draft}
                                className="px-2 py-1 bg-accent text-white rounded font-body-sm text-[11px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
