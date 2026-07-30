"use client"

import { useState } from "react"
import { ShareDialog, type ShareEntityType } from "./share-dialog"

interface Props {
    entityType: ShareEntityType
    entityId: string
    entityLabel?: string | null
    entityNumero?: string | null
    /** Variant : "icon" (compact, pour barres d'actions) | "button" (avec label) */
    variant?: "icon" | "button"
    className?: string
}

export function ShareButton({
    entityType,
    entityId,
    entityLabel,
    entityNumero,
    variant = "button",
    className,
}: Props) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Partager à un membre de l'équipe"
                className={
                    className ??
                    (variant === "icon"
                        ? "p-1 rounded text-outline hover:text-primary-container hover:bg-surface-container transition-colors"
                        : "px-2.5 py-1 border border-outline-variant rounded bg-transparent text-primary font-body-sm text-[12px] hover:bg-surface-container-low transition-colors inline-flex items-center gap-1")
                }
            >
                <span
                    className={
                        variant === "icon"
                            ? "material-symbols-outlined text-[16px]"
                            : "material-symbols-outlined text-[14px]"
                    }
                >
                    share
                </span>
                {variant === "button" && "Partager"}
            </button>
            <ShareDialog
                open={open}
                entityType={entityType}
                entityId={entityId}
                entityLabel={entityLabel}
                entityNumero={entityNumero}
                onClose={() => setOpen(false)}
            />
        </>
    )
}
