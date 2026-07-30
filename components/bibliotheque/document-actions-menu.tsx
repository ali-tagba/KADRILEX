"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface DocumentActionsMenuProps {
    onEdit: () => void
    onDuplicate: () => void
    onAttach: () => void
    onToggleFavori: () => void
    onArchive: () => void
    isFavori: boolean
    /** Taille de l'icône 3-dot en px (défaut 18) */
    size?: number
    /** Alignement du menu (défaut "end") */
    align?: "start" | "end"
}

/**
 * Menu compact 3-dot pour chaque ligne de la table Bibliothèque + chaque card galerie.
 * Utilise position: fixed pour s'échapper de tout overflow:hidden ancêtre.
 * Suppression à 2 étapes (warning → confirme).
 */
export function DocumentActionsMenu({
    onEdit,
    onDuplicate,
    onAttach,
    onToggleFavori,
    onArchive,
    isFavori,
    size = 18,
    align = "end",
}: DocumentActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const [confirmingArchive, setConfirmingArchive] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return
        const compute = () => {
            const t = triggerRef.current
            if (!t) return
            const r = t.getBoundingClientRect()
            const menuWidth = 200
            const menuHeight = confirmingArchive ? 240 : 220
            const margin = 8
            const goUp = window.innerHeight - r.bottom < menuHeight + 12 && r.top > menuHeight
            let left = align === "end" ? r.right - menuWidth : r.left
            left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin))
            const top = goUp ? r.top - menuHeight - 4 : r.bottom + 4
            setCoords({ top, left })
        }
        compute()
        const onScrollOrResize = () => setOpen(false)
        window.addEventListener("scroll", onScrollOrResize, true)
        window.addEventListener("resize", onScrollOrResize)
        return () => {
            window.removeEventListener("scroll", onScrollOrResize, true)
            window.removeEventListener("resize", onScrollOrResize)
        }
    }, [open, align, confirmingArchive])

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
            setOpen(false)
            setConfirmingArchive(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false)
                setConfirmingArchive(false)
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
        setConfirmingArchive(false)
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((v) => !v)
                    setConfirmingArchive(false)
                }}
                aria-label="Actions sur le document"
                aria-haspopup="menu"
                aria-expanded={open}
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
                    style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        zIndex: 9999,
                        width: 200,
                    }}
                    className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl py-1"
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
                        icon={isFavori ? "star" : "star_border"}
                        label={isFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
                        iconClassName={isFavori ? "text-secondary" : ""}
                        iconFilled={isFavori}
                        onClick={() => {
                            close()
                            onToggleFavori()
                        }}
                    />
                    <MenuItem
                        icon="link"
                        label="Joindre à un dossier"
                        onClick={() => {
                            close()
                            onAttach()
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
                    {confirmingArchive ? (
                        <div className="px-3 py-2 flex flex-col gap-2">
                            <p className="font-body-sm text-[12px] text-on-surface">
                                Archiver ce document ?
                            </p>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setConfirmingArchive(false)}
                                    className="flex-1 px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        close()
                                        onArchive()
                                    }}
                                    className="flex-1 px-2 py-1 bg-error text-white rounded font-body-sm text-[11px] hover:opacity-90 transition-opacity"
                                >
                                    Archiver
                                </button>
                            </div>
                        </div>
                    ) : (
                        <MenuItem
                            icon="archive"
                            label="Archiver"
                            danger
                            onClick={() => setConfirmingArchive(true)}
                        />
                    )}
                </div>
            )}
        </>
    )
}

function MenuItem({
    icon,
    label,
    onClick,
    danger,
    iconClassName,
    iconFilled,
}: {
    icon: string
    label: string
    onClick: () => void
    danger?: boolean
    iconClassName?: string
    iconFilled?: boolean
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
            <span
                className={cn("material-symbols-outlined text-[16px]", iconClassName)}
                style={iconFilled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
                {icon}
            </span>
            {label}
        </button>
    )
}
