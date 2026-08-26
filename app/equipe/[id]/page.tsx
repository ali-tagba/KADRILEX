"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { clientDisplayName } from "@/lib/mock/clients"
import { cn } from "@/lib/utils"
import {
    INVITATION_STATUTS,
    ROLES,
    ROLE_PERMISSIONS,
    ancienneteAnnees,
    ancienneteLabel,
    fullName,
} from "@/lib/constants/team"
import { STATUTS_CONTRAT, formatFCFA, MODES_PAIEMENT } from "@/lib/constants/finance"
import { TACHE_STATUTS, AUDIENCE_STATUTS } from "@/lib/constants/legal"
import { MembreAvatar } from "@/components/equipe/membre-avatar"
import { AccesCodeSection } from "@/components/equipe/acces-code-section"
import { PermissionsMatrix } from "@/components/equipe/permissions-matrix"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { PageGate } from "@/components/auth/require-permission"
import type { Membre } from "@prisma/client"
import type { RoleKey, InvitationStatutKey } from "@/lib/constants/team"

interface PageProps {
    params: Promise<{ id: string }>
}

export default function MembreFichePage({ params }: PageProps) {
    const { id } = use(params)
    const [membre, setMembre] = useState<Membre | null>(null)
    const [stats, setStats] = useState<any | null>(null)
    const [activity, setActivity] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFoundFlag, setNotFoundFlag] = useState(false)

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch(`/api/membres/${id}`, { credentials: "include" }).then(async (r) => {
                if (r.status === 404) return null
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return (await r.json()) as Membre
            }),
            fetch(`/api/membres/${id}/activity`, { credentials: "include" }).then(async (r) => {
                if (r.status === 404) return null
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return (await r.json())
            })
        ])
            .then(([membreData, activityData]) => {
                if (!alive) return
                if (!membreData) {
                    setNotFoundFlag(true)
                } else {
                    setMembre(membreData)
                    if (activityData) {
                        setStats(activityData.stats)
                        setActivity(activityData.activity)
                    }
                }
            })
            .catch(() => {
                if (alive) setNotFoundFlag(true)
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [id])

    const { membre: currentUser, can } = useCurrentUser()

    const handleRegenerateCode = (newCode: string, generatedAt: string) => {
        setMembre((m: any) =>
            m
                ? {
                      ...m,
                      codeAcces: newCode,
                      codeAccesGeneAt: generatedAt,
                      updatedAt: new Date().toISOString(),
                  }
                : m
        )
    }

    if (notFoundFlag) notFound()
    if (loading || !membre || !stats || !activity) {
        return (
            <div className="flex-1 overflow-y-auto p-container-margin">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            </div>
        )
    }

    const isSelf = currentUser.id === membre.id
    /* On peut voir le code si on est gérant (equipe.write) ou s'il s'agit de sa
       propre fiche. Salaire et matrice permissions soumis aux mêmes règles. */
    const canSeeAccessCode = can("equipe.write") || isSelf
    const canSeeFinancialInfo = can("equipe.write") || isSelf

    const role = ROLES[membre.role as RoleKey]
    const invit = INVITATION_STATUTS[membre.invitationStatut as InvitationStatutKey]
    const permissions = ROLE_PERMISSIONS[membre.role as RoleKey]
    const annees = ancienneteAnnees(membre.dateEmbauche)

    return (
        <PageGate perm="equipe.view" moduleName="Équipe">
        <div className="flex flex-col h-full overflow-hidden px-container-margin pt-container-margin pb-density-medium">
            {/* Breadcrumb compact */}
            <nav className="flex-shrink-0 flex items-center gap-1.5 mb-density-tight font-body-xs text-[11px] text-outline">
                <Link href="/equipe" className="hover:text-on-surface transition-colors inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">arrow_back</span>
                    Équipe
                </Link>
                <span>/</span>
                <span className="text-on-surface-variant">{fullName(membre)}</span>
            </nav>

            {/* Header membre : compact, identité gauche + chips à droite */}
            <header className="flex-shrink-0 bg-surface-container-lowest border border-outline-variant rounded-lg px-density-medium py-density-medium mb-density-tight flex items-center gap-density-medium flex-wrap">
                <MembreAvatar membre={membre} size="xl" />
                <div className="min-w-0 flex-1">
                    <h1 className="font-h2 text-h2 text-primary-container leading-tight truncate">
                        {fullName(membre)}
                    </h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {membre.fonction ?? role.label}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase whitespace-nowrap",
                                role.chip
                            )}
                        >
                            <span className="material-symbols-outlined text-[12px]">{role.icon}</span>
                            {role.label}
                        </span>
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase whitespace-nowrap",
                                invit.chip
                            )}
                        >
                            <span className="material-symbols-outlined text-[12px]">{invit.icon}</span>
                            {invit.label}
                        </span>
                        {!membre.actif && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-[10px] uppercase">
                                Archivé
                            </span>
                        )}
                    </div>
                </div>
                {/* Chips infos clés */}
                <div className="flex flex-col gap-1 text-right text-[11px] text-on-surface-variant">
                    <span className="inline-flex items-center justify-end gap-1">
                        <span className="material-symbols-outlined text-[14px] text-outline">event</span>
                        Embauché·e {ancienneteLabel(membre.dateEmbauche)}
                    </span>
                    <span className="inline-flex items-center justify-end gap-1">
                        <span className="material-symbols-outlined text-[14px] text-outline">work</span>
                        {STATUTS_CONTRAT[membre.statutContrat].label}
                    </span>
                    {membre.derniereConnexion && (
                        <span className="inline-flex items-center justify-end gap-1 text-outline">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Dernière connexion{" "}
                            {new Date(membre.derniereConnexion).toLocaleDateString("fr-FR")}
                        </span>
                    )}
                </div>
            </header>

            {/* Stats stratégiques en bandeau */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-gutter mb-density-tight flex-shrink-0">
                <StatCard
                    icon="folder_open"
                    label="Dossiers"
                    value={`${stats.dossiersActifs}/${stats.dossiers}`}
                    sub={`${stats.dossiersActifs} actifs`}
                    href="#dossiers"
                />
                <StatCard
                    icon="account_circle"
                    label="Clients"
                    value={String(stats.clients)}
                    sub="suivis"
                    href="#clients"
                />
                <StatCard
                    icon="task_alt"
                    label="Tâches"
                    value={`${stats.tachesEnCours}/${stats.tachesTotal}`}
                    sub={
                        stats.tachesEnRetard > 0
                            ? `${stats.tachesEnRetard} en retard`
                            : "à jour"
                    }
                    tone={stats.tachesEnRetard > 0 ? "error" : "default"}
                    href="#taches"
                />
                <StatCard
                    icon="gavel"
                    label="Audiences"
                    value={String(stats.audiencesAVenir)}
                    sub={`${stats.audiencesTotal} au total`}
                    href="#audiences"
                />
                <StatCard
                    icon="bolt"
                    label="Charge"
                    value={`${stats.chargePct}%`}
                    sub={
                        stats.chargePct >= 80
                            ? "saturée"
                            : stats.chargePct >= 50
                            ? "soutenue"
                            : "stable"
                    }
                    tone={
                        stats.chargePct >= 80
                            ? "error"
                            : stats.chargePct >= 50
                            ? "warning"
                            : "success"
                    }
                />
            </div>

            {/* Contenu : 2 colonnes (gauche : profil + permissions, droite : activité scrollable) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-gutter overflow-hidden">
                {/* Col gauche */}
                <div className="lg:col-span-5 flex flex-col gap-gutter min-h-0 overflow-y-auto scrollbar-thin pr-1">
                    {/* Profil */}
                    <Section title="Profil" icon="badge">
                        <KV label="Email">
                            <a
                                href={`mailto:${membre.email}`}
                                className="text-on-surface hover:text-primary-container transition-colors"
                            >
                                {membre.email}
                            </a>
                        </KV>
                        {membre.telephone && (
                            <KV label="Téléphone">
                                <a
                                    href={`tel:${membre.telephone}`}
                                    className="font-mono-num text-on-surface hover:text-primary-container"
                                >
                                    {membre.telephone}
                                </a>
                            </KV>
                        )}
                        <KV label="Date d'embauche">
                            <span className="font-mono-num">
                                {new Date(membre.dateEmbauche).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>{" "}
                            <span className="text-outline">
                                · {annees} an{annees > 1 ? "s" : ""}
                            </span>
                        </KV>
                        {membre.dateSortie && (
                            <KV label="Date de sortie">
                                <span className="font-mono-num text-error">
                                    {new Date(membre.dateSortie).toLocaleDateString("fr-FR", {
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                                {membre.motifSortie && (
                                    <span className="text-outline ml-1">· {membre.motifSortie}</span>
                                )}
                            </KV>
                        )}
                        <KV label="Statut contrat">
                            {STATUTS_CONTRAT[membre.statutContrat].label}
                        </KV>
                    </Section>

                    {/* Paie — visible si gérant ou si c'est sa propre fiche */}
                    {canSeeFinancialInfo && (
                    <Section title="Paie" icon="payments">
                        <KV label="Salaire de base brut">
                            <span className="font-mono-num text-on-surface font-semibold">
                                {formatFCFA(membre.salaireBaseBrut)}
                            </span>
                            <span className="text-outline ml-1">/ mois</span>
                        </KV>
                        <KV label="Mode de versement">
                            {MODES_PAIEMENT[membre.modeVersementParDefaut].label}
                        </KV>
                        {membre.rib && (
                            <KV label="RIB">
                                <span className="font-mono-num text-[11px]">{membre.rib}</span>
                            </KV>
                        )}
                        {membre.banque && <KV label="Banque">{membre.banque}</KV>}
                        {membre.mobileMoney && (
                            <KV label="Mobile Money">
                                <span className="font-mono-num">{membre.mobileMoney}</span>
                            </KV>
                        )}
                        <div className="pt-2 mt-2 border-t border-outline-variant/40">
                            <Link
                                href={`/facturation?tab=paie`}
                                className="text-primary-container hover:text-accent text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                Voir les bulletins de paie
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                        </div>
                    </Section>
                    )}

                    {/* Code d'accès — visible uniquement par le membre lui-même ou un gérant */}
                    {canSeeAccessCode && (
                        <AccesCodeSection membre={membre} onRegenerate={handleRegenerateCode} />
                    )}

                    {/* Permissions complètes — matrice éditable par le Gérant */}
                    <PermissionsMatrix
                        membre={membre}
                        canEdit={can("equipe.write")}
                        onChange={(updated) => setMembre(updated)}
                    />

                    {membre.notes && (
                        <Section title="Notes internes" icon="sticky_note_2">
                            <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">
                                {membre.notes}
                            </p>
                        </Section>
                    )}
                </div>

                {/* Col droite : activité */}
                <div className="lg:col-span-7 flex flex-col gap-gutter min-h-0 overflow-y-auto scrollbar-thin pr-1">
                    <Section title="Clients suivis" icon="account_circle" id="clients" count={activity.clients.length}>
                        {activity.clients.length === 0 ? (
                            <Empty text="Aucun client rattaché" />
                        ) : (
                            <ul className="divide-y divide-outline-variant/50">
                                {activity.clients.map((c: any) => (
                                    <li key={c.id} className="py-1.5">
                                        <Link
                                            href={`/clients/${c.id}`}
                                            className="flex items-center gap-2 hover:text-primary-container transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px] text-outline">
                                                {c.type === "PERSONNE_MORALE" ? "storefront" : "person"}
                                            </span>
                                            <span className="font-body-sm text-body-sm text-on-surface flex-1 truncate">
                                                {clientDisplayName(c)}
                                            </span>
                                            <span className="font-mono-num text-[10px] text-outline">
                                                {c.numeroClient}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section title="Dossiers" icon="folder_open" id="dossiers" count={activity.dossiers.length}>
                        {activity.dossiers.length === 0 ? (
                            <Empty text="Aucun dossier rattaché" />
                        ) : (
                            <ul className="divide-y divide-outline-variant/50">
                                {activity.dossiers.slice(0, 10).map((d: any) => (
                                    <li key={d.id} className="py-1.5">
                                        <Link
                                            href={`/dossiers/${d.id}`}
                                            className="flex items-center gap-2 hover:text-primary-container transition-colors"
                                        >
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                    d.statut === "EN_COURS"
                                                        ? "bg-accent"
                                                        : d.statut === "ARCHIVE"
                                                        ? "bg-outline"
                                                        : "bg-outline-variant"
                                                )}
                                            />
                                            <span className="font-mono-num text-[11px] text-outline">
                                                {d.numero}
                                            </span>
                                            <span className="font-body-sm text-body-sm text-on-surface flex-1 truncate">
                                                {d.titre}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                                {activity.dossiers.length > 10 && (
                                    <li className="py-1.5 font-body-xs text-[11px] text-outline italic">
                                        + {activity.dossiers.length - 10} autres dossiers
                                    </li>
                                )}
                            </ul>
                        )}
                    </Section>

                    <Section
                        title="Audiences"
                        icon="gavel"
                        id="audiences"
                        count={activity.audiences.length}
                    >
                        {activity.audiences.length === 0 ? (
                            <Empty text="Aucune audience rattachée" />
                        ) : (
                            <ul className="divide-y divide-outline-variant/50">
                                {activity.audiences.slice(0, 8).map((a: any) => {
                                    const stat = AUDIENCE_STATUTS[a.statut as keyof typeof AUDIENCE_STATUTS]
                                    const isFuture =
                                        new Date(a.dateDebut).getTime() >= activity.ref.getTime()
                                    return (
                                        <li key={a.id} className="py-1.5">
                                            <Link
                                                href={`/audiences/${a.id}`}
                                                className="flex items-center gap-2 hover:text-primary-container transition-colors"
                                            >
                                                <span
                                                    className={cn(
                                                        "font-mono-num text-[10px] tabular-nums w-[90px] flex-shrink-0",
                                                        isFuture ? "text-on-surface" : "text-outline"
                                                    )}
                                                >
                                                    {new Date(a.dateDebut).toLocaleDateString("fr-FR", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "2-digit",
                                                    })}
                                                </span>
                                                <span className="font-body-sm text-body-sm text-on-surface flex-1 truncate">
                                                    {a.titre}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase",
                                                        stat.chip
                                                    )}
                                                >
                                                    {stat.label}
                                                </span>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </Section>

                    <Section title="Tâches" icon="task_alt" id="taches" count={activity.taches.length}>
                        {activity.taches.length === 0 ? (
                            <Empty text="Aucune tâche assignée" />
                        ) : (
                            <ul className="divide-y divide-outline-variant/50">
                                {activity.taches.slice(0, 12).map((t: any) => {
                                    const stat = TACHE_STATUTS[t.statut as keyof typeof TACHE_STATUTS]
                                    const isLate =
                                        t.echeance &&
                                        t.statut !== "FAIT" &&
                                        t.statut !== "ANNULE" &&
                                        new Date(t.echeance).getTime() < activity.ref.getTime()
                                    return (
                                        <li key={t.id} className="py-1.5 flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                    stat.dot
                                                )}
                                            />
                                            <span className="font-body-sm text-body-sm text-on-surface flex-1 truncate">
                                                {t.titre}
                                            </span>
                                            {t.echeance && (
                                                <span
                                                    className={cn(
                                                        "font-mono-num text-[10px] tabular-nums",
                                                        isLate ? "text-error font-semibold" : "text-outline"
                                                    )}
                                                >
                                                    {new Date(t.echeance).toLocaleDateString("fr-FR", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                    })}
                                                    {isLate && " ⚠"}
                                                </span>
                                            )}
                                        </li>
                                    )
                                })}
                                {activity.taches.length > 12 && (
                                    <li className="py-1.5 font-body-xs text-[11px] text-outline italic">
                                        + {activity.taches.length - 12} autres tâches
                                    </li>
                                )}
                            </ul>
                        )}
                    </Section>
                </div>
            </div>
        </div>
        </PageGate>
    )
}

/* ============================================================
   Sub-components
   ============================================================ */

function StatCard({
    icon,
    label,
    value,
    sub,
    tone = "default",
    href,
}: {
    icon: string
    label: string
    value: string
    sub: string
    tone?: "default" | "success" | "warning" | "error"
    href?: string
}) {
    const valueClass =
        tone === "success"
            ? "text-[#166534]"
            : tone === "error"
            ? "text-error"
            : tone === "warning"
            ? "text-secondary"
            : "text-on-surface"
    const Wrapper: React.ElementType = href ? "a" : "div"
    return (
        <Wrapper
            href={href}
            className={cn(
                "bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium shadow-[0px_1px_3px_rgba(31,26,20,0.08)]",
                href && "hover:border-accent/40 hover:shadow-[0px_2px_6px_rgba(31,26,20,0.12)] transition-all"
            )}
        >
            <div className="flex items-center justify-between mb-1.5">
                <span className="font-label-caps text-label-caps text-outline uppercase">{label}</span>
                <span className="material-symbols-outlined text-[18px] text-outline">{icon}</span>
            </div>
            <p className={cn("font-mono-num text-2xl font-semibold tabular-nums leading-none", valueClass)}>
                {value}
            </p>
            <p className="font-body-xs text-[10px] text-outline mt-1">{sub}</p>
        </Wrapper>
    )
}

function Section({
    title,
    icon,
    id,
    count,
    sub,
    children,
}: {
    title: string
    icon: string
    id?: string
    count?: number
    sub?: string
    children: React.ReactNode
}) {
    return (
        <section
            id={id}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_1px_3px_rgba(31,26,20,0.08)] scroll-mt-4 flex-shrink-0"
        >
            <header className="px-density-medium py-2 bg-surface-container border-b border-outline-variant rounded-t-lg flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-outline">{icon}</span>
                <h2 className="font-body-sm text-body-sm font-semibold text-on-surface flex-1">
                    {title}
                </h2>
                {count !== undefined && (
                    <span className="font-mono-num text-mono-num text-[11px] text-outline">{count}</span>
                )}
            </header>
            <div className="p-density-medium">
                {sub && (
                    <p className="font-body-xs text-[11px] text-outline italic mb-2">{sub}</p>
                )}
                {children}
            </div>
        </section>
    )
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2 py-1 border-b border-outline-variant/30 last:border-b-0">
            <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider whitespace-nowrap">
                {label}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface text-right truncate">
                {children}
            </span>
        </div>
    )
}

function Empty({ text }: { text: string }) {
    return (
        <p className="font-body-sm text-body-sm text-outline italic py-3 text-center">{text}</p>
    )
}

