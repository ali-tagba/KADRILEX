"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { patchEntity, showApiError } from "@/lib/api/patch"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    AUDIENCE_NATURES,
    JURIDICTIONS_NIGER,
    RESULTATS_AUDIENCE,
    TACHE_STATUTS,
    type AudienceStatutKey,
    type ResultatAudienceKey,
    type TacheStatutKey,
} from "@/lib/constants/legal"
import type { MockAudience, MockTache } from "@/lib/mock/audiences"
import { ShareButton } from "@/components/shared/share-button"
import { mockClients, clientDisplayName, type MockClient } from "@/lib/mock/clients"
import { mockDossiers, type DossierFile, type MockDossier } from "@/lib/mock/dossiers"

/* ============================================================
   Helpers
   ============================================================ */

function formatDayLong(iso: string): string {
    return new Date(iso)
        .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        .replace(/^\w/, (m) => m.toUpperCase())
}

function formatHM(iso: string): string {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`
}

function formatDuree(min: number): string {
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m === 0 ? `${h}h estimées` : `${h}h${String(m).padStart(2, "0")} estimées`
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatEcheanceShort(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const now = new Date()
    if (isSameDay(d, now)) return "Aujourd'hui"
    const diff = Math.round((d.getTime() - now.getTime()) / 86_400_000)
    if (diff === 1) return "Demain"
    if (diff === -1) return "Hier"
    if (diff < 0) return `Retard de ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}`
    if (diff <= 7) return `Dans ${diff}j`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

function formatRelativePast(iso: string): string {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 60) return `Il y a ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Il y a ${hours}h`
    const days = Math.floor(hours / 24)
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days}j`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatSize(bytes: number | null): string {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function fileIcon(mimeType: string | null): { icon: string; color: string } {
    if (!mimeType) return { icon: "description", color: "text-on-surface-variant" }
    if (mimeType.includes("pdf")) return { icon: "picture_as_pdf", color: "text-red-500" }
    if (mimeType.includes("image")) return { icon: "image", color: "text-purple-500" }
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return { icon: "table_chart", color: "text-emerald-600" }
    if (mimeType.includes("word") || mimeType.includes("document")) return { icon: "description", color: "text-blue-600" }
    return { icon: "insert_drive_file", color: "text-on-surface-variant" }
}

/**
 * Statut effectif affiché : auto-dérivé de la date tant que la statut brute est A_VENIR.
 * Permet à "À venir" de devenir "En cours" puis "À confirmer" sans intervention,
 * tout en gardant les overrides manuels (TERMINEE / REPORTEE / ANNULEE).
 * Note : la confirmation finale (audience tenue ou non) sera automatisée par mail
 * quand le back-end sera branché — pour l'instant l'utilisateur confirme via le menu statut.
 */
type DerivedStatutKey = AudienceStatutKey | "EN_COURS" | "A_CONFIRMER"

const STATUT_DERIVED_META: Record<DerivedStatutKey, { label: string; chip: string }> = {
    A_VENIR: { label: "À venir", chip: "bg-primary-fixed text-primary" },
    EN_COURS: { label: "En cours", chip: "bg-tertiary-fixed-dim/70 text-on-tertiary-fixed-variant" },
    A_CONFIRMER: { label: "À confirmer", chip: "bg-[#fef3c7] text-[#92400e]" },
    TERMINEE: { label: "Tenue", chip: "bg-[#e8f5e9] text-[#166534]" },
    REPORTEE: { label: "Reportée", chip: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant" },
    ANNULEE: { label: "Annulée", chip: "bg-error-container text-on-error-container" },
}

function deriveStatut(audience: MockAudience): { key: DerivedStatutKey; isAuto: boolean } {
    if (audience.statut !== "A_VENIR") return { key: audience.statut, isAuto: false }
    const now = Date.now()
    const start = new Date(audience.dateDebut).getTime()
    const end = start + audience.dureeMinutes * 60_000
    if (now < start) return { key: "A_VENIR", isAuto: true }
    if (now < end) return { key: "EN_COURS", isAuto: true }
    return { key: "A_CONFIRMER", isAuto: true }
}

/** ISO → "YYYY-MM-DDTHH:mm" pour input[type=datetime-local] */
function toDatetimeLocal(iso: string): string {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromDatetimeLocal(s: string): string {
    return new Date(s).toISOString()
}

/* ============================================================
   Page
   ============================================================ */

const STATUT_TACHE_CHIP: Record<TacheStatutKey, string> = {
    A_FAIRE: "text-[#1e40af] bg-[#eff6ff] border border-[#bfdbfe]",
    EN_COURS: "text-on-tertiary-fixed-variant bg-tertiary-fixed-dim/40 border border-tertiary-fixed-dim",
    FAIT: "text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0]",
    ANNULE: "text-outline bg-surface-container border border-outline-variant",
}

export default function AudienceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [audience, setAudience] = useState<MockAudience | null>(null)
    const [allTaches, setAllTaches] = useState<MockTache[]>([])
    const [loading, setLoading] = useState(true)
    const [notFoundFlag, setNotFoundFlag] = useState(false)
    const [tacheLocalStatus, setTacheLocalStatus] = useState<Record<string, TacheStatutKey>>({})
    const [editing, setEditing] = useState<"datetime" | "juridiction" | "resultat" | null>(null)

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch(`/api/audiences/${id}`).then(async (r) => {
                if (r.status === 404) return null
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return (await r.json()) as MockAudience
            }),
            fetch("/api/taches")
                .then(async (r) => (r.ok ? ((await r.json()) as MockTache[]) : []))
                .catch(() => [] as MockTache[]),
        ])
            .then(([aud, tac]) => {
                if (!alive) return
                if (!aud) {
                    setNotFoundFlag(true)
                    return
                }
                setAudience(aud)
                setAllTaches(tac)
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

    // Priorité aux données de l'API (audience.dossier / audience.client inclus par le GET),
    // fallback sur les mocks. Une audience peut n'avoir ni dossier ni client.
    const dossier = useMemo(
        () =>
            audience
                ? ((audience as unknown as { dossier?: MockDossier }).dossier ??
                  mockDossiers.find((d) => d.id === audience.dossierId) ??
                  null)
                : null,
        [audience]
    )

    const client = useMemo(
        () =>
            audience
                ? ((audience as unknown as { client?: MockClient }).client ??
                  (dossier?.clientId ? mockClients.find((c) => c.id === dossier.clientId) ?? null : null))
                : null,
        [audience, dossier]
    )

    /* Tâches liées à cette audience */
    const taches = useMemo(() => {
        if (!audience) return []
        return allTaches
            .filter((t) => t.audienceId === audience.id)
            .map((t) => ({ ...t, statut: tacheLocalStatus[t.id] ?? t.statut }))
    }, [audience, allTaches, tacheLocalStatus])

    const tachesFaites = taches.filter((t) => t.statut === "FAIT").length

    /* Documents liés : pour MVP on prend les fichiers du dossier (sub-set GED) */
    const documents = useMemo(() => {
        if (!dossier) return []
        return (dossier.files ?? []).filter((f: DossierFile) => f.type === "FILE").slice(0, 4)
    }, [dossier])

    /* Activité : générée à partir des tâches récemment complétées + audience programmée */
    const activity = useMemo(() => {
        if (!audience) return []
        type ActItem = { id: string; icon: string; label: React.ReactNode; at: string; important: boolean }
        const items: ActItem[] = []

        // Tâches récemment terminées
        for (const t of allTaches.filter((x) => x.audienceId === audience.id && x.statut === "FAIT" && x.completedAt)) {
            items.push({
                id: `tac-${t.id}`,
                icon: "task_alt",
                label: (
                    <>
                        <span className="font-medium">{t.assigneA.replace(/^Me /, "Me ")}</span> a terminé la tâche{" "}
                        <span className="font-medium">«&nbsp;{t.titre}&nbsp;»</span>
                    </>
                ),
                at: t.completedAt!,
                important: false,
            })
        }

        // Audience programmée (createdAt fictif basé sur dateDebut - 14j)
        const programDate = new Date(audience.dateDebut)
        programDate.setDate(programDate.getDate() - 14)
        items.push({
            id: "audience-prog",
            icon: "event_available",
            label: <>Audience programmée par <span className="font-medium">le secrétariat</span></>,
            at: programDate.toISOString(),
            important: false,
        })

        // Tri antéchronologique, top 5
        return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5)
    }, [audience, allTaches])

    const toggleTache = (t: MockTache) => {
        const current = tacheLocalStatus[t.id] ?? t.statut
        const next: TacheStatutKey = current === "FAIT" ? "A_FAIRE" : "FAIT"
        setTacheLocalStatus((prev) => ({ ...prev, [t.id]: next }))
        patchEntity(`/api/taches/${t.id}`, { statut: next }).catch((e) => {
            setTacheLocalStatus((prev) => ({ ...prev, [t.id]: current }))
            showApiError("Échec sauvegarde tâche")(e)
        })
    }

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto p-container-margin">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            </div>
        )
    }
    if (notFoundFlag || !audience) return notFound()

    const nature = AUDIENCE_NATURES[audience.nature]
    const derived = deriveStatut(audience)
    const statutMeta = STATUT_DERIVED_META[derived.key]
    const resultat = audience.resultatAudience ? RESULTATS_AUDIENCE[audience.resultatAudience] : null
    const inheritedAvocat = !audience.avocatPlaidant && client?.avocatEnCharge
    const avocat = audience.avocatPlaidant ?? client?.avocatEnCharge ?? "—"

    /** Patch local (optimistic) + sync API. Rollback si erreur. */
    const patchAudience = (changes: Partial<MockAudience>) => {
        const prev = audience
        setAudience((p) => (p ? { ...p, ...changes } : p))
        if (!prev) return
        // Le shape backend utilise `resultat` (pas `resultatAudience`)
        const apiPatch: Record<string, unknown> = { ...changes }
        if ("resultatAudience" in changes) {
            apiPatch.resultat = (changes as { resultatAudience?: unknown }).resultatAudience
            delete apiPatch.resultatAudience
        }
        if ("avocatPlaidant" in changes) {
            // pas mappé côté DB pour l'instant — skip
            delete apiPatch.avocatPlaidant
        }
        patchEntity(`/api/audiences/${prev.id}`, apiPatch).catch((e) => {
            setAudience(prev)
            showApiError("Échec sauvegarde audience")(e)
        })
    }

    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-container-margin">
            <div className="max-w-[1200px] mx-auto">
                {/* Back link */}
                <Link
                    href="/audiences"
                    className="inline-flex items-center gap-2 text-primary-container font-body-sm text-body-sm hover:underline mb-5"
                >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Toutes les audiences
                </Link>

                {/* Header section */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono-num text-mono-num text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                            {audience.numero}
                        </span>
                        <StatutChipMenu
                            audience={audience}
                            derived={derived}
                            statutMeta={statutMeta}
                            onChange={(newStatut) => patchAudience({ statut: newStatut })}
                            onOpenResultat={() => setEditing("resultat")}
                        />
                        <span className={cn("font-label-caps text-label-caps px-2 py-1 rounded uppercase", nature.chip)}>
                            {nature.label}
                        </span>
                        {resultat ? (
                            <button
                                onClick={() => setEditing("resultat")}
                                title="Modifier le résultat"
                                className={cn(
                                    "font-label-caps text-label-caps px-2 py-1 rounded uppercase hover:opacity-90 transition-opacity",
                                    resultat.chip
                                )}
                            >
                                {resultat.label}
                            </button>
                        ) : (
                            (derived.key === "A_CONFIRMER" || audience.statut === "TERMINEE") && (
                                <button
                                    onClick={() => setEditing("resultat")}
                                    className="font-label-caps text-label-caps px-2 py-1 rounded uppercase inline-flex items-center gap-1 text-on-surface-variant bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[12px]">add</span>
                                    Saisir le résultat
                                </button>
                            )
                        )}
                    </div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h1 className="font-h1 text-h1 text-on-background">{audience.titre}</h1>
                        <ShareButton
                            entityType="AUDIENCE"
                            entityId={audience.id}
                            entityNumero={audience.numero}
                            entityLabel={audience.titre}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md flex-wrap">
                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                        <span className="first-letter:uppercase">{formatDayLong(audience.dateDebut)}</span>
                        <span className="text-outline-variant">·</span>
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span className="font-mono-num">{formatHM(audience.dateDebut)}</span>
                        <span className="text-outline-variant">·</span>
                        <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                        <span>{formatDuree(audience.dureeMinutes)}</span>
                        <button
                            onClick={() => setEditing("datetime")}
                            title="Modifier la date / heure / durée"
                            className="ml-1 p-1 rounded text-outline hover:text-primary hover:bg-surface-container-low transition-colors"
                            aria-label="Modifier la date"
                        >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                    </div>
                </div>

                {/* Sub-header meta data */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg mb-6 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant overflow-hidden">
                    <MetaCell label="Dossier">
                        {dossier ? (
                            <Link
                                href={`/dossiers/${dossier.id}`}
                                className="font-body-md text-body-md text-primary-container font-medium hover:underline inline-flex items-center gap-1"
                            >
                                {dossier.numero}
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </Link>
                        ) : (
                            <span className="text-outline">—</span>
                        )}
                    </MetaCell>
                    <MetaCell label="Client">
                        {client ? (
                            <Link
                                href={`/clients/${client.id}`}
                                className="font-body-md text-body-md text-primary-container font-medium hover:underline inline-flex items-center gap-1"
                            >
                                <span className="truncate">{clientDisplayName(client)}</span>
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </Link>
                        ) : (
                            <span className="text-outline">—</span>
                        )}
                    </MetaCell>
                    <MetaCell label="Juridiction">
                        <div className="group flex items-start justify-between gap-1 min-w-0">
                            <div className="min-w-0 flex-1">
                                <span className="font-body-md text-body-md text-on-background font-medium block truncate">
                                    {audience.juridiction ?? <span className="text-outline italic font-normal">—</span>}
                                </span>
                                {audience.salleAudience && (
                                    <span className="text-[11px] text-outline">{audience.salleAudience}</span>
                                )}
                            </div>
                            <button
                                onClick={() => setEditing("juridiction")}
                                title="Modifier la juridiction"
                                aria-label="Modifier la juridiction"
                                className="p-0.5 rounded text-outline hover:text-primary hover:bg-surface-container-low transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                        </div>
                    </MetaCell>
                    <MetaCell label="Avocat plaidant">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-body-md text-body-md text-on-background font-medium truncate">
                                {avocat}
                            </span>
                            {inheritedAvocat && (
                                <span
                                    title="Hérité de la fiche client"
                                    className="font-label-caps text-[9px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-[10px]">link</span>
                                    Hérité
                                </span>
                            )}
                        </div>
                    </MetaCell>
                </div>

                {/* Main grid 8/4 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Col gauche : Tâches */}
                    <div className="lg:col-span-8">
                        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                            <header className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center">
                                <h2 className="font-h2 text-h2 text-on-background">Tâches</h2>
                                <span className="font-mono-num text-mono-num text-on-surface-variant bg-surface px-2 py-1 rounded border border-outline-variant">
                                    {tachesFaites}/{taches.length}
                                </span>
                            </header>
                            {taches.length === 0 ? (
                                <div className="p-density-loose text-center font-body-sm text-body-sm text-on-surface-variant">
                                    Aucune tâche pour cette audience.
                                </div>
                            ) : (
                                <ul className="divide-y divide-outline-variant">
                                    {taches.map((t) => (
                                        <TacheRow key={t.id} t={t} onToggle={() => toggleTache(t)} />
                                    ))}
                                </ul>
                            )}
                            <div className="p-density-medium border-t border-outline-variant">
                                <Link
                                    href={`/taches?audienceId=${audience.id}&new=1`}
                                    className="text-primary-container font-body-sm text-body-sm font-medium flex items-center gap-1 hover:underline"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Ajouter une tâche
                                </Link>
                            </div>
                        </section>

                        {/* Notes / Compte-rendu */}
                        {(audience.notes || audience.compteRendu) && (
                            <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden mt-6">
                                <header className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant">
                                    <h2 className="font-h2 text-h2 text-on-background">
                                        {audience.compteRendu ? "Compte-rendu" : "Notes"}
                                    </h2>
                                </header>
                                <div className="p-density-loose">
                                    <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">
                                        {audience.compteRendu ?? audience.notes}
                                    </p>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Col droite : Documents + Activité */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Documents */}
                        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                            <header className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center">
                                <h2 className="font-h2 text-h2 text-on-background">Documents liés</h2>
                                {dossier && (
                                    <Link
                                        href={`/dossiers/${dossier.id}/ged`}
                                        className="font-body-sm text-body-sm text-accent hover:underline"
                                    >
                                        GED
                                    </Link>
                                )}
                            </header>
                            <div className="p-density-medium flex flex-col gap-2">
                                {documents.length === 0 ? (
                                    <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-3">
                                        Aucun document lié
                                    </p>
                                ) : (
                                    documents.map((doc) => {
                                        const { icon, color } = fileIcon(doc.mimeType)
                                        return (
                                            <a
                                                key={doc.id}
                                                href={doc.url ?? "#"}
                                                onClick={(e) => !doc.url && e.preventDefault()}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-2 rounded hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant group"
                                            >
                                                <div className="w-8 h-8 rounded bg-surface-container/60 flex items-center justify-center flex-shrink-0">
                                                    <span
                                                        className={cn("material-symbols-outlined text-[18px]", color)}
                                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                                    >
                                                        {icon}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-body-sm text-body-sm font-medium text-on-background truncate">
                                                        {doc.name}
                                                    </p>
                                                    <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
                                                        {formatRelativePast(doc.updatedAt)} · {formatSize(doc.size)}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-[16px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                                                    download
                                                </span>
                                            </a>
                                        )
                                    })
                                )}
                            </div>
                            <div className="px-density-medium pb-density-medium">
                                <Link
                                    href={dossier ? `/dossiers/${dossier.id}/ged` : "#"}
                                    className="w-full border border-outline-variant bg-transparent text-primary-container font-body-sm text-body-sm font-medium py-1.5 rounded hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">upload</span>
                                    Gérer documents (GED dossier)
                                </Link>
                            </div>
                        </section>

                        {/* Activité */}
                        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                            <header className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant">
                                <h2 className="font-h2 text-h2 text-on-background">Activité récente</h2>
                            </header>
                            <div className="p-density-medium relative">
                                {activity.length === 0 ? (
                                    <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-3">
                                        Aucune activité
                                    </p>
                                ) : (
                                    <>
                                        <div className="absolute left-[27px] top-[24px] bottom-4 w-px bg-outline-variant" />
                                        <div className="space-y-4">
                                            {activity.map((item) => (
                                                <div key={item.id} className="flex gap-3 relative">
                                                    <div
                                                        className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 border-2 border-surface-container-lowest",
                                                            item.important
                                                                ? "bg-primary-container text-on-primary-container"
                                                                : "bg-surface-variant text-on-surface-variant"
                                                        )}
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            {item.icon}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-body-sm text-body-sm text-on-background">
                                                            {item.label}
                                                        </p>
                                                        <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                                                            {formatRelativePast(item.at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Modal d'édition unique (le contenu change selon `editing`) */}
            {editing && (
                <EditModal
                    key={editing}
                    title={
                        editing === "datetime"
                            ? "Date et durée"
                            : editing === "juridiction"
                                ? "Juridiction"
                                : "Résultat de l'audience"
                    }
                    onClose={() => setEditing(null)}
                >
                    {editing === "datetime" && (
                        <DateTimeEditor
                            initial={{ dateDebut: audience.dateDebut, dureeMinutes: audience.dureeMinutes }}
                            onSave={(v) => {
                                patchAudience(v)
                                setEditing(null)
                            }}
                            onCancel={() => setEditing(null)}
                        />
                    )}
                    {editing === "juridiction" && (
                        <JuridictionEditor
                            initial={{ juridiction: audience.juridiction, salleAudience: audience.salleAudience }}
                            onSave={(v) => {
                                patchAudience(v)
                                setEditing(null)
                            }}
                            onCancel={() => setEditing(null)}
                        />
                    )}
                    {editing === "resultat" && (
                        <ResultatEditor
                            initial={audience.resultatAudience}
                            onSave={(v) => {
                                patchAudience({
                                    resultatAudience: v,
                                    statut: v ? "TERMINEE" : audience.statut,
                                })
                                setEditing(null)
                            }}
                            onCancel={() => setEditing(null)}
                        />
                    )}
                </EditModal>
            )}
        </div>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="p-density-medium min-w-0">
            <span className="block font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase">
                {label}
            </span>
            <div className="min-w-0">{children}</div>
        </div>
    )
}

interface TacheRowProps {
    t: MockTache
    onToggle: () => void
}

function TacheRow({ t, onToggle }: TacheRowProps) {
    const done = t.statut === "FAIT"
    const isLate = !done && t.echeance ? new Date(t.echeance) < new Date() && !isSameDay(new Date(t.echeance), new Date()) : false
    const echeanceLabel = formatEcheanceShort(t.echeance)
    const statutMeta = TACHE_STATUTS[t.statut]

    return (
        <li
            className={cn(
                "px-density-medium py-3 flex items-center justify-between hover:bg-surface-bright transition-colors group cursor-pointer gap-3",
                isLate && "bg-error-container/15",
                done && "bg-surface-container-low/50"
            )}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggle()
                    }}
                    className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                        done
                            ? "bg-primary border-primary text-on-primary"
                            : isLate
                                ? "bg-surface border-error hover:border-error"
                                : "bg-surface border-outline group-hover:border-primary"
                    )}
                >
                    {done && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                </button>
                <div className="flex flex-col min-w-0">
                    <span
                        className={cn(
                            "font-body-md text-body-md font-medium truncate",
                            done
                                ? "text-on-surface-variant line-through decoration-on-surface-variant/50"
                                : isLate
                                    ? "text-error"
                                    : "text-on-background"
                        )}
                    >
                        {t.titre}
                    </span>
                    {echeanceLabel && (
                        <span
                            className={cn(
                                "font-body-sm text-body-sm flex items-center gap-1 mt-0.5",
                                isLate
                                    ? "text-error/80 font-medium"
                                    : done
                                        ? "text-on-surface-variant/60"
                                        : "text-on-surface-variant"
                            )}
                        >
                            <span className="material-symbols-outlined text-[12px]">
                                {isLate ? "warning" : "event"}
                            </span>
                            {echeanceLabel}
                            <span className="text-outline-variant">·</span>
                            <span className="truncate">{t.assigneA}</span>
                        </span>
                    )}
                </div>
            </div>
            <span
                className={cn(
                    "font-label-caps text-label-caps px-2 py-1 rounded uppercase whitespace-nowrap flex-shrink-0",
                    t.priorite === "URGENTE" && t.statut === "A_FAIRE"
                        ? "text-error bg-error-container border border-error/20"
                        : STATUT_TACHE_CHIP[t.statut]
                )}
            >
                {t.priorite === "URGENTE" && t.statut === "A_FAIRE" ? "URGENTE" : statutMeta.label}
            </span>
        </li>
    )
}

/* ============================================================
   Edit modals — modal centrée + 3 éditeurs spécialisés
   ============================================================ */

interface EditModalProps {
    title: string
    onClose: () => void
    children: React.ReactNode
}
function EditModal({ title, onClose, children }: EditModalProps) {
    useEscapeClose(onClose)

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
            onClick={() => onClose()}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="px-density-medium py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container">
                    <h3 className="font-h2 text-h2 text-on-background">{title}</h3>
                    <button
                        onClick={() => onClose()}
                        className="text-outline hover:text-on-background transition-colors"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>
                <div className="p-density-medium">{children}</div>
            </div>
        </div>
    )
}

interface DateTimeEditorProps {
    initial: { dateDebut: string; dureeMinutes: number }
    onSave: (v: { dateDebut: string; dureeMinutes: number }) => void
    onCancel: () => void
}
function DateTimeEditor({ initial, onSave, onCancel }: DateTimeEditorProps) {
    const [dt, setDt] = useState(toDatetimeLocal(initial.dateDebut))
    const [duree, setDuree] = useState(initial.dureeMinutes)
    const PRESETS = [30, 60, 90, 120, 180]
    return (
        <div className="flex flex-col gap-4">
            <label className="block">
                <span className="font-label-caps text-label-caps text-outline uppercase mb-1.5 block">
                    Date et heure
                </span>
                <input
                    type="datetime-local"
                    value={dt}
                    onChange={(e) => setDt(e.target.value)}
                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
            </label>
            <div>
                <span className="font-label-caps text-label-caps text-outline uppercase mb-1.5 block">
                    Durée estimée (minutes)
                </span>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={5}
                        step={5}
                        value={duree}
                        onChange={(e) => setDuree(Number(e.target.value) || 0)}
                        className="w-24 border border-outline-variant rounded px-3 py-2 font-mono-num bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <div className="flex flex-wrap gap-1">
                        {PRESETS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setDuree(p)}
                                className={cn(
                                    "px-2 py-1 rounded font-body-sm text-[12px] transition-colors",
                                    duree === p
                                        ? "bg-accent/15 text-primary font-medium"
                                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                                )}
                            >
                                {p < 60 ? `${p}min` : `${p / 60}h`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/40 mt-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 border border-outline-variant rounded font-body-sm hover:bg-surface-container-low transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={() => onSave({ dateDebut: fromDatetimeLocal(dt), dureeMinutes: duree })}
                    disabled={!dt || duree <= 0}
                    className="px-3 py-1.5 bg-accent text-white rounded font-body-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                    Enregistrer
                </button>
            </div>
        </div>
    )
}

interface JuridictionEditorProps {
    initial: { juridiction: string | null; salleAudience: string | null }
    onSave: (v: { juridiction: string | null; salleAudience: string | null }) => void
    onCancel: () => void
}
function JuridictionEditor({ initial, onSave, onCancel }: JuridictionEditorProps) {
    const [jur, setJur] = useState(initial.juridiction ?? "")
    const [salle, setSalle] = useState(initial.salleAudience ?? "")
    return (
        <div className="flex flex-col gap-4">
            <label className="block">
                <span className="font-label-caps text-label-caps text-outline uppercase mb-1.5 block">
                    Juridiction
                </span>
                <select
                    value={jur}
                    onChange={(e) => setJur(e.target.value)}
                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                    <option value="">— Aucune —</option>
                    {JURIDICTIONS_NIGER.map((j) => (
                        <option key={j} value={j}>
                            {j}
                        </option>
                    ))}
                </select>
            </label>
            <label className="block">
                <span className="font-label-caps text-label-caps text-outline uppercase mb-1.5 block">
                    Salle d&apos;audience
                </span>
                <input
                    type="text"
                    value={salle}
                    onChange={(e) => setSalle(e.target.value)}
                    placeholder="Ex : Salle 3"
                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/40 mt-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 border border-outline-variant rounded font-body-sm hover:bg-surface-container-low transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={() =>
                        onSave({
                            juridiction: jur.trim() || null,
                            salleAudience: salle.trim() || null,
                        })
                    }
                    className="px-3 py-1.5 bg-accent text-white rounded font-body-sm hover:opacity-90 transition-opacity"
                >
                    Enregistrer
                </button>
            </div>
        </div>
    )
}

interface ResultatEditorProps {
    initial: ResultatAudienceKey | null
    onSave: (v: ResultatAudienceKey | null) => void
    onCancel: () => void
}
function ResultatEditor({ initial, onSave, onCancel }: ResultatEditorProps) {
    const [val, setVal] = useState<ResultatAudienceKey | "">(initial ?? "")
    return (
        <div className="flex flex-col gap-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
                Saisir le résultat marquera l&apos;audience comme <strong>tenue</strong>.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
                {(Object.entries(RESULTATS_AUDIENCE) as [ResultatAudienceKey, { label: string; chip: string }][]).map(
                    ([key, meta]) => (
                        <label
                            key={key}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-colors",
                                val === key
                                    ? "border-accent bg-accent/10"
                                    : "border-outline-variant hover:bg-surface-container-low"
                            )}
                        >
                            <input
                                type="radio"
                                name="resultat"
                                value={key}
                                checked={val === key}
                                onChange={() => setVal(key)}
                                className="accent-accent"
                            />
                            <span
                                className={cn(
                                    "font-label-caps text-label-caps px-2 py-0.5 rounded uppercase",
                                    meta.chip
                                )}
                            >
                                {meta.label}
                            </span>
                        </label>
                    )
                )}
            </div>
            <div className="flex justify-between items-center gap-2 pt-2 border-t border-outline-variant/40 mt-2">
                {initial && (
                    <button
                        onClick={() => onSave(null)}
                        className="px-3 py-1.5 text-error font-body-sm hover:bg-error-container/30 rounded transition-colors"
                    >
                        Effacer
                    </button>
                )}
                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 border border-outline-variant rounded font-body-sm hover:bg-surface-container-low transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => onSave(val ? (val as ResultatAudienceKey) : null)}
                        disabled={!val}
                        className="px-3 py-1.5 bg-accent text-white rounded font-body-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ============================================================
   StatutChipMenu — chip cliquable + dropdown d'actions sur le statut
   ============================================================ */

interface StatutChipMenuProps {
    audience: MockAudience
    derived: { key: DerivedStatutKey; isAuto: boolean }
    statutMeta: { label: string; chip: string }
    onChange: (newStatut: AudienceStatutKey) => void
    onOpenResultat: () => void
}
function StatutChipMenu({ audience, derived, statutMeta, onChange, onOpenResultat }: StatutChipMenuProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        window.addEventListener("mousedown", onClick)
        window.addEventListener("keydown", onKey)
        return () => {
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onKey)
        }
    }, [open])

    /** Options proposées en fonction du statut courant (brut, pas dérivé). */
    const options: { label: string; icon: string; action: () => void; tone?: "danger" }[] = []
    if (audience.statut === "A_VENIR") {
        options.push(
            { label: "Saisir le résultat", icon: "gavel", action: () => { setOpen(false); onOpenResultat() } },
            { label: "Marquer comme tenue", icon: "task_alt", action: () => { setOpen(false); onChange("TERMINEE") } },
            { label: "Reporter", icon: "schedule", action: () => { setOpen(false); onChange("REPORTEE") } },
            { label: "Annuler", icon: "cancel", action: () => { setOpen(false); onChange("ANNULEE") }, tone: "danger" }
        )
    } else if (audience.statut === "TERMINEE") {
        options.push(
            { label: "Modifier le résultat", icon: "edit", action: () => { setOpen(false); onOpenResultat() } },
            { label: "Réactiver (À venir)", icon: "undo", action: () => { setOpen(false); onChange("A_VENIR") } }
        )
    } else if (audience.statut === "REPORTEE" || audience.statut === "ANNULEE") {
        options.push(
            { label: "Réactiver (À venir)", icon: "undo", action: () => { setOpen(false); onChange("A_VENIR") } }
        )
    }

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => setOpen((v) => !v)}
                title={derived.isAuto ? "Statut auto-calculé selon la date — cliquer pour modifier" : "Cliquer pour modifier le statut"}
                className={cn(
                    "font-label-caps text-label-caps px-2 py-1 rounded uppercase inline-flex items-center gap-1 hover:opacity-90 transition-opacity",
                    statutMeta.chip
                )}
            >
                {statutMeta.label}
                <span className="material-symbols-outlined text-[11px] opacity-60">expand_more</span>
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-40 bg-surface-container-lowest border border-outline-variant rounded shadow-2xl min-w-[220px] py-1">
                    {options.length === 0 ? (
                        <p className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
                            Aucune action disponible
                        </p>
                    ) : (
                        options.map((opt) => (
                            <button
                                key={opt.label}
                                onClick={opt.action}
                                className={cn(
                                    "w-full text-left px-3 py-2 font-body-sm text-body-sm flex items-center gap-2 hover:bg-surface-container-low transition-colors",
                                    opt.tone === "danger" && "text-error hover:bg-error-container/30"
                                )}
                            >
                                <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
