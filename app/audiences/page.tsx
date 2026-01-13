"use client"

import { useState, useEffect } from "react"
import { AudienceFormDialog } from "@/components/audiences/audience-form-dialog"
import { Button } from "@/components/ui/button"
import { AudienceList } from "../../components/audiences/audience-list"
import { AudienceCalendar } from "../../components/audiences/audience-calendar"
import { Plus, LayoutGrid, Calendar as CalendarIcon } from "lucide-react"

export default function AudiencesPage() {
    const [audiences, setAudiences] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
    const [filterStatus, setFilterStatus] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "ARCHIVED">("UPCOMING")
    const [dialogOpen, setDialogOpen] = useState(false)

    const fetchAudiences = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/audiences')
            if (!response.ok) throw new Error('Failed to fetch audiences')
            const data = await response.json()
            setAudiences(data)
        } catch (error) {
            console.error('Error fetching audiences:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAudiences()
    }, [])

    const upcomingCount = audiences.filter(a => a.statut === "A_VENIR").length

    const filteredAudiences = audiences.filter(audience => {
        if (filterStatus === "ALL") return true
        if (filterStatus === "UPCOMING") return audience.statut === "A_VENIR" || audience.statut === "REPORTEE"
        if (filterStatus === "COMPLETED") return audience.statut === "TERMINEE"
        if (filterStatus === "ARCHIVED") return audience.statut === "ANNULEE"
        return true
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-200 border-t-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] gap-4 pb-4">
            {/* Header */}
            <div className="flex-none flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Audiences & Agenda
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            {upcomingCount} audiences à venir
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <CalendarIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Calendrier</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                <span className="hidden sm:inline">Liste</span>
                            </button>
                        </div>

                        <Button
                            size="default"
                            className="shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            onClick={() => setDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nouvelle Audience
                        </Button>
                    </div>
                </div>

                {/* Filters Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar">
                    {[
                        { id: "UPCOMING", label: "À venir" },
                        { id: "COMPLETED", label: "Terminées" },
                        { id: "ARCHIVED", label: "Archivées / Annulées" },
                        { id: "ALL", label: "Tout voir" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={`
                                px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                ${filterStatus === tab.id
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative flex flex-col">
                {viewMode === "calendar" ? (
                    <AudienceCalendar audiences={filteredAudiences} />
                ) : (
                    <AudienceList audiences={filteredAudiences} />
                )}
            </div>

            {/* Audience Form Dialog */}
            <AudienceFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchAudiences}
            />
        </div>
    )
}
