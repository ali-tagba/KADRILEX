"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { MockClient } from "@/lib/mock/clients"
import { clientDisplayName } from "@/lib/mock/clients"

interface ClientGalleryProps {
    clients: MockClient[]
}

export function ClientGallery({ clients }: ClientGalleryProps) {
    if (clients.length === 0) return null

    return (
        <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter pr-1">
                {clients.map((client) => {
                const name = clientDisplayName(client)
                const isPM = client.type === "PERSONNE_MORALE"
                const isImpaye = client.etatFacturation === "IMPAYE"
                const subline = isPM
                    ? `${client.formeJuridique ?? "Société"} · ${client.numeroClient}`
                    : `${client.profession ?? "Particulier"} · ${client.numeroClient}`

                return (
                    <Link
                        key={client.id}
                        href={`/clients/${client.id}`}
                        className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium hover:bg-surface-container-low transition-colors group flex flex-col"
                    >
                        {/* Top: avatar + chip type */}
                        <div className="flex justify-between items-start mb-density-medium">
                            <div
                                className={cn(
                                    "w-14 h-14 flex items-center justify-center border border-outline-variant flex-shrink-0",
                                    isPM
                                        ? "rounded bg-primary-container"
                                        : "rounded-full bg-tertiary-fixed-dim"
                                )}
                            >
                                <span
                                    className={cn(
                                        "material-symbols-outlined text-[28px]",
                                        isPM ? "text-white" : "text-tertiary"
                                    )}
                                >
                                    {client.iconHint}
                                </span>
                            </div>
                            <span
                                className={cn(
                                    "px-2 py-0.5 rounded text-xs font-body-sm",
                                    isPM
                                        ? "bg-surface-container text-primary-container"
                                        : "border border-accent text-accent"
                                )}
                            >
                                {isPM ? "Société" : "Particulier"}
                            </span>
                        </div>

                        {/* Name + subline */}
                        <div className="mb-density-medium">
                            <h3
                                className="font-h2 text-h2 text-primary group-hover:text-accent transition-colors truncate"
                                title={name}
                            >
                                {name}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">
                                {subline}
                            </p>
                        </div>

                        <div className="border-t border-outline-variant/60 -mx-density-medium mb-density-medium" />

                        {/* Coordonnées */}
                        <div className="space-y-1.5 mb-density-medium flex-1">
                            <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                    mail
                                </span>
                                <span className="font-body-sm text-body-sm truncate text-on-surface group-hover:text-accent transition-colors">
                                    {client.email}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                    phone
                                </span>
                                <span className="font-mono-num text-mono-num text-body-sm">
                                    {client.telephone}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                    location_on
                                </span>
                                <span className="font-body-sm text-body-sm">
                                    {client.ville}, {client.pays}
                                </span>
                            </div>
                        </div>

                        {/* Footer chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-primary-container font-mono-num text-xs">
                                <span className="material-symbols-outlined text-[14px]">
                                    folder_open
                                </span>
                                {client.activeDossiers} {client.activeDossiers > 1 ? "dossiers" : "dossier"}
                            </span>
                            {isImpaye ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFEBEE] text-[#B71C1C] border border-[#FFCDD2] font-body-sm text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#B71C1C]" />
                                    Impayé
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#166534] border border-[#C8E6C9] font-body-sm text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
                                    À jour
                                </span>
                            )}
                        </div>
                    </Link>
                )
            })}
            </div>
        </div>
    )
}
