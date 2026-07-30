"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    MODES_PAIEMENT,
    STATUTS_BULLETIN,
    STATUTS_CONTRAT,
    type ModePaiementKey,
    type StatutBulletinKey,
    type StatutContratKey,
} from "@/lib/constants/finance"
import { CheckboxGroup, NumberField, RadioGroup, Section, ToggleRow } from "./depense-filter-drawer"

export interface PaieFiltersState {
    search: string
    statuts: StatutBulletinKey[]
    statutsContrat: StatutContratKey[]
    modesVersement: ModePaiementKey[]
    employeIds: string[]
    salaireBrutMin: number | null
    salaireBrutMax: number | null
    avecPrimes: boolean
    avecRetenues: boolean
}

export const INITIAL_PAIE_FILTERS: PaieFiltersState = {
    search: "",
    statuts: [],
    statutsContrat: [],
    modesVersement: [],
    employeIds: [],
    salaireBrutMin: null,
    salaireBrutMax: null,
    avecPrimes: false,
    avecRetenues: false,
}

export function countActivePaieFilters(s: PaieFiltersState): number {
    let n = 0
    if (s.statuts.length > 0) n += 1
    if (s.statutsContrat.length > 0) n += 1
    if (s.modesVersement.length > 0) n += 1
    if (s.employeIds.length > 0) n += 1
    if (s.salaireBrutMin !== null || s.salaireBrutMax !== null) n += 1
    if (s.avecPrimes || s.avecRetenues) n += 1
    return n
}

interface PaieFilterDrawerProps {
    open: boolean
    onClose: () => void
    filters: PaieFiltersState
    onChange: (next: PaieFiltersState) => void
    availableEmployes: { id: string; name: string }[]
}

export function PaieFilterDrawer({ open, onClose, filters, onChange, availableEmployes }: PaieFilterDrawerProps) {
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

    const update = (patch: Partial<PaieFiltersState>) => onChange({ ...filters, ...patch })
    const reset = () => onChange({ ...INITIAL_PAIE_FILTERS, search: filters.search })
    const toggleArr = <T extends string>(arr: T[], v: T): T[] =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
    const activeCount = countActivePaieFilters(filters)

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
                        <h2 className="font-h2 text-h2 text-primary">Filtres paie</h2>
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
                        title="Statut bulletin"
                        icon="flag"
                        hint={filters.statuts.length === 0 ? "Tous" : `${filters.statuts.length} sélectionné${filters.statuts.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(STATUTS_BULLETIN) as [StatutBulletinKey, { label: string }][]).map(([k, m]) => ({
                                value: k,
                                label: m.label,
                            }))}
                            selected={filters.statuts}
                            onToggle={(v) => update({ statuts: toggleArr(filters.statuts, v as StatutBulletinKey) })}
                        />
                    </Section>

                    <Section
                        title="Type de contrat"
                        icon="badge"
                        hint={filters.statutsContrat.length === 0 ? "Tous" : `${filters.statutsContrat.length} sélectionné${filters.statutsContrat.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(STATUTS_CONTRAT) as [StatutContratKey, { label: string; icon: string }][]).map(([k, m]) => ({
                                value: k,
                                label: m.label,
                                icon: m.icon,
                            }))}
                            selected={filters.statutsContrat}
                            onToggle={(v) => update({ statutsContrat: toggleArr(filters.statutsContrat, v as StatutContratKey) })}
                        />
                    </Section>

                    {availableEmployes.length > 0 && (
                        <Section
                            title="Employé"
                            icon="person"
                            hint={filters.employeIds.length === 0 ? "Tous" : `${filters.employeIds.length} sélectionné${filters.employeIds.length > 1 ? "s" : ""}`}
                        >
                            <CheckboxGroup
                                options={availableEmployes.map((e) => ({ value: e.id, label: e.name }))}
                                selected={filters.employeIds}
                                onToggle={(v) => update({ employeIds: toggleArr(filters.employeIds, v) })}
                            />
                        </Section>
                    )}

                    <Section
                        title="Mode de versement"
                        icon="payments"
                        hint={filters.modesVersement.length === 0 ? "Tous" : `${filters.modesVersement.length} sélectionné${filters.modesVersement.length > 1 ? "s" : ""}`}
                    >
                        <CheckboxGroup
                            options={(Object.entries(MODES_PAIEMENT) as [ModePaiementKey, { label: string; icon: string }][]).map(([k, m]) => ({
                                value: k,
                                label: m.label,
                                icon: m.icon,
                            }))}
                            selected={filters.modesVersement}
                            onToggle={(v) => update({ modesVersement: toggleArr(filters.modesVersement, v as ModePaiementKey) })}
                        />
                    </Section>

                    <Section title="Salaire brut" icon="account_balance_wallet">
                        <div className="grid grid-cols-2 gap-density-tight">
                            <NumberField label="Min (FCFA)" value={filters.salaireBrutMin} onChange={(v) => update({ salaireBrutMin: v })} placeholder="0" />
                            <NumberField label="Max (FCFA)" value={filters.salaireBrutMax} onChange={(v) => update({ salaireBrutMax: v })} placeholder="∞" />
                        </div>
                    </Section>

                    <Section title="Particularités" icon="info">
                        <ToggleRow checked={filters.avecPrimes} onChange={(b) => update({ avecPrimes: b })} label="Avec primes" />
                        <ToggleRow checked={filters.avecRetenues} onChange={(b) => update({ avecRetenues: b })} label="Avec retenues" />
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
