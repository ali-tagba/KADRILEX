"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface DossierActionsMenuProps {
    onView: () => void
    onEdit: () => void
    onDuplicate: () => void
    onArchive: () => void
    onDelete: () => void
}

export function DossierActionsMenu({
    onView,
    onEdit,
    onDuplicate,
    onArchive,
    onDelete,
}: DossierActionsMenuProps) {
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
            const w = 200
            const h = 200
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
                <Panel
                    ref={menuRef}
                    coords={coords}
                    onView={() => {
                        onView()
                        close()
                    }}
                    onEdit={() => {
                        onEdit()
                        close()
                    }}
                    onDuplicate={() => {
                        onDuplicate()
                        close()
                    }}
                    onArchive={() => {
                        onArchive()
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
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            {menu}
        </>
    )
}

interface PanelProps {
    ref: React.Ref<HTMLDivElement>
    coords: { top: number; left: number }
    onView: () => void
    onEdit: () => void
    onDuplicate: () => void
    onArchive: () => void
    onDelete: () => void
}

function Panel({ ref, coords, onView, onEdit, onDuplicate, onArchive, onDelete }: PanelProps) {
    const [confirmDelete, setConfirmDelete] = useState(false)
    return (
        <div
            ref={ref}
            role="menu"
            style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                zIndex: 99999,
                width: 200,
            }}
            className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {confirmDelete ? (
                <div className="p-3 bg-error-container/30" style={{ width: 280 }}>
                    <p className="font-body-sm text-body-sm text-on-surface font-semibold mb-1.5">
                        ⚠ Suppression définitive
                    </p>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mb-2 leading-tight">
                        Toutes les données liées seront <strong>supprimées en cascade</strong> :
                    </p>
                    <ul className="font-body-sm text-[11px] text-on-surface-variant list-disc list-inside mb-2 leading-tight">
                        <li>Audiences, tâches, parties adverses</li>
                        <li>Factures, paiements et lignes</li>
                        <li>Dépenses internes liées</li>
                        <li>Notes, fichiers et sous-dossiers (GED)</li>
                        <li>Liaisons bibliothèque (documents)</li>
                    </ul>
                    <p className="font-body-sm text-[11px] text-error mb-2 leading-tight">
                        Action <strong>irréversible</strong>. Aucune récupération possible.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 px-2 py-1 rounded border border-outline-variant font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex-1 px-2 py-1 rounded bg-error text-white font-body-sm text-body-sm hover:bg-opacity-90"
                        >
                            Supprimer tout
                        </button>
                    </div>
                </div>
            ) : (
                <ul className="py-1">
                    <Item icon="visibility" label="Ouvrir" onClick={onView} />
                    <Item icon="edit" label="Modifier" onClick={onEdit} />
                    <Item icon="content_copy" label="Dupliquer" onClick={onDuplicate} />
                    <Divider />
                    <Item icon="inventory_2" label="Archiver" onClick={onArchive} />
                    <Item
                        icon="delete"
                        label="Supprimer"
                        danger
                        onClick={() => setConfirmDelete(true)}
                    />
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
