"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    DOC_CATEGORIES,
    DOC_TYPES,
    DOMAINES_JURIDIQUES,
    ISSUES_JURIS,
    NIVEAUX_JURIDICTION,
    type DocCategorieKey,
    type DocTypeKey,
    type DomaineJuridiqueKey,
    type IssueJurisKey,
    type NiveauJuridictionKey,
} from "@/lib/constants/biblio"
import {
    INITIAL_FILTERS,
    countActiveFilters,
    type BibliothequeFiltersState,
    type DatePreset,
} from "./filters-state"

interface BibliothequeFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: BibliothequeFiltersState
    onChange: (next: BibliothequeFiltersState) => void
    /** Liste des juridictions distinctes (peuplée depuis les docs existants) */
    availableJuridictions: string[]
    /** Liste des auteurs distincts */
    availableAuteurs: string[]
}

export function BibliothequeFilterDrawer({
    open,
    onClose,
    filters,
    onChange,
    availableJuridictions,
    availableAuteurs,
}: BibliothequeFilterDrawerProps) {
    /* ESC pour fermer */
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    /* Bloque le scroll body */
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    const update = (patch: Partial<BibliothequeFiltersState>) => onChange({ ...filters, ...patch })

    const reset = () =>
        onChange({ ...INITIAL_FILTERS, viewMode: filters.viewMode, search: filters.search })

    const toggleArr = <T extends string>(arr: T[], v: T): T[] =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

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
                aria-label="Filtres avancés bibliothèque"
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
                    {/* Catégorie (multi) */}
                    <FilterSection
                        title="Catégorie"
                        icon="category"
                        hint={
                            filters.categories.length === 0
                                ? "Toutes catégories"
                                : `${filters.categories.length} sélectionnée${filters.categories.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={(
                                Object.entries(DOC_CATEGORIES) as [DocCategorieKey, { label: string }][]
                            ).map(([k, m]) => ({ value: k, label: m.label }))}
                            selected={filters.categories}
                            onToggle={(v) =>
                                update({ categories: toggleArr(filters.categories, v as DocCategorieKey) })
                            }
                        />
                    </FilterSection>

                    {/* Domaine juridique (multi) */}
                    <FilterSection
                        title="Domaine juridique"
                        icon="balance"
                        hint={
                            filters.domaines.length === 0
                                ? "Tous domaines"
                                : `${filters.domaines.length} sélectionné${filters.domaines.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={(
                                Object.entries(DOMAINES_JURIDIQUES) as [DomaineJuridiqueKey, { label: string; icon: string }][]
                            ).map(([k, m]) => ({ value: k, label: m.label, icon: m.icon }))}
                            selected={filters.domaines}
                            onToggle={(v) =>
                                update({ domaines: toggleArr(filters.domaines, v as DomaineJuridiqueKey) })
                            }
                        />
                    </FilterSection>

                    {/* Type de document (multi) */}
                    <FilterSection
                        title="Type de document"
                        icon="article"
                        hint={
                            filters.types.length === 0
                                ? "Tous types"
                                : `${filters.types.length} sélectionné${filters.types.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={(Object.entries(DOC_TYPES) as [DocTypeKey, string][]).map(([k, label]) => ({
                                value: k,
                                label,
                            }))}
                            selected={filters.types}
                            onToggle={(v) => update({ types: toggleArr(filters.types, v as DocTypeKey) })}
                        />
                    </FilterSection>

                    {/* Juridiction (multi, depuis docs existants) */}
                    {availableJuridictions.length > 0 && (
                        <FilterSection
                            title="Juridiction"
                            icon="gavel"
                            hint={
                                filters.juridictions.length === 0
                                    ? "Toutes juridictions"
                                    : `${filters.juridictions.length} sélectionnée${filters.juridictions.length > 1 ? "s" : ""}`
                            }
                        >
                            <CheckboxGroup
                                options={availableJuridictions.map((j) => ({ value: j, label: j }))}
                                selected={filters.juridictions}
                                onToggle={(v) =>
                                    update({ juridictions: toggleArr(filters.juridictions, v) })
                                }
                            />
                        </FilterSection>
                    )}

                    {/* Niveau (multi) */}
                    <FilterSection
                        title="Niveau de juridiction"
                        icon="account_balance"
                        hint={
                            filters.niveaux.length === 0
                                ? "Tous niveaux"
                                : `${filters.niveaux.length} sélectionné${filters.niveaux.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={(
                                Object.entries(NIVEAUX_JURIDICTION) as [NiveauJuridictionKey, string][]
                            ).map(([k, label]) => ({ value: k, label }))}
                            selected={filters.niveaux}
                            onToggle={(v) =>
                                update({ niveaux: toggleArr(filters.niveaux, v as NiveauJuridictionKey) })
                            }
                        />
                    </FilterSection>

                    {/* Issue (single, jurisprudence uniquement) */}
                    <FilterSection title="Issue (jurisprudence)" icon="rule">
                        <RadioGroup<IssueJurisKey | "ALL">
                            value={filters.issue}
                            onChange={(v) => update({ issue: v })}
                            options={[
                                { value: "ALL", label: "Toutes issues" },
                                ...(Object.entries(ISSUES_JURIS) as [IssueJurisKey, { label: string }][]).map(
                                    ([k, m]) => ({ value: k, label: m.label })
                                ),
                            ]}
                        />
                    </FilterSection>

                    {/* Date du document */}
                    <FilterSection title="Date du document" icon="calendar_today">
                        <RadioGroup<DatePreset>
                            value={filters.datePreset}
                            onChange={(v) => update({ datePreset: v })}
                            options={[
                                { value: "ALL", label: "Toutes les dates" },
                                { value: "CURRENT_MONTH", label: "Ce mois" },
                                { value: "CURRENT_YEAR", label: "Cette année" },
                                { value: "LAST_YEAR", label: "L'année dernière" },
                                { value: "CUSTOM", label: "Période personnalisée" },
                            ]}
                        />

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

                    {/* Auteur (multi, peuplé depuis docs) */}
                    {availableAuteurs.length > 0 && (
                        <FilterSection
                            title="Auteur"
                            icon="person"
                            hint={
                                filters.auteurs.length === 0
                                    ? "Tous auteurs"
                                    : `${filters.auteurs.length} sélectionné${filters.auteurs.length > 1 ? "s" : ""}`
                            }
                        >
                            <CheckboxGroup
                                options={availableAuteurs.map((a) => ({ value: a, label: a }))}
                                selected={filters.auteurs}
                                onToggle={(v) => update({ auteurs: toggleArr(filters.auteurs, v) })}
                            />
                        </FilterSection>
                    )}

                    {/* Visibilité */}
                    <FilterSection title="Visibilité" icon="visibility">
                        <ToggleRow
                            checked={filters.favorisOnly}
                            onChange={(b) => update({ favorisOnly: b })}
                            label="Mes favoris uniquement"
                        />
                        <ToggleRow
                            checked={filters.showArchives}
                            onChange={(b) => update({ showArchives: b })}
                            label="Inclure les archivés"
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

/* ============================================================
   Sub-composants
   ============================================================ */

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
                {hint && <span className="font-body-sm text-[11px] text-outline">{hint}</span>}
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
                                isActive ? "border-accent" : "border-outline-variant"
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

interface CheckboxOption {
    value: string
    label: string
    icon?: string
}
interface CheckboxGroupProps {
    options: CheckboxOption[]
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
                        {opt.icon && (
                            <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">
                                {opt.icon}
                            </span>
                        )}
                        <span className="truncate">{opt.label}</span>
                    </label>
                )
            })}
        </div>
    )
}

function ToggleRow({
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
            <span
                className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    checked ? "bg-accent border-accent text-white" : "bg-white border-outline-variant"
                )}
            >
                {checked && <span className="material-symbols-outlined text-[14px]">check</span>}
            </span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only"
            />
            {label}
        </label>
    )
}
