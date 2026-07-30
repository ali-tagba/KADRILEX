"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
    DOC_CATEGORIES,
    DOC_TYPES,
    DOMAINES_JURIDIQUES,
    ISSUES_JURIS,
} from "@/lib/constants/biblio"
import type { MockDocument } from "@/lib/mock/documents"
import { DocumentActionsMenu } from "./document-actions-menu"

interface DocumentVeilleViewProps {
    documents: MockDocument[]
    selectedId: string | null
    onSelect: (doc: MockDocument) => void
    onToggleFavori: (id: string) => void
    onEdit: (doc: MockDocument) => void
    onDuplicate: (doc: MockDocument) => void
    onAttach: (doc: MockDocument) => void
    onArchive: (id: string) => void
}

const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

function monthKey(iso: string): string {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
}

function formatMonthLabel(key: string): string {
    const [year, month] = key.split("-").map(Number)
    return `${MONTHS_FR[month]} ${year}`
}

function formatDayShort(iso: string): string {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}`
}

function isSameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/* Tags helpers */
function parseTags(csv: string | null): string[] {
    return csv?.split(",").map((t) => t.trim()).filter(Boolean) ?? []
}

/* ============================================================
   Composant principal
   ============================================================ */

export function DocumentVeilleView({
    documents,
    selectedId,
    onSelect,
    onToggleFavori,
    onEdit,
    onDuplicate,
    onAttach,
    onArchive,
}: DocumentVeilleViewProps) {
    /** Grouper par mois (de `createdAt` — c'est l'activité bibliothèque, pas la date du document) */
    const groups = useMemo(() => {
        const sorted = [...documents].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const map = new Map<string, MockDocument[]>()
        for (const d of sorted) {
            const k = monthKey(d.createdAt)
            const arr = map.get(k) ?? []
            arr.push(d)
            map.set(k, arr)
        }
        return Array.from(map.entries())
    }, [documents])

    /** Total cumul ce mois-ci (pour le badge du mois courant) */
    const now = new Date()

    if (documents.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
                    update
                </span>
                <p className="font-body-md text-body-md text-on-surface font-medium">
                    Aucune activité
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Aucun document ajouté correspondant aux filtres.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {groups.map(([key, docs]) => {
                    const isCurrentMonth = isSameMonth(new Date(`${key}-01`), now)
                    return (
                        <section key={key}>
                            {/* Header sticky de mois */}
                            <header className="sticky top-0 z-10 bg-surface-container border-b border-outline-variant px-density-medium py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-outline">
                                        calendar_month
                                    </span>
                                    <h3 className="font-h2 text-[15px] text-primary-container">
                                        {formatMonthLabel(key)}
                                    </h3>
                                    {isCurrentMonth && (
                                        <span className="font-label-caps text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary-container/40 text-secondary border border-secondary-container/50">
                                            En cours
                                        </span>
                                    )}
                                </div>
                                <span className="font-mono-num text-mono-num text-[11px] text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant">
                                    {docs.length} document{docs.length > 1 ? "s" : ""}
                                </span>
                            </header>

                            {/* Timeline des docs du mois */}
                            <ul className="relative py-2">
                                {/* Ligne verticale de timeline */}
                                <div className="absolute left-[36px] top-0 bottom-0 w-px bg-outline-variant/50 pointer-events-none" />
                                {docs.map((d) => (
                                    <VeilleRow
                                        key={d.id}
                                        document={d}
                                        isSelected={selectedId === d.id}
                                        onClick={() => onSelect(d)}
                                        onToggleFavori={() => onToggleFavori(d.id)}
                                        onEdit={() => onEdit(d)}
                                        onDuplicate={() => onDuplicate(d)}
                                        onAttach={() => onAttach(d)}
                                        onArchive={() => onArchive(d.id)}
                                    />
                                ))}
                            </ul>
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

/* ============================================================
   VeilleRow — entrée timeline avec marker date à gauche
   ============================================================ */

interface VeilleRowProps {
    document: MockDocument
    isSelected: boolean
    onClick: () => void
    onToggleFavori: () => void
    onEdit: () => void
    onDuplicate: () => void
    onAttach: () => void
    onArchive: () => void
}

function VeilleRow({
    document,
    isSelected,
    onClick,
    onToggleFavori,
    onEdit,
    onDuplicate,
    onAttach,
    onArchive,
}: VeilleRowProps) {
    const cat = DOC_CATEGORIES[document.categorie]
    const dom = document.domaineJuridique ? DOMAINES_JURIDIQUES[document.domaineJuridique] : null
    const type = document.type ? DOC_TYPES[document.type] : null
    const issue = document.issue ? ISSUES_JURIS[document.issue] : null
    const tagsList = parseTags(document.tags)

    return (
        <li>
            <div
                onClick={onClick}
                className={cn(
                    "group relative flex items-stretch gap-3 px-density-medium py-3 hover:bg-surface-container-low/40 transition-colors cursor-pointer",
                    isSelected && "bg-accent/10 hover:bg-accent/15"
                )}
            >
                {/* Marker date (timeline) */}
                <div className="flex-none w-[58px] flex flex-col items-center pt-1 relative z-10">
                    <div
                        className={cn(
                            "w-3 h-3 rounded-full border-2 transition-colors",
                            isSelected
                                ? "bg-accent border-accent shadow-[0_0_0_3px_rgba(200,119,47,0.2)]"
                                : "bg-surface-container-lowest border-outline-variant group-hover:border-accent"
                        )}
                    />
                    <span className="font-mono-num text-[10px] text-outline mt-1 text-center leading-tight">
                        {formatDayShort(document.createdAt)}
                    </span>
                </div>

                {/* Content card */}
                <div className="flex-1 min-w-0 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 group-hover:border-outline transition-colors">
                    {/* Header : chips + favori + 3-dot */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span
                                className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                    cat.chip
                                )}
                            >
                                {cat.label}
                            </span>
                            {dom && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-label-caps text-[10px] uppercase bg-surface-container-high text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[12px]">{dom.icon}</span>
                                    {dom.label}
                                </span>
                            )}
                            {type && (
                                <span className="font-mono-num text-[10px] text-outline">· {type}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={onToggleFavori}
                                aria-label={document.estFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
                                className="p-1 rounded hover:bg-surface-container transition-colors"
                            >
                                <span
                                    className={cn(
                                        "material-symbols-outlined text-[16px]",
                                        document.estFavori ? "text-secondary" : "text-outline-variant hover:text-outline"
                                    )}
                                    style={
                                        document.estFavori ? { fontVariationSettings: "'FILL' 1" } : undefined
                                    }
                                >
                                    star
                                </span>
                            </button>
                            <DocumentActionsMenu
                                onEdit={onEdit}
                                onDuplicate={onDuplicate}
                                onAttach={onAttach}
                                onToggleFavori={onToggleFavori}
                                onArchive={onArchive}
                                isFavori={document.estFavori}
                                size={16}
                            />
                        </div>
                    </div>

                    {/* Titre */}
                    <h4
                        className="font-body-md text-body-md font-semibold text-on-surface line-clamp-1 mb-1 group-hover:text-primary-container transition-colors"
                        title={document.titre}
                    >
                        {document.titre}
                    </h4>

                    {/* Description tronquée */}
                    {document.description && (
                        <p className="font-body-sm text-[12px] text-on-surface-variant line-clamp-2 mb-1.5 leading-snug">
                            {document.description}
                        </p>
                    )}

                    {/* Méta : référence + auteur + juridiction + issue + tags */}
                    <div className="flex items-center gap-2 flex-wrap font-body-sm text-[11px] text-outline">
                        {document.reference && (
                            <span className="font-mono-num text-on-surface-variant">{document.reference}</span>
                        )}
                        {document.auteur && (
                            <>
                                <span className="text-outline-variant">·</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">person</span>
                                    {document.auteur}
                                </span>
                            </>
                        )}
                        {document.juridiction && (
                            <>
                                <span className="text-outline-variant">·</span>
                                <span className="inline-flex items-center gap-1 truncate">
                                    <span className="material-symbols-outlined text-[12px]">gavel</span>
                                    {document.juridiction}
                                </span>
                            </>
                        )}
                        {issue && (
                            <>
                                <span className="text-outline-variant">·</span>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]",
                                        issue.chip
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[11px]">{issue.icon}</span>
                                    {issue.label}
                                </span>
                            </>
                        )}
                        {tagsList.length > 0 && (
                            <>
                                <span className="text-outline-variant">·</span>
                                <span className="inline-flex items-center gap-1 flex-wrap">
                                    {tagsList.slice(0, 3).map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-primary text-[10px]"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                    {tagsList.length > 3 && (
                                        <span className="text-outline-variant text-[10px]">
                                            +{tagsList.length - 3}
                                        </span>
                                    )}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </li>
    )
}
