"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    TACHE_PRIORITES,
    TACHE_STATUTS,
    type TachePrioriteKey,
    type TacheStatutKey,
} from "@/lib/constants/legal"
import {
    INITIAL_FILTERS,
    countActiveFilters,
    type EcheancePreset,
    type LiaisonKey,
    type TachesFiltersState,
} from "./filters-state"

interface TachesFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: TachesFiltersState
    onChange: (next: TachesFiltersState) => void
    /** Liste de tous les avocats/juristes apparaissant dans les tâches (pour la checkbox group) */
    availableAssignees: string[]
}

export function TachesFilterDrawer({
    open,
    onClose,
    filters,
    onChange,
    availableAssignees,
}: TachesFilterDrawerProps) {
    /* ESC pour fermer */
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    /* Bloque le scroll body quand drawer ouvert */
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    const update = (patch: Partial<TachesFiltersState>) => onChange({ ...filters, ...patch })

    const reset = () =>
        onChange({ ...INITIAL_FILTERS, viewMode: filters.viewMode, search: filters.search })

    const toggleStatut = (s: TacheStatutKey) => {
        const exists = filters.statuts.includes(s)
        update({
            statuts: exists ? filters.statuts.filter((x) => x !== s) : [...filters.statuts, s],
        })
    }

    const togglePriorite = (p: TachePrioriteKey) => {
        const exists = filters.priorites.includes(p)
        update({
            priorites: exists ? filters.priorites.filter((x) => x !== p) : [...filters.priorites, p],
        })
    }

    const toggleAvocat = (a: string) => {
        const exists = filters.avocats.includes(a)
        update({
            avocats: exists ? filters.avocats.filter((x) => x !== a) : [...filters.avocats, a],
        })
    }

    const toggleLiaison = (l: LiaisonKey) => {
        const exists = filters.liaisons.includes(l)
        update({
            liaisons: exists ? filters.liaisons.filter((x) => x !== l) : [...filters.liaisons, l],
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
                aria-label="Filtres avancés des tâches"
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
                    {/* Statut (multi) */}
                    <FilterSection
                        title="Statut"
                        icon="check_box"
                        hint={
                            filters.statuts.length === 0
                                ? "Tous statuts"
                                : `${filters.statuts.length} sélectionné${filters.statuts.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={(
                                Object.entries(TACHE_STATUTS) as [TacheStatutKey, { label: string }][]
                            ).map(([k, m]) => ({ value: k, label: m.label }))}
                            selected={filters.statuts}
                            onToggle={(v) => toggleStatut(v as TacheStatutKey)}
                        />
                    </FilterSection>

                    {/* Priorité (multi) */}
                    <FilterSection
                        title="Priorité"
                        icon="priority_high"
                        hint={
                            filters.priorites.length === 0
                                ? "Toutes priorités"
                                : `${filters.priorites.length} sélectionnée${filters.priorites.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={(
                                Object.entries(TACHE_PRIORITES) as [TachePrioriteKey, { label: string; icon: string }][]
                            ).map(([k, m]) => ({ value: k, label: m.label, icon: m.icon }))}
                            selected={filters.priorites}
                            onToggle={(v) => togglePriorite(v as TachePrioriteKey)}
                        />
                    </FilterSection>

                    {/* Avocats / juristes (multi) */}
                    <FilterSection
                        title="Avocat en charge"
                        icon="badge"
                        hint={
                            filters.avocats.length === 0
                                ? "Tous les avocats"
                                : `${filters.avocats.length} sélectionné${filters.avocats.length > 1 ? "s" : ""}`
                        }
                    >
                        {availableAssignees.length === 0 ? (
                            <p className="font-body-sm text-[12px] text-outline italic px-2">
                                Aucun avocat trouvé dans les tâches.
                            </p>
                        ) : (
                            <CheckboxGroup
                                options={availableAssignees.map((a) => ({ value: a, label: a }))}
                                selected={filters.avocats}
                                onToggle={toggleAvocat}
                            />
                        )}
                    </FilterSection>

                    {/* Échéance */}
                    <FilterSection title="Échéance" icon="schedule">
                        <RadioGroup<EcheancePreset>
                            value={filters.echeancePreset}
                            onChange={(v) => update({ echeancePreset: v })}
                            options={[
                                { value: "ALL", label: "Toutes échéances" },
                                { value: "OVERDUE", label: "En retard" },
                                { value: "TODAY", label: "Aujourd'hui" },
                                { value: "WEEK", label: "Cette semaine" },
                                { value: "MONTH", label: "Ce mois" },
                                { value: "NO_DEADLINE", label: "Sans échéance" },
                                { value: "CUSTOM", label: "Période personnalisée" },
                            ]}
                        />

                        {filters.echeancePreset === "CUSTOM" && (
                            <div className="mt-density-tight pl-6 grid grid-cols-2 gap-density-tight">
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">
                                        Du
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.echeanceStart ?? ""}
                                        onChange={(e) => update({ echeanceStart: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">
                                        Au
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.echeanceEnd ?? ""}
                                        onChange={(e) => update({ echeanceEnd: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </FilterSection>

                    {/* Liaison (multi) */}
                    <FilterSection
                        title="Type de liaison"
                        icon="link"
                        hint={
                            filters.liaisons.length === 0
                                ? "Toutes liaisons"
                                : `${filters.liaisons.length} sélectionné${filters.liaisons.length > 1 ? "s" : ""}`
                        }
                    >
                        <CheckboxGroup
                            options={[
                                { value: "CLIENT", label: "Liées à un client", icon: "person" },
                                { value: "DOSSIER", label: "Liées à un dossier", icon: "folder" },
                                { value: "AUDIENCE", label: "Liées à une audience", icon: "gavel" },
                                { value: "NONE", label: "Tâches libres (sans liaison)", icon: "block" },
                            ]}
                            selected={filters.liaisons}
                            onToggle={(v) => toggleLiaison(v as LiaisonKey)}
                        />
                    </FilterSection>

                    {/* Visibilité — réservé à la vue Liste (en Kanban les colonnes Fait/Annulé sont la vue elle-même) */}
                    {filters.viewMode === "list" && (
                        <FilterSection
                            title="Visibilité"
                            icon="visibility"
                            hint="Spécifique à la vue Liste"
                        >
                        <label
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                                filters.showDone
                                    ? "bg-accent/10 text-primary font-medium"
                                    : "text-on-surface hover:bg-surface-container-low"
                            )}
                        >
                            <span
                                className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                    filters.showDone
                                        ? "bg-accent border-accent text-white"
                                        : "bg-white border-outline-variant"
                                )}
                            >
                                {filters.showDone && (
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                )}
                            </span>
                            <input
                                type="checkbox"
                                checked={filters.showDone}
                                onChange={(e) => update({ showDone: e.target.checked })}
                                className="sr-only"
                            />
                            Inclure les tâches faites et annulées
                        </label>
                        </FilterSection>
                    )}
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
   Sub-composants (calqués sur client-filter-drawer)
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
