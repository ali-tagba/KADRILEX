"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { patchEntity, showApiError } from "@/lib/api/patch"
import { toast } from "@/components/ui/toaster"
import {
    ROLE_PERMISSIONS,
    type PermissionKey,
    type PermissionScope,
} from "@/lib/constants/team"
import type { Membre } from "@prisma/client"

/**
 * Matrice éditable des permissions d'un membre.
 *
 * Affiche les 17 permissions × 3 scopes (ALL / OWN / NONE) + une 4e option
 * "Hérité du rôle" qui correspond à override absent (null/undefined).
 *
 * Le scope effectif = override si défini, sinon ROLE_PERMISSIONS[role][perm].
 *
 * Seul un ASSOCIE_GERANT peut éditer. Les autres voient en lecture seule.
 */

interface Props {
    membre: Membre
    /** True si l'utilisateur courant peut éditer (ASSOCIE_GERANT) */
    canEdit: boolean
    onChange?: (updated: Membre) => void
}

const PERMISSION_GROUPS: Array<{
    label: string
    icon: string
    perms: Array<{ key: PermissionKey; label: string; hint: string }>
}> = [
    {
        label: "Clients & Dossiers",
        icon: "folder_open",
        perms: [
            { key: "clients.view", label: "Voir les clients", hint: "Liste + fiches clients" },
            { key: "clients.write", label: "Modifier les clients", hint: "Créer, éditer, archiver" },
            { key: "dossiers.view", label: "Voir les dossiers", hint: "Liste + fiches dossiers" },
            { key: "dossiers.write", label: "Modifier les dossiers", hint: "Créer, éditer, archiver" },
        ],
    },
    {
        label: "Activité",
        icon: "event",
        perms: [
            { key: "audiences.view", label: "Voir les audiences", hint: "Agenda + détails" },
            { key: "audiences.write", label: "Modifier les audiences", hint: "Programmer, modifier, annuler" },
            { key: "taches.view", label: "Voir les tâches", hint: "Kanban + liste" },
            { key: "taches.write", label: "Modifier les tâches", hint: "Créer, assigner, terminer" },
        ],
    },
    {
        label: "Bibliothèque",
        icon: "library_books",
        perms: [
            { key: "bibliotheque.view", label: "Voir la bibliothèque", hint: "Documents juridiques" },
            { key: "bibliotheque.write", label: "Modifier la bibliothèque", hint: "Ajouter, modifier, archiver" },
        ],
    },
    {
        label: "Finance",
        icon: "account_balance_wallet",
        perms: [
            { key: "finance.view", label: "Voir la finance", hint: "Factures, paiements, dépenses" },
            { key: "finance.write", label: "Modifier la finance", hint: "Créer factures, enregistrer paiements" },
        ],
    },
    {
        label: "Équipe & Vue d'ensemble",
        icon: "groups",
        perms: [
            { key: "equipe.view", label: "Voir l'équipe", hint: "Annuaire membres" },
            { key: "equipe.write", label: "Modifier l'équipe", hint: "Inviter, désactiver, gérer permissions" },
            { key: "dashboard.global", label: "Dashboard global", hint: "Statistiques cabinet vs personnel" },
        ],
    },
]

const SCOPE_META: Record<PermissionScope | "INHERIT", { label: string; color: string; bg: string; description: string }> = {
    INHERIT: {
        label: "Hérité",
        color: "text-outline",
        bg: "bg-surface-container border-dashed",
        description: "Utilise le défaut du rôle",
    },
    ALL: {
        label: "Tout",
        color: "text-[#166534]",
        bg: "bg-[#e8f5e9] border-[#166534]/30",
        description: "Accès à toutes les entités du cabinet",
    },
    OWN: {
        label: "Mien",
        color: "text-secondary",
        bg: "bg-secondary/10 border-secondary/30",
        description: "Accès uniquement aux entités où il est responsable ou en équipe",
    },
    NONE: {
        label: "Aucun",
        color: "text-error",
        bg: "bg-error-container/40 border-error/30",
        description: "Pas d'accès",
    },
}

export function PermissionsMatrix({ membre, canEdit, onChange }: Props) {
    const initialOverrides = useMemo(
        () => (membre.permissionsOverrides as Record<string, PermissionScope> | null) ?? {},
        [membre.permissionsOverrides]
    )
    const [overrides, setOverrides] = useState<Record<string, PermissionScope>>(initialOverrides)
    const [saving, setSaving] = useState(false)
    const roleDefaults = ROLE_PERMISSIONS[membre.role]

    const hasChanges = useMemo(
        () => JSON.stringify(overrides) !== JSON.stringify(initialOverrides),
        [overrides, initialOverrides]
    )

    const overrideCount = Object.keys(overrides).length

    function setOverride(perm: PermissionKey, scope: PermissionScope | "INHERIT") {
        setOverrides((prev) => {
            const next = { ...prev }
            if (scope === "INHERIT") {
                delete next[perm]
            } else {
                next[perm] = scope
            }
            return next
        })
    }

    async function handleSave() {
        if (!canEdit || saving) return
        setSaving(true)
        try {
            const payload = {
                permissionsOverrides: Object.keys(overrides).length > 0 ? overrides : null,
            }
            const updated = await patchEntity<Membre>(`/api/membres/${membre.id}`, payload)
            onChange?.(updated)
            toast.success("Permissions enregistrées")
        } catch (e) {
            showApiError("Échec sauvegarde permissions")(e)
        } finally {
            setSaving(false)
        }
    }

    function handleReset() {
        setOverrides({})
    }

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="font-h2 text-h2 text-primary inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px] text-accent">
                            shield
                        </span>
                        Permissions effectives
                    </h3>
                    <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                        {canEdit
                            ? "Modifie les permissions par défaut héritées du rôle si nécessaire."
                            : "Lecture seule — seul un Associé Gérant peut modifier."}
                        {overrideCount > 0 && (
                            <span className="ml-1 inline-flex items-center gap-1 text-secondary">
                                · <strong>{overrideCount}</strong> override{overrideCount > 1 ? "s" : ""}
                            </span>
                        )}
                    </p>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        {Object.keys(overrides).length > 0 && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm text-[12px] hover:bg-surface-container-low transition-colors inline-flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                                Tout hériter
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            className="px-3 py-1.5 rounded bg-accent text-white font-body-sm text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity inline-flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {saving ? "progress_activity" : "save"}
                            </span>
                            {saving ? "Sauvegarde…" : "Enregistrer"}
                        </button>
                    </div>
                )}
            </header>

            <div className="px-density-medium py-density-medium space-y-density-medium">
                {/* Légende */}
                <div className="flex flex-wrap gap-2 text-[11px]">
                    {(["INHERIT", "ALL", "OWN", "NONE"] as const).map((s) => (
                        <span
                            key={s}
                            className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded border",
                                SCOPE_META[s].bg,
                                SCOPE_META[s].color
                            )}
                            title={SCOPE_META[s].description}
                        >
                            <strong>{SCOPE_META[s].label}</strong> · {SCOPE_META[s].description}
                        </span>
                    ))}
                </div>

                {/* Groupes de permissions */}
                {PERMISSION_GROUPS.map((group) => (
                    <div
                        key={group.label}
                        className="border border-outline-variant/60 rounded-md overflow-hidden"
                    >
                        <div className="bg-surface-container-low/60 px-3 py-2 border-b border-outline-variant/60 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-outline">
                                {group.icon}
                            </span>
                            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                                {group.label}
                            </h4>
                        </div>
                        <table className="w-full">
                            <tbody>
                                {group.perms.map((p, i) => {
                                    const override = overrides[p.key]
                                    const defaultScope = roleDefaults[p.key]
                                    const effective = override ?? defaultScope
                                    const isOverridden = override !== undefined
                                    return (
                                        <tr
                                            key={p.key}
                                            className={cn(
                                                i < group.perms.length - 1 && "border-b border-outline-variant/40"
                                            )}
                                        >
                                            <td className="px-3 py-2.5 w-1/2">
                                                <p className="font-body-sm text-body-sm text-on-surface font-medium">
                                                    {p.label}
                                                </p>
                                                <p className="font-body-sm text-[11px] text-outline">
                                                    {p.hint}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2.5 w-1/4">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium",
                                                        SCOPE_META[defaultScope].bg,
                                                        SCOPE_META[defaultScope].color
                                                    )}
                                                    title={`Défaut du rôle : ${SCOPE_META[defaultScope].description}`}
                                                >
                                                    Défaut : {SCOPE_META[defaultScope].label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 w-1/4 text-right">
                                                {canEdit ? (
                                                    <ScopeSelector
                                                        value={override ?? "INHERIT"}
                                                        onChange={(v) => setOverride(p.key, v)}
                                                        isOverridden={isOverridden}
                                                    />
                                                ) : (
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold",
                                                            SCOPE_META[effective].bg,
                                                            SCOPE_META[effective].color
                                                        )}
                                                    >
                                                        {SCOPE_META[effective].label}
                                                        {isOverridden && (
                                                            <span
                                                                className="text-[9px] opacity-70"
                                                                title="Override actif"
                                                            >
                                                                *
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </section>
    )
}

function ScopeSelector({
    value,
    onChange,
    isOverridden,
}: {
    value: PermissionScope | "INHERIT"
    onChange: (v: PermissionScope | "INHERIT") => void
    isOverridden: boolean
}) {
    return (
        <div className="inline-flex items-center gap-0 border border-outline-variant rounded overflow-hidden bg-surface">
            {(["INHERIT", "ALL", "OWN", "NONE"] as const).map((s) => {
                const meta = SCOPE_META[s]
                const isActive = value === s
                return (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onChange(s)}
                        title={meta.description}
                        className={cn(
                            "px-2 py-1 font-body-sm text-[10px] font-semibold transition-colors border-r border-outline-variant last:border-r-0",
                            isActive
                                ? cn(meta.bg, meta.color, "border-transparent")
                                : "text-outline hover:bg-surface-container-low"
                        )}
                    >
                        {meta.label}
                    </button>
                )
            })}
            {isOverridden && (
                <span
                    className="px-1 text-[9px] text-secondary bg-secondary/10"
                    title="Override actif — différent du défaut du rôle"
                >
                    *
                </span>
            )}
        </div>
    )
}
