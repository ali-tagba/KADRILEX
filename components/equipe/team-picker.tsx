"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import {
    ROLES,
    ROLE_KEYS,
    fullName,
    type RoleKey,
} from "@/lib/constants/team"
import type { Membre } from "@prisma/client"
import { useMembres } from "@/lib/hooks/use-membres"
import { MembreAvatar, MembreAvatarStack } from "./membre-avatar"

/* ============================================================
   TeamPicker compact — popover avec recherche, multi-select
   ============================================================ */

export interface TeamPickerCompactProps {
    /** Membre owner — apparaît premier dans le stack avec ring accentué */
    responsableId: string | null
    /** Autres membres de l'équipe (sans le responsable) */
    equipeIds: string[]
    /** Callback : nouvelle équipe (le responsable n'est PAS inclus dans equipeIds en sortie) */
    onChange: (next: { responsableId: string | null; equipeIds: string[] }) => void
    /** Lecture seule — pas d'ouverture du popover */
    disabled?: boolean
    /** Tooltip du déclencheur */
    title?: string
    /** Taille des avatars */
    size?: "xs" | "sm" | "md"
    /** Nombre max d'avatars empilés avant +N */
    maxStack?: number
    /** Si true, n'autorise que les membres actifs */
    activeOnly?: boolean
    /** Filtre les rôles autorisés (par défaut tous) */
    allowedRoles?: RoleKey[]
}

export function TeamPickerCompact({
    responsableId,
    equipeIds,
    onChange,
    disabled = false,
    title = "Gérer l'équipe",
    size = "sm",
    maxStack = 4,
    activeOnly = true,
    allowedRoles,
}: TeamPickerCompactProps) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const popRef = useRef<HTMLDivElement | null>(null)
    const membres = useMembres()

    /* Composition affichée : responsable d'abord, puis équipe */
    const displayedMembres = useMemo(() => {
        const list: Membre[] = []
        if (responsableId) {
            const r = membres.find((m) => m.id === responsableId)
            if (r) list.push(r)
        }
        for (const id of equipeIds) {
            if (id === responsableId) continue
            const m = membres.find((x) => x.id === id)
            if (m) list.push(m)
        }
        return list
    }, [responsableId, equipeIds, membres])

    useEffect(() => {
        if (!open) return
        const compute = () => {
            const t = triggerRef.current
            if (!t) return
            const r = t.getBoundingClientRect()
            const w = 320
            const h = 380
            const margin = 8
            const goUp = window.innerHeight - r.bottom < h + 12 && r.top > h
            let left = r.left
            left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
            const top = goUp ? r.top - h - 4 : r.bottom + 4
            setCoords({ top, left })
        }
        compute()
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        const onScroll = (e: Event) => {
            const t = e.target as Node
            if (popRef.current?.contains(t)) return
            setOpen(false)
        }
        const onResize = () => setOpen(false)
        const tid = window.setTimeout(() => {
            window.addEventListener("mousedown", onClick)
            window.addEventListener("keydown", onKey)
            window.addEventListener("scroll", onScroll, true)
            window.addEventListener("resize", onResize)
        }, 0)
        return () => {
            window.clearTimeout(tid)
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("scroll", onScroll, true)
            window.removeEventListener("resize", onResize)
        }
    }, [open])

    const popover =
        open && coords && typeof document !== "undefined"
            ? createPortal(
                <TeamPickerPanel
                    ref={popRef}
                    coords={coords}
                    responsableId={responsableId}
                    equipeIds={equipeIds}
                    onChange={onChange}
                    activeOnly={activeOnly}
                    allowedRoles={allowedRoles}
                    onClose={() => setOpen(false)}
                    membres={membres}
                />,
                document.body
            )
            : null

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) setOpen((v) => !v)
                }}
                className={cn(
                    "inline-flex items-center gap-1 rounded transition-all",
                    !disabled && "hover:ring-2 hover:ring-accent/30 cursor-pointer",
                    open && "ring-2 ring-accent",
                    disabled && "cursor-default opacity-70"
                )}
                title={title}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                {displayedMembres.length === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low border border-dashed border-outline-variant text-outline font-body-xs text-[10px]">
                        <span className="material-symbols-outlined text-[12px]">person_add</span>
                        Affecter
                    </span>
                ) : (
                    <MembreAvatarStack membres={displayedMembres} max={maxStack} size={size} />
                )}
            </button>
            {popover}
        </>
    )
}

/* ============================================================
   Panel — sous-composant qui héberge la search + selection.
   Re-monté à chaque ouverture, son state est réinitialisé naturellement.
   ============================================================ */

interface PanelProps {
    ref: React.Ref<HTMLDivElement>
    coords: { top: number; left: number }
    responsableId: string | null
    equipeIds: string[]
    onChange: (next: { responsableId: string | null; equipeIds: string[] }) => void
    onClose: () => void
    activeOnly: boolean
    allowedRoles?: RoleKey[]
    membres: Membre[]
}

function TeamPickerPanel({
    ref,
    coords,
    responsableId,
    equipeIds,
    onChange,
    onClose,
    activeOnly,
    allowedRoles,
    membres,
}: PanelProps) {
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<RoleKey | "ALL">("ALL")

    const candidates = useMemo(() => {
        const q = search.trim().toLowerCase()
        return membres.filter((m) => {
            if (activeOnly && !m.actif) return false
            if (allowedRoles && !allowedRoles.includes(m.role)) return false
            if (roleFilter !== "ALL" && m.role !== roleFilter) return false
            if (q) {
                const hay = [
                    fullName(m),
                    m.email,
                    m.fonction ?? "",
                    ROLES[m.role].label,
                ]
                    .join(" ")
                    .toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [search, roleFilter, activeOnly, allowedRoles, membres])

    const isResponsable = (id: string) => id === responsableId
    const isInEquipe = (id: string) => equipeIds.includes(id)
    const isSelected = (id: string) => isResponsable(id) || isInEquipe(id)

    const toggleMembre = (id: string) => {
        if (isResponsable(id)) {
            /* Cliquer sur le responsable le retire complètement */
            onChange({ responsableId: null, equipeIds: equipeIds.filter((x) => x !== id) })
            return
        }
        if (isInEquipe(id)) {
            /* Retire de l'équipe */
            onChange({ responsableId, equipeIds: equipeIds.filter((x) => x !== id) })
            return
        }
        /* Ajout : si pas de responsable encore, devient responsable. Sinon va dans equipe. */
        if (!responsableId) {
            onChange({ responsableId: id, equipeIds })
        } else {
            onChange({ responsableId, equipeIds: [...equipeIds, id] })
        }
    }

    const promoteToResponsable = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const oldRespInEquipe = responsableId && responsableId !== id
            ? [...equipeIds.filter((x) => x !== id), responsableId]
            : equipeIds.filter((x) => x !== id)
        onChange({ responsableId: id, equipeIds: oldRespInEquipe })
    }

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="Sélectionner les membres"
            style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                zIndex: 99999,
                width: 320,
            }}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl flex flex-col max-h-[380px]"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="px-3 py-2 bg-surface-container border-b border-outline-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-outline">groups</span>
                <h3 className="font-body-sm text-body-sm font-semibold text-on-surface flex-1">
                    Équipe affectée
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low"
                    aria-label="Fermer"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            </header>

            <div className="p-2 border-b border-outline-variant/40 space-y-2">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
                        search
                    </span>
                    <input
                        type="text"
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un membre…"
                        className="w-full pl-7 pr-2 py-1.5 bg-surface border border-outline-variant rounded font-body-sm text-body-sm focus:outline-none focus:border-accent"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as RoleKey | "ALL")}
                    className="w-full bg-surface border border-outline-variant rounded px-2 py-1 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent"
                >
                    <option value="ALL">Tous rôles</option>
                    {ROLE_KEYS.filter((r) => !allowedRoles || allowedRoles.includes(r)).map((r) => (
                        <option key={r} value={r}>
                            {ROLES[r].label}
                        </option>
                    ))}
                </select>
            </div>

            <ul className="flex-1 overflow-y-auto scrollbar-thin py-1">
                {candidates.length === 0 ? (
                    <li className="px-3 py-4 text-center font-body-xs text-[11px]">
                        {membres.length === 0 ? (
                            <span className="text-error inline-flex items-center gap-1 italic">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                Aucun membre chargé — vérifie ta session
                            </span>
                        ) : (
                            <span className="text-outline italic">Aucun membre ne correspond</span>
                        )}
                    </li>
                ) : (
                    candidates.map((m) => {
                        const selected = isSelected(m.id)
                        const isResp = isResponsable(m.id)
                        const r = ROLES[m.role]
                        return (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => toggleMembre(m.id)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 flex items-center gap-2 transition-colors",
                                        selected
                                            ? "bg-accent/10"
                                            : "hover:bg-surface-container-low"
                                    )}
                                >
                                    <MembreAvatar membre={m} size="sm" ring={selected} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body-sm text-[12px] font-medium text-on-surface truncate">
                                            {fullName(m)}
                                        </p>
                                        <span
                                            className={cn(
                                                "inline-block px-1.5 py-0.5 rounded font-label-caps text-[8px] uppercase tracking-wider",
                                                r.chip
                                            )}
                                        >
                                            {r.labelCourt}
                                        </span>
                                    </div>
                                    {selected && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {isResp ? (
                                                <span
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent text-white font-label-caps text-[9px] uppercase tracking-wider"
                                                    title="Responsable du dossier"
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">
                                                        star
                                                    </span>
                                                    Owner
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => promoteToResponsable(m.id, e)}
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-outline-variant text-outline hover:text-on-surface hover:bg-surface-container-low font-label-caps text-[9px] uppercase tracking-wider"
                                                    title="Définir comme responsable"
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">
                                                        star
                                                    </span>
                                                </button>
                                            )}
                                            <span className="material-symbols-outlined text-[14px] text-accent">
                                                check_circle
                                            </span>
                                        </div>
                                    )}
                                </button>
                            </li>
                        )
                    })
                )}
            </ul>

            <footer className="px-2 py-1.5 border-t border-outline-variant/40 bg-surface-container-low/40 flex items-center justify-between text-[10px] text-outline">
                <span>
                    {responsableId ? "1 owner" : "Aucun owner"} · {equipeIds.length} membre
                    {equipeIds.length > 1 ? "s" : ""}
                </span>
                <button
                    onClick={onClose}
                    className="px-2 py-0.5 rounded font-body-sm text-[11px] text-on-surface hover:bg-surface-container-low"
                >
                    Terminé
                </button>
            </footer>
        </div>
    )
}

/* ============================================================
   TeamPicker étendu — pour les formulaires de fiche
   ============================================================ */

export function TeamPickerExpanded({
    responsableId,
    equipeIds,
    onChange,
    activeOnly = true,
    allowedRoles,
}: {
    responsableId: string | null
    equipeIds: string[]
    onChange: (next: { responsableId: string | null; equipeIds: string[] }) => void
    activeOnly?: boolean
    allowedRoles?: RoleKey[]
}) {
    const membres = useMembres()
    const responsable = responsableId ? membres.find((m) => m.id === responsableId) : null
    const equipe = equipeIds
        .map((id) => membres.find((m) => m.id === id))
        .filter((m): m is Membre => !!m)

    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                    Responsable
                </span>
                {responsable ? (
                    <div className="flex items-center gap-2 p-2 bg-surface-container-low border border-outline-variant rounded">
                        <MembreAvatar membre={responsable} size="md" ring />
                        <div className="min-w-0 flex-1">
                            <p className="font-body-sm text-body-sm font-medium text-on-surface truncate">
                                {fullName(responsable)}
                            </p>
                            <p className="font-body-xs text-[10px] text-outline truncate">
                                {ROLES[responsable.role].label}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                onChange({ responsableId: null, equipeIds })
                            }
                            className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30"
                            aria-label="Retirer le responsable"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                ) : (
                    <TeamPickerCompact
                        responsableId={null}
                        equipeIds={[]}
                        onChange={(next) =>
                            onChange({
                                responsableId: next.responsableId,
                                equipeIds,
                            })
                        }
                        title="Désigner un responsable"
                        size="md"
                        activeOnly={activeOnly}
                        allowedRoles={allowedRoles}
                    />
                )}
            </div>

            <div className="space-y-1">
                <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                    Équipe ({equipe.length})
                </span>
                {equipe.length > 0 && (
                    <ul className="space-y-1">
                        {equipe.map((m) => (
                            <li
                                key={m.id}
                                className="flex items-center gap-2 p-2 bg-surface-container-low/50 border border-outline-variant rounded"
                            >
                                <MembreAvatar membre={m} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-body-sm text-[12px] font-medium text-on-surface truncate">
                                        {fullName(m)}
                                    </p>
                                    <p className="font-body-xs text-[10px] text-outline truncate">
                                        {ROLES[m.role].labelCourt}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onChange({
                                            responsableId,
                                            equipeIds: equipeIds.filter((x) => x !== m.id),
                                        })
                                    }
                                    className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30"
                                    aria-label="Retirer du dossier"
                                >
                                    <span className="material-symbols-outlined text-[14px]">
                                        close
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <TeamPickerCompact
                    responsableId={responsableId}
                    equipeIds={equipeIds}
                    onChange={onChange}
                    title="Ajouter un membre"
                    size="md"
                    activeOnly={activeOnly}
                    allowedRoles={allowedRoles}
                />
            </div>
        </div>
    )
}
