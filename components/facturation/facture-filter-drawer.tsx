"use client"

import { useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { STATUTS_FACTURE, type StatutFactureKey } from "@/lib/constants/finance"
import { clientDisplayName, type MockClient } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"

export type FactureDatePreset = "ALL" | "CURRENT_MONTH" | "CURRENT_QUARTER" | "CURRENT_YEAR" | "CUSTOM"

export interface FactureFiltersState {
    search: string
    statuts: StatutFactureKey[]
    clientIds: string[]
    dossierIds: string[]
    datePreset: FactureDatePreset
    dateStart: string | null
    dateEnd: string | null
    montantMin: number | null
    montantMax: number | null
}

export const INITIAL_FACTURE_FILTERS: FactureFiltersState = {
    search: "",
    statuts: [],
    clientIds: [],
    dossierIds: [],
    datePreset: "ALL",
    dateStart: null,
    dateEnd: null,
    montantMin: null,
    montantMax: null,
}

export function countActiveFactureFilters(s: FactureFiltersState): number {
    let n = 0
    if (s.statuts.length > 0) n += 1
    if (s.clientIds.length > 0) n += 1
    if (s.dossierIds.length > 0) n += 1
    if (s.datePreset !== "ALL") n += 1
    if (s.montantMin !== null || s.montantMax !== null) n += 1
    return n
}

interface FactureFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: FactureFiltersState
    onChange: (next: FactureFiltersState) => void
    clients: MockClient[]
    dossiers: MockDossier[]
}

export function FactureFilterDrawer({ open, onClose, filters, onChange, clients, dossiers }: FactureFilterDrawerProps) {
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

    const update = (patch: Partial<FactureFiltersState>) => onChange({ ...filters, ...patch })
    const reset = () => onChange({ ...INITIAL_FACTURE_FILTERS, search: filters.search })
    const toggleArr = <T extends string>(arr: T[], v: T): T[] =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
    const activeCount = countActiveFactureFilters(filters)

    const clientsList = useMemo(
        () => clients.map((c) => ({ value: c.id, label: `${clientDisplayName(c)} · ${c.numeroClient}` })),
        [clients]
    )
    const dossiersList = useMemo(
        () => dossiers.map((d) => ({ value: d.id, label: `${d.numero} — ${d.titre}` })),
        [dossiers]
    )

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
                    <Section
                        title="Statut"
                        icon="flag"
                        hint={filters.statuts.length === 0 ? "Tous" : `${filters.statuts.length} sélectionné${filters.statuts.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(STATUTS_FACTURE) as [StatutFactureKey, { label: string }][]).map(
                                ([k, v]) => ({ value: k, label: v.label })
                            )}
                            selected={filters.statuts}
                            onToggle={(v) => update({ statuts: toggleArr(filters.statuts, v as StatutFactureKey) })}
                        />
                    </Section>

                    <Section title="Date d'émission" icon="calendar_today">
                        <RadioRow active={filters.datePreset === "ALL"} onClick={() => update({ datePreset: "ALL" })} label="Toutes les dates" />
                        <RadioRow active={filters.datePreset === "CURRENT_MONTH"} onClick={() => update({ datePreset: "CURRENT_MONTH" })} label="Ce mois" />
                        <RadioRow active={filters.datePreset === "CURRENT_QUARTER"} onClick={() => update({ datePreset: "CURRENT_QUARTER" })} label="Ce trimestre" />
                        <RadioRow active={filters.datePreset === "CURRENT_YEAR"} onClick={() => update({ datePreset: "CURRENT_YEAR" })} label="Cette année" />
                        <RadioRow active={filters.datePreset === "CUSTOM"} onClick={() => update({ datePreset: "CUSTOM" })} label="Période personnalisée" />
                        {filters.datePreset === "CUSTOM" && (
                            <div className="mt-density-tight pl-6 grid grid-cols-2 gap-density-tight">
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Du</label>
                                    <input type="date" value={filters.dateStart ?? ""} onChange={(e) => update({ dateStart: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                </div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Au</label>
                                    <input type="date" value={filters.dateEnd ?? ""} onChange={(e) => update({ dateEnd: e.target.value || null })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40" />
                                </div>
                            </div>
                        )}
                    </Section>

                    <Section title="Montant TTC" icon="payments">
                        <div className="grid grid-cols-2 gap-density-tight">
                            <div>
                                <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Min</label>
                                <input
                                    type="number"
                                    value={filters.montantMin ?? ""}
                                    onChange={(e) => update({ montantMin: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                            <div>
                                <label className="font-label-caps text-label-caps text-outline mb-1 block uppercase">Max</label>
                                <input
                                    type="number"
                                    value={filters.montantMax ?? ""}
                                    onChange={(e) => update({ montantMax: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full px-2 py-1.5 rounded border border-outline-variant bg-white font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Client"
                        icon="group"
                        hint={filters.clientIds.length === 0 ? "Tous" : `${filters.clientIds.length} sélectionné${filters.clientIds.length > 1 ? "s" : ""}`}
                    >
                        <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1 border border-outline-variant rounded p-1.5">
                            <CheckboxGroup
                                options={clientsList}
                                selected={filters.clientIds}
                                onToggle={(v) => update({ clientIds: toggleArr(filters.clientIds, v) })}
                            />
                        </div>
                    </Section>

                    <Section
                        title="Dossier lié"
                        icon="folder"
                        hint={filters.dossierIds.length === 0 ? "Tous" : `${filters.dossierIds.length} sélectionné${filters.dossierIds.length > 1 ? "s" : ""}`}
                    >
                        <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1 border border-outline-variant rounded p-1.5">
                            <CheckboxGroup
                                options={dossiersList}
                                selected={filters.dossierIds}
                                onToggle={(v) => update({ dossierIds: toggleArr(filters.dossierIds, v) })}
                            />
                        </div>
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
