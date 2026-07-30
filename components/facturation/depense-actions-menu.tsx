"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface DepenseActionsMenuProps {
    onView?: () => void
    onEdit: () => void
    onDuplicate: () => void
    onDelete: () => void
    size?: number
    align?: "start" | "end"
}

export function DepenseActionsMenu({
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    size = 18,
    align = "end",
}: DepenseActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return
        const compute = () => {
            const t = triggerRef.current
            if (!t) return
            const r = t.getBoundingClientRect()
            const w = 200
            const h = confirming ? 240 : 200
            const margin = 8
            const goUp = window.innerHeight - r.bottom < h + 12 && r.top > h
            let left = align === "end" ? r.right - w : r.left
            left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
            const top = goUp ? r.top - h - 4 : r.bottom + 4
            setCoords({ top, left })
        }
        compute()
        const onSr = () => setOpen(false)
        window.addEventListener("scroll", onSr, true)
        window.addEventListener("resize", onSr)
        return () => {
            window.removeEventListener("scroll", onSr, true)
            window.removeEventListener("resize", onSr)
        }
    }, [open, align, confirming])

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
            setOpen(false)
            setConfirming(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false)
                setConfirming(false)
            }
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

    const close = () => {
        setOpen(false)
        setConfirming(false)
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((v) => !v)
                    setConfirming(false)
                }}
                aria-label="Actions sur la dépense"
                className="inline-flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                style={{ width: size + 8, height: size + 8 }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: size }}>
                    more_vert
                </span>
            </button>
            {open && coords && (
                <div
                    ref={menuRef}
                    role="menu"
                    style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999, width: 200 }}
                    className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {onView && <Item icon="visibility" label="Voir le détail" onClick={() => { close(); onView() }} />}
                    <Item icon="edit" label="Modifier" onClick={() => { close(); onEdit() }} />
                    <Item icon="content_copy" label="Dupliquer" onClick={() => { close(); onDuplicate() }} />
                    <div className="my-1 border-t border-outline-variant/40" />
                    {confirming ? (
                        <div className="px-3 py-2 flex flex-col gap-2">
                            <p className="font-body-sm text-[12px] text-on-surface">Supprimer cette dépense ?</p>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setConfirming(false)}
                                    className="flex-1 px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => { close(); onDelete() }}
                                    className="flex-1 px-2 py-1 bg-error text-white rounded font-body-sm text-[11px] hover:opacity-90 transition-opacity"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Item icon="delete" label="Supprimer" danger onClick={() => setConfirming(true)} />
                    )}
                </div>
            )}
        </>
    )
}

function Item({
    icon,
    label,
    onClick,
    danger,
}: {
    icon: string
    label: string
    onClick: () => void
    danger?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors",
                danger ? "text-error hover:bg-error-container/30" : "text-on-surface hover:bg-surface-container-low"
            )}
        >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
        </button>
    )
}
