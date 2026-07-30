"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { MockDossier } from "@/lib/mock/dossiers"
import { getClientForDossier } from "@/lib/mock/dossiers"
import {
    DOSSIER_STATUTS,
    DOSSIER_TYPES,
    ETATS_PROCEDURE_SUGGESTIONS,
    NATURES_AFFAIRE,
    type DossierStatutKey,
    type DossierTypeKey,
    type NatureAffaire,
} from "@/lib/constants/legal"
import { clientDisplayName } from "@/lib/mock/clients"
import { TeamPickerCompact } from "@/components/equipe/team-picker"
import { resolveTeam } from "@/lib/mock/membre-bridge"
import {
    InlineComboCell,
    InlineSelectCell,
    InlineTextCell,
    type InlineOption,
} from "@/components/inline"
import { DossierActionsMenu } from "./dossier-actions-menu"

/* Options réutilisables pour les drop-downs de la table */
const STATUT_OPTIONS: InlineOption<DossierStatutKey>[] = (
    Object.entries(DOSSIER_STATUTS) as [DossierStatutKey, { label: string; tone: string }][]
).map(([key, meta]) => ({
    value: key,
    label: meta.label,
}))

const TYPE_OPTIONS: InlineOption<DossierTypeKey>[] = (
    Object.entries(DOSSIER_TYPES) as [DossierTypeKey, { code: string; label: string }][]
).map(([key, meta]) => ({
    value: key,
    label: `${meta.code} — ${meta.label}`,
}))

interface DossierTableProps {
    dossiers: MockDossier[]
    pageSize?: number
}

const STATUT_CHIP: Record<string, string> = {
    success: "bg-[#e8f5e9] text-[#1b5e20]",
    warning: "bg-[#fff8e1] text-[#f57f17]",
    error: "bg-[#ffebee] text-[#c62828]",
    neutral: "bg-surface-container-high text-on-surface-variant",
    muted: "bg-surface-container text-outline",
}

const STATUT_DOT: Record<string, string> = {
    success: "bg-[#4caf50]",
    warning: "bg-[#ffb300]",
    error: "bg-[#e53935]",
    neutral: "bg-on-surface-variant",
    muted: "bg-outline-variant",
}

function formatDateFR(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export function DossierTable({ dossiers, pageSize = 10 }: DossierTableProps) {
    const router = useRouter()
    const [page, setPage] = useState(1)
    /* Overrides locaux : modifs cellule + équipe + suppression masquée — propagés via API plus tard */
    const [overrides, setOverrides] = useState<Record<string, Partial<MockDossier>>>({})
    const [teamOverrides, setTeamOverrides] = useState<
        Record<string, { responsableId: string | null; equipeIds: string[] }>
    >({})
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

    const merged = useMemo(
        () =>
            dossiers
                .filter((d) => !hiddenIds.has(d.id))
                .map((d) => ({ ...d, ...(overrides[d.id] ?? {}) }))
                .sort((a, b) => {
                    const byDate = new Date(a.dateOuverture).getTime() - new Date(b.dateOuverture).getTime()
                    if (byDate !== 0) return byDate
                    const byTitle = a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" })
                    return byTitle !== 0 ? byTitle : a.numero.localeCompare(b.numero, "fr", { numeric: true })
                }),
        [dossiers, overrides, hiddenIds]
    )

    const totalPages = Math.max(1, Math.ceil(merged.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const startIdx = (safePage - 1) * pageSize
    const visible = useMemo(
        () => merged.slice(startIdx, startIdx + pageSize),
        [merged, startIdx, pageSize]
    )

    const patchDossier = (id: string, patch: Partial<MockDossier>) =>
        setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }))

    const getTeam = (d: MockDossier): { responsableId: string | null; equipeIds: string[] } => {
        const o = teamOverrides[d.id]
        if (o) return o
        const client = getClientForDossier(d)
        return resolveTeam(d, client)
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.04)] flex flex-col h-full">
            <div className="flex-1 overflow-auto scrollbar-thin min-h-0">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 z-10 bg-surface-container">
                        <tr className="border-b border-outline-variant">
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold whitespace-nowrap">N° Dossier</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold w-16">Type</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold">Client</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold">Contre</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold">Nature</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold">État procédure</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold w-32">Statut</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold w-40">Équipe</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold text-right whitespace-nowrap w-28">Ouvert le</th>
                            <th className="py-2 px-3 font-label-caps text-label-caps text-on-surface-variant font-semibold sticky right-0 bg-surface-container border-l border-outline-variant z-10 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant">
                        {visible.map((d) => {
                            const client = getClientForDossier(d)
                            const typeMeta = DOSSIER_TYPES[d.type]
                            const statutMeta = DOSSIER_STATUTS[d.statut]
                            const isUrgent = d.statut === "URGENT"
                            return (
                                <tr key={d.id} className={cn(
                                    "hover:bg-surface-container-low transition-colors group h-12",
                                    isUrgent && "bg-primary-container/5"
                                )}>
                                    {/* N° dossier — read-only, lien fiche */}
                                    <td className="py-1 px-3 whitespace-nowrap font-mono-num text-mono-num text-primary">
                                        <Link href={`/dossiers/${d.id}`} className={cn("hover:underline inline-flex items-center gap-1", isUrgent && "font-bold")}>
                                            {d.numero}
                                            <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-60 transition-opacity">
                                                open_in_new
                                            </span>
                                        </Link>
                                    </td>

                                    {/* Type — drop-down inline */}
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                        <InlineSelectCell<DossierTypeKey>
                                            trigger={
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-surface-container-high text-on-surface border border-outline-variant/50 text-[11px] font-medium tracking-wide">
                                                    {typeMeta.code}
                                                    <span className="material-symbols-outlined text-[10px] opacity-60">
                                                        expand_more
                                                    </span>
                                                </span>
                                            }
                                            options={TYPE_OPTIONS}
                                            selected={d.type}
                                            onSelect={(v) => patchDossier(d.id, { type: v })}
                                            menuHeader="Type de dossier"
                                            align="start"
                                        />
                                    </td>

                                    {/* Client — read-only (lien fiche client) */}
                                    <td className="py-1 px-3">
                                        {client ? (
                                            <Link
                                                href={`/clients/${client.id}`}
                                                className="block hover:bg-surface-container-low/50 -mx-1 px-1 rounded transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="font-medium text-on-surface truncate" title={clientDisplayName(client)}>
                                                    {clientDisplayName(client)}
                                                </div>
                                                <div className="text-[11px] text-outline mt-0.5 font-mono-num">{client.numeroClient}</div>
                                            </Link>
                                        ) : (
                                            <span className="text-outline italic text-[12px]">Interne</span>
                                        )}
                                    </td>

                                    {/* Parties adverses — inline text (séparées par virgule) */}
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                        <InlineTextCell
                                            value={d.partiesAdverses.join(", ")}
                                            onChange={(v) =>
                                                patchDossier(d.id, {
                                                    partiesAdverses: v
                                                        .split(",")
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                })
                                            }
                                            placeholder="— Aucune —"
                                            displayClassName="text-on-surface-variant truncate max-w-[200px] block"
                                            title="Modifier (parties séparées par des virgules)"
                                        />
                                    </td>

                                    {/* Nature — combo : suggestions + Autre… */}
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                        <InlineComboCell
                                            value={d.nature}
                                            onChange={(v) =>
                                                patchDossier(d.id, { nature: v as NatureAffaire })
                                            }
                                            options={NATURES_AFFAIRE}
                                            menuHeader="Nature de l'affaire"
                                            triggerClassName="text-on-surface-variant truncate max-w-[180px] block py-0.5 px-1"
                                            title="Cliquer pour choisir la nature (ou saisir une nouvelle)"
                                        />
                                    </td>

                                    {/* État procédure — combo : suggestions + Autre… */}
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                        <InlineComboCell
                                            value={d.etatProcedure ?? ""}
                                            onChange={(v) =>
                                                patchDossier(d.id, { etatProcedure: v || null })
                                            }
                                            options={ETATS_PROCEDURE_SUGGESTIONS}
                                            menuHeader="État de la procédure"
                                            placeholder="—"
                                            triggerClassName="italic text-on-surface-variant truncate max-w-[200px] block py-0.5 px-1"
                                            title="Cliquer pour choisir l'état (ou saisir un nouveau)"
                                            nullable
                                        />
                                    </td>

                                    {/* Statut — drop-down inline */}
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                        <InlineSelectCell<DossierStatutKey>
                                            trigger={
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap",
                                                    STATUT_CHIP[statutMeta.tone]
                                                )}>
                                                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUT_DOT[statutMeta.tone])} />
                                                    {statutMeta.label}
                                                    <span className="material-symbols-outlined text-[10px] opacity-60">
                                                        expand_more
                                                    </span>
                                                </span>
                                            }
                                            options={STATUT_OPTIONS}
                                            selected={d.statut}
                                            onSelect={(v) => patchDossier(d.id, { statut: v })}
                                            menuHeader="Statut du dossier"
                                            align="start"
                                        />
                                    </td>

                                    {/* Équipe */}
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                        <TeamPickerCompact
                                            responsableId={getTeam(d).responsableId}
                                            equipeIds={getTeam(d).equipeIds}
                                            onChange={(next) =>
                                                setTeamOverrides((prev) => ({
                                                    ...prev,
                                                    [d.id]: next,
                                                }))
                                            }
                                            title="Modifier l'équipe du dossier"
                                            size="xs"
                                        />
                                    </td>

                                    {/* Date d'ouverture */}
                                    <td className="py-1 px-3 text-right text-outline whitespace-nowrap font-mono-num text-[12px]">
                                        {formatDateFR(d.dateOuverture)}
                                    </td>

                                    {/* Menu 3 points */}
                                    <td
                                        className={cn(
                                            "py-1 px-2 sticky right-0 border-l border-outline-variant/30 text-center transition-colors z-10",
                                            isUrgent
                                                ? "bg-primary-container/5 group-hover:bg-surface-container-low"
                                                : "bg-surface-container-lowest group-hover:bg-surface-container-low"
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <DossierActionsMenu
                                            onView={() => router.push(`/dossiers/${d.id}`)}
                                            onEdit={() => router.push(`/dossiers/${d.id}?edit=1`)}
                                            onDuplicate={() =>
                                                console.info(`Dupliquer ${d.numero}`)
                                            }
                                            onArchive={() =>
                                                patchDossier(d.id, { statut: "ARCHIVE" })
                                            }
                                            onDelete={async () => {
                                                const prev = hiddenIds
                                                setHiddenIds((s) => new Set(s).add(d.id))
                                                try {
                                                    const r = await fetch(
                                                        `/api/dossiers/${d.id}`,
                                                        { method: "DELETE", credentials: "include" }
                                                    )
                                                    if (!r.ok) {
                                                        const body = await r.json().catch(() => ({}))
                                                        throw new Error(
                                                            body.error ?? `HTTP ${r.status}`
                                                        )
                                                    }
                                                    const body = await r.json().catch(() => ({}))
                                                    const { toast } = await import(
                                                        "@/components/ui/toaster"
                                                    )
                                                    const c = body.cascade
                                                    if (c) {
                                                        const parts = []
                                                        if (c.audiences) parts.push(`${c.audiences} audience${c.audiences > 1 ? "s" : ""}`)
                                                        if (c.taches) parts.push(`${c.taches} tâche${c.taches > 1 ? "s" : ""}`)
                                                        if (c.factures) parts.push(`${c.factures} facture${c.factures > 1 ? "s" : ""}`)
                                                        if (c.files) parts.push(`${c.files} fichier${c.files > 1 ? "s" : ""}`)
                                                        const detail = parts.length > 0 ? ` (${parts.join(", ")})` : ""
                                                        toast.success(`Dossier supprimé${detail}.`)
                                                    } else {
                                                        toast.success("Dossier supprimé.")
                                                    }
                                                } catch (e) {
                                                    setHiddenIds(prev)
                                                    const { toast } = await import(
                                                        "@/components/ui/toaster"
                                                    )
                                                    toast.error(
                                                        "Échec suppression : " +
                                                            (e instanceof Error
                                                                ? e.message
                                                                : "Erreur")
                                                    )
                                                }
                                            }}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex-none flex items-center justify-between mt-0 px-3 py-3 bg-surface-container border-t border-outline-variant font-body-sm text-body-sm text-outline">
                <span>
                    Affichage de {dossiers.length === 0 ? 0 : startIdx + 1}–
                    {Math.min(startIdx + pageSize, dossiers.length)} sur {dossiers.length} dossier
                    {dossiers.length > 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                        className="p-1 rounded hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-primary-container">
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="font-mono-num text-mono-num">{safePage}</span>
                    <span className="px-1 text-outline-variant">/</span>
                    <span className="font-mono-num text-mono-num">{totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                        className="p-1 rounded hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-primary-container">
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
