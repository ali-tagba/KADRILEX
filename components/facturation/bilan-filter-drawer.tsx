"use client"

import { Section, CheckboxGroup, FilterDrawerShell } from "./depense-filter-drawer"

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
    const toggle = (cat: string) => {
        const next = new Set(activeCats)
        if (next.has(cat)) next.delete(cat)
        else next.add(cat)
        onChange(next)
    }

    const activeCount = categories.filter((c) => activeCats.has(c.categorie) !== defaultCats.has(c.categorie)).length

    return (
        <FilterDrawerShell
            open={open}
            onClose={onClose}
            title="Filtres Bilan"
            activeCount={activeCount}
            onReset={() => onChange(new Set(defaultCats))}
        >
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
        </FilterDrawerShell>
    )
}
