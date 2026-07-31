"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { INVITATION_STATUTS, ROLES, ancienneteLabel, fullName } from "@/lib/constants/team"
import type { Membre } from "@prisma/client"
import { computeMembreStats } from "@/lib/mock/membre-stats"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { MembreAvatar } from "./membre-avatar"
import { MembreActionsMenu } from "./membre-actions-menu"

interface MembreGalleryViewProps {
    membres: Membre[]
    canWrite: boolean
    onEdit: (m: Membre) => void
    onInvite: (m: Membre) => void
    onDeactivate: (m: Membre) => void
    onReactivate: (m: Membre) => void
    onDelete: (m: Membre) => void
}

export function MembreGalleryView({
    membres,
    canWrite,
    onEdit,
    onInvite,
    onDeactivate,
    onReactivate,
    onDelete,
}: MembreGalleryViewProps) {
    if (membres.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3">
                    groups
                </span>
                <p className="font-body-md text-body-md text-on-surface font-medium">
                    Aucun membre à afficher
                </p>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter overflow-auto pb-2">
            {membres.map((m) => (
                <MembreCard
                    key={m.id}
                    membre={m}
                    canWrite={canWrite}
                    onEdit={() => onEdit(m)}
                    onInvite={() => onInvite(m)}
                    onDeactivate={() => onDeactivate(m)}
                    onReactivate={() => onReactivate(m)}
                    onDelete={() => onDelete(m)}
                />
            ))}
        </div>
    )
}

function MembreCard({
    membre,
    canWrite,
    onEdit,
    onInvite,
    onDeactivate,
    onReactivate,
    onDelete,
}: {
    membre: Membre
    canWrite: boolean
    onEdit: () => void
    onInvite: () => void
    onDeactivate: () => void
    onReactivate: () => void
    onDelete: () => void
}) {
    const { membre: currentUser, can } = useCurrentUser()
    const role = ROLES[membre.role]
    const invit = INVITATION_STATUTS[membre.invitationStatut]
    const stats = computeMembreStats(membre)
    const showStats = can("equipe.write") || currentUser.id === membre.id
    return (
        <article
            className={cn(
                "bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-[0px_1px_3px_rgba(31,26,20,0.08)] hover:shadow-[0px_2px_8px_rgba(31,26,20,0.12)] transition-shadow",
                !membre.actif && "opacity-70"
            )}
        >
            {/* Bandeau coloré du rôle */}
            <div
                className="h-1 w-full"
                style={{
                    background: `linear-gradient(90deg, ${role.chip
                        .split(" ")[0]
                        .replace("bg-[", "")
                        .replace("]", "")}, transparent)`,
                }}
            />
            <header className="p-density-medium flex items-start gap-3">
                <MembreAvatar membre={membre} size="lg" />
                <div className="min-w-0 flex-1">
                    <Link
                        href={`/equipe/${membre.id}`}
                        className="font-display text-body-md font-semibold text-on-surface hover:text-primary-container transition-colors truncate block"
                    >
                        {fullName(membre)}
                    </Link>
                    <p className="font-body-xs text-[11px] text-outline truncate">
                        {membre.fonction ?? role.label}
                    </p>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase whitespace-nowrap mt-1",
                            role.chip
                        )}
                    >
                        <span className="material-symbols-outlined text-[11px]">{role.icon}</span>
                        {role.labelCourt}
                    </span>
                </div>
                <MembreActionsMenu
                    actif={membre.actif}
                    canWrite={canWrite}
                    onView={() => {
                        window.location.href = `/equipe/${membre.id}`
                    }}
                    onEdit={onEdit}
                    onInvite={onInvite}
                    onDeactivate={onDeactivate}
                    onReactivate={onReactivate}
                    onDelete={onDelete}
                />
            </header>

            {/* Contact */}
            <div className="px-density-medium pb-2 flex flex-col gap-1 text-[11px]">
                <a
                    href={`mailto:${membre.email}`}
                    className="text-on-surface hover:text-primary-container transition-colors truncate inline-flex items-center gap-1"
                    title={membre.email}
                >
                    <span className="material-symbols-outlined text-[12px] text-outline">mail</span>
                    {membre.email}
                </a>
                {membre.telephone && (
                    <a
                        href={`tel:${membre.telephone}`}
                        className="font-mono-num text-outline hover:text-on-surface transition-colors inline-flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[12px]">call</span>
                        {membre.telephone}
                    </a>
                )}
                <span className="font-mono-num text-outline inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">event</span>
                    {ancienneteLabel(membre.dateEmbauche)}
                </span>
            </div>

            {/* Charge stratégique */}
            <div className="mt-auto px-density-medium pb-density-medium pt-2 border-t border-outline-variant/40">
                {showStats ? (
                    <>
                        <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
                            <Stat icon="folder_open" value={stats.dossiersActifs} label="dossiers" />
                            <Stat icon="account_circle" value={stats.clients} label="clients" />
                            <Stat
                                icon="task_alt"
                                value={stats.tachesEnCours}
                                label="tâches"
                                warn={stats.tachesEnRetard > 0}
                            />
                            <Stat icon="gavel" value={stats.audiencesAVenir} label="audiences" />
                        </div>
                    </>
                ) : (
                    <div className="py-3 flex items-center justify-center gap-1 text-outline italic text-[11px]">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        Charge confidentielle
                    </div>
                )}
                <div className="flex items-center justify-between mt-2">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase",
                            invit.chip
                        )}
                    >
                        <span className="material-symbols-outlined text-[10px]">{invit.icon}</span>
                        {invit.label}
                    </span>
                </div>
            </div>
        </article>
    )
}

function Stat({
    icon,
    value,
    label,
    warn = false,
}: {
    icon: string
    value: number
    label: string
    warn?: boolean
}) {
    return (
        <div
            className={cn(
                "rounded p-1 transition-colors",
                warn ? "bg-error-container/40" : "bg-surface-container-low/40"
            )}
            title={`${value} ${label}`}
        >
            <span
                className={cn(
                    "material-symbols-outlined text-[14px] block",
                    warn ? "text-error" : "text-outline"
                )}
            >
                {icon}
            </span>
            <span
                className={cn(
                    "font-mono-num text-[12px] font-semibold block tabular-nums",
                    warn ? "text-error" : "text-on-surface"
                )}
            >
                {value}
            </span>
            <span className="font-label-caps text-[8px] text-outline uppercase block">
                {label}
            </span>
        </div>
    )
}
