"use client"

import Link from "next/link"

/**
 * Vue d'ensemble du tableau de bord global.
 *
 * Décision produit (2026-05-05) — pas de chiffres financiers ici :
 *   les métriques d'encaissement / créances n'apparaissent qu'à l'intérieur
 *   du module Finance, où elles sont gated par la permission `finance.view`.
 *   Le dashboard global doit pouvoir s'afficher en présence de tiers (autorité
 *   fiscale, visiteurs) sans exposer les flux d'argent du cabinet.
 */
export interface OverviewData {
    audiencesToday: number
    nextAudience: { id: string; label: string | null; date: string | null; heure: string | null } | null
    activeDossiers: number
    activeDossiersDelta: number
    /** Tâches en cours (statut A_FAIRE + EN_COURS) */
    activeTasksCount?: number
    /** Tâches en retard (échéance passée + non terminée) */
    overdueTasksCount?: number
    /** Clients actifs (= avec dossier en cours) */
    activeClientsCount?: number
    /** Membres équipe actifs */
    activeTeamCount?: number
}

interface MetricStripProps {
    data: OverviewData | null
    isLoading: boolean
}

function formatNextAudience(next: OverviewData["nextAudience"]): string {
    if (!next?.date) return "Aucune programmée"
    const d = new Date(next.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sameDay =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const sameDayAsTomorrow =
        d.getFullYear() === tomorrow.getFullYear() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getDate() === tomorrow.getDate()
    const datePart = sameDay
        ? "Aujourd'hui"
        : sameDayAsTomorrow
            ? "Demain"
            : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
    return next.heure ? `${datePart} · ${next.heure}` : datePart
}

interface CellProps {
    icon: string
    label: string
    value: string
    valueClass?: string
    suffix?: React.ReactNode
    sublabel: string
    href: string
    isLoading: boolean
}

function Cell({ icon, label, value, valueClass, suffix, sublabel, href, isLoading }: CellProps) {
    return (
        <Link
            href={href}
            className="flex-1 p-density-medium flex flex-col justify-center hover:bg-surface-container-low transition-colors"
        >
            <div className="flex items-center gap-2 mb-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                <span className="font-label-caps text-label-caps">{label}</span>
            </div>
            {isLoading ? (
                <div className="h-7 w-24 bg-surface-container-high animate-pulse rounded" />
            ) : (
                <div className="flex items-baseline gap-2">
                    <span
                        className={`font-mono-num text-mono-num text-2xl font-bold ${valueClass ?? "text-primary-container"}`}
                    >
                        {value}
                    </span>
                    {suffix}
                </div>
            )}
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{sublabel}</p>
        </Link>
    )
}

export function MetricStrip({ data, isLoading }: MetricStripProps) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col md:flex-row items-stretch divide-y md:divide-y-0 md:divide-x divide-outline-variant overflow-hidden">
            <Cell
                icon="gavel"
                label="Audiences"
                value={data ? String(data.audiencesToday) : "—"}
                sublabel={
                    data
                        ? `Prochaine : ${formatNextAudience(data.nextAudience)}`
                        : "Chargement…"
                }
                href="/audiences"
                isLoading={isLoading}
            />
            <Cell
                icon="folder_open"
                label="Dossiers actifs"
                value={data ? String(data.activeDossiers) : "—"}
                suffix={
                    data && data.activeDossiersDelta > 0 ? (
                        <span className="font-mono-num text-mono-num text-xs px-1 rounded text-[#166534] bg-[#f0fdf4]">
                            ↑ +{data.activeDossiersDelta}
                        </span>
                    ) : null
                }
                sublabel="Évolution depuis le 1er du mois"
                href="/dossiers"
                isLoading={isLoading}
            />
            <Cell
                icon="task_alt"
                label="Tâches en cours"
                value={data?.activeTasksCount !== undefined ? String(data.activeTasksCount) : "—"}
                valueClass={
                    data && (data.overdueTasksCount ?? 0) > 0 ? "text-error" : undefined
                }
                sublabel={
                    data && (data.overdueTasksCount ?? 0) > 0
                        ? `${data.overdueTasksCount} en retard`
                        : "À jour"
                }
                href="/taches"
                isLoading={isLoading}
            />
            <Cell
                icon="groups"
                label="Équipe"
                value={data?.activeTeamCount !== undefined ? String(data.activeTeamCount) : "—"}
                sublabel={
                    data?.activeClientsCount !== undefined
                        ? `${data.activeClientsCount} clients actifs`
                        : "Membres actifs"
                }
                href="/equipe"
                isLoading={isLoading}
            />
        </div>
    )
}
