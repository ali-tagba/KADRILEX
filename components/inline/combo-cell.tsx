"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/* ============================================================
   InlineComboCell — dropdown sur liste prédéfinie + option "Autre…"
   qui ouvre une saisie libre. Pattern Notion/Airtable :
   - cliquer sur la cellule → menu avec suggestions
   - sélectionner une suggestion → ferme + applique
   - cliquer "Autre…" ou taper → champ texte libre, Enter pour valider
   ============================================================ */

export interface InlineComboOption {
    value: string
    label?: ReactNode
}

interface InlineComboCellProps {
    /** Valeur courante (string libre) */
    value: string
    onChange: (next: string) => void
    /** Liste de suggestions standard. La valeur courante peut ne pas y figurer (custom). */
    options: readonly string[] | readonly InlineComboOption[]
    /** Texte affiché si vide */
    placeholder?: string
    /** Largeur min du popover */
    menuMinWidth?: number
    /** Header du menu (ex: "Domaine de droit") */
    menuHeader?: string
    /** Classe sur le déclencheur */
    triggerClassName?: string
    /** Affichage spécial pour valeur vide */
    emptyDisplay?: ReactNode
    title?: string
    disabled?: boolean
    /** Permettre le vidage de la valeur via le bouton ✕ */
    nullable?: boolean
}

const OTHER_TOKEN = "__OTHER__"

function normalizeOptions(
    opts: readonly string[] | readonly InlineComboOption[]
): InlineComboOption[] {
    if (opts.length === 0) return []
    if (typeof opts[0] === "string") {
        return (opts as readonly string[]).map((v) => ({ value: v }))
    }
    return [...(opts as readonly InlineComboOption[])]
}

export function InlineComboCell({
    value,
    onChange,
    options,
    placeholder = "—",
    menuMinWidth = 220,
    menuHeader,
    triggerClassName,
    emptyDisplay,
    title,
    disabled = false,
    nullable = false,
}: InlineComboCellProps) {
    const normOpts = normalizeOptions(options)
    const isCustom = value !== "" && !normOpts.some((o) => o.value === value)

    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<"list" | "custom">("list")
    const [draft, setDraft] = useState(value)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => setMounted(true), [])

    /* Resync draft quand la valeur externe change OU à l'ouverture */
    useEffect(() => {
        if (open) setDraft(value)
    }, [open, value])

    const computePosition = () => {
        const t = triggerRef.current
        if (!t) return
        const r = t.getBoundingClientRect()
        const w = Math.max(menuMinWidth, r.width)
        const maxMenuH = Math.min(window.innerHeight * 0.7, 480)
        const naturalH = normOpts.length * 32 + (menuHeader ? 32 : 0) + 60
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
    }, [open, mode])

    useEffect(() => {
        if (!open) return
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

    /* Auto-focus de l'input quand on bascule en mode custom */
    useEffect(() => {
        if (mode === "custom") {
            window.setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [mode])

    const handleSelect = (v: string) => {
        if (v === OTHER_TOKEN) {
            setMode("custom")
            return
        }
        onChange(v)
        setOpen(false)
        setMode("list")
    }

    const handleCustomCommit = () => {
        const cleaned = draft.trim()
        if (cleaned !== value) onChange(cleaned)
        setOpen(false)
        setMode("list")
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange("")
    }

    const display =
        value === "" ? (
            emptyDisplay ?? <span className="text-outline-variant italic">{placeholder}</span>
        ) : (
            <span className="inline-flex items-center gap-1">
                {value}
                {isCustom && (
                    <span
                        className="font-label-caps text-[8px] uppercase text-outline tracking-wider"
                        title="Valeur personnalisée"
                    >
                        custom
                    </span>
                )}
            </span>
        )

    const menu =
        open && coords && mounted
            ? createPortal(
                <div
                    ref={menuRef}
                    role="menu"
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

                    {mode === "list" ? (
                        <div className="overflow-y-auto overscroll-contain py-1 scrollbar-thin">
                            {normOpts.map((opt) => {
                                const isSel = opt.value === value
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        role="menuitemradio"
                                        aria-checked={isSel}
                                        className={cn(
                                            "w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors text-on-surface hover:bg-surface-container-low",
                                            isSel && "bg-accent/10 font-medium"
                                        )}
                                    >
                                        <span className="flex-1 truncate">{opt.label ?? opt.value}</span>
                                        {isSel && (
                                            <span className="material-symbols-outlined text-[14px] text-accent">
                                                check
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                            {/* Si valeur custom courante, on l'affiche dans la liste */}
                            {isCustom && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect(value)}
                                    className="w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 bg-accent/10 font-medium text-on-surface"
                                >
                                    <span className="flex-1 truncate">{value}</span>
                                    <span className="font-label-caps text-[8px] uppercase text-outline tracking-wider">
                                        custom
                                    </span>
                                    <span className="material-symbols-outlined text-[14px] text-accent">
                                        check
                                    </span>
                                </button>
                            )}
                            <div className="my-1 border-t border-outline-variant/50" />
                            <button
                                type="button"
                                onClick={() => handleSelect(OTHER_TOKEN)}
                                className="w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors text-primary-container hover:bg-surface-container-low"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                <span className="flex-1">Autre… (saisir)</span>
                            </button>
                            {nullable && value !== "" && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect("")}
                                    className="w-full text-left px-3 py-1.5 font-body-sm text-body-sm flex items-center gap-2 transition-colors text-error hover:bg-error-container/30"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                    <span className="flex-1">Effacer</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="p-2">
                            <p className="font-body-xs text-[10px] text-outline italic mb-1">
                                Valeur libre — Entrée pour valider, Échap pour annuler
                            </p>
                            <input
                                ref={inputRef}
                                type="text"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleCustomCommit()
                                    } else if (e.key === "Escape") {
                                        e.preventDefault()
                                        setOpen(false)
                                        setMode("list")
                                    }
                                }}
                                placeholder="Saisir une valeur personnalisée"
                                className="w-full bg-white border border-accent rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={handleCustomCommit}
                                    className="flex-1 px-2 py-1 rounded bg-accent text-white font-body-sm text-body-sm hover:bg-opacity-90"
                                >
                                    Valider
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode("list")}
                                    className="flex-1 px-2 py-1 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low"
                                >
                                    Retour à la liste
                                </button>
                            </div>
                        </div>
                    )}
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
                    "inline-flex items-center gap-1 rounded text-left transition-shadow group/combo",
                    !disabled && [
                        "cursor-pointer",
                        "hover:ring-2 hover:ring-accent/30",
                        "focus:outline-none focus:ring-2 focus:ring-accent",
                        open && "ring-2 ring-accent",
                    ],
                    disabled && "cursor-default opacity-60",
                    triggerClassName
                )}
            >
                <span className="flex-1 truncate">{display}</span>
                <span className="material-symbols-outlined text-[12px] text-outline opacity-60">
                    expand_more
                </span>
                {nullable && value !== "" && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                handleClear(e as unknown as React.MouseEvent)
                            }
                        }}
                        className="material-symbols-outlined text-[12px] text-outline opacity-0 group-hover/combo:opacity-60 hover:opacity-100 cursor-pointer"
                        title="Effacer"
                    >
                        close
                    </span>
                )}
            </button>
            {menu}
        </>
    )
}
