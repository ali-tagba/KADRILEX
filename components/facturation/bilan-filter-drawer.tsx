"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Section, CheckboxGroup } from "./depense-filter-drawer"

interface BilanCategorie {
    categorie: string
    label: string
    total: number
}

interface BilanFilterDrawerProps {
    open: boolean
    onClose: () => void
    categories: BilanCategorie[]
    activeCats: Set<string>
    onChange: (next: Set<string>) => void
    /** Catégories affichées par défaut (celles avec un montant sur l'année) — pour le bouton Réinitialiser */
    defaultCats: Set<string>
}

/**
 * Filtre catégories du Bilan — tiroir (pas de pastilles toujours visibles),
 * cohérent avec le pattern établi ailleurs dans Finance (cf. depense-filter-drawer.tsx).
 * Les catégories proposées viennent de la réponse API (dynamiques, pas d'une liste figée) :
 * la liste s'adapte donc automatiquement si le cabinet en ajoute ou en retire.
 */
export function BilanFilterDrawer({ open, onClose, categories, activeCats, onChange, defaultCats }: BilanFilterDrawerProps) {
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

    const toggle = (cat: string) => {
        const next = new Set(activeCats)
        if (next.has(cat)) next.delete(cat)
        else next.add(cat)
        onChange(next)
    }

    const activeCount = categories.filter((c) => activeCats.has(c.categorie) !== defaultCats.has(c.categorie)).length

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
                        <h2 className="font-h2 text-h2 text-primary">Filtres Bilan</h2>
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
                        title="Catégories affichées"
                        icon="category"
                        hint={`${activeCats.size}/${categories.length}`}
                    >
                        <p className="font-body-xs text-body-xs text-outline mb-2 leading-relaxed">
                            Par défaut, seules les catégories avec un montant cette année sont affichées dans le tableau.
                        </p>
                        <CheckboxGroup
                            options={categories.map((c) => ({
                                value: c.categorie,
                                label: c.total > 0 ? c.label : `${c.label} (vide)`,
                            }))}
                            selected={Array.from(activeCats)}
                            onToggle={toggle}
                        />
                    </Section>
                </div>

                <footer className="flex-none flex items-center justify-between gap-3 px-density-loose py-density-medium border-t border-outline-variant bg-surface-container">
                    <button
                        onClick={() => onChange(new Set(defaultCats))}
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
