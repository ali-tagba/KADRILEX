"use client"

import { cn } from "@/lib/utils"
import {
    DOC_CATEGORIES,
    DOC_TYPES,
    DOMAINES_JURIDIQUES,
    ISSUES_JURIS,
} from "@/lib/constants/biblio"
import type { MockDocument } from "@/lib/mock/documents"
import { DocumentActionsMenu } from "./document-actions-menu"

interface DocumentGalleryViewProps {
    documents: MockDocument[]
    selectedId: string | null
    onSelect: (doc: MockDocument) => void
    onToggleFavori: (id: string) => void
    onEdit: (doc: MockDocument) => void
    onDuplicate: (doc: MockDocument) => void
    onAttach: (doc: MockDocument) => void
    onArchive: (id: string) => void
}

function formatDate(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
}

export function DocumentGalleryView({
    documents,
    selectedId,
    onSelect,
    onToggleFavori,
    onEdit,
    onDuplicate,
    onAttach,
    onArchive,
}: DocumentGalleryViewProps) {
    if (documents.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
                    library_books
                </span>
                <p className="font-body-md text-body-md text-on-surface font-medium">
                    Aucun document trouvé
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Ajustez la recherche ou les filtres.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-density-medium">
                <div className="grid gap-density-medium grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {documents.map((d) => (
                        <DocumentCard
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
                </div>
            </div>
        </div>
    )
}

/* ============================================================
   DocumentCard — card catalogue bibliothèque numérique
   ============================================================ */

interface DocumentCardProps {
    document: MockDocument
    isSelected: boolean
    onClick: () => void
    onToggleFavori: () => void
    onEdit: () => void
    onDuplicate: () => void
    onAttach: () => void
    onArchive: () => void
}

function DocumentCard({
    document,
    isSelected,
    onClick,
    onToggleFavori,
    onEdit,
    onDuplicate,
    onAttach,
    onArchive,
}: DocumentCardProps) {
    const cat = DOC_CATEGORIES[document.categorie]
    const dom = document.domaineJuridique ? DOMAINES_JURIDIQUES[document.domaineJuridique] : null
    const type = document.type ? DOC_TYPES[document.type] : null
    const issue = document.issue ? ISSUES_JURIS[document.issue] : null
    const tagsList = document.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []

    return (
        <article
            onClick={onClick}
            className={cn(
                "group relative bg-surface-container-lowest border rounded-lg overflow-hidden hover:shadow-md transition-all duration-150 flex flex-col cursor-pointer",
                isSelected
                    ? "border-accent shadow-md ring-1 ring-accent/30"
                    : "border-outline-variant hover:border-accent/50"
            )}
        >
            {/* Header : preview thumbnail style livre/document */}
            <div className="relative h-[180px] bg-surface-container-low overflow-hidden flex items-center justify-center">
                {/* Pattern fond subtle */}
                <div
                    className="absolute inset-0 opacity-15"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiM2YjQ0MjMiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==\")",
                    }}
                />

                {/* Mini doc preview façon "livre" */}
                <div
                    className={cn(
                        "relative z-10 w-[105px] h-[140px] bg-white shadow-sm border border-outline-variant flex flex-col p-2.5 transition-transform duration-200",
                        "group-hover:scale-105 group-hover:shadow-md"
                    )}
                >
                    {/* Lignes simulant le contenu */}
                    <div className="w-1/2 h-1.5 bg-surface-variant mb-2 rounded-sm" />
                    <div className="w-full h-1 bg-surface-variant mb-1 rounded-sm" />
                    <div className="w-5/6 h-1 bg-surface-variant mb-1 rounded-sm" />
                    <div className="w-full h-1 bg-surface-variant mb-1 rounded-sm" />
                    <div className="w-3/4 h-1 bg-surface-variant mb-3 rounded-sm" />
                    {/* Icône PDF/DOCX en bas */}
                    <div className="flex-1 flex items-end justify-center">
                        <span
                            className="material-symbols-outlined text-outline-variant"
                            style={{ fontSize: 28 }}
                        >
                            {document.fileName?.endsWith(".docx") || document.fileName?.endsWith(".doc")
                                ? "description"
                                : "picture_as_pdf"}
                        </span>
                    </div>
                </div>

                {/* Badge type document en haut-gauche */}
                {type && (
                    <span className="absolute top-2 left-2 z-10 inline-flex items-center px-1.5 py-0.5 rounded bg-white/80 backdrop-blur border border-outline-variant/60 font-label-caps text-[9px] uppercase text-on-surface-variant">
                        {type}
                    </span>
                )}

                {/* Toggle favori en haut-droite */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavori()
                    }}
                    aria-label={document.estFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur border border-outline-variant/60 flex items-center justify-center hover:bg-white transition-colors"
                >
                    <span
                        className={cn(
                            "material-symbols-outlined text-[16px]",
                            document.estFavori ? "text-secondary" : "text-outline"
                        )}
                        style={document.estFavori ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                        star
                    </span>
                </button>
            </div>

            {/* Body */}
            <div className="px-3 py-2.5 flex flex-col gap-2 flex-1">
                {/* Header : catégorie + 3-dot */}
                <div className="flex items-start justify-between gap-1.5">
                    <span
                        className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[10px] uppercase",
                            cat.chip
                        )}
                    >
                        {cat.label}
                    </span>
                    <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 -mr-1 -mt-1">
                        <DocumentActionsMenu
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            onAttach={onAttach}
                            onToggleFavori={onToggleFavori}
                            onArchive={onArchive}
                            isFavori={document.estFavori}
                            archived={document.statut === "ARCHIVE"}
                            size={16}
                        />
                    </div>
                </div>

                {/* Titre */}
                <h3
                    className="font-body-md text-body-md font-semibold text-on-surface line-clamp-2 leading-snug group-hover:text-primary-container transition-colors"
                    title={document.titre}
                >
                    {document.titre}
                </h3>

                {/* Référence + auteur */}
                <div className="font-mono-num text-[11px] text-outline truncate">
                    {document.reference ?? document.fileName ?? "—"}
                    {document.auteur && (
                        <span className="text-on-surface-variant"> · {document.auteur}</span>
                    )}
                </div>

                {/* Méta : domaine + juridiction + date (compact) */}
                <ul className="flex flex-col gap-1 font-body-sm text-[11px] text-on-surface-variant">
                    {dom && (
                        <MetaLine icon={dom.icon}>
                            <span className="truncate">{dom.label}</span>
                        </MetaLine>
                    )}
                    {document.juridiction && (
                        <MetaLine icon="gavel">
                            <span className="truncate">{document.juridiction}</span>
                        </MetaLine>
                    )}
                    {document.dateDocument && (
                        <MetaLine icon="calendar_today">
                            <span className="font-mono-num">{formatDate(document.dateDocument)}</span>
                        </MetaLine>
                    )}
                </ul>

                {/* Tags (max 3) */}
                {tagsList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {tagsList.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-accent/10 text-primary text-[10px] border border-accent/20"
                            >
                                #{tag}
                            </span>
                        ))}
                        {tagsList.length > 3 && (
                            <span className="text-[10px] text-outline self-center">
                                +{tagsList.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer : issue + stats */}
            <footer className="px-3 py-2 border-t border-outline-variant/60 bg-surface-container-low/40 flex items-center justify-between gap-2">
                {issue ? (
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-body-sm text-[11px]",
                            issue.chip
                        )}
                    >
                        <span className="material-symbols-outlined text-[12px]">{issue.icon}</span>
                        {issue.label}
                    </span>
                ) : (
                    <span className="font-body-sm text-[11px] text-outline-variant">—</span>
                )}
                <span
                    className="inline-flex items-center gap-1 font-body-sm text-[11px] text-on-surface-variant"
                    title={`${document.nbConsultations} consultation${document.nbConsultations > 1 ? "s" : ""}`}
                >
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                    <span className="font-mono-num">{document.nbConsultations}</span>
                </span>
            </footer>
        </article>
    )
}

function MetaLine({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <li className="inline-flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[13px] text-outline flex-shrink-0">
                {icon}
            </span>
            <span className="truncate min-w-0">{children}</span>
        </li>
    )
}
