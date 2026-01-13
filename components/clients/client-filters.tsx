"use client"

import { Input } from "@/components/ui/input"
import { Search, Grid, List as ListIcon, Filter } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ClientFiltersProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    typeFilter: "ALL" | "PERSONNE_MORALE" | "PERSONNE_PHYSIQUE"
    setTypeFilter: (type: "ALL" | "PERSONNE_MORALE" | "PERSONNE_PHYSIQUE") => void
    viewMode: "list" | "gallery"
    setViewMode: (mode: "list" | "gallery") => void
}

export function ClientFilters({
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode
}: ClientFiltersProps) {
    return (
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            {/* Left Side: Search & Type Filters */}
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
                {/* Search Input */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Rechercher un client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all w-full"
                    />
                </div>

                {/* Type Filter Tabs (Custom Styled) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto no-scrollbar">
                    {[
                        { label: "Tous", value: "ALL" },
                        { label: "Entreprises", value: "PERSONNE_MORALE" },
                        { label: "Particuliers", value: "PERSONNE_PHYSIQUE" }
                    ].map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setTypeFilter(filter.value as any)}
                            className={`
                                px-4 py-1.5 text-sm font-medium rounded-md transition-all flex-1 md:flex-none whitespace-nowrap
                                ${typeFilter === filter.value
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}
                            `}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side: View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "gallery")}>
                <TabsList className="bg-slate-100">
                    <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                        <ListIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Tableau</span>
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                        <Grid className="h-4 w-4" />
                        <span className="hidden sm:inline">Galerie</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    )
}
