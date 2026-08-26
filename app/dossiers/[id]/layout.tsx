"use client"

import { use, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, notFound, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import { DossierProvider, type DossierConflit } from "@/components/dossiers/dossier-context"
import { DossierFormDialog, type DossierFormDraft } from "@/components/dossiers/dossier-form-dialog"
import { ShareButton } from "@/components/shared/share-button"
import { patchEntity, showApiError } from "@/lib/api/patch"
import type { MockDossier } from "@/lib/mock/dossiers"
import { clientDisplayName, type MockClient } from "@/lib/mock/clients"
import { DOSSIER_STATUTS, DOSSIER_TYPES } from "@/lib/constants/legal"

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

function formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

interface DossierLayoutProps {
    children: ReactNode
    params: Promise<{ id: string }>
}

export default function DossierLayout({ children, params }: DossierLayoutProps) {
    const { id } = use(params)
    const [dossier, setDossier] = useState<MockDossier | null>(null)
    const [editClients, setEditClients] = useState<MockClient[]>([])
    const [loading, setLoading] = useState(true)
    const [notFoundFlag, setNotFoundFlag] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Si l'URL contient ?edit=1 (depuis la liste), ouvre la dialog au boot
    useEffect(() => {
        if (searchParams.get("edit") === "1") setEditOpen(true)
    }, [searchParams])

    async function handleEditSave(draft: DossierFormDraft) {
        if (!dossier) return
        try {
            const updated = await patchEntity<MockDossier>(`/api/dossiers/${dossier.id}`, {
                kind: draft.kind,
                type: draft.type,
                nature: draft.nature,
                titre: draft.titre,
                statut: draft.statut,
                etatProcedure: draft.etatProcedure,
                juridiction: draft.juridiction,
                partiesAdverses: draft.partiesAdverses,
                description: draft.description,
                honoraires: draft.honoraires,
                retrocession: draft.retrocession,
                clientId: draft.clientId,
                responsableId: draft.responsableId,
                equipeIds: draft.equipeIds,
            })
            setDossier(updated)
            setEditOpen(false)
            toast.success("Dossier modifié")
        } catch (e) {
            showApiError("Échec modification")(e)
        }
    }

    useEffect(() => {
        let alive = true
        // Charger dossier + liste clients en parallèle
        Promise.all([
            fetch(`/api/dossiers/${id}`, { credentials: "include" }).then(async (r) => {
                if (r.status === 404) throw new Error("404")
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return (await r.json()) as MockDossier
            }),
            fetch("/api/clients", { credentials: "include" })
                .then((r) => (r.ok ? (r.json() as Promise<MockClient[]>) : Promise.resolve([] as MockClient[])))
                .catch(() => [] as MockClient[]),
        ])
            .then(([data, clients]) => {
                if (!alive) return
                setDossier(data)
                setEditClients(clients)
            })
            .catch((e: unknown) => {
                if (!alive) return
                if (e instanceof Error && e.message === "404") setNotFoundFlag(true)
                else setNotFoundFlag(true)
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [id])

    // Le client est inclus dans la réponse API via shapeDossier
    const client = useMemo<MockClient | null>(
        () => {
            if (!dossier) return null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return ((dossier as any).client as MockClient) ?? null
        },
        [dossier]
    )

    const conflits = useMemo<DossierConflit[]>(() => {
        if (!dossier) return []
        return (dossier.partiesAdverses ?? [])
            .map((nom) => {
                const matched = editClients.find(
                    (c) => c.id !== dossier.clientId && clientDisplayName(c) === nom
                )
                return matched ? { partie: nom, client: matched } : null
            })
            .filter((x): x is DossierConflit => x !== null)
    }, [dossier, editClients])

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto p-container-margin">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            </div>
        )
    }
    if (notFoundFlag || !dossier) return notFound()

    const typeMeta = DOSSIER_TYPES[dossier.type]
    const statutMeta = DOSSIER_STATUTS[dossier.statut]

    const baseUrl = `/dossiers/${dossier.id}`
    const tabs: { href: string; label: string; icon: string; matcher: (p: string) => boolean }[] = [
        { href: baseUrl, label: "Vue d'ensemble", icon: "dashboard", matcher: (p) => p === baseUrl },
        { href: `${baseUrl}/finance`, label: "Finance", icon: "payments", matcher: (p) => p.startsWith(`${baseUrl}/finance`) },
        { href: `${baseUrl}/ged`, label: "GED", icon: "folder_managed", matcher: (p) => p.startsWith(`${baseUrl}/ged`) },
    ]

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* === ZONE FIXE — header + sub-header + tabs === */}
            <div className="flex-none px-container-margin pt-4">
                {/* Back link compact */}
                <Link
                    href="/dossiers"
                    className="inline-flex items-center gap-1 text-outline hover:text-on-surface font-body-sm text-body-sm mb-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Tous les dossiers
                </Link>

                {/* Bandeau conflit (si présent) */}
                {conflits.length > 0 && (
                    <div role="alert" className="mb-3 bg-error-container/60 border border-error/40 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-error text-[18px] flex-shrink-0">warning</span>
                        <p className="flex-1 font-body-sm text-body-sm text-on-error-container">
                            <strong>
                                {conflits.length} conflit{conflits.length > 1 ? "s" : ""} d&apos;intérêts
                            </strong>{" "}
                            détecté{conflits.length > 1 ? "s" : ""} —{" "}
                            {conflits.map((c, i) => (
                                <span key={c.partie}>
                                    <Link href={`/clients/${c.client.id}`} className="font-medium hover:underline">
                                        {c.partie}
                                    </Link>
                                    {i < conflits.length - 1 ? ", " : ""}
                                </span>
                            ))}
                        </p>
                    </div>
                )}

                {/* Ligne 1 : numéro + chips + actions */}
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-mono-num text-mono-num text-[15px] text-primary font-bold">
                            {dossier.numero}
                        </span>
                        <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                            STATUT_CHIP[statutMeta.tone]
                        )}>
                            <span className={cn("w-1 h-1 rounded-full", STATUT_DOT[statutMeta.tone])} />
                            {statutMeta.label}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-container-high text-on-surface border border-outline-variant/50 text-[10px] font-medium tracking-wide uppercase">
                            {typeMeta.code} · {typeMeta.label}
                        </span>
                        {dossier.kind === "ADMIN" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant text-[10px] font-medium uppercase">
                                Interne
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                        <ShareButton
                            entityType="DOSSIER"
                            entityId={dossier.id}
                            entityNumero={dossier.numero}
                            entityLabel={dossier.titre}
                        />
                        <button
                            onClick={() => setEditOpen(true)}
                            className="px-2.5 py-1 border border-outline-variant rounded bg-transparent text-primary font-body-sm text-[12px] hover:bg-surface-container-low transition-colors inline-flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Modifier
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm(`Archiver le dossier ${dossier.numero} ?`)) return
                                const r = await fetch(`/api/dossiers/${dossier.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({ statut: "ARCHIVE", dateCloture: new Date().toISOString() }),
                                })
                                if (r.ok) location.reload()
                                else toast.error("Échec archivage : " + r.status)
                            }}
                            className="px-2.5 py-1 border border-outline-variant rounded bg-transparent text-primary font-body-sm text-[12px] hover:bg-surface-container-low transition-colors"
                        >
                            Archiver
                        </button>
                        <Link
                            href={`/audiences?dossierId=${dossier.id}&new=1`}
                            className="px-2.5 py-1 rounded bg-accent text-white font-body-sm text-[12px] font-medium hover:bg-opacity-90 transition-colors active:scale-[0.98] flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">event</span>
                            Programmer audience
                        </Link>
                    </div>
                </div>

                {/* Ligne 2 : titre serif + sub-titre */}
                <h1 className="font-h2 text-h2 text-on-surface leading-tight">{dossier.titre}</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
                    {dossier.nature}
                    {dossier.juridiction && (
                        <>
                            <span className="text-outline-variant mx-1.5">·</span>
                            {dossier.juridiction}
                        </>
                    )}
                </p>

                {/* Ligne 3 : sub-header en bandeau horizontal compact (1 ligne) */}
                <div className="bg-surface-container-low border border-outline-variant rounded flex divide-x divide-outline-variant overflow-hidden mb-3">
                    {client && (
                        <CompactCell icon="person" label="Client">
                            <Link
                                href={`/clients/${client.id}`}
                                className="font-body-sm text-body-sm font-medium text-on-surface hover:text-accent transition-colors truncate block"
                            >
                                {clientDisplayName(client)}
                                <span className="font-mono-num text-[11px] text-outline ml-1">· {client.numeroClient}</span>
                            </Link>
                        </CompactCell>
                    )}
                    {client?.avocatEnCharge && (
                        <CompactCell icon="badge" label="Avocat" inheritedTooltip>
                            <p className="font-body-sm text-body-sm text-on-surface truncate" title={client.avocatEnCharge}>
                                {client.avocatEnCharge}
                            </p>
                        </CompactCell>
                    )}
                    {client?.honorairesConvenus && (
                        <CompactCell icon="payments" label="Honoraires" inheritedTooltip>
                            <p className="font-body-sm text-body-sm text-on-surface truncate" title={client.honorairesConvenus}>
                                {client.honorairesConvenus}
                            </p>
                        </CompactCell>
                    )}
                    <CompactCell icon="calendar_today" label="Ouvert le">
                        <p className="font-body-sm text-body-sm text-on-surface">
                            {formatDateShort(dossier.dateOuverture)}
                        </p>
                    </CompactCell>
                </div>

                {/* Tabs nav — collée au bas de la zone fixe */}
                <nav
                    className="border-b border-outline-variant flex gap-1 -mx-container-margin px-container-margin"
                    aria-label="Sections du dossier"
                >
                    {tabs.map((t) => {
                        const isActive = t.matcher(pathname)
                        return (
                            <Link
                                key={t.href}
                                href={t.href}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2.5 font-body-sm text-body-sm font-medium border-b-2 transition-colors -mb-px",
                                    isActive
                                        ? "border-accent text-primary"
                                        : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
                                )}
                            >
                                <span className={cn(
                                    "material-symbols-outlined text-[18px]",
                                    isActive ? "text-accent" : ""
                                )}>
                                    {t.icon}
                                </span>
                                {t.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* === ZONE SCROLLABLE — uniquement le contenu de la vue active === */}
            <DossierProvider value={{ dossier, client, conflits }}>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-container-margin py-density-loose">
                    {children}
                </div>
            </DossierProvider>

            {/* Dialog d'édition complet (remplace le prompt() limité au titre) */}
            {editOpen && (
                <DossierFormDialog
                    initial={dossier}
                    clients={editClients}
                    onSave={handleEditSave}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </div>
    )
}

interface CompactCellProps {
    icon: string
    label: string
    inheritedTooltip?: boolean
    children: ReactNode
}

function CompactCell({ icon, label, inheritedTooltip, children }: CompactCellProps) {
    return (
        <div className="flex-1 min-w-0 px-3 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="font-label-caps text-label-caps text-outline flex items-center gap-1">
                    {label.toUpperCase()}
                    {inheritedTooltip && (
                        <span
                            className="material-symbols-outlined text-[11px] text-outline-variant cursor-help"
                            title="Hérité de la fiche client"
                        >
                            link
                        </span>
                    )}
                </div>
                {children}
            </div>
        </div>
    )
}
