"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { MockClient } from "@/lib/mock/clients"
import { clientDisplayName } from "@/lib/mock/clients"
import { HONORAIRES_TYPES, type HonorairesType } from "@/lib/constants/legal"
/* HonorairesType est utilisé dans le cast `v as HonorairesType` lors de l'inline select */
import { TeamPickerCompact } from "@/components/equipe/team-picker"
import { membreIdFromAvocatKey } from "@/lib/mock/membre-bridge"
import {
    InlineSelectCell,
    InlineTextCell,
    type InlineOption,
} from "@/components/inline"
import { ClientActionsMenu } from "./client-actions-menu"

interface ClientTableProps {
    clients: MockClient[]
    pageSize?: number
}

/* Suggestions communes — pas obligatoires, l'utilisateur peut taper librement */
const VILLES_NIGER_COMMUNES = [
    "Niamey",
    "Maradi",
    "Zinder",
    "Tahoua",
    "Agadez",
    "Diffa",
    "Dosso",
    "Tillabéri",
] as const

const HONORAIRE_OPTIONS: InlineOption<string>[] = [
    { value: "", label: "— Non défini —" },
    ...HONORAIRES_TYPES.map((h) => ({ value: h, label: h })),
]

function isoDate(iso: string): string {
    return iso.split("T")[0]
}

export function ClientTable({ clients, pageSize = 10 }: ClientTableProps) {
    const router = useRouter()
    const [page, setPage] = useState(1)

    /* Overrides locaux — toutes les cellules éditées en session.
       Quand l'API sera connectée, ces overrides seront propagés via PATCH /api/clients/[id]. */
    const [overrides, setOverrides] = useState<Record<string, Partial<MockClient>>>({})
    const [teamOverrides, setTeamOverrides] = useState<
        Record<string, { responsableId: string | null; equipeIds: string[] }>
    >({})
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

    const merged = useMemo(
        () =>
            clients
                .filter((c) => !hiddenIds.has(c.id))
                .map((c) => ({ ...c, ...(overrides[c.id] ?? {}) }))
                .sort((a, b) => {
                    const byDate = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    if (byDate !== 0) return byDate
                    return clientDisplayName(a).localeCompare(clientDisplayName(b), "fr", { sensitivity: "base" })
                }),
        [clients, overrides, hiddenIds]
    )
    const totalPages = Math.max(1, Math.ceil(merged.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const startIdx = (safePage - 1) * pageSize
    const visible = useMemo(
        () => merged.slice(startIdx, startIdx + pageSize),
        [merged, startIdx, pageSize]
    )

    const patchClient = (id: string, patch: Partial<MockClient>) =>
        setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }))

    /** Composition équipe : override > responsableId stocké > bridge avocatEnCharge */
    const getTeam = (c: MockClient): { responsableId: string | null; equipeIds: string[] } => {
        const o = teamOverrides[c.id]
        if (o) return o
        if (c.responsableId !== null || c.equipeIds.length > 0) {
            return { responsableId: c.responsableId, equipeIds: c.equipeIds }
        }
        return {
            responsableId: membreIdFromAvocatKey(c.avocatEnCharge),
            equipeIds: [],
        }
    }

    /* Suggestions de villes — Notion-like : la datalist est branchée sur les inputs
       via un id partagé. Pour l'instant désactivé en attendant l'extension de
       InlineTextCell (datalist support). Conservé pour Sprint H+ */
    void VILLES_NIGER_COMMUNES

    return (
        <div className="bg-surface-container-lowest border border-[#E8DCC8] rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.04)] flex flex-col h-full">
            <div className="flex-1 overflow-auto scrollbar-thin min-h-0">
                <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-[#FBF7F0] border-b border-[#E8DCC8]">
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase w-28">
                                N° Client
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase w-12 text-center">
                                Type
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase">
                                Nom / Raison sociale
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase">
                                Contact
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase">
                                Ville
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase w-36">
                                Créé le
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase w-52">
                                Équipe
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase w-56">
                                Honoraires
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase text-center w-24">
                                Dossiers
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase w-32">
                                Statut
                            </th>
                            <th className="py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] uppercase text-center w-20 sticky right-0 bg-[#FBF7F0] shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.02)]">
                                ⋮
                            </th>
                        </tr>
                    </thead>
                    <tbody className="font-body-md text-body-md text-on-surface divide-y divide-[#E8DCC8]">
                        {visible.map((client, index) => {
                            const name = clientDisplayName(client)
                            const isPM = client.type === "PERSONNE_MORALE"
                            return (
                                <tr
                                    key={client.id}
                                    className="h-12 hover:bg-[#E8B27D]/10 transition-colors group"
                                >
                                    <td className="py-2 px-4 font-mono-num text-mono-num text-on-surface-variant">
                                        {client.numeroClient}
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                        <div
                                            className={cn(
                                                "w-8 h-8 flex items-center justify-center mx-auto border border-[#E8DCC8]",
                                                isPM
                                                    ? "rounded bg-surface-container-high"
                                                    : "rounded-full bg-surface-container"
                                            )}
                                            title={isPM ? "Personne Morale" : "Personne Physique"}
                                        >
                                            <span
                                                className={cn(
                                                    "material-symbols-outlined text-[18px]",
                                                    isPM ? "text-primary-container" : "text-tertiary"
                                                )}
                                            >
                                                {client.iconHint}
                                            </span>
                                        </div>
                                    </td>
                                    {/* Nom — inline edit + lien fiche au survol */}
                                    <td className="py-2 px-4 font-bold text-primary" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1.5 group/name">
                                            <InlineTextCell
                                                value={name}
                                                onChange={(v) => {
                                                    if (isPM) patchClient(client.id, { raisonSociale: v })
                                                    else {
                                                        /* Heuristique : si "Prénom NOM", on split */
                                                        const parts = v.trim().split(/\s+/)
                                                        if (parts.length >= 2) {
                                                            const lastIdx = parts.length - 1
                                                            patchClient(client.id, {
                                                                prenom: parts.slice(0, lastIdx).join(" "),
                                                                nom: parts[lastIdx],
                                                            })
                                                        } else {
                                                            patchClient(client.id, { nom: v })
                                                        }
                                                    }
                                                }}
                                                displayClassName="text-primary hover:text-accent font-bold"
                                                title="Modifier le nom"
                                            />
                                            <Link
                                                href={`/clients/${client.id}`}
                                                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-outline hover:text-accent"
                                                title="Ouvrir la fiche"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">
                                                    open_in_new
                                                </span>
                                            </Link>
                                        </div>
                                    </td>
                                    {/* Contact — email + tel inline éditables */}
                                    <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col gap-0.5">
                                            <InlineTextCell
                                                value={client.email ?? ""}
                                                onChange={(v) => patchClient(client.id, { email: v || null })}
                                                placeholder="email@…"
                                                displayClassName="text-accent hover:underline text-body-sm"
                                                title="Modifier l'email"
                                            />
                                            <InlineTextCell
                                                value={client.telephone ?? ""}
                                                onChange={(v) => patchClient(client.id, { telephone: v || null })}
                                                placeholder="+227 …"
                                                displayClassName="font-mono-num text-mono-num text-on-surface-variant text-[12px]"
                                                title="Modifier le téléphone"
                                            />
                                        </div>
                                    </td>
                                    {/* Ville — inline text avec datalist (suggestions) */}
                                    <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                                        <InlineTextCell
                                            value={client.ville}
                                            onChange={(v) => patchClient(client.id, { ville: v })}
                                            placeholder="Ville…"
                                            title="Modifier la ville (suggestions disponibles à la frappe)"
                                        />
                                    </td>

                                    {/* Date de création — input date inline */}
                                    <td className="py-2 px-4">
                                        <InlineDate
                                            value={isoDate(client.createdAt)}
                                            onChange={(v) =>
                                                patchClient(client.id, {
                                                    createdAt: new Date(v + "T10:00").toISOString(),
                                                })
                                            }
                                        />
                                    </td>

                                    {/* Équipe affectée — TeamPicker */}
                                    <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                                        <TeamPickerCompact
                                            responsableId={getTeam(client).responsableId}
                                            equipeIds={getTeam(client).equipeIds}
                                            onChange={(next) =>
                                                setTeamOverrides((prev) => ({
                                                    ...prev,
                                                    [client.id]: next,
                                                }))
                                            }
                                            title="Modifier l'équipe affectée"
                                        />
                                    </td>

                                    {/* Honoraires — dropdown */}
                                    <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                                        <InlineSelectCell
                                            trigger={
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded font-body-sm text-[12px]",
                                                        client.honorairesConvenus
                                                            ? "bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant"
                                                            : "bg-surface-container-low text-outline italic"
                                                    )}
                                                >
                                                    {client.honorairesConvenus ?? "— Non défini —"}
                                                    <span className="material-symbols-outlined text-[10px] opacity-60">
                                                        expand_more
                                                    </span>
                                                </span>
                                            }
                                            options={HONORAIRE_OPTIONS}
                                            selected={client.honorairesConvenus ?? ""}
                                            onSelect={(v) =>
                                                patchClient(client.id, {
                                                    honorairesConvenus:
                                                        v === "" ? null : (v as HonorairesType),
                                                })
                                            }
                                            menuHeader="Type d'honoraires"
                                            align="start"
                                        />
                                    </td>

                                    <td className="py-2 px-4 text-center">
                                        {client.activeDossiers > 0 ? (
                                            <Link
                                                href={`/dossiers?clientId=${client.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center justify-center min-w-[24px] h-[24px] rounded bg-surface-container text-primary-container font-mono-num text-mono-num px-1 hover:bg-accent/20 transition-colors"
                                            >
                                                {client.activeDossiers}
                                            </Link>
                                        ) : (
                                            <span className="text-outline-variant text-xs">—</span>
                                        )}
                                    </td>

                                    {/* Statut Actif/Inactif — chip cliquable, toggle direct */}
                                    <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() =>
                                                patchClient(client.id, { actif: !client.actif })
                                            }
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-body-sm text-[12px] border transition-colors",
                                                client.actif
                                                    ? "bg-[#E8F5E9] text-[#166534] border-[#C8E6C9] hover:bg-[#dcedc8]"
                                                    : "bg-surface-container text-outline border-outline-variant hover:bg-surface-container-high line-through"
                                            )}
                                            title={
                                                client.actif
                                                    ? "Cliquer pour marquer comme inactif"
                                                    : "Cliquer pour réactiver"
                                            }
                                        >
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    client.actif ? "bg-[#166534]" : "bg-outline"
                                                )}
                                            />
                                            {client.actif ? "Actif" : "Inactif"}
                                        </button>
                                    </td>

                                    {/* Menu 3 points */}
                                    <td
                                        className="py-2 px-4 text-center sticky right-0 bg-white group-hover:bg-[#fdf9f4] transition-colors shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.02)] border-l border-transparent group-hover:border-[#E8DCC8]/50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ClientActionsMenu
                                            actif={client.actif}
                                            onView={() => router.push(`/clients/${client.id}`)}
                                            onEdit={() => router.push(`/clients/${client.id}?edit=1`)}
                                            onDuplicate={() => {
                                                /* Mock : on signale, la création réelle viendra avec l'API */
                                                console.info(`Dupliquer ${client.numeroClient}`)
                                            }}
                                            onToggleActif={() =>
                                                patchClient(client.id, { actif: !client.actif })
                                            }
                                            onDelete={async () => {
                                                const prev = hiddenIds
                                                setHiddenIds((s) => new Set(s).add(client.id))
                                                try {
                                                    const r = await fetch(
                                                        `/api/clients/${client.id}`,
                                                        { method: "DELETE", credentials: "include" }
                                                    )
                                                    if (!r.ok) {
                                                        const body = await r.json().catch(() => ({}))
                                                        throw new Error(
                                                            body.error ?? `HTTP ${r.status}`
                                                        )
                                                    }
                                                    const result = await r.json().catch(() => ({}))
                                                    const { toast } = await import(
                                                        "@/components/ui/toaster"
                                                    )
                                                    if (result._info) {
                                                        toast.info(result._info)
                                                    } else {
                                                        toast.success("Client supprimé.")
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

            {/* Pagination footer — fixé en bas */}
            <div className="flex-none bg-[#FBF7F0] border-t border-[#E8DCC8] p-3 flex items-center justify-between font-body-sm text-on-surface-variant">
                <span>
                    Affichage de {clients.length === 0 ? 0 : startIdx + 1} à{" "}
                    {Math.min(startIdx + pageSize, clients.length)} sur {clients.length} clients
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="p-1 rounded hover:bg-[#E8DCC8]/30 disabled:opacity-50 disabled:cursor-not-allowed text-primary-container"
                        aria-label="Page précédente"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <span className="font-mono-num text-mono-num">{safePage}</span>
                    <span className="px-1 text-outline-variant">/</span>
                    <span className="font-mono-num text-mono-num">{totalPages}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="p-1 rounded hover:bg-[#E8DCC8]/30 disabled:opacity-50 disabled:cursor-not-allowed text-primary-container"
                        aria-label="Page suivante"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

/**
 * Input date natif HTML stylé sépia — édition inline directe au clic.
 * Affiche aussi la date formatée en FR au survol (tooltip).
 */
interface InlineDateProps {
    value: string // YYYY-MM-DD
    onChange: (value: string) => void
}

function InlineDate({ value, onChange }: InlineDateProps) {
    const formatted = value
        ? new Date(value + "T00:00:00").toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : ""
    return (
        <div className="relative">
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                title={formatted}
                className={cn(
                    "w-full appearance-none cursor-pointer pl-2 pr-7 py-1 rounded border bg-white",
                    "font-mono-num text-mono-num text-[12px] transition-colors",
                    "focus:outline-none focus:border-accent focus:ring-0",
                    "border-[#E8DCC8] text-on-surface hover:border-accent/60",
                    "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-7 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                )}
            />
            <span className="material-symbols-outlined text-[16px] text-outline absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                calendar_today
            </span>
        </div>
    )
}
