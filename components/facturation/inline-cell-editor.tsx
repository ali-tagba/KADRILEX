"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/* ============================================================
   InlineSelectCell — pill cliquable + dropdown options portalisé
   ============================================================ */

export interface InlineOption<V extends string = string> {
    value: V
    label: ReactNode
    icon?: string
    preview?: ReactNode
    danger?: boolean
}

interface InlineSelectCellProps<V extends string = string> {
    trigger: ReactNode
    options: InlineOption<V>[]
    selected: V
    onSelect: (value: V) => void
    menuMinWidth?: number
    align?: "start" | "end"
    title?: string
    menuHeader?: string
    disabled?: boolean
}

/**
 * Inline dropdown qui se rend via React.createPortal sur document.body.
 * → garantit que le menu n'est JAMAIS clippé par un overflow:hidden ancêtre,
 *   peu importe le contexte de stacking (transform, filter, etc.).
 */
export function InlineSelectCell<V extends string = string>({
    trigger,
    options,
    selected,
    onSelect,
    menuMinWidth = 200,
    align = "start",
    title,
    menuHeader,
    disabled = false,
}: InlineSelectCellProps<V>) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number; direction: "down" | "up" } | null>(null)
    const [mounted, setMounted] = useState(false)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)

    /* Mount flag pour SSR safety */
    useEffect(() => {
        setMounted(true)
    }, [])

    const computePosition = () => {
        const t = triggerRef.current
        if (!t) return
        const r = t.getBoundingClientRect()
        const w = Math.max(menuMinWidth, r.width)
        /* Estimation de la hauteur : capée à la max-height effective du menu (480px ou 70vh).
           Si la liste est plus petite, on prend sa hauteur réelle.
           Le `goUp` détermine si on ouvre vers le haut (manque de place en bas). */
        const maxMenuH = Math.min(window.innerHeight * 0.7, 480)
        const naturalH = options.length * 36 + (menuHeader ? 32 : 0) + 12
        const estimatedH = Math.min(maxMenuH, naturalH)
        const spaceBelow = window.innerHeight - r.bottom
        const spaceAbove = r.top
        const goUp = spaceBelow < estimatedH + 12 && spaceAbove > spaceBelow
        let left = align === "end" ? r.right - w : r.left
        const margin = 8
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
        const top = goUp ? r.top - estimatedH - 4 : r.bottom + 4
        setCoords({ top, left, direction: goUp ? "up" : "down" })
    }

    useLayoutEffect(() => {
        if (!open) return
        computePosition()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

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
        /* Scroll : on ferme uniquement quand le scroll vient d'EXTÉRIEUR du menu.
           Sans ce check, scroller la liste d'options ferme le menu (bug bloquant). */
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
                    }}
                    className={cn(
                        "bg-surface-container-lowest border border-outline-variant rounded shadow-2xl",
                        coords.direction === "up" && "shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {menuHeader && (
                        <div className="px-3 py-1.5 bg-surface-container border-b border-outline-variant font-label-caps text-label-caps text-outline uppercase flex items-center justify-between gap-2 rounded-t">
                            <span>{menuHeader}</span>
                            {options.length > 8 && (
                                <span className="font-mono-num text-[10px] text-outline tracking-normal normal-case">
                                    {options.length} options
                                </span>
                            )}
                        </div>
                    )}
                    {/* Liste scrollable — maxHeight directement sur la zone, pas de flex parent */}
                    <div
                        style={{ maxHeight: "min(70vh, 480px)" }}
                        className="overflow-y-auto overscroll-contain scrollbar-thin py-1"
                    >
                        {options.map((opt) => {
                            const isSel = opt.value === selected
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(opt.value)
                                        setOpen(false)
                                    }}
                                    role="menuitemradio"
                                    aria-checked={isSel}
                                    className={cn(
                                        "w-full text-left px-3 py-2 font-body-sm text-body-sm flex items-center gap-2 transition-colors",
                                        opt.danger
                                            ? "text-error hover:bg-error-container/30"
                                            : "text-on-surface hover:bg-surface-container-low",
                                        isSel && "bg-accent/10 font-medium"
                                    )}
                                >
                                    {opt.icon && (
                                        <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">
                                            {opt.icon}
                                        </span>
                                    )}
                                    {opt.preview && <span className="flex-shrink-0">{opt.preview}</span>}
                                    <span className="flex-1 truncate">{opt.label}</span>
                                    {isSel && (
                                        <span className="material-symbols-outlined text-[14px] text-accent flex-shrink-0">
                                            check
                                        </span>
                                    )}
                                </button>
                            )
                        })}
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
                title={title}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    "inline-flex items-center gap-1 rounded transition-shadow",
                    !disabled && [
                        "cursor-pointer",
                        "hover:ring-2 hover:ring-accent/30",
                        "focus:outline-none focus:ring-2 focus:ring-accent",
                        open && "ring-2 ring-accent",
                    ],
                    disabled && "cursor-default opacity-60"
                )}
            >
                {trigger}
            </button>
            {menu}
        </>
    )
}

/* ============================================================
   InlineDateCell — chip date cliquable + popover input[type=date]
   ============================================================ */

interface InlineDateCellProps {
    value: string | null // ISO
    onChange: (iso: string | null) => void
    /** Texte affiché par défaut si pas de date (ex: "+ Date") */
    placeholder?: string
    /** Format d'affichage personnalisé (sinon dd/mm/yy) */
    formatDisplay?: (iso: string | null) => string
    /** Classe sur le trigger */
    triggerClassName?: string
    title?: string
    /** Permet de retirer la date (bouton Effacer) */
    nullable?: boolean
    align?: "start" | "end"
    disabled?: boolean
}

function defaultFormat(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}
function toDateInput(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function InlineDateCell({
    value,
    onChange,
    placeholder = "—",
    formatDisplay = defaultFormat,
    triggerClassName,
    title,
    nullable = false,
    align = "start",
    disabled = false,
}: InlineDateCellProps) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(toDateInput(value))
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const popRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => setMounted(true), [])
    useEffect(() => setDraft(toDateInput(value)), [value])

    const computePosition = () => {
        const t = triggerRef.current
        if (!t) return
        const r = t.getBoundingClientRect()
        const w = 240
        const h = 180
        const margin = 8
        const goUp = window.innerHeight - r.bottom < h + 12 && r.top > h
        let left = align === "end" ? r.right - w : r.left
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin))
        const top = goUp ? r.top - h - 4 : r.bottom + 4
        setCoords({ top, left })
    }
    useLayoutEffect(() => {
        if (open) computePosition()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        const onScroll = (e: Event) => {
            const t = e.target as Node
            if (popRef.current?.contains(t)) return
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

    const apply = () => {
        onChange(draft ? new Date(draft).toISOString() : null)
        setOpen(false)
    }
    const clear = () => {
        onChange(null)
        setDraft("")
        setOpen(false)
    }

    const popover =
        open && coords && mounted
            ? createPortal(
                <div
                    ref={popRef}
                    style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 99999, width: 240 }}
                    className="bg-surface-container-lowest border border-outline-variant rounded shadow-2xl p-3 flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="date"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="w-full border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        autoFocus
                    />
                    <div className="flex items-center justify-between gap-1.5">
                        {nullable && value && (
                            <button
                                type="button"
                                onClick={clear}
                                className="px-2 py-1 text-error font-body-sm text-[11px] hover:bg-error-container/30 rounded transition-colors"
                            >
                                Effacer
                            </button>
                        )}
                        <div className="ml-auto flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-2 py-1 border border-outline-variant rounded font-body-sm text-[11px] hover:bg-surface-container-low transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={apply}
                                disabled={!draft}
                                className="px-2 py-1 bg-accent text-white rounded font-body-sm text-[11px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )
            : null

    const display = value ? formatDisplay(value) : placeholder

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
                title={title}
                className={cn(
                    "inline-flex items-center gap-1 rounded transition-shadow",
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
                <span className="material-symbols-outlined text-[12px] text-outline">calendar_today</span>
                <span className="font-mono-num">{display}</span>
            </button>
            {popover}
        </>
    )
}

/* ============================================================
   InlineTextCell — texte cliquable, devient input à l'édition
   ============================================================ */

interface InlineTextCellProps {
    value: string
    onChange: (next: string) => void
    placeholder?: string
    /** Classe appliquée à la version texte (lecture) */
    displayClassName?: string
    /** Classe appliquée à l'input édition */
    inputClassName?: string
    title?: string
    disabled?: boolean
    /** Multi-line si true (textarea au lieu de input) */
    multiline?: boolean
}

export function InlineTextCell({
    value,
    onChange,
    placeholder = "—",
    displayClassName,
    inputClassName,
    title,
    disabled = false,
    multiline = false,
}: InlineTextCellProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)

    /* Init du draft uniquement à l'ouverture de l'édition pour éviter le pattern
       useEffect+setState (anti-pattern react-hooks/set-state-in-effect). */
    const startEdit = () => {
        setDraft(value)
        setEditing(true)
    }

    const save = () => {
        if (draft !== value) onChange(draft)
        setEditing(false)
    }
    const cancel = () => {
        setDraft(value)
        setEditing(false)
    }

    if (editing) {
        const InputComp = multiline ? "textarea" : "input"
        return (
            <InputComp
                autoFocus
                value={draft}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setDraft(e.target.value)
                }
                onBlur={save}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    if (e.key === "Enter" && !multiline) {
                        e.preventDefault()
                        save()
                    } else if (e.key === "Escape") {
                        e.preventDefault()
                        cancel()
                    }
                }}
                onClick={(e) => e.stopPropagation()}
                rows={multiline ? 2 : undefined}
                className={cn(
                    "w-full border border-accent rounded px-1.5 py-0.5 font-body-sm text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40",
                    inputClassName
                )}
                placeholder={placeholder}
            />
        )
    }

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation()
                if (!disabled) startEdit()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={title ?? "Cliquer pour modifier"}
            className={cn(
                "text-left rounded px-1 -mx-1 py-0.5 transition-colors",
                !disabled && [
                    "cursor-text",
                    "hover:bg-surface-container-low/60 hover:ring-1 hover:ring-outline-variant",
                ],
                disabled && "cursor-default",
                displayClassName
            )}
        >
            {value || <span className="text-outline-variant italic">{placeholder}</span>}
        </button>
    )
}

/* ============================================================
   InlineNumberCell — montant FCFA cliquable, devient input numérique
   ============================================================ */

interface InlineNumberCellProps {
    value: number
    onChange: (next: number) => void
    /** Format d'affichage (ex: formatFCFA, ou +1 200 / -300). Si non fourni, valeur brute. */
    formatDisplay?: (n: number) => string
    /** Préfixe affiché en lecture (ex: "+", "−") — n'affecte pas la valeur stockée */
    prefix?: string
    /** Min autorisé (défaut: 0) */
    min?: number
    /** Max autorisé */
    max?: number
    /** Pas pour les flèches up/down */
    step?: number
    /** Texte affiché si valeur === 0 */
    placeholder?: string
    displayClassName?: string
    title?: string
    disabled?: boolean
    /** Si true, 0 est rendu comme "—" (lecture seule visuelle, mais on peut toujours éditer) */
    showDashOnZero?: boolean
}

export function InlineNumberCell({
    value,
    onChange,
    formatDisplay,
    prefix,
    min = 0,
    max,
    step = 1,
    placeholder = "0",
    displayClassName,
    title,
    disabled = false,
    showDashOnZero = false,
}: InlineNumberCellProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(String(value))

    /* Sync draft uniquement à l'ouverture (évite useEffect+setState) */
    const startEdit = () => {
        setDraft(String(value))
        setEditing(true)
    }

    const commit = () => {
        const cleaned = draft.replace(/[^\d.-]/g, "")
        let n = Number(cleaned)
        if (!Number.isFinite(n)) n = value
        if (n < min) n = min
        if (max !== undefined && n > max) n = max
        if (n !== value) onChange(n)
        setEditing(false)
    }
    const cancel = () => {
        setDraft(String(value))
        setEditing(false)
    }

    if (editing) {
        return (
            <input
                type="number"
                autoFocus
                value={draft}
                step={step}
                min={min}
                max={max}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        commit()
                    } else if (e.key === "Escape") {
                        e.preventDefault()
                        cancel()
                    }
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full border border-accent rounded px-1.5 py-0.5 font-mono-num text-mono-num text-body-sm bg-white text-right focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
        )
    }

    const showDash = showDashOnZero && value === 0
    const displayValue = formatDisplay ? formatDisplay(value) : String(value)

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation()
                if (!disabled) startEdit()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={title ?? "Cliquer pour modifier"}
            className={cn(
                "text-right rounded px-1 -mx-1 py-0.5 transition-colors w-full",
                !disabled && [
                    "cursor-text",
                    "hover:bg-surface-container-low/60 hover:ring-1 hover:ring-outline-variant",
                ],
                disabled && "cursor-default",
                displayClassName
            )}
        >
            {showDash ? (
                <span className="text-outline-variant">—</span>
            ) : (
                <>
                    {prefix && value !== 0 && <span>{prefix}</span>}
                    {displayValue || <span className="text-outline-variant italic">{placeholder}</span>}
                </>
            )}
        </button>
    )
}
