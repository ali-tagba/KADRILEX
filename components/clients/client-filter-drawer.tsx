"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { AVOCATS_CABINET, HONORAIRES_TYPES, type AvocatCabinet, type HonorairesType } from "@/lib/constants/legal"
import {
    INITIAL_FILTERS,
    countActiveFilters,
    type ClientFiltersState,
    type ClientType,
    type DatePreset,
    type StatusFacturation,
    type SortOrder,
} from "./filters-state"

interface ClientFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: ClientFiltersState
    onChange: (next: ClientFiltersState) => void
    availableYears: string[]
}

export function ClientFilterDrawer({
    open,
    onClose,
    filters,
    onChange,
    availableYears,
}: ClientFilterDrawerProps) {
    // ESC to close
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    // Block scroll on body
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    const update = (patch: Partial<ClientFiltersState>) => onChange({ ...filters, ...patch })

    const reset = () => onChange({ ...INITIAL_FILTERS, viewMode: filters.viewMode, search: filters.search })

    const toggleAvocat = (a: AvocatCabinet) => {
        const exists = filters.avocats.includes(a)
        update({
            avocats: exists ? filters.avocats.filter((x) => x !== a) : [...filters.avocats, a],
        })
    }

    const toggleHonoraire = (h: HonorairesType) => {
        const exists = filters.honoraires.includes(h)
        update({
            honoraires: exists ? filters.honoraires.filter((x) => x !== h) : [...filters.honoraires, h],
        })
    }

    const activeCount = countActiveFilters(filters)

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className={cn(
                    "fixed inset-0 z-40 bg-inverse-surface/30 transition-opacity duration-200",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                aria-hidden={!open}
            />

            {/* Drawer */}
            <aside
                role="dialog"
                aria-label="Filtres avancés"
                aria-modal="true"
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-surface-container-lowest border-l border-outline-variant shadow-2xl",
                    "flex flex-col transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <header className="flex-none flex items-center justify-between px-density-loose py-density-medium border-b border-outline-variant bg-surface-container">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                        <h2 className="font-h2 text-h2 text-primary">Filtres</h2>
                        {activeCount > 0 && (
                            <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white">
                                {activeCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                        aria-label="Fermer les filtres"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-loose py-density-medium space-y-density-loose">
                    {/* Type de client */}
                    <FilterSection title="Type de client" icon="group">
                        <RadioGroup<ClientType>
                            value={filters.type}
                            onChange={(v) => update({ type: v })}
                            options={[
                                { value: "ALL", label: "Tous" },
                                { value: "PERSONNE_MORALE", label: "Sociétés" },
                                { value: "PERSONNE_PHYSIQUE", label: "Particuliers" },
                            ]}
                        />
                    </FilterSection>

                    {/* Date de création */}
                    <FilterSection title="Date de création" icon="calendar_today">
                        <RadioGroup<DatePreset>
                            value={filters.datePreset}
                            onChange={(v) => update({ datePreset: v })}
                            options={[
                                { value: "ALL", label: "Toutes les dates" },
                                { value: "CURRENT_MONTH", label: "Ce mois" },
                                { value: "CURRENT_QUARTER", label: "Ce trimestre" },
                                { value: "CURRENT_YEAR", label: "Cette année" },
                                { value: "YEAR", label: "Année précise" },
                                { value: "CUSTOM", label: "Période personnalisée" },
                            ]}
                        />

                        {filters.datePreset === "YEAR" && (
                            <div className="mt-density-tight pl-6">
                                <select
                                    value={filters.dateYear ?? ""}
                                    onChange={(e) => update({ dateYear: e.target.value || null })}
                                    className="w-full px-3 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none"
                                >
                                    <option value="">— Sélectionner une année —</option>
                                    {availableYears.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {filters.datePreset === "CUSTOM" && (
                            <div className="mt-density-tight pl-6 grid grid-cols-2 gap-density-tight">
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">
                                        Du
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.dateStart ?? ""}
                                        onChange={(e) => update({ dateStart: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">
                                        Au
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.dateEnd ?? ""}
                                        onChange={(e) => update({ dateEnd: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </FilterSection>

                    {/* Avocat en charge */}
                    <FilterSection
                        title="Avocat en charge"
                        icon="badge"
                        hint={
                            filters.avocats.length === 0
                                ? "Tous les avocats"
                                : `${filters.avocats.length} sélectionné${filters.avocats.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={AVOCATS_CABINET.map((a) => ({ value: a, label: a }))}
                            selected={filters.avocats}
                            onToggle={(v) => toggleAvocat(v as AvocatCabinet)}
                        />
                    </FilterSection>

                    {/* Honoraires */}
                    <FilterSection
                        title="Type d'honoraires"
                        icon="payments"
                        hint={
                            filters.honoraires.length === 0
                                ? "Tous les types"
                                : `${filters.honoraires.length} sélectionné${filters.honoraires.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={HONORAIRES_TYPES.map((h) => ({ value: h, label: h }))}
                            selected={filters.honoraires}
                            onToggle={(v) => toggleHonoraire(v as HonorairesType)}
                        />
                    </FilterSection>

                    {/* État facturation */}
                    <FilterSection title="État facturation" icon="receipt_long">
                        <RadioGroup<StatusFacturation>
                            value={filters.statut}
                            onChange={(v) => update({ statut: v })}
                            options={[
                                { value: "ALL", label: "Tous" },
                                { value: "A_JOUR", label: "À jour" },
                                { value: "IMPAYE", label: "Impayés" },
                            ]}
                        />
                    </FilterSection>
                    {/* Ordre de tri */}
                    <FilterSection title="Ordre de tri" icon="sort_by_alpha">
                        <RadioGroup<SortOrder>
                            value={filters.sortOrder}
                            onChange={(v) => update({ sortOrder: v })}
                            options={[
                                { value: "DEFAULT", label: "Par défaut" },
                                { value: "A-Z", label: "De A à Z" },
                                { value: "Z-A", label: "De Z à A" },
                            ]}
                        />
                    </FilterSection>
                </div>

                {/* Footer */}
                <footer className="flex-none flex items-center justify-between gap-3 px-density-loose py-density-medium border-t border-outline-variant bg-surface-container">
                    <button
                        onClick={reset}
                        className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary underline-offset-2 hover:underline transition-colors"
                    >
                        Réinitialiser
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm font-medium hover:bg-opacity-90 transition-colors active:scale-[0.98] duration-150 ease-out"
                    >
                        Voir les résultats
                    </button>
                </footer>
            </aside>
        </>
    )
}

/* ------------------------------------------------------------------
   Sub-composants
   ------------------------------------------------------------------ */

interface FilterSectionProps {
    title: string
    icon: string
    hint?: string
    children: React.ReactNode
}

function FilterSection({ title, icon, hint, children }: FilterSectionProps) {
    return (
        <section>
            <header className="flex items-center justify-between mb-density-tight">
                <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                    <h3 className="font-label-caps text-label-caps uppercase">{title}</h3>
                </div>
                {hint && (
                    <span className="font-body-sm text-[11px] text-outline">{hint}</span>
                )}
            </header>
            {children}
        </section>
    )
}

interface RadioGroupProps<T extends string> {
    value: T
    onChange: (v: T) => void
    options: { value: T; label: string }[]
}

function RadioGroup<T extends string>({ value, onChange, options }: RadioGroupProps<T>) {
    return (
        <div className="space-y-1">
            {options.map((opt) => {
                const isActive = value === opt.value
                return (
                    <label
                        key={opt.value}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                            isActive
                                ? "bg-accent/10 text-primary font-medium"
                                : "text-on-surface hover:bg-surface-container-low"
                        )}
                    >
                        <span
                            className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                isActive
                                    ? "border-accent"
                                    : "border-outline-variant"
                            )}
                        >
                            {isActive && <span className="w-2 h-2 rounded-full bg-accent" />}
                        </span>
                        <input
                            type="radio"
                            checked={isActive}
                            onChange={() => onChange(opt.value)}
                            className="sr-only"
                        />
                        {opt.label}
                    </label>
                )
            })}
        </div>
    )
}

interface CheckboxGroupProps {
    options: { value: string; label: string }[]
    selected: string[]
    onToggle: (v: string) => void
}

function CheckboxGroup({ options, selected, onToggle }: CheckboxGroupProps) {
    return (
        <div className="space-y-1">
            {options.map((opt) => {
                const isChecked = selected.includes(opt.value)
                return (
                    <label
                        key={opt.value}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                            isChecked
                                ? "bg-accent/10 text-primary font-medium"
                                : "text-on-surface hover:bg-surface-container-low"
                        )}
                    >
                        <span
                            className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                isChecked
                                    ? "bg-accent border-accent text-white"
                                    : "bg-white border-outline-variant"
                            )}
                        >
                            {isChecked && (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                            )}
                        </span>
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggle(opt.value)}
                            className="sr-only"
                        />
                        <span className="truncate">{opt.label}</span>
                    </label>
                )
            })}
        </div>
    )
}
