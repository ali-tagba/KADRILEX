"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface MembreActionsMenuProps {
    actif: boolean
    /** Si false, seules les actions de lecture (Voir la fiche) sont proposées */
    canWrite?: boolean
    onView: () => void
    onEdit: () => void
    onInvite: () => void
    onDeactivate: () => void
    onReactivate: () => void
    onDelete: () => void
}

export function MembreActionsMenu({
    actif,
    canWrite = true,
    onView,
    onEdit,
    onInvite,
    onDeactivate,
    onReactivate,
    onDelete,
}: MembreActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return
        const compute = () => {
            const t = triggerRef.current
            if (!t) return
            const r = t.getBoundingClientRect()
            const w = 220
            const h = 240
            const margin = 8
            const goUp = window.innerHeight - r.bottom < h + 12 && r.top > h
            let left = r.right - w
            left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
            const top = goUp ? r.top - h - 4 : r.bottom + 4
            setCoords({ top, left })
        }
        compute()
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        const onSr = () => setOpen(false)
        const tid = window.setTimeout(() => {
            window.addEventListener("mousedown", onClick)
            window.addEventListener("keydown", onKey)
            window.addEventListener("scroll", onSr, true)
            window.addEventListener("resize", onSr)
        }, 0)
        return () => {
            window.clearTimeout(tid)
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("scroll", onSr, true)
            window.removeEventListener("resize", onSr)
        }
    }, [open])

    const close = () => setOpen(false)

    const menu =
        open && coords && typeof document !== "undefined"
            ? createPortal(
                <MenuPanel
                    ref={menuRef}
                    coords={coords}
                    actif={actif}
                    canWrite={canWrite}
                    onView={() => {
                        onView()
                        close()
                    }}
                    onEdit={() => {
                        onEdit()
                        close()
                    }}
                    onInvite={() => {
                        onInvite()
                        close()
                    }}
                    onDeactivate={() => {
                        onDeactivate()
                        close()
                    }}
                    onReactivate={() => {
                        onReactivate()
                        close()
                    }}
                    onDelete={() => {
                        onDelete()
                        close()
                    }}
                />,
                document.body
            )
            : null

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((v) => !v)
                }}
                className={cn(
                    "p-1 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors",
                    open && "bg-surface-container-low"
                )}
                aria-label="Actions"
                aria-expanded={open}
                aria-haspopup="menu"
            >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            {menu}
        </>
    )
}

/* ============================================================
   MenuPanel — sous-composant qui héberge le state `confirming`.
   Re-monté à chaque ouverture, donc le state est naturellement
   réinitialisé sans setState dans un effet.
   ============================================================ */

interface MenuPanelProps {
    ref: React.Ref<HTMLDivElement>
    coords: { top: number; left: number }
    actif: boolean
    canWrite: boolean
    onView: () => void
    onEdit: () => void
    onInvite: () => void
    onDeactivate: () => void
    onReactivate: () => void
    onDelete: () => void
}

function MenuPanel({
    ref,
    coords,
    actif,
    canWrite,
    onView,
    onEdit,
    onInvite,
    onDeactivate,
    onReactivate,
    onDelete,
}: MenuPanelProps) {
    const [confirming, setConfirming] = useState<"deactivate" | "delete" | null>(null)

    return (
        <div
            ref={ref}
            role="menu"
            style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                zIndex: 99999,
                width: 220,
            }}
            className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {confirming === "deactivate" ? (
                <div className="p-3">
                    <p className="font-body-sm text-body-sm text-on-surface mb-2">
                        Désactiver ce membre ? Il ne pourra plus se connecter.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onDeactivate}
                            className="flex-1 px-2 py-1 rounded bg-error text-white font-body-sm text-body-sm hover:bg-opacity-90"
                        >
                            Confirmer
                        </button>
                        <button
                            onClick={() => setConfirming(null)}
                            className="flex-1 px-2 py-1 rounded border border-outline-variant font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            ) : confirming === "delete" ? (
                <div className="p-3">
                    <p className="font-body-sm text-body-sm text-on-surface mb-2">
                        Supprimer définitivement ? Les bulletins de paie historiques resteront.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onDelete}
                            className="flex-1 px-2 py-1 rounded bg-error text-white font-body-sm text-body-sm hover:bg-opacity-90"
                        >
                            Supprimer
                        </button>
                        <button
                            onClick={() => setConfirming(null)}
                            className="flex-1 px-2 py-1 rounded border border-outline-variant font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            ) : (
                <ul className="py-1">
                    <Item icon="visibility" label="Voir la fiche" onClick={onView} />
                    {canWrite && (
                        <>
                            <Item icon="edit" label="Modifier" onClick={onEdit} />
                            <Item
                                icon="mail"
                                label="Renvoyer l'invitation"
                                onClick={onInvite}
                            />
                            <Divider />
                            {actif ? (
                                <Item
                                    icon="block"
                                    label="Désactiver"
                                    danger
                                    onClick={() => setConfirming("deactivate")}
                                />
                            ) : (
                                <Item
                                    icon="check_circle"
                                    label="Réactiver"
                                    onClick={onReactivate}
                                />
                            )}
                            <Item
                                icon="delete"
                                label="Supprimer"
                                danger
                                onClick={() => setConfirming("delete")}
                            />
                        </>
                    )}
                    {!canWrite && (
                        <li className="px-3 py-1.5 font-body-xs text-[10px] text-outline italic flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            Lecture seule (Associé gérant requis)
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}

function Item({
    icon,
    label,
    onClick,
    danger = false,
}: {
    icon: string
    label: string
    onClick: () => void
    danger?: boolean
}) {
    return (
        <li>
            <button
                role="menuitem"
                onClick={onClick}
                className={cn(
                    "w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors",
                    danger
                        ? "text-error hover:bg-error-container/30"
                        : "text-on-surface hover:bg-surface-container-low"
                )}
            >
                <span className="material-symbols-outlined text-[16px] text-outline">{icon}</span>
                {label}
            </button>
        </li>
    )
}

function Divider() {
    return <li className="my-1 border-t border-outline-variant/50" />
}
