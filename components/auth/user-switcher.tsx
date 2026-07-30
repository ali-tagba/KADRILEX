"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ROLES, fullName, initials } from "@/lib/constants/team"
import { useCurrentUser } from "@/lib/auth/current-user-context"

const ROLE_COLOR: Record<string, string> = {
    ASSOCIE_GERANT: "#502e0f",
    ASSOCIE: "#7f5533",
    AVOCAT: "#c8772f",
    JURISTE: "#a08152",
    STAGIAIRE: "#d3a96a",
    SECRETAIRE: "#83746b",
}

/**
 * Pastille flottante en bas-droite qui permet de basculer entre les 6 membres
 * mockés pour tester le RBAC. À retirer (ou flag-gater) en production réelle —
 * pour l'instant on l'affiche tant qu'on n'a pas de vraie auth.
 */
export function UserSwitcher() {
    const { membre, membres, setMembreId } = useCurrentUser()
    const [open, setOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return
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

    const role = ROLES[membre.role]

    return (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
            {/* Panel ouvert */}
            {open && (
                <div
                    ref={panelRef}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl w-[320px] max-h-[70vh] overflow-hidden flex flex-col"
                >
                    <header className="px-density-medium py-2 bg-surface-container border-b border-outline-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-outline">
                            switch_account
                        </span>
                        <h3 className="font-body-sm text-body-sm font-semibold text-on-surface flex-1">
                            Bascule de rôle (dev)
                        </h3>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low"
                            aria-label="Fermer"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </header>
                    <div className="p-2 border-b border-outline-variant/40 bg-surface-container-low/40">
                        <p className="font-body-xs text-[10px] text-outline italic leading-tight">
                            Bascule entre les membres mockés pour tester l&apos;UI selon les
                            permissions du rôle. Persisté en localStorage.
                        </p>
                    </div>
                    <ul className="flex-1 overflow-y-auto scrollbar-thin py-1">
                        {membres.map((m) => {
                            const r = ROLES[m.role]
                            const active = m.id === membre.id
                            const dimmed = !m.actif
                            return (
                                <li key={m.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMembreId(m.id)
                                            setOpen(false)
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors",
                                            active
                                                ? "bg-accent/10 border-l-[3px] border-accent"
                                                : "border-l-[3px] border-transparent hover:bg-surface-container-low",
                                            dimmed && "opacity-50"
                                        )}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-[11px] flex-shrink-0"
                                            style={{ backgroundColor: ROLE_COLOR[m.role] }}
                                        >
                                            {initials(m)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-body-sm text-body-sm font-medium text-on-surface truncate">
                                                {fullName(m)}
                                            </p>
                                            <span
                                                className={cn(
                                                    "inline-block px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase tracking-wider",
                                                    r.chip
                                                )}
                                            >
                                                {r.label}
                                            </span>
                                        </div>
                                        {active && (
                                            <span className="material-symbols-outlined text-[16px] text-accent flex-shrink-0">
                                                check_circle
                                            </span>
                                        )}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}

            {/* Bouton flottant */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant shadow-2xl hover:shadow-[0_8px_24px_rgba(31,26,20,0.18)] transition-all",
                    open && "ring-2 ring-accent"
                )}
                title="Bascule de rôle (dev)"
            >
                <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0"
                    style={{ backgroundColor: ROLE_COLOR[membre.role] }}
                >
                    {initials(membre)}
                </div>
                <div className="text-left leading-none">
                    <p className="font-body-xs text-[10px] text-outline uppercase tracking-wider font-bold">
                        Connecté
                    </p>
                    <p className="font-body-sm text-[12px] text-on-surface font-medium leading-tight">
                        {role.labelCourt}
                    </p>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">
                    {open ? "expand_more" : "unfold_more"}
                </span>
            </button>
        </div>
    )
}
