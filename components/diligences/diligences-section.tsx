"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import {
    DILIGENCE_TYPES,
    DILIGENCE_STATUTS,
} from "@/lib/constants/legal"
import {
    daysUntil,
    type DiligenceFormDraft,
    type DiligenceRecord,
} from "@/lib/types/diligence"
import type { MockDossier } from "@/lib/mock/dossiers"
import type { MockClient } from "@/lib/mock/clients"
import { DiligenceFormDialog } from "@/components/diligences/diligence-form-dialog"

interface DiligencesSectionProps {
    /** Rattachement : fournir l'un OU l'autre selon le contexte (fiche dossier / fiche client) */
    dossier?: MockDossier | null
    client?: MockClient | null
}

/**
 * Section « Diligences » réutilisable, affichée dans la fiche dossier et la fiche client.
 * Charge les diligences liées via /api/diligences?dossierId= ou ?clientId=,
 * permet d'en créer une pré-rattachée et de cocher « accomplie ».
 */
export function DiligencesSection({ dossier, client }: DiligencesSectionProps) {
    const scope: { key: "dossierId" | "clientId"; id: string } | null = dossier
        ? { key: "dossierId", id: dossier.id }
        : client
        ? { key: "clientId", id: client.id }
        : null

    const [diligences, setDiligences] = useState<DiligenceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)

    useEffect(() => {
        if (!scope) {
            setLoading(false)
            return
        }
        let alive = true
        setLoading(true)
        fetch(`/api/diligences?${scope.key}=${encodeURIComponent(scope.id)}`, {
            credentials: "include",
        })
            .then((r) => (r.ok ? (r.json() as Promise<DiligenceRecord[]>) : []))
            .then((list) => {
                if (alive) setDiligences(list)
            })
            .catch(() => {
                if (alive) setDiligences([])
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope?.key, scope?.id])

    const { actives, accomplies } = useMemo(() => {
        const a: DiligenceRecord[] = []
        const done: DiligenceRecord[] = []
        for (const d of diligences) {
            if (d.statut === "ACCOMPLIE" || d.statut === "ANNULEE") done.push(d)
            else a.push(d)
        }
        // Actives triées par échéance (les plus urgentes d'abord, sans échéance en dernier)
        a.sort((x, y) => {
            if (!x.dateEcheance) return 1
            if (!y.dateEcheance) return -1
            return new Date(x.dateEcheance).getTime() - new Date(y.dateEcheance).getTime()
        })
        return { actives: a, accomplies: done }
    }, [diligences])

    function draftToPayload(draft: DiligenceFormDraft) {
        return {
            titre: draft.titre,
            description: draft.description || null,
            type: draft.type,
            statut: draft.statut,
            priorite: draft.priorite,
            dateEcheance: draft.dateEcheance ? new Date(`${draft.dateEcheance}T09:00`).toISOString() : null,
            dossierId: draft.dossierId,
            clientId: draft.clientId,
            audienceId: draft.audienceId,
            responsableId: draft.responsableId,
            equipeIds: draft.equipeIds ?? [],
        }
    }

    async function handleCreate(draft: DiligenceFormDraft) {
        try {
            const res = await fetch("/api/diligences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(draftToPayload(draft)),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const created: DiligenceRecord = await res.json()
            setDiligences((prev) => [created, ...prev])
            setCreateOpen(false)
            toast.success("Diligence créée")
        } catch (e) {
            toast.error("Échec création : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    async function toggleDone(d: DiligenceRecord) {
        const next = d.statut === "ACCOMPLIE" ? "A_FAIRE" : "ACCOMPLIE"
        try {
            const res = await fetch(`/api/diligences/${d.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ statut: next }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const updated: DiligenceRecord = await res.json()
            setDiligences((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
        } catch (e) {
            toast.error("Échec mise à jour : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const total = diligences.length
    const enRetard = actives.filter((d) => {
        const j = daysUntil(d.dateEcheance)
        return j !== null && j < 0
    }).length

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-h2 text-h2 text-primary">Diligences</h2>
                    {total > 0 && (
                        <span className="font-mono-num text-mono-num text-[12px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {actives.length} en cours
                            {enRetard > 0 && (
                                <span className="text-error font-semibold"> · {enRetard} en retard</span>
                            )}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="text-primary font-body-sm text-body-sm font-medium hover:underline inline-flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Nouvelle diligence
                </button>
            </header>

            {loading ? (
                <div className="p-density-loose text-center font-body-sm text-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            ) : total === 0 ? (
                <div className="p-density-loose text-center">
                    <span className="material-symbols-outlined text-[28px] text-outline-variant">checklist</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Aucune diligence pour l&apos;instant
                    </p>
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="mt-2 text-accent font-body-sm text-body-sm font-medium hover:underline"
                    >
                        Ajouter une diligence
                    </button>
                </div>
            ) : (
                <ul className="divide-y divide-outline-variant/50">
                    {actives.map((d) => (
                        <DiligenceRow key={d.id} d={d} onToggle={() => toggleDone(d)} />
                    ))}
                    {accomplies.map((d) => (
                        <DiligenceRow key={d.id} d={d} onToggle={() => toggleDone(d)} />
                    ))}
                </ul>
            )}

            {createOpen && (
                <DiligenceFormDialog
                    presetDossierId={dossier?.id ?? null}
                    presetClientId={!dossier ? client?.id ?? null : null}
                    dossiers={dossier ? [dossier] : []}
                    clients={client ? [client] : []}
                    onSave={handleCreate}
                    onClose={() => setCreateOpen(false)}
                />
            )}
        </section>
    )
}

function DiligenceRow({ d, onToggle }: { d: DiligenceRecord; onToggle: () => void }) {
    const typeMeta = DILIGENCE_TYPES[d.type as keyof typeof DILIGENCE_TYPES] || DILIGENCE_TYPES.AUTRE
    const statutMeta = DILIGENCE_STATUTS[d.statut as keyof typeof DILIGENCE_STATUTS] || DILIGENCE_STATUTS.A_FAIRE
    const isDone = d.statut === "ACCOMPLIE" || d.statut === "ANNULEE"
    const jours = daysUntil(d.dateEcheance)

    let echeanceLabel = "—"
    let echeanceTone = "text-outline"
    if (jours !== null) {
        if (jours < 0) {
            echeanceLabel = `Retard ${Math.abs(jours)}j`
            echeanceTone = "text-error font-semibold"
        } else if (jours === 0) {
            echeanceLabel = "Aujourd'hui"
            echeanceTone = "text-[#f57f17] font-semibold"
        } else if (jours === 1) {
            echeanceLabel = "Demain"
            echeanceTone = "text-[#f57f17]"
        } else if (jours <= 7) {
            echeanceLabel = `Dans ${jours}j`
            echeanceTone = "text-primary-container"
        } else {
            echeanceLabel = new Date(d.dateEcheance!).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
            })
            echeanceTone = "text-on-surface-variant"
        }
    }

    return (
        <li className={cn("px-4 py-2.5 flex items-center gap-3", isDone && "opacity-60")}>
            <button
                type="button"
                onClick={onToggle}
                title={isDone ? "Rouvrir" : "Marquer accomplie"}
                className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    isDone ? "bg-[#166534] border-[#166534] text-white" : "border-outline hover:border-accent"
                )}
            >
                {isDone && <span className="material-symbols-outlined text-[14px]">check</span>}
            </button>

            <span className="material-symbols-outlined text-[18px] text-primary-container flex-shrink-0">
                {typeMeta.icon}
            </span>

            <div className="min-w-0 flex-1">
                <div className={cn("font-body-md text-body-md text-on-surface truncate", isDone && "line-through")}>
                    {d.titre}
                </div>
                <div className="font-body-sm text-[11px] text-outline flex items-center gap-1.5 flex-wrap">
                    <span>{typeMeta.label}</span>
                    {d.dossier && (
                        <>
                            <span className="text-outline-variant">·</span>
                            <Link href={`/dossiers/${d.dossier.id}`} className="text-primary-container hover:underline">
                                {d.dossier.numero}
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <span className={cn("font-body-sm text-[12px] whitespace-nowrap min-w-[72px] text-right", echeanceTone)}>
                {echeanceLabel}
            </span>

            <span className={cn("hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold", statutMeta.chip)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", statutMeta.dot)} />
                {statutMeta.label}
            </span>
        </li>
    )
}
