"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    INVITATION_STATUTS,
    ROLES,
    ancienneteAnnees,
    fullName,
} from "@/lib/constants/team"
import type { Membre } from "@prisma/client"
import { computeMembreStats } from "@/lib/mock/membre-stats"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { MembreAvatar } from "./membre-avatar"
import { MembreActionsMenu } from "./membre-actions-menu"

interface MembreTableViewProps {
    membres: Membre[]
    canWrite: boolean
    onEdit: (m: Membre) => void
    onInvite: (m: Membre) => void
    onDeactivate: (m: Membre) => void
    onReactivate: (m: Membre) => void
    onDelete: (m: Membre) => void
}

export function MembreTableView({
    membres,
    canWrite,
    onEdit,
    onInvite,
    onDeactivate,
    onReactivate,
    onDelete,
}: MembreTableViewProps) {
    if (membres.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <span className="material-symbols-outlined text-[48px] text-outline-variant mb-3">
                    groups
                </span>
                <p className="font-body-md text-body-md text-on-surface font-medium">
                    Aucun membre à afficher
                </p>
                <p className="font-body-sm text-body-sm text-outline mt-1">
                    Invite un premier collaborateur via le bouton ci-dessus.
                </p>
            </div>
        )
    }
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-auto h-full scrollbar-thin shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-surface-container-low">
                    <tr className="border-b border-outline-variant">
                        <Th width="250px">Identité</Th>
                        <Th width="180px">Rôle &amp; titre</Th>
                        <Th width="200px">Contact</Th>
                        <Th width="250px">Charge stratégique</Th>
                        <Th width="130px" align="right">Statut</Th>
                        <Th width="48px" align="center">⋮</Th>
                    </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm">
                    {membres.map((m) => (
                        <MembreRow
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
                </tbody>
            </table>
        </div>
    )
}

function MembreRow({
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
    const isInvite = membre.invitationStatut === "INVITE"
    const isDeactivated = !membre.actif
    const annees = ancienneteAnnees(membre.dateEmbauche)
    const ancLabel =
        annees === 0 ? "Nouvelle recrue" : `${annees} an${annees > 1 ? "s" : ""} d'expérience`
    /* Charge stratégique visible si on est gérant OU si on regarde sa propre ligne.
       Sinon on n'affiche pas les chiffres (pas d'espionnage entre pairs). */
    const showStats = can("equipe.write") || currentUser.id === membre.id

    return (
        <tr
            className={cn(
                "border-b border-outline-variant last:border-b-0 transition-colors h-12 group",
                isDeactivated
                    ? "bg-surface-container/40 hover:bg-surface-container/60 opacity-70"
                    : isInvite
                    ? "opacity-90 hover:bg-surface-container-highest/50"
                    : "hover:bg-surface-container-highest/50"
            )}
        >
            {/* Identité */}
            <td className="py-2 px-4">
                <Link
                    href={`/equipe/${membre.id}`}
                    className="flex items-center gap-3 group/link"
                >
                    {isInvite ? (
                        <span className="w-8 h-8 rounded-full border border-dashed border-outline-variant bg-surface flex items-center justify-center text-outline flex-shrink-0">
                            <span className="material-symbols-outlined text-[16px]">person</span>
                        </span>
                    ) : (
                        <MembreAvatar membre={membre} size="sm" ring />
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-on-surface group-hover/link:text-primary-container transition-colors truncate">
                            {fullName(membre)}
                        </span>
                        <span className="text-outline text-[11px] truncate">{ancLabel}</span>
                    </div>
                </Link>
            </td>

            {/* Rôle & titre */}
            <td className="py-2 px-4">
                <div className="flex flex-col gap-1 items-start">
                    <span
                        className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap",
                            role.chip
                        )}
                    >
                        {role.label}
                    </span>
                    {membre.fonction && (
                        <span
                            className="text-on-surface-variant truncate w-full text-[11px]"
                            title={membre.fonction}
                        >
                            {membre.fonction}
                        </span>
                    )}
                </div>
            </td>

            {/* Contact */}
            <td className="py-2 px-4">
                <div className="flex flex-col text-on-surface-variant">
                    <a
                        href={`mailto:${membre.email}`}
                        className={cn(
                            "hover:text-primary-container hover:underline truncate w-full text-[12px]",
                            isInvite && "italic"
                        )}
                        title={membre.email}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {membre.email}
                    </a>
                    {isInvite ? (
                        <span className="font-mono-num text-[10px] text-outline mt-0.5">
                            En attente
                        </span>
                    ) : membre.telephone ? (
                        <a
                            href={`tel:${membre.telephone}`}
                            className="font-mono-num text-[11px] text-outline hover:text-on-surface mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {membre.telephone}
                        </a>
                    ) : (
                        <span className="font-mono-num text-[10px] text-outline mt-0.5">—</span>
                    )}
                </div>
            </td>

            {/* Charge stratégique */}
            <td className="py-2 px-4">
                {isInvite ? (
                    <span className="text-outline italic text-[11px]">
                        Aucune charge assignée
                    </span>
                ) : !showStats ? (
                    <span
                        className="inline-flex items-center gap-1 text-outline italic text-[11px]"
                        title="Confidentiel — réservé à l'Associé gérant"
                    >
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        Privé
                    </span>
                ) : (
                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                        <Counter
                            icon="folder_open"
                            value={stats.dossiersActifs}
                            title={`${stats.dossiersActifs} dossier${stats.dossiersActifs > 1 ? "s" : ""} actif${stats.dossiersActifs > 1 ? "s" : ""}`}
                        />
                        <Counter
                            icon="account_circle"
                            value={stats.clients}
                            title={`${stats.clients} client${stats.clients > 1 ? "s" : ""} suivi${stats.clients > 1 ? "s" : ""}`}
                        />
                        <Counter
                            icon="task_alt"
                            value={stats.tachesEnCours}
                            warn={stats.tachesEnRetard > 0}
                            title={
                                stats.tachesEnRetard > 0
                                    ? `${stats.tachesEnCours} tâches dont ${stats.tachesEnRetard} en retard`
                                    : `${stats.tachesEnCours} tâche${stats.tachesEnCours > 1 ? "s" : ""} en cours`
                            }
                        />
                        <Counter
                            icon="gavel"
                            value={stats.audiencesAVenir}
                            title={`${stats.audiencesAVenir} audience${stats.audiencesAVenir > 1 ? "s" : ""} à venir`}
                        />
                    </div>
                )}
            </td>

            {/* Statut invitation */}
            <td className="py-2 px-4 text-right">
                <span
                    className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                        membre.invitationStatut === "ACTIF"
                            ? "bg-[#166534]/10 text-[#166534]"
                            : membre.invitationStatut === "INVITE"
                            ? "bg-surface-container-highest text-on-surface-variant border border-outline-variant"
                            : membre.invitationStatut === "DESACTIVE"
                            ? "bg-surface-container text-outline line-through"
                            : "bg-surface-container-highest text-on-surface-variant"
                    )}
                >
                    {invit.label}
                </span>
                {!membre.actif && membre.dateSortie && (
                    <p className="text-[10px] text-outline mt-0.5">
                        Sortie {new Date(membre.dateSortie).toLocaleDateString("fr-FR")}
                    </p>
                )}
            </td>

            {/* Actions */}
            <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
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
            </td>
        </tr>
    )
}

function Counter({
    icon,
    value,
    warn = false,
    title,
}: {
    icon: string
    value: number
    warn?: boolean
    title: string
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 font-mono-num tabular-nums whitespace-nowrap",
                warn && "text-error font-medium"
            )}
            title={title}
        >
            <span
                className={cn(
                    "material-symbols-outlined text-[14px]",
                    warn ? "text-error" : "text-outline"
                )}
            >
                {icon}
            </span>
            <span className={cn(!warn && "text-on-surface")}>{value}</span>
        </span>
    )
}

function Th({
    children,
    width,
    align = "left",
}: {
    children: React.ReactNode
    width?: string
    align?: "left" | "right" | "center"
}) {
    return (
        <th
            className={cn(
                "font-label-caps text-label-caps text-outline py-3 px-4 font-bold uppercase tracking-wider whitespace-nowrap",
                align === "right" && "text-right pr-6",
                align === "center" && "text-center"
            )}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
