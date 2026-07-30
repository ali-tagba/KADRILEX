"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    AUDIENCE_NATURES,
    AUDIENCE_STATUTS,
    RESULTATS_AUDIENCE,
    type AudienceStatutKey,
} from "@/lib/constants/legal"
import {
    audienceClientLabel,
    getAudienceClient,
    getAudienceDossier,
    getAudienceTaches,
    type MockAudience,
} from "@/lib/mock/audiences"
import { AudienceActionsMenu } from "./audience-actions-menu"

interface GalleryViewProps {
    audiences: MockAudience[]
    pageSize?: number
}

/* ============================================================
   Helpers
   ============================================================ */

function formatDateBadge(iso: string): { day: string; month: string; weekday: string } {
    const d = new Date(iso)
    return {
        day: String(d.getDate()).padStart(2, "0"),
        month: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase(),
        weekday: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "").toUpperCase(),
    }
}

function formatHM(iso: string): string {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`
}

function formatDuree(min: number): string {
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Statut auto-dérivé : à venir → en cours → à confirmer (sans CR — confirmation par mail à venir back-end) */
type DerivedStatutKey = AudienceStatutKey | "EN_COURS" | "A_CONFIRMER"
const STATUT_DERIVED_META: Record<DerivedStatutKey, { label: string; chip: string }> = {
    A_VENIR: AUDIENCE_STATUTS.A_VENIR,
    EN_COURS: { label: "En cours", chip: "bg-tertiary-fixed-dim/70 text-on-tertiary-fixed-variant" },
    A_CONFIRMER: { label: "À confirmer", chip: "bg-[#fef3c7] text-[#92400e]" },
    TERMINEE: AUDIENCE_STATUTS.TERMINEE,
    REPORTEE: AUDIENCE_STATUTS.REPORTEE,
    ANNULEE: AUDIENCE_STATUTS.ANNULEE,
}
function deriveStatut(audience: MockAudience): DerivedStatutKey {
    if (audience.statut !== "A_VENIR") return audience.statut
    const now = Date.now()
    const start = new Date(audience.dateDebut).getTime()
    const end = start + audience.dureeMinutes * 60_000
    if (now < start) return "A_VENIR"
    if (now < end) return "EN_COURS"
    return "A_CONFIRMER"
}

/** Indication temporelle relative pour le ruban supérieur de la card */
function relativeBadge(iso: string): { label: string; tone: "today" | "soon" | "past" | "future" } {
    const d = new Date(iso)
    const now = new Date()
    if (isSameDay(d, now)) return { label: "Aujourd'hui", tone: "today" }
    const diffDays = Math.round((d.getTime() - now.getTime()) / 86_400_000)
    if (diffDays === 1) return { label: "Demain", tone: "soon" }
    if (diffDays === -1) return { label: "Hier", tone: "past" }
    if (diffDays < 0) return { label: `Il y a ${Math.abs(diffDays)}j`, tone: "past" }
    if (diffDays <= 7) return { label: `Dans ${diffDays}j`, tone: "soon" }
    return {
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        tone: "future",
    }
}

/* ============================================================
   Composant principal
   ============================================================ */

export function GalleryView({ audiences, pageSize = 12 }: GalleryViewProps) {
    const router = useRouter()
    const [page, setPage] = useState(1)
    /* Suppression locale en session — sera propagée via DELETE API plus tard */
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

    const filtered = useMemo(
        () => audiences.filter((a) => !hiddenIds.has(a.id)),
        [audiences, hiddenIds]
    )

    const sorted = useMemo(
        () =>
            [...filtered].sort(
                (a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime()
            ),
        [filtered]
    )

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
    /* Clamp natif au lieu de useEffect+setPage (anti-pattern react-hooks/set-state-in-effect) */
    const safePage = Math.min(page, totalPages)
    const startIdx = (safePage - 1) * pageSize
    const visible = sorted.slice(startIdx, startIdx + pageSize)

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col h-full min-h-[520px]">
            {/* Grille des cards */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-density-medium">
                {visible.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
                            event_busy
                        </span>
                        <p className="font-body-md text-body-md font-medium">Aucune audience</p>
                        <p className="font-body-sm text-body-sm mt-1">
                            Ajustez la recherche ou les filtres pour voir des résultats.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-density-medium grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {visible.map((a) => (
                            <AudienceCard
                                key={a.id}
                                audience={a}
                                onOpen={() => router.push(`/audiences/${a.id}`)}
                                onDelete={async () => {
                                    const prev = hiddenIds
                                    setHiddenIds((s) => new Set(s).add(a.id))
                                    try {
                                        const r = await fetch(`/api/audiences/${a.id}`, {
                                            method: "DELETE",
                                            credentials: "include",
                                        })
                                        if (!r.ok) {
                                            const body = await r.json().catch(() => ({}))
                                            throw new Error(body.error ?? `HTTP ${r.status}`)
                                        }
                                        const { toast } = await import("@/components/ui/toaster")
                                        toast.success("Audience supprimée.")
                                    } catch (e) {
                                        setHiddenIds(prev)
                                        const { toast } = await import("@/components/ui/toaster")
                                        toast.error(
                                            "Échec : " +
                                                (e instanceof Error ? e.message : "Erreur")
                                        )
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex-none flex items-center justify-between px-3 py-2.5 bg-surface-container border-t border-outline-variant font-body-sm text-on-surface-variant">
                <span className="text-[12px]">
                    Affichage de {sorted.length === 0 ? 0 : startIdx + 1}–
                    {Math.min(startIdx + pageSize, sorted.length)} sur {sorted.length} audience
                    {sorted.length > 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="p-1 rounded hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-primary-container"
                        aria-label="Page précédente"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="font-mono-num text-mono-num">{safePage}</span>
                    <span className="px-1 text-outline-variant">/</span>
                    <span className="font-mono-num text-mono-num">{totalPages}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="p-1 rounded hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-primary-container"
                        aria-label="Page suivante"
                    >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ============================================================
   AudienceCard — la brique de la galerie
   ============================================================ */

interface AudienceCardProps {
    onDelete: () => void
    audience: MockAudience
    onOpen: () => void
}

function AudienceCard({ audience, onOpen, onDelete }: AudienceCardProps) {
    const dossier = getAudienceDossier(audience)
    const client = getAudienceClient(audience)
    const nature = AUDIENCE_NATURES[audience.nature]
    const derivedKey = deriveStatut(audience)
    const statutMeta = STATUT_DERIVED_META[derivedKey]
    const resultat = audience.resultatAudience ? RESULTATS_AUDIENCE[audience.resultatAudience] : null
    const dateBadge = formatDateBadge(audience.dateDebut)
    const rel = relativeBadge(audience.dateDebut)
    const taches = getAudienceTaches(audience.id)
    const tachesFaites = taches.filter((t) => t.statut === "FAIT").length
    const allDone = taches.length > 0 && tachesFaites === taches.length

    const avocat = audience.avocatPlaidant ?? client?.avocatEnCharge ?? null

    return (
        <article
            className="group relative bg-white border border-outline-variant rounded-lg overflow-hidden hover:border-accent/50 hover:shadow-md transition-all duration-150 flex flex-col"
        >
            {/* Bandeau couleur nature */}
            <div className="h-1 w-full" style={{ backgroundColor: nature.color }} />

            {/* Header : numéro + statut + nature */}
            <header className="px-density-medium pt-3 pb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Link
                        href={`/audiences/${audience.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono-num text-mono-num text-[12px] text-primary-container hover:underline"
                    >
                        {audience.numero}
                    </Link>
                    <RelativeChip rel={rel} />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span
                        className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[10px] uppercase whitespace-nowrap",
                            statutMeta.chip
                        )}
                        title={`Statut : ${statutMeta.label}`}
                    >
                        {statutMeta.label}
                    </span>
                    <AudienceActionsMenu
                        size="sm"
                        onEdit={() => onOpen()}
                        onDelete={onDelete}
                    />
                </div>
            </header>

            {/* Body — clickable */}
            <button
                onClick={onOpen}
                className="text-left flex-1 px-density-medium pb-3 flex flex-col gap-2.5 cursor-pointer"
            >
                {/* Date badge + heure */}
                <div className="flex items-center gap-3">
                    <DateBadge weekday={dateBadge.weekday} day={dateBadge.day} month={dateBadge.month} tone={rel.tone} />
                    <div className="flex flex-col">
                        <span className="font-mono-num text-[18px] font-semibold text-on-surface leading-none">
                            {formatHM(audience.dateDebut)}
                        </span>
                        <span className="font-body-sm text-[11px] text-outline mt-0.5">
                            {formatDuree(audience.dureeMinutes)} estimées
                        </span>
                    </div>
                    <span
                        className="ml-auto font-label-caps text-[10px] px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: `${nature.color}1a`, color: nature.color }}
                    >
                        {nature.label}
                    </span>
                </div>

                {/* Titre */}
                <h3 className="font-body-md text-body-md font-semibold text-on-surface line-clamp-2 leading-snug group-hover:text-primary-container transition-colors">
                    {audience.titre}
                </h3>

                {/* Métadonnées */}
                <ul className="flex flex-col gap-1 font-body-sm text-[12px] text-on-surface-variant">
                    <MetaLine icon={client?.type === "PERSONNE_MORALE" ? "domain" : "person"}>
                        <span className="truncate">{audienceClientLabel(audience)}</span>
                        {dossier && (
                            <>
                                <span className="text-outline-variant mx-1">·</span>
                                <span className="font-mono-num text-[11px] text-outline">{dossier.numero}</span>
                            </>
                        )}
                    </MetaLine>
                    <MetaLine icon="gavel">
                        <span className="truncate">{audience.juridiction ?? "Juridiction non précisée"}</span>
                        {audience.salleAudience && (
                            <span className="text-outline ml-1 text-[11px]">· {audience.salleAudience}</span>
                        )}
                    </MetaLine>
                    {avocat && (
                        <MetaLine icon="badge">
                            <span className="truncate">{avocat}</span>
                        </MetaLine>
                    )}
                </ul>
            </button>

            {/* Footer : tâches + résultat (si dispo) + arrow */}
            <footer className="px-density-medium py-2 border-t border-outline-variant/60 bg-surface-container-low/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {taches.length > 0 ? (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 font-body-sm text-[11px]",
                                allDone ? "text-[#166534]" : "text-on-surface-variant"
                            )}
                            title={`${tachesFaites} tâche(s) terminée(s) sur ${taches.length}`}
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {allDone ? "task_alt" : "checklist"}
                            </span>
                            <span className="font-mono-num text-mono-num">
                                {tachesFaites}/{taches.length}
                            </span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 font-body-sm text-[11px] text-outline-variant">
                            <span className="material-symbols-outlined text-[14px]">checklist</span>
                            <span className="font-mono-num text-mono-num">0</span>
                        </span>
                    )}
                    {resultat && (
                        <>
                            <span className="text-outline-variant">·</span>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 font-label-caps text-[10px] px-1.5 py-0.5 rounded uppercase truncate",
                                    resultat.chip
                                )}
                                title={`Résultat : ${resultat.label}`}
                            >
                                {resultat.label}
                            </span>
                        </>
                    )}
                </div>
                <Link
                    href={`/audiences/${audience.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-primary hover:bg-primary-container/10 transition-colors flex-shrink-0"
                    aria-label="Ouvrir la fiche audience"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
            </footer>
        </article>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

interface DateBadgeProps {
    weekday: string
    day: string
    month: string
    tone: "today" | "soon" | "past" | "future"
}
function DateBadge({ weekday, day, month, tone }: DateBadgeProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded border flex-shrink-0",
                tone === "today"
                    ? "bg-accent/15 border-accent text-primary"
                    : tone === "past"
                        ? "bg-surface-container border-outline-variant text-outline"
                        : "bg-surface-container border-outline-variant text-on-surface"
            )}
        >
            <span className="font-label-caps text-[8px] leading-none opacity-80">{weekday}</span>
            <span className="font-mono-num text-[16px] font-bold leading-tight mt-0.5">{day}</span>
            <span className="font-label-caps text-[8px] leading-none opacity-80">{month}</span>
        </div>
    )
}

function RelativeChip({ rel }: { rel: { label: string; tone: "today" | "soon" | "past" | "future" } }) {
    const cls =
        rel.tone === "today"
            ? "bg-accent/15 text-primary font-medium"
            : rel.tone === "soon"
                ? "bg-primary-fixed/60 text-primary-container"
                : rel.tone === "past"
                    ? "bg-surface-container text-outline"
                    : "bg-surface-container-low text-on-surface-variant"
    return (
        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded font-body-sm text-[10px]", cls)}>
            {rel.label}
        </span>
    )
}

function MetaLine({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <li className="inline-flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[14px] text-outline flex-shrink-0">{icon}</span>
            <span className="truncate min-w-0 inline-flex items-center">{children}</span>
        </li>
    )
}
