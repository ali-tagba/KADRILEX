"use client"

import { cn } from "@/lib/utils"
import { countActiveFilters, type BibliothequeFiltersState, type ViewMode } from "./filters-state"

interface BibliothequeToolbarProps {
    filters: BibliothequeFiltersState
    onSearchChange: (q: string) => void
    onClearSearch: () => void
    onOpenFilters: () => void
    onViewModeChange: (m: ViewMode) => void
}

const VIEWS: { value: ViewMode; label: string; icon: string }[] = [
    { value: "table", label: "Table", icon: "table_rows" },
    { value: "gallery", label: "Galerie", icon: "grid_view" },
    { value: "veille", label: "Veille", icon: "timeline" },
]

export function BibliothequeToolbar({
    filters,
    onSearchChange,
    onClearSearch,
    onOpenFilters,
    onViewModeChange,
}: BibliothequeToolbarProps) {
    const activeCount = countActiveFilters(filters)

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex items-center gap-2 p-density-tight">
            {/* Recherche */}
            <div className="relative flex-1 min-w-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                    search
                </span>
                <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Rechercher (titre, référence, juridiction, tags…)"
                    className="w-full pl-10 pr-9 py-2 bg-transparent border-0 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
                {filters.search && (
                    <button
                        onClick={onClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                        aria-label="Effacer la recherche"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                )}
            </div>

            <div className="h-6 w-px bg-outline-variant" />

            {/* Bouton Filtres */}
            <button
                onClick={onOpenFilters}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded font-body-sm text-body-sm font-medium transition-colors",
                    activeCount > 0
                        ? "bg-accent/10 text-primary border border-accent/30 hover:bg-accent/15"
                        : "text-on-surface-variant hover:bg-surface-container-low border border-transparent"
                )}
                aria-label={activeCount > 0 ? `Filtres actifs (${activeCount})` : "Ouvrir les filtres"}
            >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Filtres</span>
                {activeCount > 0 && (
                    <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                        {activeCount}
                    </span>
                )}
            </button>

            <div className="h-6 w-px bg-outline-variant" />

            {/* Toggle vue (3 boutons icônes) */}
            <div className="flex bg-surface-container-low rounded overflow-hidden border border-outline-variant">
                {VIEWS.map((v, i) => {
                    const isActive = filters.viewMode === v.value
                    return (
                        <button
                            key={v.value}
                            onClick={() => onViewModeChange(v.value)}
                            title={`Vue ${v.label}`}
                            aria-pressed={isActive}
                            className={cn(
                                "p-1.5 transition-colors",
                                i > 0 && "border-l border-outline-variant",
                                isActive
                                    ? "bg-white text-primary-container"
                                    : "text-on-surface-variant hover:bg-white/50 hover:text-primary-container"
                            )}
                        >
                            <span className="material-symbols-outlined text-[18px] block">{v.icon}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
