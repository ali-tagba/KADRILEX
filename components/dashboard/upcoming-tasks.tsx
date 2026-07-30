"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { SectionCard } from "./section-card"
import { useSectionData } from "./use-section-data"
import { mockTaches } from "@/lib/mock/audiences"
import { TACHE_STATUTS, TACHE_PRIORITES } from "@/lib/constants/legal"
import { mockMembres } from "@/lib/mock/employes"
import { membreFromText } from "@/lib/mock/membre-bridge"
import { fullName } from "@/lib/constants/team"
import { useCurrentUser } from "@/lib/auth/current-user-context"

interface TacheRow {
    id: string
    titre: string
    echeance: string | null
    statut: string
    priorite: string
    assigneId: string | null
    isLate: boolean
}

const SCROLL_MAX_HEIGHT = 180
const MAX_ROWS = 10

function formatEcheance(iso: string | null, isLate: boolean): { label: string; color: string } {
    if (!iso) return { label: "Sans échéance", color: "text-outline" }
    const d = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const day = new Date(d)
    day.setHours(0, 0, 0, 0)
    const diffDays = Math.round((day.getTime() - today.getTime()) / 86_400_000)
    if (isLate) return { label: `Retard ${Math.abs(diffDays)}j`, color: "text-error font-semibold" }
    if (diffDays === 0) return { label: "Auj.", color: "text-secondary font-semibold" }
    if (diffDays === 1) return { label: "Demain", color: "text-secondary" }
    if (diffDays < 7)
        return {
            label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
            color: "text-on-surface-variant",
        }
    return {
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", ""),
        color: "text-outline",
    }
}

interface UpcomingTasksProps {
    refreshKey?: number
}

export function UpcomingTasks({ refreshKey }: UpcomingTasksProps) {
    const { membre, can } = useCurrentUser()
    /* On lit côté client depuis les mocks pour respecter le filtrage RBAC.
       useSectionData garde sa signature pour l'animation de loading + refresh. */
    const { error, refresh } = useSectionData<unknown>(
        `/api/taches`,
        null,
        refreshKey
    )

    /* `now` figé au mount (évite l'appel impur Date.now() en render) */
    const [now] = useState(() => Date.now())
    /* Source : mocks locaux + filtrage RBAC */
    const allTaches: TacheRow[] = mockTaches
        .filter((t) => t.statut !== "FAIT" && t.statut !== "ANNULE")
        .map((t) => {
            const isLate = !!(t.echeance && new Date(t.echeance).getTime() < now)
            const respId =
                t.responsableId ?? membreFromText(t.assigneA)?.id ?? null
            return {
                id: t.id,
                titre: t.titre,
                echeance: t.echeance,
                statut: t.statut,
                priorite: t.priorite,
                assigneId: respId,
                isLate,
            }
        })

    /* Filtrage par scope OWN si applicable */
    const visible = can("taches.view")
        ? allTaches.filter((row) => {
              const fullTask = mockTaches.find((t) => t.id === row.id)
              if (!fullTask) return false
              return (
                  can("taches.view", {
                      responsableId: fullTask.responsableId,
                      equipeIds: fullTask.equipeIds,
                  }) ||
                  /* Si le scope est ALL, can() renvoie true sans resource — on garde tout */
                  row.assigneId === membre.id
              )
          })
        : []

    /* Tri : retards en haut, puis échéance asc, puis priorité */
    const sorted = [...visible].sort((a, b) => {
        if (a.isLate !== b.isLate) return a.isLate ? -1 : 1
        const aTs = a.echeance ? new Date(a.echeance).getTime() : Infinity
        const bTs = b.echeance ? new Date(b.echeance).getTime() : Infinity
        return aTs - bTs
    })

    const rows = sorted.slice(0, MAX_ROWS)
    const hasMore = sorted.length > MAX_ROWS
    const overdueCount = sorted.filter((r) => r.isLate).length

    return (
        <SectionCard
            title={
                overdueCount > 0
                    ? `Tâches en cours · ${overdueCount} en retard`
                    : `Tâches en cours (${sorted.length})`
            }
            error={error}
            onRetry={refresh}
            actions={
                <Link
                    href="/taches"
                    className="text-primary-container hover:text-accent text-[12px] inline-flex items-center gap-0.5 transition-colors"
                >
                    Voir
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
            }
        >
            {rows.length === 0 ? (
                <p className="font-body-sm text-body-sm text-outline italic px-density-medium py-6 text-center">
                    Aucune tâche en cours dans votre périmètre.
                </p>
            ) : (
                <div
                    className="overflow-y-auto scrollbar-thin"
                    style={{ maxHeight: SCROLL_MAX_HEIGHT }}
                >
                    <ul className="divide-y divide-outline-variant/40">
                        {rows.map((r) => {
                            const stat = TACHE_STATUTS[r.statut as keyof typeof TACHE_STATUTS]
                            const prio =
                                TACHE_PRIORITES[r.priorite as keyof typeof TACHE_PRIORITES]
                            const ech = formatEcheance(r.echeance, r.isLate)
                            const assigne = r.assigneId
                                ? mockMembres.find((m) => m.id === r.assigneId) ?? null
                                : null
                            return (
                                <li
                                    key={r.id}
                                    className="px-density-medium py-2 flex items-center gap-2.5 hover:bg-surface-container-low/40 transition-colors h-12"
                                >
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                            stat?.dot ?? "bg-outline"
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            "font-mono-num text-[10px] tabular-nums w-[78px] flex-shrink-0",
                                            ech.color
                                        )}
                                    >
                                        {ech.label}
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-surface flex-1 truncate">
                                        {r.titre}
                                    </span>
                                    <span
                                        className={cn(
                                            "font-label-caps text-[9px] uppercase tracking-wider whitespace-nowrap",
                                            prio?.chip ?? "text-outline"
                                        )}
                                        title={prio?.label ?? r.priorite}
                                    >
                                        {prio?.label ?? r.priorite}
                                    </span>
                                    {assigne && (
                                        <span
                                            className="font-mono-num text-[10px] text-outline truncate max-w-[100px]"
                                            title={fullName(assigne)}
                                        >
                                            {assigne.prenom.charAt(0)}. {assigne.nom}
                                        </span>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
            {hasMore && (
                <p className="px-density-medium py-1 font-body-xs text-[10px] text-outline italic border-t border-outline-variant/40">
                    + {sorted.length - MAX_ROWS} autres tâches
                </p>
            )}
        </SectionCard>
    )
}
