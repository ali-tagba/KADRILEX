"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface InlineDropdownOption<V extends string = string> {
    value: V
    label: ReactNode
    icon?: string
    /** Chip preview affiché à gauche du label (visuel "ce que ça donnera après sélection") */
    preview?: ReactNode
    danger?: boolean
}

interface InlineDropdownProps<V extends string = string> {
    trigger: ReactNode
    options: InlineDropdownOption<V>[]
    selected: V
    onSelect: (value: V) => void
    /** Largeur min du panneau (default 200) */
    menuMinWidth?: number
    /** Alignement horizontal sous le trigger */
    align?: "start" | "end"
    disabled?: boolean
    title?: string
    /** Classe sur le wrapper du trigger (button) */
    triggerClassName?: string
    /** Header optionnel affiché en haut du menu (label de section) */
    menuHeader?: string
}

/**
 * Dropdown inline avec popover en `position: fixed`.
 *
 *  Pourquoi fixed et pas absolute ?
 *  → le popover doit s'échapper du `overflow-hidden` des colonnes Kanban et des
 *    cards. `absolute` est clippé par tout ancêtre `overflow:hidden` ; `fixed`
 *    est positionné par rapport au viewport, donc s'affiche correctement.
 *
 *  Ferme automatiquement sur : Escape, clic extérieur, scroll, resize.
 */
export function InlineDropdown<V extends string = string>({
    trigger,
    options,
    selected,
    onSelect,
    menuMinWidth = 200,
    align = "start",
    disabled = false,
    title,
    triggerClassName,
    menuHeader,
}: InlineDropdownProps<V>) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [direction, setDirection] = useState<"down" | "up">("down")
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    /** Calcule la position en fonction du trigger et de la place dispo */
    const computePosition = () => {
        const t = triggerRef.current
        if (!t) return
        const r = t.getBoundingClientRect()
        const menuWidth = Math.max(menuMinWidth, r.width)
        const estimatedMenuHeight = Math.min(280, options.length * 36 + (menuHeader ? 32 : 0) + 12)
        const spaceBelow = window.innerHeight - r.bottom
        const spaceAbove = r.top
        const goUp = spaceBelow < estimatedMenuHeight + 12 && spaceAbove > spaceBelow

        let left = align === "end" ? r.right - menuWidth : r.left
        // Clamp horizontal pour ne jamais déborder du viewport
        const margin = 8
        left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin))

        const top = goUp ? r.top - estimatedMenuHeight - 4 : r.bottom + 4
        setCoords({ top, left })
        setDirection(goUp ? "up" : "down")
    }

    useLayoutEffect(() => {
        if (!open) return
        computePosition()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    /* Outside-click + escape + close on scroll/resize */
    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                triggerRef.current?.contains(target) ||
                menuRef.current?.contains(target)
            ) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        const onScrollOrResize = () => setOpen(false)
        const tid = window.setTimeout(() => {
            window.addEventListener("mousedown", onClick)
            window.addEventListener("keydown", onKey)
            window.addEventListener("scroll", onScrollOrResize, true)
            window.addEventListener("resize", onScrollOrResize)
        }, 0)
        return () => {
            window.clearTimeout(tid)
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onKey)
            window.removeEventListener("scroll", onScrollOrResize, true)
            window.removeEventListener("resize", onScrollOrResize)
        }
    }, [open])

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
                onMouseDown={(e) => {
                    // Empêche le drag HTML5 de la card parente quand on clique sur le trigger
                    e.stopPropagation()
                }}
                title={title}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    "inline-flex items-center gap-1 rounded transition-all",
                    !disabled && [
                        "cursor-pointer",
                        "hover:ring-2 hover:ring-accent/30 hover:ring-offset-0",
                        "focus:outline-none focus:ring-2 focus:ring-accent",
                        open && "ring-2 ring-accent",
                    ],
                    disabled && "cursor-default opacity-60",
                    triggerClassName
                )}
            >
                {trigger}
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
                        minWidth: menuMinWidth,
                        maxHeight: "min(60vh, 320px)",
                    }}
                    className={cn(
                        "bg-surface-container-lowest border border-outline-variant rounded shadow-2xl overflow-y-auto scrollbar-thin",
                        direction === "up" && "shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {menuHeader && (
                        <div className="sticky top-0 px-3 py-1.5 bg-surface-container border-b border-outline-variant font-label-caps text-label-caps text-outline uppercase z-10">
                            {menuHeader}
                        </div>
                    )}
                    <div className="py-1">
                        {options.map((opt) => {
                            const isSelected = opt.value === selected
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(opt.value)
                                        setOpen(false)
                                    }}
                                    role="menuitemradio"
                                    aria-checked={isSelected}
                                    className={cn(
                                        "w-full text-left px-3 py-2 font-body-sm text-body-sm flex items-center gap-2 transition-colors",
                                        opt.danger
                                            ? "text-error hover:bg-error-container/30"
                                            : "text-on-surface hover:bg-surface-container-low",
                                        isSelected && "bg-accent/10 font-medium"
                                    )}
                                >
                                    {opt.icon && (
                                        <span className="material-symbols-outlined text-[16px] flex-shrink-0 text-outline">
                                            {opt.icon}
                                        </span>
                                    )}
                                    {opt.preview && (
                                        <span className="flex-shrink-0">{opt.preview}</span>
                                    )}
                                    <span className="flex-1 truncate">{opt.label}</span>
                                    {isSelected && (
                                        <span className="material-symbols-outlined text-[14px] text-accent flex-shrink-0">
                                            check
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    )
}
