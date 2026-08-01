"use client"

import { useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
    AVOCATS_CABINET,
    DOSSIER_STATUTS,
    DOSSIER_TYPES,
    NATURES_AFFAIRE,
    type AvocatCabinet,
    type DossierStatutKey,
    type DossierTypeKey,
    type NatureAffaire,
} from "@/lib/constants/legal"
import { clientDisplayName, type MockClient } from "@/lib/mock/clients"
import {
    INITIAL_DOSSIER_FILTERS,
    countActiveDossierFilters,
    type DatePreset,
    type DossierFiltersState,
} from "./filters-state"

interface DossierFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: DossierFiltersState
    onChange: (next: DossierFiltersState) => void
    availableYears: string[]
    availableJuridictions: string[]
    clients: MockClient[]
}

export function DossierFilterDrawer({
    open,
    onClose,
    filters,
    onChange,
    availableYears,
    availableJuridictions,
    clients,
}: DossierFilterDrawerProps) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = prev }
    }, [open])

    const update = (patch: Partial<DossierFiltersState>) => onChange({ ...filters, ...patch })

    const reset = () =>
        onChange({ ...INITIAL_DOSSIER_FILTERS, viewMode: filters.viewMode, search: filters.search })

    const toggleType = (t: DossierTypeKey) =>
        update({ types: filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t] })

    const toggleNature = (n: NatureAffaire) =>
        update({ natures: filters.natures.includes(n) ? filters.natures.filter((x) => x !== n) : [...filters.natures, n] })

    const toggleStatut = (st: DossierStatutKey) =>
        update({ statuts: filters.statuts.includes(st) ? filters.statuts.filter((x) => x !== st) : [...filters.statuts, st] })

    const toggleAvocat = (a: AvocatCabinet) =>
        update({ avocats: filters.avocats.includes(a) ? filters.avocats.filter((x) => x !== a) : [...filters.avocats, a] })

    const toggleClient = (cid: string) =>
        update({ clientIds: filters.clientIds.includes(cid) ? filters.clientIds.filter((x) => x !== cid) : [...filters.clientIds, cid] })

    const toggleJuridiction = (j: string) =>
        update({ juridictions: filters.juridictions.includes(j) ? filters.juridictions.filter((x) => x !== j) : [...filters.juridictions, j] })

    const clientsList = useMemo(
        () => clients.map((c) => ({ id: c.id, label: `${clientDisplayName(c)} · ${c.numeroClient}` })),
        [clients]
    )

    const activeCount = countActiveDossierFilters(filters)

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
                aria-label="Filtres avancés"
                aria-modal="true"
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-full max-w-[440px] bg-surface-container-lowest border-l border-outline-variant shadow-2xl",
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
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant" aria-label="Fermer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-loose py-density-medium space-y-density-loose">
                    {/* Catégorie dossier */}
                    <Section title="Catégorie de dossier" icon="folder_managed">
                        <RadioRow active={filters.kind === "ALL"} onClick={() => update({ kind: "ALL" })} label="Tous" />
                        <RadioRow active={filters.kind === "CLIENT"} onClick={() => update({ kind: "CLIENT" })} label="Dossiers client" />
                        <RadioRow active={filters.kind === "ADMIN"} onClick={() => update({ kind: "ADMIN" })} label="Dossiers internes / administratifs" />
                    </Section>

                    {/* Statut */}
                    <Section
                        title="Statut"
                        icon="flag"
                        hint={filters.statuts.length === 0 ? "Tous" : `${filters.statuts.length} sélectionné${filters.statuts.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(DOSSIER_STATUTS) as [DossierStatutKey, { label: string }][]).map(
                                ([k, v]) => ({ value: k, label: v.label })
                            )}
                            selected={filters.statuts}
                            onToggle={(v) => toggleStatut(v as DossierStatutKey)}
                        />
                    </Section>

                    {/* Type de dossier */}
                    <Section
                        title="Type de dossier"
                        icon="category"
                        hint={filters.types.length === 0 ? "Tous" : `${filters.types.length} sélectionné${filters.types.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(DOSSIER_TYPES) as [DossierTypeKey, { label: string }][]).map(
                                ([k, v]) => ({ value: k, label: v.label })
                            )}
                            selected={filters.types}
                            onToggle={(v) => toggleType(v as DossierTypeKey)}
                        />
                    </Section>

                    {/* Nature */}
                    <Section
                        title="Nature de l'affaire"
                        icon="gavel"
                        hint={filters.natures.length === 0 ? "Toutes" : `${filters.natures.length} sélectionnée${filters.natures.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={NATURES_AFFAIRE.map((n) => ({ value: n, label: n }))}
                            selected={filters.natures}
                            onToggle={(v) => toggleNature(v as NatureAffaire)}
                        />
                    </Section>

                    {/* Date d'ouverture */}
                    <Section title="Date d'ouverture" icon="calendar_today">
                        <RadioRow active={filters.datePreset === "ALL"} onClick={() => update({ datePreset: "ALL" })} label="Toutes les dates" />
                        <RadioRow active={filters.datePreset === "CURRENT_MONTH"} onClick={() => update({ datePreset: "CURRENT_MONTH" })} label="Ce mois" />
                        <RadioRow active={filters.datePreset === "CURRENT_QUARTER"} onClick={() => update({ datePreset: "CURRENT_QUARTER" })} label="Ce trimestre" />
                        <RadioRow active={filters.datePreset === "CURRENT_YEAR"} onClick={() => update({ datePreset: "CURRENT_YEAR" })} label="Cette année" />
                        <RadioRow active={filters.datePreset === "YEAR"} onClick={() => update({ datePreset: "YEAR" })} label="Année précise" />
                        <RadioRow active={filters.datePreset === "CUSTOM"} onClick={() => update({ datePreset: "CUSTOM" })} label="Période personnalisée" />

                        {filters.datePreset === "YEAR" && (
                            <div className="mt-density-tight pl-6">
                                <select
                                    value={filters.dateYear ?? ""}
                                    onChange={(e) => update({ dateYear: e.target.value || null })}
                                    className="w-full px-3 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none"
                                >
                                    <option value="">— Sélectionner une année —</option>
                                    {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        {filters.datePreset === "CUSTOM" && (
                            <div className="mt-density-tight pl-6 grid grid-cols-2 gap-density-tight">
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Du</label>
                                    <input type="date" value={filters.dateStart ?? ""} onChange={(e) => update({ dateStart: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none" />
                                </div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Au</label>
                                    <input type="date" value={filters.dateEnd ?? ""} onChange={(e) => update({ dateEnd: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:border-accent focus:outline-none" />
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* Avocat */}
                    <Section
                        title="Avocat en charge"
                        icon="badge"
                        hint={filters.avocats.length === 0 ? "Tous" : `${filters.avocats.length} sélectionné${filters.avocats.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={AVOCATS_CABINET.map((a) => ({ value: a, label: a }))}
                            selected={filters.avocats}
                            onToggle={(v) => toggleAvocat(v as AvocatCabinet)}
                        />
                    </Section>

                    {/* Client */}
                    <Section
                        title="Client lié"
                        icon="group"
                        hint={filters.clientIds.length === 0 ? "Tous" : `${filters.clientIds.length} sélectionné${filters.clientIds.length > 1 ? "s" : ""}`}
                    >
                        <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1 border border-outline-variant rounded p-1.5">
                            <CheckboxGroup
                                options={clientsList.map((c) => ({ value: c.id, label: c.label }))}
                                selected={filters.clientIds}
                                onToggle={toggleClient}
                            />
                        </div>
                    </Section>

                    {/* Juridiction */}
                    <Section
                        title="Juridiction"
                        icon="account_balance"
                        hint={filters.juridictions.length === 0 ? "Toutes" : `${filters.juridictions.length} sélectionnée${filters.juridictions.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={availableJuridictions.map((j) => ({ value: j, label: j }))}
                            selected={filters.juridictions}
                            onToggle={toggleJuridiction}
                        />
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

/* ------------------------------------------------------------------
   Sub-composants partagés
   ------------------------------------------------------------------ */

interface SectionProps { title: string; icon: string; hint?: string; children: React.ReactNode }
function Section({ title, icon, hint, children }: SectionProps) {
    return (
        <section>
            <header className="flex items-center justify-between mb-density-tight">
                <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                    <h3 className="font-label-caps text-label-caps uppercase">{title}</h3>
                </div>
                {hint && <span className="font-body-sm text-[11px] text-outline">{hint}</span>}
            </header>
            <div className="space-y-1">{children}</div>
        </section>
    )
}

interface RadioRowProps { active: boolean; label: string; onClick: () => void }
function RadioRow({ active, label, onClick }: RadioRowProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded font-body-sm text-body-sm text-left transition-colors",
                active ? "bg-accent/10 text-primary font-medium" : "text-on-surface hover:bg-surface-container-low"
            )}
        >
            <span className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", active ? "border-accent" : "border-outline-variant")}>
                {active && <span className="w-2 h-2 rounded-full bg-accent" />}
            </span>
            {label}
        </button>
    )
}

interface CheckboxGroupProps { options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }
function CheckboxGroup({ options, selected, onToggle }: CheckboxGroupProps) {
    return (
        <>
            {options.map((opt) => {
                const checked = selected.includes(opt.value)
                return (
                    <label
                        key={opt.value}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-body-sm text-body-sm transition-colors",
                            checked ? "bg-accent/10 text-primary font-medium" : "text-on-surface hover:bg-surface-container-low"
                        )}
                    >
                        <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            checked ? "bg-accent border-accent text-white" : "bg-white border-outline-variant")}>
                            {checked && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </span>
                        <input type="checkbox" checked={checked} onChange={() => onToggle(opt.value)} className="sr-only" />
                        <span className="truncate">{opt.label}</span>
                    </label>
                )
            })}
        </>
    )
}
