"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface FactureActionsMenuProps {
    onView: () => void
    onEdit: () => void
    onPaiement: () => void
    onDuplicate: () => void
    onCancel: () => void
    /** Suppression définitive (hard delete DB). Distinct de onCancel (soft delete statut=ANNULEE). */
    onDelete?: () => void
    /** Disable actions selon statut courant */
    canEdit?: boolean
    canPaiement?: boolean
    canCancel?: boolean
    /** Possible uniquement si pas de paiements + pas PAYEE (refuse au backend sinon) */
    canDelete?: boolean
    size?: number
    align?: "start" | "end"
}

export function FactureActionsMenu({
    onView,
    onEdit,
    onPaiement,
    onDuplicate,
    onCancel,
    onDelete,
    canEdit = true,
    canPaiement = true,
    canCancel = true,
    canDelete = false,
    size = 18,
    align = "end",
}: FactureActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
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
            const h = confirming ? 240 : 220
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
            const target = e.target as Node
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
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
                aria-label="Actions sur la facture"
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
                    style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999, width: 220 }}
                    className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Item icon="visibility" label="Voir le détail" onClick={() => { close(); onView() }} />
                    {canEdit && <Item icon="edit" label="Modifier" onClick={() => { close(); onEdit() }} />}
                    {canPaiement && (
                        <Item
                            icon="account_balance_wallet"
                            label="Enregistrer un paiement"
                            onClick={() => { close(); onPaiement() }}
                        />
                    )}
                    <Item icon="content_copy" label="Dupliquer" onClick={() => { close(); onDuplicate() }} />
                    {(canCancel || canDelete) && (
                        <>
                            <div className="my-1 border-t border-outline-variant/40" />
                            {confirming ? (
                                <div className="px-3 py-2 flex flex-col gap-2">
                                    <p className="font-body-sm text-[12px] text-on-surface">
                                        Annuler la facture ? <span className="text-[10px] text-outline italic">(statut = ANNULEE, garde l&apos;historique compta)</span>
                                    </p>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setConfirming(false)}
                                            className="flex-1 px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            onClick={() => { close(); onCancel() }}
                                            className="flex-1 px-2 py-1 bg-error text-white rounded font-body-sm text-[11px] hover:opacity-90 transition-opacity"
                                        >
                                            Confirmer
                                        </button>
                                    </div>
                                </div>
                            ) : confirmingDelete ? (
                                <div className="px-3 py-2 flex flex-col gap-2 bg-error-container/30">
                                    <p className="font-body-sm text-[12px] text-on-surface font-medium">
                                        Supprimer définitivement ?
                                    </p>
                                    <p className="font-body-sm text-[11px] text-error">
                                        ⚠ Irréversible. Supprime aussi tous les paiements et lignes liés.
                                    </p>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setConfirmingDelete(false)}
                                            className="flex-1 px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            onClick={() => {
                                                close()
                                                onDelete?.()
                                            }}
                                            className="flex-1 px-2 py-1 bg-error text-white rounded font-body-sm text-[11px] hover:opacity-90 transition-opacity"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {canCancel && (
                                        <Item
                                            icon="cancel"
                                            label="Annuler la facture"
                                            danger
                                            onClick={() => setConfirming(true)}
                                        />
                                    )}
                                    {canDelete && onDelete && (
                                        <Item
                                            icon="delete_forever"
                                            label="Supprimer définitivement"
                                            danger
                                            onClick={() => setConfirmingDelete(true)}
                                        />
                                    )}
                                </>
                            )}
                        </>
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
