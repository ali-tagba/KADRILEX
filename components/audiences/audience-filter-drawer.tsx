"use client"

import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import { AUDIENCE_NATURES, AUDIENCE_STATUTS, type AudienceNatureKey, type AudienceStatutKey } from "@/lib/constants/legal"

export interface AudienceFilters {
    statuts: Set<AudienceStatutKey>
    natures: Set<AudienceNatureKey>
}

export const INITIAL_AUDIENCE_FILTERS: AudienceFilters = {
    statuts: new Set(),
    natures: new Set(),
}

export function countAudienceFilters(f: AudienceFilters): number {
    return f.statuts.size + f.natures.size
}

interface Props {
    open: boolean
    filters: AudienceFilters
    onChange: (next: AudienceFilters) => void
    onClose: () => void
}

export function AudienceFilterDrawer({ open, filters, onChange, onClose }: Props) {
    useEscapeClose(onClose)
    if (!open) return null

    const toggleStatut = (s: AudienceStatutKey) => {
        const next = new Set(filters.statuts)
        next.has(s) ? next.delete(s) : next.add(s)
        onChange({ ...filters, statuts: next })
    }
    const toggleNature = (n: AudienceNatureKey) => {
        const next = new Set(filters.natures)
        next.has(n) ? next.delete(n) : next.add(n)
        onChange({ ...filters, natures: next })
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} />
            <aside className="relative w-[380px] max-w-full bg-surface h-full overflow-y-auto shadow-xl p-6 space-y-6">
                <header className="flex items-center justify-between">
                    <h2 className="font-h2 text-h2 text-primary">Filtres avancés</h2>
                    <button onClick={onClose} className="text-outline hover:text-on-surface">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <section>
                    <h3 className="font-label-caps text-label-caps text-outline mb-2">Statut</h3>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(AUDIENCE_STATUTS) as AudienceStatutKey[]).map((s) => {
                            const active = filters.statuts.has(s)
                            return (
                                <button
                                    key={s}
                                    onClick={() => toggleStatut(s)}
                                    className={cn(
                                        "px-3 py-1.5 rounded border font-body-sm text-body-sm transition-colors",
                                        active
                                            ? "border-accent bg-accent/15 text-primary"
                                            : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                                    )}
                                >
                                    {AUDIENCE_STATUTS[s].label}
                                </button>
                            )
                        })}
                    </div>
                </section>

                <section>
                    <h3 className="font-label-caps text-label-caps text-outline mb-2">Nature</h3>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(AUDIENCE_NATURES) as AudienceNatureKey[]).map((n) => {
                            const active = filters.natures.has(n)
                            return (
                                <button
                                    key={n}
                                    onClick={() => toggleNature(n)}
                                    className={cn(
                                        "px-3 py-1.5 rounded border font-body-sm text-body-sm transition-colors",
                                        active
                                            ? "border-accent bg-accent/15 text-primary"
                                            : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                                    )}
                                >
                                    {AUDIENCE_NATURES[n].label}
                                </button>
                            )
                        })}
                    </div>
                </section>

                <footer className="flex gap-2 pt-2 border-t border-outline-variant">
                    <button
                        onClick={() => onChange(INITIAL_AUDIENCE_FILTERS)}
                        className="flex-1 px-3 py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container-low font-body-sm text-body-sm"
                    >
                        Réinitialiser
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-3 py-2 rounded bg-primary text-on-primary font-body-sm text-body-sm hover:opacity-90"
                    >
                        Appliquer
                    </button>
                </footer>
            </aside>
        </div>
    )
}
