"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/* ============================================================
   InlineMultiComboCell — multi-sélection style "tags Notion"
   - Affiche les valeurs sélectionnées comme chips
   - Click → popover avec checkboxes des suggestions + saisie libre
   - Possibilité d'ajouter une valeur custom via Enter
   - Click sur un chip pour le retirer (× au survol)
   ============================================================ */

interface InlineMultiComboCellProps {
    /** Valeurs sélectionnées (peuvent contenir des valeurs custom non listées) */
    values: readonly string[]
    onChange: (next: string[]) => void
    /** Liste de suggestions standard */
    options: readonly string[]
    placeholder?: string
    menuMinWidth?: number
    menuHeader?: string
    /** Couleur des chips (default: tertiary doré) */
    chipClassName?: string
    title?: string
    disabled?: boolean
    /** Limite max de valeurs (optionnel) */
    maxValues?: number
}

export function InlineMultiComboCell({
    values,
    onChange,
    options,
    placeholder = "+ Ajouter…",
    menuMinWidth = 240,
    menuHeader,
    chipClassName,
    title,
    disabled = false,
    maxValues,
}: InlineMultiComboCellProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => setMounted(true), [])

    const computePosition = () => {
        const t = triggerRef.current
        if (!t) return
        const r = t.getBoundingClientRect()
        const w = Math.max(menuMinWidth, r.width)
        const maxMenuH = Math.min(window.innerHeight * 0.7, 480)
        const naturalH = options.length * 28 + 100
        const estimatedH = Math.min(maxMenuH, naturalH)
        const spaceBelow = window.innerHeight - r.bottom
        const spaceAbove = r.top
        const goUp = spaceBelow < estimatedH + 12 && spaceAbove > spaceBelow
        const margin = 8
        let left = r.left
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
        const top = goUp ? r.top - estimatedH - 4 : r.bottom + 4
        setCoords({ top, left })
    }

    useLayoutEffect(() => {
        if (open) computePosition()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    useEffect(() => {
        if (!open) {
            setSearch("")
            return
        }
        window.setTimeout(() => inputRef.current?.focus(), 0)
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        const onScroll = (e: Event) => {
            const t = e.target as Node
            if (menuRef.current?.contains(t)) return
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

    const selected = new Set(values)

    /* Filtre les suggestions par search; expose aussi la valeur saisie comme
       option "Ajouter X" si elle ne matche aucune existante. */
    const q = search.trim()
    const qLower = q.toLowerCase()
    const matches = options.filter((o) => o.toLowerCase().includes(qLower))
    const matchesCustom =
        q.length > 0 &&
        !options.some((o) => o.toLowerCase() === qLower) &&
        !values.some((v) => v.toLowerCase() === qLower)

    const toggle = (v: string) => {
        if (selected.has(v)) {
            onChange(values.filter((x) => x !== v))
        } else {
            if (maxValues && values.length >= maxValues) return
            onChange([...values, v])
        }
    }

    const addCustom = () => {
        if (!q) return
        if (selected.has(q)) return
        if (maxValues && values.length >= maxValues) return
        onChange([...values, q])
        setSearch("")
        inputRef.current?.focus()
    }

    const handleRemove = (v: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(values.filter((x) => x !== v))
    }

    const menu =
        open && coords && mounted
            ? createPortal(
                <div
                    ref={menuRef}
                    role="dialog"
                    style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        zIndex: 99999,
                        minWidth: menuMinWidth,
                        maxHeight: "min(70vh, 480px)",
                    }}
                    className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {menuHeader && (
                        <div className="px-3 py-1.5 bg-surface-container border-b border-outline-variant font-label-caps text-label-caps text-outline uppercase">
                            {menuHeader}
                        </div>
                    )}
                    <div className="p-2 border-b border-outline-variant/40">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    if (matchesCustom) addCustom()
                                    else if (matches.length === 1) toggle(matches[0])
                                }
                            }}
                            placeholder="Filtrer ou ajouter…"
                            className="w-full bg-white border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                        />
                        {maxValues && (
                            <p className="font-body-xs text-[10px] text-outline italic mt-1">
                                {values.length}/{maxValues} sélectionnés
                            </p>
                        )}
                    </div>
                    <div className="overflow-y-auto overscroll-contain py-1 scrollbar-thin">
                        {matchesCustom && (
                            <button
                                type="button"
                                onClick={addCustom}
                                className="w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors text-primary-container hover:bg-surface-container-low font-medium"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                <span className="flex-1">Ajouter «{q}»</span>
                            </button>
                        )}
                        {matches.map((opt) => {
                            const isSel = selected.has(opt)
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggle(opt)}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors text-on-surface hover:bg-surface-container-low",
                                        isSel && "bg-accent/10 font-medium"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                                            isSel
                                                ? "bg-accent border-accent"
                                                : "border-outline-variant"
                                        )}
                                    >
                                        {isSel && (
                                            <span className="material-symbols-outlined text-[10px] text-white">
                                                check
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex-1 truncate">{opt}</span>
                                </button>
                            )
                        })}
                        {/* Affiche les valeurs custom existantes (non listées) */}
                        {values
                            .filter((v) => !options.includes(v))
                            .filter((v) => !q || v.toLowerCase().includes(qLower))
                            .map((v) => (
                                <button
                                    key={`custom-${v}`}
                                    type="button"
                                    onClick={() => toggle(v)}
                                    className="w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 bg-accent/10 font-medium text-on-surface"
                                >
                                    <span className="w-3.5 h-3.5 rounded border bg-accent border-accent flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[10px] text-white">
                                            check
                                        </span>
                                    </span>
                                    <span className="flex-1 truncate">{v}</span>
                                    <span className="font-label-caps text-[8px] uppercase text-outline tracking-wider">
                                        custom
                                    </span>
                                </button>
                            ))}
                        {matches.length === 0 && !matchesCustom && (
                            <p className="px-3 py-3 text-center font-body-xs text-[11px] text-outline italic">
                                Aucune correspondance
                            </p>
                        )}
                    </div>
                </div>,
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
                onMouseDown={(e) => e.stopPropagation()}
                title={title ?? "Cliquer pour modifier"}
                className={cn(
                    "inline-flex items-center gap-1 flex-wrap rounded p-1 -m-1 text-left transition-shadow min-h-[28px]",
                    !disabled && [
                        "cursor-pointer",
                        "hover:ring-2 hover:ring-accent/30",
                        "focus:outline-none focus:ring-2 focus:ring-accent",
                        open && "ring-2 ring-accent",
                    ],
                    disabled && "cursor-default opacity-60"
                )}
            >
                {values.length === 0 ? (
                    <span className="text-outline-variant italic font-body-xs text-[11px] inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">add</span>
                        {placeholder}
                    </span>
                ) : (
                    values.map((v) => (
                        <Chip
                            key={v}
                            value={v}
                            isCustom={!options.includes(v)}
                            chipClassName={chipClassName}
                            onRemove={(e) => handleRemove(v, e)}
                            disabled={disabled}
                        />
                    ))
                )}
            </button>
            {menu}
        </>
    )
}

function Chip({
    value,
    isCustom,
    chipClassName,
    onRemove,
    disabled,
}: {
    value: string
    isCustom: boolean
    chipClassName?: string
    onRemove: (e: React.MouseEvent) => void
    disabled: boolean
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-body-xs text-[11px] whitespace-nowrap group/chip",
                chipClassName ?? "bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant",
                isCustom && "ring-1 ring-accent/30"
            )}
        >
            {value}
            {!disabled && (
                <span
                    role="button"
                    tabIndex={0}
                    onClick={onRemove}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onRemove(e as unknown as React.MouseEvent)
                        }
                    }}
                    className="material-symbols-outlined text-[10px] opacity-0 group-hover/chip:opacity-70 hover:opacity-100 cursor-pointer"
                    title="Retirer"
                >
                    close
                </span>
            )}
        </span>
    )
}
