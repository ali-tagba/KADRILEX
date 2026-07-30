"use client"

import Link from "next/link"
import { ROLES } from "@/lib/constants/team"
import { useCurrentUser } from "@/lib/auth/current-user-context"

interface NoAccessScreenProps {
    /** Nom du module ou action refusée — ex : "Finance", "Édition de l'équipe" */
    module?: string
    /** Description plus détaillée (optionnel) */
    description?: string
}

export function NoAccessScreen({
    module = "Cette section",
    description,
}: NoAccessScreenProps) {
    const { membre } = useCurrentUser()
    const role = ROLES[membre.role]

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-container-margin py-density-loose">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_1px_3px_rgba(31,26,20,0.08)] max-w-md w-full p-density-loose flex flex-col items-center text-center gap-density-medium">
                <div className="w-16 h-16 rounded-full bg-error-container/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[36px] text-error">
                        lock
                    </span>
                </div>

                <div className="space-y-1">
                    <h1 className="font-h2 text-h2 text-on-surface">Accès refusé</h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {description ?? (
                            <>
                                {module} n&apos;est pas accessible avec votre rôle actuel.
                            </>
                        )}
                    </p>
                </div>

                <div className="bg-surface-container-low border border-outline-variant rounded px-density-medium py-2 flex items-center gap-3 w-full">
                    <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-xs`}
                        style={{
                            backgroundColor:
                                role.chip
                                    .split(" ")[0]
                                    .replace("bg-[", "")
                                    .replace("]", "") || "#7f5533",
                        }}
                    >
                        {membre.prenom.charAt(0)}
                        {membre.nom.charAt(0)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                            {membre.prenom} {membre.nom}
                        </p>
                        <p className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                            {role.label}
                        </p>
                    </div>
                </div>

                <p className="font-body-xs text-[11px] text-outline italic">
                    Demandez à un Associé gérant d&apos;ouvrir l&apos;accès depuis la
                    page Équipe.
                </p>

                <div className="flex gap-2 w-full">
                    <Link
                        href="/"
                        className="flex-1 px-3 py-2 rounded bg-primary-container text-on-primary font-body-sm text-body-sm font-medium hover:bg-primary transition-colors text-center inline-flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">home</span>
                        Tableau de bord
                    </Link>
                    <Link
                        href="/equipe"
                        className="flex-1 px-3 py-2 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low transition-colors text-center"
                    >
                        Équipe
                    </Link>
                </div>
            </div>
        </div>
    )
}
