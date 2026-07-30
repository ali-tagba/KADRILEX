"use client"

import { useState } from "react"
import Link from "next/link"
import { useSectionData } from "@/components/dashboard/use-section-data"
import { MetricStrip, type OverviewData } from "@/components/dashboard/metric-strip"
import { UpcomingAudiences } from "@/components/dashboard/upcoming-audiences"
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks"
import { RecentActivity } from "@/components/dashboard/recent-activity"

const FALLBACK_OVERVIEW: OverviewData = {
    audiencesToday: 0,
    nextAudience: null,
    activeDossiers: 0,
    activeDossiersDelta: 0,
    activeTasksCount: 0,
    overdueTasksCount: 0,
    activeClientsCount: 0,
    activeTeamCount: 0,
}

function formatToday(): string {
    return new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

export default function Dashboard() {
    const [globalRefreshKey, setGlobalRefreshKey] = useState(0)
    const overview = useSectionData<OverviewData>(
        "/api/dashboard/overview",
        FALLBACK_OVERVIEW,
        globalRefreshKey
    )

    const refreshAll = () => setGlobalRefreshKey((k) => k + 1)

    return (
        <>
            {/* Header sticky */}
            <header className="flex-none px-container-margin py-6 flex justify-between items-end border-b border-outline-variant bg-surface-container-lowest z-30">
                <div>
                    <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-1">
                        TABLEAU DE BORD
                    </p>
                    <div className="flex items-baseline gap-4 flex-wrap">
                        <h1 className="font-h1 text-h1 text-primary-container font-serif">
                            Bonjour Maître Kadri
                        </h1>
                        <span className="font-body-sm text-body-sm text-on-surface-variant first-letter:uppercase">
                            {formatToday()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshAll}
                        disabled={overview.isRefreshing}
                        className="px-4 py-2 border border-outline-variant rounded bg-transparent text-primary-container font-body-sm text-body-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <span
                            className={`material-symbols-outlined text-[18px] ${overview.isRefreshing ? "animate-spin" : ""}`}
                        >
                            refresh
                        </span>
                        Tout actualiser
                    </button>
                    <Link
                        href="/dossiers"
                        className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm font-semibold hover:bg-opacity-90 transition-colors flex items-center gap-2 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nouveau dossier
                    </Link>
                </div>
            </header>

            {/* Canvas scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-container-margin">
                {/* Pulse Bar */}
                <div className="mb-gutter">
                    <MetricStrip
                        data={overview.error ? null : overview.data}
                        isLoading={overview.isLoading}
                    />
                </div>

                {/* Grid 12 cols : 8 + 4 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                    <div className="lg:col-span-8 flex flex-col gap-gutter">
                        <UpcomingAudiences refreshKey={globalRefreshKey} />
                        <UpcomingTasks refreshKey={globalRefreshKey} />
                    </div>
                    <div className="lg:col-span-4 flex flex-col gap-gutter">
                        <RecentActivity refreshKey={globalRefreshKey} />
                    </div>
                </div>
            </div>
        </>
    )
}
