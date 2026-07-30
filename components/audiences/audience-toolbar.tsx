"use client"

import { cn } from "@/lib/utils"

export type AudienceViewMode = "agenda" | "gallery" | "calendar"

interface AudienceToolbarProps {
    viewMode: AudienceViewMode
    onViewModeChange: (m: AudienceViewMode) => void
    search: string
    onSearchChange: (q: string) => void
    activeFiltersCount: number
    onOpenFilters: () => void
}

const VIEWS: { value: AudienceViewMode; label: string; icon: string }[] = [
    { value: "agenda", label: "Agenda du jour", icon: "today" },
    { value: "gallery", label: "Galerie", icon: "grid_view" },
    { value: "calendar", label: "Calendrier mois", icon: "calendar_month" },
]

export function AudienceToolbar({
    viewMode,
    onViewModeChange,
    search,
    onSearchChange,
    activeFiltersCount,
    onOpenFilters,
}: AudienceToolbarProps) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-tight flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            {/* Toggle 3 vues */}
            <div className="flex bg-surface-container-low border border-outline-variant rounded p-0.5 w-full lg:w-auto overflow-x-auto scrollbar-thin">
                {VIEWS.map((v) => {
                    const isActive = viewMode === v.value
                    return (
                        <button
                            key={v.value}
                            onClick={() => onViewModeChange(v.value)}
                            aria-pressed={isActive}
                            className={cn(
                                "px-3 py-1.5 rounded font-body-sm text-body-sm transition-all flex items-center gap-1.5 whitespace-nowrap",
                                isActive
                                    ? "bg-white shadow-sm text-primary-container font-medium"
                                    : "text-on-surface-variant hover:text-primary-container hover:bg-white/50"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">{v.icon}</span>
                            {v.label}
                        </button>
                    )
                })}
            </div>

            {/* Search + filters */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                        search
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher (dossier, client, juridiction…)"
                        className="w-full h-9 pl-9 pr-3 bg-white border border-outline-variant rounded font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-accent transition-colors"
                    />
                </div>
                <button
                    onClick={onOpenFilters}
                    className={cn(
                        "h-9 px-3 border rounded flex items-center gap-1.5 font-body-sm text-body-sm font-medium transition-colors",
                        activeFiltersCount > 0
                            ? "border-accent/40 bg-accent/10 text-primary"
                            : "border-outline-variant bg-white text-on-surface hover:bg-surface-container-low"
                    )}
                >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    Filtres
                    {activeFiltersCount > 0 && (
                        <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>
        </div>
    )
}
