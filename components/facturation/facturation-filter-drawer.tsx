"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    DIRECTIONS_FACTURE,
    MODES_PAIEMENT,
    STATUTS_FACTURE,
    type DirectionFactureKey,
    type ModePaiementKey,
    type StatutFactureKey,
} from "@/lib/constants/finance"
import {
    INITIAL_FACTURE_FILTERS,
    countActiveFactureFilters,
    type DatePreset,
    type FactureFiltersState,
} from "./filters-state"

interface FacturationFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: FactureFiltersState
    onChange: (next: FactureFiltersState) => void
    availableClients: { id: string; name: string }[]
    availableDossiers: { id: string; numero: string }[]
    availableFournisseurs: { id: string; nom: string }[]
}

export function FacturationFilterDrawer({
    open,
    onClose,
    filters,
    onChange,
    availableClients,
    availableDossiers,
    availableFournisseurs,
}: FacturationFilterDrawerProps) {
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

    const update = (patch: Partial<FactureFiltersState>) => onChange({ ...filters, ...patch })
    const reset = () =>
        onChange({ ...INITIAL_FACTURE_FILTERS, viewMode: filters.viewMode, search: filters.search })

    const toggleArr = <T extends string>(arr: T[], v: T): T[] =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

    const activeCount = countActiveFactureFilters(filters)

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
                aria-label="Filtres avancés facturation"
                aria-modal="true"
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-surface-container-lowest border-l border-outline-variant shadow-2xl",
                    "flex flex-col transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full"
                )}
            >
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
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-loose py-density-medium space-y-density-loose">
                    {/* Direction (radio) */}
                    <FilterSection title="Direction" icon="swap_vert">
                        <RadioGroup<DirectionFactureKey | "ALL">
                            value={filters.direction}
                            onChange={(v) => update({ direction: v })}
                            options={[
                                { value: "ALL", label: "Toutes" },
                                ...(Object.entries(DIRECTIONS_FACTURE) as [DirectionFactureKey, { label: string }][]).map(
                                    ([k, m]) => ({ value: k, label: m.label })
                                ),
                            ]}
                        />
                    </FilterSection>

                    {/* Statut (multi) */}
                    <FilterSection
                        title="Statut"
                        icon="flag"
                        hint={filters.statuts.length === 0 ? "Tous statuts" : `${filters.statuts.length} sélectionné${filters.statuts.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(STATUTS_FACTURE) as [StatutFactureKey, { label: string }][]).map(
                                ([k, m]) => ({ value: k, label: m.label })
                            )}
                            selected={filters.statuts}
                            onToggle={(v) => update({ statuts: toggleArr(filters.statuts, v as StatutFactureKey) })}
                        />
                    </FilterSection>

                    {/* Client (multi) */}
                    {availableClients.length > 0 && (
                        <FilterSection
                            title="Client"
                            icon="group"
                            hint={filters.clientIds.length === 0 ? "Tous clients" : `${filters.clientIds.length} sélectionné${filters.clientIds.length > 1 ? "s" : ""}`}
                        >
                            <CheckboxGroup
                                options={availableClients.map((c) => ({ value: c.id, label: c.name }))}
                                selected={filters.clientIds}
                                onToggle={(v) => update({ clientIds: toggleArr(filters.clientIds, v) })}
                            />
                        </FilterSection>
                    )}

                    {/* Dossier (multi) */}
                    {availableDossiers.length > 0 && (
                        <FilterSection
                            title="Dossier"
                            icon="folder"
                            hint={filters.dossierIds.length === 0 ? "Tous dossiers" : `${filters.dossierIds.length} sélectionné${filters.dossierIds.length > 1 ? "s" : ""}`}
                        >
                            <CheckboxGroup
                                options={availableDossiers.map((d) => ({ value: d.id, label: d.numero }))}
                                selected={filters.dossierIds}
                                onToggle={(v) => update({ dossierIds: toggleArr(filters.dossierIds, v) })}
                            />
                        </FilterSection>
                    )}

                    {/* Fournisseur (multi, factures reçues) */}
                    {availableFournisseurs.length > 0 && (
                        <FilterSection
                            title="Fournisseur (reçues)"
                            icon="store"
                            hint={filters.fournisseurIds.length === 0 ? "Tous fournisseurs" : `${filters.fournisseurIds.length} sélectionné${filters.fournisseurIds.length > 1 ? "s" : ""}`}
                        >
                            <CheckboxGroup
                                options={availableFournisseurs.map((f) => ({ value: f.id, label: f.nom }))}
                                selected={filters.fournisseurIds}
                                onToggle={(v) => update({ fournisseurIds: toggleArr(filters.fournisseurIds, v) })}
                            />
                        </FilterSection>
                    )}

                    {/* Mode de paiement (multi) */}
                    <FilterSection
                        title="Mode de paiement"
                        icon="payments"
                        hint={filters.modes.length === 0 ? "Tous modes" : `${filters.modes.length} sélectionné${filters.modes.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(MODES_PAIEMENT) as [ModePaiementKey, { label: string; icon: string }][]).map(
                                ([k, m]) => ({ value: k, label: m.label, icon: m.icon })
                            )}
                            selected={filters.modes}
                            onToggle={(v) => update({ modes: toggleArr(filters.modes, v as ModePaiementKey) })}
                        />
                    </FilterSection>

                    {/* Date émission */}
                    <FilterSection title="Date d'émission" icon="calendar_today">
                        <RadioGroup<DatePreset>
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
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">
                                        Du
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.dateStart ?? ""}
                                        onChange={(e) => update({ dateStart: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm focus:border-accent focus:outline-none"
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
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm focus:border-accent focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </FilterSection>

                    {/* Montant */}
                    <FilterSection title="Montant TTC" icon="payments">
                        <div className="grid grid-cols-2 gap-density-tight">
                            <div>
                                <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Min (FCFA)</label>
                                <input
                                    type="number"
                                    value={filters.montantMin ?? ""}
                                    onChange={(e) => update({ montantMin: e.target.value ? Number(e.target.value) : null })}
                                    placeholder="0"
                                    className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-mono-num text-body-sm focus:border-accent focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Max (FCFA)</label>
                                <input
                                    type="number"
                                    value={filters.montantMax ?? ""}
                                    onChange={(e) => update({ montantMax: e.target.value ? Number(e.target.value) : null })}
                                    placeholder="∞"
                                    className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-mono-num text-body-sm focus:border-accent focus:outline-none"
                                />
                            </div>
                        </div>
                    </FilterSection>

                    {/* Visibilité */}
                    <FilterSection title="Visibilité" icon="visibility">
                        <ToggleRow checked={filters.inclureBrouillons} onChange={(b) => update({ inclureBrouillons: b })} label="Inclure les brouillons" />
                        <ToggleRow checked={filters.inclureAnnulees} onChange={(b) => update({ inclureAnnulees: b })} label="Inclure les annulées" />
                        <ToggleRow checked={filters.refacturablesOnly} onChange={(b) => update({ refacturablesOnly: b })} label="Refacturables uniquement (reçues)" />
                    </FilterSection>
                </div>

                <footer className="flex-none flex items-center justify-between gap-3 px-density-loose py-density-medium border-t border-outline-variant bg-surface-container">
                    <button
                        onClick={reset}
                        className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary underline-offset-2 hover:underline transition-colors"
                    >
                        Réinitialiser
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm font-medium hover:bg-opacity-90 transition-colors active:scale-[0.98]"
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

function FilterSection({
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

function RadioGroup<T extends string>({
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
                        <span
                            className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                isActive ? "border-accent" : "border-outline-variant"
                            )}
                        >
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

function CheckboxGroup({
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
                        <span
                            className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                isChecked ? "bg-accent border-accent text-white" : "bg-white border-outline-variant"
                            )}
                        >
                            {isChecked && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </span>
                        <input type="checkbox" checked={isChecked} onChange={() => onToggle(opt.value)} className="sr-only" />
                        {opt.icon && (
                            <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">{opt.icon}</span>
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
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
            {label}
        </label>
    )
}
