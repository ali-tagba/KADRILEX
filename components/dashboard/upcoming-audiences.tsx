"use client"

import Link from "next/link"
import { SectionCard } from "./section-card"
import { useSectionData } from "./use-section-data"

interface AudienceRow {
    id: string
    date: string
    heure: string | null
    titre: string
    clientName: string
    dossierNumero: string | null
    juridiction: string | null
    statut: string
}

const STATUT_LABEL: Record<string, string> = {
    A_VENIR: "Plaidoirie",
    TERMINEE: "Terminée",
    REPORTEE: "Reportée",
    ANNULEE: "Annulée",
}

/** 3 lignes visibles (3 × 48px) + en-tête sticky (≈ 36px) = 180px ; scroll révèle jusqu'à 10 lignes max */
const SCROLL_MAX_HEIGHT = 180
const MAX_ROWS = 10

function formatDateBadge(iso: string, heure: string | null): string {
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const day = new Date(d)
    day.setHours(0, 0, 0, 0)
    const diffDays = Math.round((day.getTime() - today.getTime()) / 86_400_000)

    let datePart: string
    if (diffDays === 0) datePart = "Auj."
    else if (diffDays === 1) datePart = "Demain"
    else if (diffDays > 0 && diffDays < 7) {
        datePart = d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")
    } else {
        datePart = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "")
    }
    return heure ? `${datePart} ${heure}` : datePart
}

interface UpcomingAudiencesProps {
    refreshKey?: number
}

export function UpcomingAudiences({ refreshKey }: UpcomingAudiencesProps) {
    const { data, isLoading, error, refresh } = useSectionData<AudienceRow[]>(
        `/api/dashboard/audiences?days=30`,
        [],
        refreshKey
    )

    return (
        <SectionCard
            title="Audiences à venir"
            error={error}
            onRetry={refresh}
            actions={
                <Link
                    href="/audiences"
                    className="font-body-sm text-body-sm text-primary-container hover:text-accent transition-colors"
                >
                    Voir tout
                </Link>
            }
        >
            {isLoading ? (
                <div className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            ) : data.length === 0 ? (
                <div className="px-4 py-10 text-center">
                    <span className="material-symbols-outlined text-[32px] text-outline-variant">
                        event_busy
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Aucune audience programmée
                    </p>
                </div>
            ) : (
                <div
                    className="overflow-y-auto overflow-x-auto scrollbar-thin"
                    style={{ maxHeight: SCROLL_MAX_HEIGHT }}
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-surface-container-lowest">
                            <tr className="border-b border-outline-variant">
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal">
                                    Date
                                </th>
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal">
                                    Affaire
                                </th>
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal">
                                    Juridiction
                                </th>
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal">
                                    Statut
                                </th>
                            </tr>
                        </thead>
                        <tbody className="font-body-sm text-body-sm">
                            {data.slice(0, MAX_ROWS).map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors h-[48px]"
                                >
                                    <td className="py-2 px-4">
                                        <span className="inline-block bg-surface-container px-2 py-1 rounded text-primary-container font-mono-num text-mono-num text-xs whitespace-nowrap">
                                            {formatDateBadge(row.date, row.heure)}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4">
                                        <div className="font-medium text-on-background truncate" title={row.titre}>
                                            {row.titre}
                                        </div>
                                        {row.dossierNumero && (
                                            <div className="font-mono-num text-mono-num text-xs text-on-surface-variant">
                                                {row.dossierNumero}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 px-4 text-on-surface-variant">
                                        {row.juridiction || "—"}
                                    </td>
                                    <td className="py-2 px-4">
                                        <span className="inline-block border border-accent text-accent px-2 py-0.5 rounded text-xs">
                                            {STATUT_LABEL[row.statut] ?? row.statut}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    )
}
