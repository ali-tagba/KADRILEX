"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface TacheActionsMenuProps {
    onEdit: () => void
    onDuplicate: () => void
    onDelete: () => void
    /** Taille de l'icône 3-dot (px) — par défaut 18 */
    size?: number
    /** Alignement du menu */
    align?: "start" | "end"
}

/**
 * Menu compact 3-dot accessible sur chaque tâche (liste + kanban).
 * Variante "Supprimer" demande une confirmation à 2 étapes (clic 1 = warning, clic 2 = confirme).
 */
export function TacheActionsMenu({
    onEdit,
    onDuplicate,
    onDelete,
    size = 18,
    align = "end",
}: TacheActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const wrapperRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false)
                setConfirmingDelete(false)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false)
                setConfirmingDelete(false)
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
        setConfirmingDelete(false)
    }

    return (
        <div ref={wrapperRef} className="relative inline-block flex-shrink-0">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((v) => !v)
                    setConfirmingDelete(false)
                }}
                aria-label="Actions sur la tâche"
                className="inline-flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                style={{ width: size + 8, height: size + 8 }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: size }}>
                    more_vert
                </span>
            </button>
            {open && (
                <div
                    role="menu"
                    className={cn(
                        "absolute z-50 mt-1 min-w-[180px] bg-surface-container-lowest border border-outline-variant rounded shadow-2xl py-1",
                        align === "end" ? "right-0" : "left-0"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        icon="edit"
                        label="Modifier"
                        onClick={() => {
                            close()
                            onEdit()
                        }}
                    />
                    <MenuItem
                        icon="content_copy"
                        label="Dupliquer"
                        onClick={() => {
                            close()
                            onDuplicate()
                        }}
                    />
                    <div className="my-1 border-t border-outline-variant/40" />
                    {confirmingDelete ? (
                        <div className="px-3 py-2 flex flex-col gap-2">
                            <p className="font-body-sm text-[12px] text-on-surface">
                                Supprimer cette tâche ?
                            </p>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setConfirmingDelete(false)}
                                    className="flex-1 px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        close()
                                        onDelete()
                                    }}
                                    className="flex-1 px-2 py-1 bg-error text-white rounded font-body-sm text-[11px] hover:opacity-90 transition-opacity"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <MenuItem
                            icon="delete"
                            label="Supprimer"
                            danger
                            onClick={() => setConfirmingDelete(true)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

function MenuItem({
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
            role="menuitem"
            className={cn(
                "w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors",
                danger
                    ? "text-error hover:bg-error-container/30"
                    : "text-on-surface hover:bg-surface-container-low"
            )}
        >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
        </button>
    )
}
