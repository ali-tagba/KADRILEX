"use client"

import { useMemo, useState } from "react"
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
import { EcheancePicker } from "./taches-list-view"

interface TachesKanbanViewProps {
    taches: MockTache[]
    onChangeStatut: (id: string, statut: TacheStatutKey) => void
    onChangePriorite: (id: string, priorite: TachePrioriteKey) => void
    onChangeAssigne: (id: string, assigne: string) => void
    onChangeEcheance: (id: string, echeance: string | null) => void
    onEdit: (t: MockTache) => void
    onDuplicate: (t: MockTache) => void
    onDelete: (id: string) => void
}

/** Métadonnées visuelles par colonne — header bg + icône + couleur de texte/icône.
 *  Hiérarchie : À faire = active (primary) · En cours = en mouvement (tertiary) ·
 *  Fait = succès (vert) · Annulé = muté (gris). */
const COLUMNS: {
    key: TacheStatutKey
    icon: string
    headerBg: string
    headerText: string
    iconColor: string
    accentBar: string
}[] = [
    {
        key: "A_FAIRE",
        icon: "inbox",
        headerBg: "bg-primary-fixed",
        headerText: "text-primary",
        iconColor: "text-primary",
        accentBar: "bg-primary",
    },
    {
        key: "EN_COURS",
        icon: "donut_large",
        headerBg: "bg-tertiary-fixed-dim/60",
        headerText: "text-on-tertiary-fixed-variant",
        iconColor: "text-tertiary",
        accentBar: "bg-tertiary",
    },
    {
        key: "FAIT",
        icon: "check_circle",
        headerBg: "bg-[#e8f5e9]",
        headerText: "text-[#166534]",
        iconColor: "text-[#166534]",
        accentBar: "bg-[#166534]",
    },
    {
        key: "ANNULE",
        icon: "cancel",
        headerBg: "bg-surface-container",
        headerText: "text-outline",
        iconColor: "text-outline",
        accentBar: "bg-outline-variant",
    },
]

/* ============================================================
   Helpers
   ============================================================ */

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatEcheance(iso: string | null, now: Date): { label: string; tone: "late" | "today" | "soon" | "future" | "none" } {
    if (!iso) return { label: "—", tone: "none" }
    const d = new Date(iso)
    if (isSameDay(d, now)) {
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        return { label: `Auj. ${hh}h${mm}`, tone: "today" }
    }
    const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000)
    if (diff === 1) return { label: "Demain", tone: "soon" }
    if (diff === -1) return { label: "Hier", tone: "late" }
    if (diff < 0) return { label: `${Math.abs(diff)}j de retard`, tone: "late" }
    if (diff <= 7) return { label: `Dans ${diff}j`, tone: "soon" }
    return { label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), tone: "future" }
}

/* ============================================================
   Kanban
   ============================================================ */

export function TachesKanbanView({
    taches,
    onChangeStatut,
    onChangePriorite,
    onChangeAssigne,
    onChangeEcheance,
    onEdit,
    onDuplicate,
    onDelete,
}: TachesKanbanViewProps) {
    const now = useMemo(() => new Date(), [])
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragOverCol, setDragOverCol] = useState<TacheStatutKey | null>(null)

    const tachesByStatut = useMemo(() => {
        const map = new Map<TacheStatutKey, MockTache[]>()
        for (const col of COLUMNS) map.set(col.key, [])
        for (const t of taches) map.get(t.statut)?.push(t)
        const order: Record<string, number> = { URGENTE: 0, HAUTE: 1, MOYENNE: 2, BASSE: 3 }
        for (const arr of map.values()) {
            arr.sort((a, b) => {
                const pa = order[a.priorite] ?? 99
                const pb = order[b.priorite] ?? 99
                if (pa !== pb) return pa - pb
                const ea = a.echeance ? new Date(a.echeance).getTime() : Number.POSITIVE_INFINITY
                const eb = b.echeance ? new Date(b.echeance).getTime() : Number.POSITIVE_INFINITY
                return ea - eb
            })
        }
        return map
    }, [taches])

    const handleDrop = (e: React.DragEvent, targetStatut: TacheStatutKey) => {
        e.preventDefault()
        const id = e.dataTransfer.getData("text/plain")
        setDragOverCol(null)
        setDraggedId(null)
        if (!id) return
        const tache = taches.find((t) => t.id === id)
        if (!tache || tache.statut === targetStatut) return
        onChangeStatut(id, targetStatut)
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full overflow-hidden">
            <div className="h-full overflow-x-auto scrollbar-thin">
                {/* 4 colonnes toujours côte à côte (Kanban a besoin de toutes ses colonnes visibles).
                    min-w-[840px] garantit ~210px par colonne ; scroll horizontal sinon. */}
                <div className="h-full grid grid-cols-4 gap-px bg-outline-variant min-w-[840px]">
                    {COLUMNS.map((col) => {
                        const meta = TACHE_STATUTS[col.key]
                        const list = tachesByStatut.get(col.key) ?? []
                        const isDropTarget = dragOverCol === col.key && draggedId !== null
                        return (
                            <div
                                key={col.key}
                                onDragOver={(e) => {
                                    if (!draggedId) return
                                    e.preventDefault()
                                    e.dataTransfer.dropEffect = "move"
                                    if (dragOverCol !== col.key) setDragOverCol(col.key)
                                }}
                                onDragLeave={(e) => {
                                    // Évite le flicker : on ne reset que si on quitte vraiment la colonne
                                    if (e.currentTarget.contains(e.relatedTarget as Node)) return
                                    if (dragOverCol === col.key) setDragOverCol(null)
                                }}
                                onDrop={(e) => handleDrop(e, col.key)}
                                className={cn(
                                    "bg-surface-container-lowest flex flex-col min-h-0 transition-colors relative",
                                    isDropTarget && "bg-accent/8 ring-2 ring-inset ring-accent/40"
                                )}
                            >
                                {/* Bandeau couleur 2px en haut de la colonne — repère visuel fort */}
                                <div className={cn("h-[3px] w-full flex-none", col.accentBar)} />

                                {/* Header colonne */}
                                <header
                                    className={cn(
                                        "flex-none px-3 py-2.5 border-b border-outline-variant flex items-center justify-between gap-2",
                                        col.headerBg
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className={cn(
                                                "material-symbols-outlined text-[18px] flex-shrink-0",
                                                col.iconColor
                                            )}
                                        >
                                            {col.icon}
                                        </span>
                                        <h3
                                            className={cn(
                                                "font-h2 text-[13px] uppercase tracking-wider truncate",
                                                col.headerText
                                            )}
                                        >
                                            {meta.label}
                                        </h3>
                                    </div>
                                    <span
                                        className={cn(
                                            "font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded-full bg-white/80 border border-outline-variant/40 flex-shrink-0 min-w-[24px] text-center",
                                            col.headerText
                                        )}
                                    >
                                        {list.length}
                                    </span>
                                </header>

                                {/* Contenu */}
                                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 flex flex-col gap-2">
                                    {list.length === 0 ? (
                                        <div
                                            className={cn(
                                                "flex flex-col items-center justify-center text-center py-8 px-2 rounded border-2 border-dashed transition-colors",
                                                isDropTarget
                                                    ? "border-accent bg-accent/5 text-primary"
                                                    : "border-outline-variant/40 text-outline-variant"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-[28px] opacity-60">
                                                {isDropTarget ? "download" : col.icon}
                                            </span>
                                            <p className="text-[11px] mt-1 italic">
                                                {isDropTarget ? "Déposer ici" : "Aucune tâche"}
                                            </p>
                                        </div>
                                    ) : (
                                        list.map((t) => (
                                            <KanbanCard
                                                key={t.id}
                                                t={t}
                                                now={now}
                                                isDragging={draggedId === t.id}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("text/plain", t.id)
                                                    e.dataTransfer.effectAllowed = "move"
                                                    setDraggedId(t.id)
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedId(null)
                                                    setDragOverCol(null)
                                                }}
                                                onChangePriorite={(p) => onChangePriorite(t.id, p)}
                                                onChangeAssigne={(a) => onChangeAssigne(t.id, a)}
                                                onChangeEcheance={(e) => onChangeEcheance(t.id, e)}
                                                onChangeStatut={(s) => onChangeStatut(t.id, s)}
                                                onEdit={() => onEdit(t)}
                                                onDuplicate={() => onDuplicate(t)}
                                                onDelete={() => onDelete(t.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

/* ============================================================
   KanbanCard — draggable + tous les inline pickers
   ============================================================ */

interface KanbanCardProps {
    t: MockTache
    now: Date
    isDragging: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragEnd: () => void
    onChangePriorite: (p: TachePrioriteKey) => void
    onChangeAssigne: (a: string) => void
    onChangeEcheance: (e: string | null) => void
    onChangeStatut: (s: TacheStatutKey) => void
    onEdit: () => void
    onDuplicate: () => void
    onDelete: () => void
}
function KanbanCard({
    t,
    now,
    isDragging,
    onDragStart,
    onDragEnd,
    onChangePriorite,
    onChangeAssigne,
    onChangeEcheance,
    onChangeStatut,
    onEdit,
    onDuplicate,
    onDelete,
}: KanbanCardProps) {
    const ech = formatEcheance(t.echeance, now)
    const prioriteMeta = TACHE_PRIORITES[t.priorite]
    const isUrgent = t.priorite === "URGENTE"
    const isHigh = t.priorite === "HAUTE"
    const done = t.statut === "FAIT"
    const cancelled = t.statut === "ANNULE"

    const prioriteOptions: InlineDropdownOption<TachePrioriteKey>[] = (
        Object.entries(TACHE_PRIORITES) as [TachePrioriteKey, { label: string; icon: string }][]
    ).map(([k, m]) => ({
        value: k,
        label: m.label,
        preview: <UniformPrioriteChip priorite={k} />,
    }))

    const assigneeOptions: InlineDropdownOption<string>[] = (AVOCATS_CABINET as readonly AvocatCabinet[]).map((a) => ({
        value: a,
        label: a,
        icon: "badge",
    }))

    const statutOptions: InlineDropdownOption<TacheStatutKey>[] = (
        Object.entries(TACHE_STATUTS) as [TacheStatutKey, { label: string; chip: string; dot: string }][]
    ).map(([k, m]) => ({
        value: k,
        label: m.label,
        preview: (
            <span className={cn("inline-block w-2 h-2 rounded-full", m.dot)} />
        ),
    }))

    return (
        <article
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={cn(
                "flex-shrink-0 bg-white border border-outline-variant rounded-md shadow-[0px_1px_2px_rgba(31,26,20,0.04)] hover:shadow-md hover:border-outline transition-all flex flex-col cursor-grab active:cursor-grabbing",
                isDragging && "opacity-40 rotate-1 scale-[0.98]"
            )}
        >
            <div className="px-2.5 py-2.5 flex flex-col gap-2">
                {/* Header : chip priorité + chip échéance + 3-dot */}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <InlineDropdown
                            trigger={<UniformPrioriteChip priorite={t.priorite} />}
                            options={prioriteOptions}
                            selected={t.priorite}
                            onSelect={onChangePriorite}
                            menuMinWidth={180}
                            title="Changer la priorité"
                            menuHeader="Priorité"
                        />
                        <EcheancePicker
                            value={t.echeance}
                            label={t.echeance ? ech.label : "+ échéance"}
                            isLate={ech.tone === "late"}
                            onChange={onChangeEcheance}
                        />
                    </div>
                    <TacheActionsMenu
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        size={16}
                    />
                </div>

                {/* Titre — gros click target qui ouvre l'édition complète */}
                <button
                    type="button"
                    onClick={onEdit}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={cn(
                        "font-body-sm text-[13px] font-medium text-on-surface line-clamp-3 leading-snug text-left rounded -mx-1 px-1 py-0.5 hover:bg-surface-container-low/60 transition-colors",
                        done && "line-through text-on-surface-variant",
                        cancelled && "italic text-on-surface-variant"
                    )}
                    title="Modifier la tâche"
                >
                    {t.titre}
                </button>

                {/* Liaison contextuelle (si présente) */}
                {(t.audienceId || t.dossierId || t.clientId) && (
                    <div className="text-[11px] text-on-surface-variant">
                        {t.audienceId ? (
                            <Link
                                href={`/audiences/${t.audienceId}`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                            >
                                <span className="material-symbols-outlined text-[13px]">gavel</span>
                                Audience liée
                            </Link>
                        ) : t.dossierId ? (
                            <Link
                                href={`/dossiers/${t.dossierId}`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 hover:text-primary-container transition-colors truncate"
                            >
                                <span className="material-symbols-outlined text-[13px]">folder</span>
                                {t.dossierId.toUpperCase()}
                            </Link>
                        ) : t.clientId ? (
                            <Link
                                href={`/clients/${t.clientId}`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 hover:text-primary-container transition-colors"
                            >
                                <span className="material-symbols-outlined text-[13px]">person</span>
                                Client lié
                            </Link>
                        ) : null}
                    </div>
                )}

                {/* Footer : assigné + statut (inline pickers, séparés par un border) */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-outline-variant/60">
                    <InlineDropdown
                        trigger={
                            <span className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] text-on-surface-variant min-w-0">
                                <span className="material-symbols-outlined text-[14px] text-outline flex-shrink-0">badge</span>
                                <span className="truncate max-w-[100px]">{t.assigneA.replace(/^Me /, "")}</span>
                            </span>
                        }
                        options={assigneeOptions}
                        selected={t.assigneA}
                        onSelect={onChangeAssigne}
                        menuMinWidth={240}
                        title="Réassigner"
                        menuHeader="Avocat assigné"
                    />
                    <InlineDropdown
                        trigger={
                            <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-medium bg-surface-container-low border border-outline-variant text-on-surface-variant">
                                {TACHE_STATUTS[t.statut].label}
                                <span className="material-symbols-outlined text-[14px] opacity-60">expand_more</span>
                            </span>
                        }
                        options={statutOptions}
                        selected={t.statut}
                        onSelect={onChangeStatut}
                        align="end"
                        menuMinWidth={180}
                        title="Changer le statut"
                        menuHeader="Statut"
                    />
                </div>
            </div>
        </article>
    )
}

/* ============================================================
   UniformPrioriteChip — chip uniforme pour les 4 priorités.
   Même forme/taille pour toutes les cards (cohérence visuelle Kanban).
   ============================================================ */

function UniformPrioriteChip({ priorite }: { priorite: TachePrioriteKey }) {
    const meta = TACHE_PRIORITES[priorite]
    const cls =
        priorite === "URGENTE"
            ? "bg-error-container text-on-error-container"
            : priorite === "HAUTE"
                ? "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant"
                : priorite === "MOYENNE"
                    ? "bg-surface-container-high text-on-surface-variant"
                    : "bg-surface-container text-outline"
    const label =
        priorite === "URGENTE"
            ? "Urgent"
            : priorite === "HAUTE"
                ? "Haute"
                : priorite === "MOYENNE"
                    ? "Moyenne"
                    : "Basse"
    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase",
                cls
            )}
        >
            <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
            {label}
        </span>
    )
}
