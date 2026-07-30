"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    CATEGORIES_DEPENSE,
    FREQUENCES_RECURRENCE,
    MODES_PAIEMENT,
    type CategorieDepenseKey,
    type FrequenceRecurrenceKey,
    type ModePaiementKey,
} from "@/lib/constants/finance"

export type DepenseDatePreset = "ALL" | "CURRENT_MONTH" | "CURRENT_QUARTER" | "CURRENT_YEAR" | "CUSTOM"

export interface DepenseFiltersState {
    search: string
    categories: CategorieDepenseKey[]
    modes: ModePaiementKey[]
    datePreset: DepenseDatePreset
    dateStart: string | null
    dateEnd: string | null
    montantMin: number | null
    montantMax: number | null
    recurrenceFilter: "ALL" | "RECURRENT" | "PONCTUEL"
    frequences: FrequenceRecurrenceKey[]
    avecJustificatif: boolean
    sansJustificatif: boolean
}

export const INITIAL_DEPENSE_FILTERS: DepenseFiltersState = {
    search: "",
    categories: [],
    modes: [],
    datePreset: "ALL",
    dateStart: null,
    dateEnd: null,
    montantMin: null,
    montantMax: null,
    recurrenceFilter: "ALL",
    frequences: [],
    avecJustificatif: false,
    sansJustificatif: false,
}

export function countActiveDepenseFilters(s: DepenseFiltersState): number {
    let n = 0
    if (s.categories.length > 0) n += 1
    if (s.modes.length > 0) n += 1
    if (s.datePreset !== "ALL") n += 1
    if (s.montantMin !== null || s.montantMax !== null) n += 1
    if (s.recurrenceFilter !== "ALL") n += 1
    if (s.frequences.length > 0) n += 1
    if (s.avecJustificatif || s.sansJustificatif) n += 1
    return n
}

interface DepenseFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: DepenseFiltersState
    onChange: (next: DepenseFiltersState) => void
}

export function DepenseFilterDrawer({ open, onClose, filters, onChange }: DepenseFilterDrawerProps) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    const update = (patch: Partial<DepenseFiltersState>) => onChange({ ...filters, ...patch })
    const reset = () => onChange({ ...INITIAL_DEPENSE_FILTERS, search: filters.search })
    const toggleArr = <T extends string>(arr: T[], v: T): T[] =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
    const activeCount = countActiveDepenseFilters(filters)

    return (
        <>
            <div
                onClick={onClose}
                className={cn(
                    "fixed inset-0 z-40 bg-inverse-surface/30 transition-opacity duration-200",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
            />
            <aside
                role="dialog"
                aria-modal="true"
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full"
                )}
            >
                <header className="flex-none flex items-center justify-between px-density-loose py-density-medium border-b border-outline-variant bg-surface-container">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                        <h2 className="font-h2 text-h2 text-primary">Filtres dépenses</h2>
                        {activeCount > 0 && (
                            <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white">
                                {activeCount}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-container-low text-outline hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-loose py-density-medium space-y-density-loose">
                    <Section
                        title="Catégorie"
                        icon="category"
                        hint={filters.categories.length === 0 ? "Toutes" : `${filters.categories.length} sélectionnée${filters.categories.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(CATEGORIES_DEPENSE) as [CategorieDepenseKey, { label: string; icon: string }][]).map(([k, m]) => ({
                                value: k,
                                label: m.label,
                                icon: m.icon,
                            }))}
                            selected={filters.categories}
                            onToggle={(v) => update({ categories: toggleArr(filters.categories, v as CategorieDepenseKey) })}
                        />
                    </Section>

                    <Section
                        title="Mode de paiement"
                        icon="payments"
                        hint={filters.modes.length === 0 ? "Tous" : `${filters.modes.length} sélectionné${filters.modes.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(MODES_PAIEMENT) as [ModePaiementKey, { label: string; icon: string }][]).map(([k, m]) => ({
                                value: k,
                                label: m.label,
                                icon: m.icon,
                            }))}
                            selected={filters.modes}
                            onToggle={(v) => update({ modes: toggleArr(filters.modes, v as ModePaiementKey) })}
                        />
                    </Section>

                    <Section title="Date" icon="calendar_today">
                        <RadioGroup<DepenseDatePreset>
                            value={filters.datePreset}
                            onChange={(v) => update({ datePreset: v })}
                            options={[
                                { value: "ALL", label: "Toutes" },
                                { value: "CURRENT_MONTH", label: "Ce mois" },
                                { value: "CURRENT_QUARTER", label: "Ce trimestre" },
                                { value: "CURRENT_YEAR", label: "Cette année" },
                                { value: "CUSTOM", label: "Période personnalisée" },
                            ]}
                        />
                        {filters.datePreset === "CUSTOM" && (
                            <div className="mt-density-tight pl-6 grid grid-cols-2 gap-density-tight">
                                <DateField label="Du" value={filters.dateStart} onChange={(v) => update({ dateStart: v })} />
                                <DateField label="Au" value={filters.dateEnd} onChange={(v) => update({ dateEnd: v })} />
                            </div>
                        )}
                    </Section>

                    <Section title="Montant TTC" icon="payments">
                        <div className="grid grid-cols-2 gap-density-tight">
                            <NumberField label="Min (FCFA)" value={filters.montantMin} onChange={(v) => update({ montantMin: v })} placeholder="0" />
                            <NumberField label="Max (FCFA)" value={filters.montantMax} onChange={(v) => update({ montantMax: v })} placeholder="∞" />
                        </div>
                    </Section>

                    <Section title="Récurrence" icon="event_repeat">
                        <RadioGroup<"ALL" | "RECURRENT" | "PONCTUEL">
                            value={filters.recurrenceFilter}
                            onChange={(v) => update({ recurrenceFilter: v })}
                            options={[
                                { value: "ALL", label: "Toutes" },
                                { value: "RECURRENT", label: "Récurrentes uniquement" },
                                { value: "PONCTUEL", label: "Ponctuelles uniquement" },
                            ]}
                        />
                        {filters.recurrenceFilter === "RECURRENT" && (
                            <div className="mt-density-tight">
                                <CheckboxGroup
                                    options={(Object.entries(FREQUENCES_RECURRENCE) as [FrequenceRecurrenceKey, { label: string }][]).map(([k, m]) => ({
                                        value: k,
                                        label: m.label,
                                    }))}
                                    selected={filters.frequences}
                                    onToggle={(v) => update({ frequences: toggleArr(filters.frequences, v as FrequenceRecurrenceKey) })}
                                />
                            </div>
                        )}
                    </Section>

                    <Section title="Justificatif" icon="attach_file">
                        <ToggleRow checked={filters.avecJustificatif} onChange={(b) => update({ avecJustificatif: b, sansJustificatif: b ? false : filters.sansJustificatif })} label="Avec justificatif uniquement" />
                        <ToggleRow checked={filters.sansJustificatif} onChange={(b) => update({ sansJustificatif: b, avecJustificatif: b ? false : filters.avecJustificatif })} label="Sans justificatif uniquement" />
                    </Section>
                </div>

                <footer className="flex-none flex items-center justify-between gap-3 px-density-loose py-density-medium border-t border-outline-variant bg-surface-container">
                    <button onClick={reset} className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary underline-offset-2 hover:underline transition-colors">
                        Réinitialiser
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm font-medium hover:bg-opacity-90 transition-colors active:scale-[0.98]">
                        Voir les résultats
                    </button>
                </footer>
            </aside>
        </>
    )
}

/* ============================================================
   Sub-composants partagés (utilisés aussi par paie-filter-drawer)
   ============================================================ */

export function Section({
    title,
    icon,
    hint,
    children,
}: {
    title: string
    icon: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <section>
            <header className="flex items-center justify-between mb-density-tight">
                <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                    <h3 className="font-label-caps text-label-caps uppercase">{title}</h3>
                </div>
                {hint && <span className="font-body-sm text-[11px] text-outline">{hint}</span>}
            </header>
            {children}
        </section>
    )
}

export function RadioGroup<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T
    onChange: (v: T) => void
    options: { value: T; label: string }[]
}) {
    return (
        <div className="space-y-1">
            {options.map((opt) => {
                const isActive = value === opt.value
                return (
                    <label
                        key={opt.value}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                            isActive ? "bg-accent/10 text-primary font-medium" : "text-on-surface hover:bg-surface-container-low"
                        )}
                    >
                        <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", isActive ? "border-accent" : "border-outline-variant")}>
                            {isActive && <span className="w-2 h-2 rounded-full bg-accent" />}
                        </span>
                        <input type="radio" checked={isActive} onChange={() => onChange(opt.value)} className="sr-only" />
                        {opt.label}
                    </label>
                )
            })}
        </div>
    )
}

export function CheckboxGroup({
    options,
    selected,
    onToggle,
}: {
    options: { value: string; label: string; icon?: string }[]
    selected: string[]
    onToggle: (v: string) => void
}) {
    return (
        <div className="space-y-1">
            {options.map((opt) => {
                const isChecked = selected.includes(opt.value)
                return (
                    <label
                        key={opt.value}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                            isChecked ? "bg-accent/10 text-primary font-medium" : "text-on-surface hover:bg-surface-container-low"
                        )}
                    >
                        <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", isChecked ? "bg-accent border-accent text-white" : "bg-white border-outline-variant")}>
                            {isChecked && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </span>
                        <input type="checkbox" checked={isChecked} onChange={() => onToggle(opt.value)} className="sr-only" />
                        {opt.icon && <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                    </label>
                )
            })}
        </div>
    )
}

export function ToggleRow({
    checked,
    onChange,
    label,
}: {
    checked: boolean
    onChange: (b: boolean) => void
    label: string
}) {
    return (
        <label
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                checked ? "bg-accent/10 text-primary font-medium" : "text-on-surface hover:bg-surface-container-low"
            )}
        >
            <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", checked ? "bg-accent border-accent text-white" : "bg-white border-outline-variant")}>
                {checked && <span className="material-symbols-outlined text-[14px]">check</span>}
            </span>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
            {label}
        </label>
    )
}

export function DateField({
    label,
    value,
    onChange,
}: {
    label: string
    value: string | null
    onChange: (v: string | null) => void
}) {
    return (
        <div>
            <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">{label}</label>
            <input
                type="date"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm focus:border-accent focus:outline-none"
            />
        </div>
    )
}

export function NumberField({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string
    value: number | null
    onChange: (v: number | null) => void
    placeholder?: string
}) {
    return (
        <div>
            <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">{label}</label>
            <input
                type="number"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                placeholder={placeholder}
                className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-mono-num text-body-sm focus:border-accent focus:outline-none"
            />
        </div>
    )
}
