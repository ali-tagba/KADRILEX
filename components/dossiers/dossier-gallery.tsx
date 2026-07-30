"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { MockDossier } from "@/lib/mock/dossiers"
import { getClientForDossier } from "@/lib/mock/dossiers"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"
import { DOSSIER_STATUTS } from "@/lib/constants/legal"

interface DossierGalleryProps {
    dossiers: MockDossier[]
}

const STATUT_BADGE: Record<string, string> = {
    success: "bg-primary-fixed text-primary",
    warning: "bg-tertiary-fixed-dim text-on-tertiary-fixed-variant",
    error: "bg-error-container text-on-error-container",
    neutral: "bg-primary-fixed-dim text-on-primary-fixed",
    muted: "bg-surface-container text-outline",
}

export function DossierGallery({ dossiers }: DossierGalleryProps) {
    if (dossiers.length === 0) return null

    return (
        <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-density-loose pr-1">
                {dossiers.map((d) => {
                    const client = getClientForDossier(d)
                    const statutMeta = DOSSIER_STATUTS[d.statut]
                    const isClosed = d.statut === "CLOTURE" || d.statut === "TERMINE" || d.statut === "ARCHIVE"

                    // Détection conflit : une partie adverse est aussi cliente
                    const hasConflict = d.partiesAdverses.some((p) =>
                        mockClients.some((c) => clientDisplayName(c) === p)
                    )

                    return (
                        <Link
                            key={d.id}
                            href={`/dossiers/${d.id}`}
                            className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden h-[260px] shadow-[0px_1px_3px_rgba(31,26,20,0.08)] hover:border-primary-container transition-colors"
                        >
                            {/* Header */}
                            <div className="bg-surface-bright px-4 py-3 border-b border-outline-variant flex justify-between items-center flex-shrink-0">
                                <span className="font-mono-num text-mono-num text-on-surface-variant">{d.numero}</span>
                                <span className={cn(
                                    "font-label-caps text-label-caps px-2 py-1 rounded uppercase",
                                    STATUT_BADGE[statutMeta.tone]
                                )}>
                                    {statutMeta.label}
                                </span>
                            </div>

                            {/* Body */}
                            <div className="p-4 flex-1 flex flex-col overflow-hidden">
                                <h3 className="font-h2 text-h2 text-primary-container mb-3 line-clamp-2" title={d.titre}>
                                    {d.titre}
                                </h3>
                                <div className="flex flex-col gap-2 mt-auto">
                                    <Row icon="balance" label={d.juridiction || "Juridiction non précisée"} />
                                    <Row
                                        icon="person"
                                        label={
                                            <>
                                                <strong className="font-medium text-on-surface">Client : </strong>
                                                {client ? clientDisplayName(client) : "Dossier interne"}
                                            </>
                                        }
                                    />
                                    <Row
                                        icon="gavel"
                                        label={
                                            <>
                                                <strong className="font-medium text-on-surface">Nature : </strong>
                                                {d.nature}
                                            </>
                                        }
                                    />
                                </div>
                            </div>

                            {/* Footer chips compteurs */}
                            <div className="px-4 py-3 border-t border-outline-variant bg-surface-bright flex justify-between items-center flex-shrink-0">
                                <div className="flex gap-2">
                                    <CountChip icon="event" value={d.audiences.length} dim={isClosed} />
                                    <CountChip icon="description" value={d.files.length} dim={isClosed} />
                                    <CountChip
                                        icon="payments"
                                        value={d.factures.length}
                                        dim={isClosed}
                                    />
                                </div>
                                {hasConflict && (
                                    <div className="flex items-center gap-1 text-error bg-error-container px-2 py-0.5 rounded font-label-caps text-[10px]">
                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                        CONFLIT
                                    </div>
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

function Row({ icon, label }: { icon: string; label: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[16px] mt-0.5 text-outline">{icon}</span>
            <span className="truncate">{label}</span>
        </div>
    )
}

function CountChip({ icon, value, dim }: { icon: string; value: number; dim?: boolean }) {
    return (
        <div
            className={cn(
                "flex items-center gap-1 text-on-surface-variant font-mono-num text-xs bg-surface-variant px-1.5 py-0.5 rounded",
                dim && "opacity-60"
            )}
        >
            <span className="material-symbols-outlined text-[14px]">{icon}</span>
            {value}
        </div>
    )
}
