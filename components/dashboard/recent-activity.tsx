"use client"

import Link from "next/link"
import { SectionCard } from "./section-card"
import { useSectionData } from "./use-section-data"

interface ActivityItem {
    id: string
    type: "CLIENT" | "DOSSIER" | "AUDIENCE" | "INVOICE" | "DOCUMENT"
    label: string
    sublabel: string | null
    href: string
    at: string
}

function formatRelative(iso: string): string {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? "s" : ""}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`
    const days = Math.floor(hours / 24)
    if (days === 1) {
        const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        return `Hier, ${time.replace(":", "h")}`
    }
    if (days < 7) return `Il y a ${days} jours`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

/** Couleur de la pastille : récent (<6h) = accent doré, sinon = primary sépia */
function dotColor(iso: string): string {
    const ageMs = Date.now() - new Date(iso).getTime()
    return ageMs < 6 * 3600 * 1000 ? "bg-accent" : "bg-primary"
}

interface RecentActivityProps {
    refreshKey?: number
}

export function RecentActivity({ refreshKey }: RecentActivityProps) {
    const { data, isLoading, error, refresh } = useSectionData<ActivityItem[]>(
        `/api/dashboard/activity`,
        [],
        refreshKey
    )

    return (
        <SectionCard title="Activité récente" error={error} onRetry={refresh} className="h-full">
            {isLoading ? (
                <div className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            ) : data.length === 0 ? (
                <div className="px-4 py-10 text-center font-body-sm text-body-sm text-on-surface-variant">
                    Aucune activité récente
                </div>
            ) : (
                <div className="p-4">
                    <div className="relative border-l border-outline-variant ml-2 space-y-6">
                        {data.slice(0, 8).map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="relative pl-6 block group"
                            >
                                <span
                                    className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border-2 border-surface-container-lowest ${dotColor(item.at)}`}
                                />
                                <p className="font-body-sm text-body-sm text-on-background group-hover:text-accent transition-colors">
                                    {item.label}
                                </p>
                                <p className="font-mono-num text-mono-num text-xs text-on-surface-variant mt-1">
                                    {formatRelative(item.at)}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </SectionCard>
    )
}
