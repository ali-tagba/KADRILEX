"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    DOC_CATEGORIES,
    DOC_TYPES,
    DOMAINES_JURIDIQUES,
    ISSUES_JURIS,
    NIVEAUX_JURIDICTION,
} from "@/lib/constants/biblio"
import type { MockDocument } from "@/lib/mock/documents"
import { DocumentActionsMenu } from "./document-actions-menu"
import { FilePreviewModal } from "@/components/shared/file-preview-modal"

interface DocumentDetailPanelProps {
    document: MockDocument | null
    onClose: () => void
    onToggleFavori: (id: string) => void
    onEdit: (doc: MockDocument) => void
    onDuplicate: (doc: MockDocument) => void
    onArchive: (id: string) => void
    onAttach: (doc: MockDocument) => void
}

function formatDateLong(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

function formatSize(bytes: number | null): string {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatRelative(iso: string | null): string {
    if (!iso) return "Jamais"
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return "Hier"
    if (days < 7) return `Il y a ${days}j`
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export function DocumentDetailPanel({
    document,
    onClose,
    onToggleFavori,
    onEdit,
    onDuplicate,
    onArchive,
    onAttach,
}: DocumentDetailPanelProps) {
    /* Reset scroll quand on change de document */
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
        setPreviewOpen(false)
    }, [document?.id])

    /* Dossiers liés — la liste consolidée côté page ne contient que les IDs ;
       on va chercher les objets complets (numero/titre) pour un affichage lisible. */
    const [dossiersLies, setDossiersLies] = useState<{ id: string; numero: string; titre: string }[]>([])
    useEffect(() => {
        setDossiersLies([])
        if (!document || document.dossierIdsLies.length === 0) return
        let alive = true
        fetch(`/api/documents/${document.id}`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (alive && data?.dossiers) setDossiersLies(data.dossiers)
            })
            .catch(() => undefined)
        return () => {
            alive = false
        }
    }, [document])

    const downloadFile = () => {
        if (!document) return
        const fileUrl = document.fileUrl
        if (!fileUrl) {
            alert("Pas de fichier joint — uploade un fichier via le formulaire de modification.")
            return
        }
        const name = document.fileName ?? `${document.titre}`
        fetch(`/api/storage/download-url?path=${encodeURIComponent(fileUrl)}&ttl=3600`, {
            credentials: "include",
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { signedUrl?: string } | null) => {
                const href = data?.signedUrl ?? fileUrl
                const a = window.document.createElement("a")
                a.href = href
                a.download = name
                window.document.body.appendChild(a)
                a.click()
                window.document.body.removeChild(a)
            })
            .catch(() => {
                const a = window.document.createElement("a")
                a.href = fileUrl
                a.download = name
                window.document.body.appendChild(a)
                a.click()
                window.document.body.removeChild(a)
            })
    }

    /* ESC pour fermer */
    useEffect(() => {
        if (!document) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [document, onClose])

    if (!document) return null

    const cat = DOC_CATEGORIES[document.categorie]
    const dom = document.domaineJuridique ? DOMAINES_JURIDIQUES[document.domaineJuridique] : null
    const type = document.type ? DOC_TYPES[document.type] : null
    const niveau = document.niveauJuridiction ? NIVEAUX_JURIDICTION[document.niveauJuridiction] : null
    const issue = document.issue ? ISSUES_JURIS[document.issue] : null
    const tagsList = document.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []
    const articlesList = document.articlesCites?.split(",").map((t) => t.trim()).filter(Boolean) ?? []

    return (
        <aside
            role="dialog"
            aria-label="Détails du document"
            className="w-[440px] flex-shrink-0 bg-surface-container-lowest border-l border-outline-variant flex flex-col h-full min-h-0 shadow-[-4px_0_24px_-10px_rgba(31,26,20,0.1)]"
        >
            {/* Header — fixe */}
            <header className="flex-none flex items-center justify-between px-density-medium py-3 border-b border-outline-variant bg-surface-container">
                <h3 className="font-h2 text-h2 text-primary truncate min-w-0 mr-2">Détails du document</h3>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                        onClick={() => onToggleFavori(document.id)}
                        title={document.estFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
                        className="p-1.5 rounded hover:bg-surface-container-low transition-colors"
                    >
                        <span
                            className={cn(
                                "material-symbols-outlined text-[20px] block",
                                document.estFavori ? "text-secondary" : "text-outline"
                            )}
                            style={document.estFavori ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                            star
                        </span>
                    </button>
                    <DocumentActionsMenu
                        onEdit={() => onEdit(document)}
                        onDuplicate={() => onDuplicate(document)}
                        onAttach={() => onAttach(document)}
                        onToggleFavori={() => onToggleFavori(document.id)}
                        onArchive={() => onArchive(document.id)}
                        isFavori={document.estFavori}
                        archived={document.statut === "ARCHIVE"}
                        size={20}
                    />
                    <button
                        onClick={onClose}
                        aria-label="Fermer le panneau"
                        className="p-1.5 rounded hover:bg-surface-container-low text-outline hover:text-on-surface transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] block">close</span>
                    </button>
                </div>
            </header>

            {/* Zone scrollable unique : preview + body content */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                {/* Aperçu cliquable (ouvre la modal universelle) */}
                <button
                    type="button"
                    onClick={() => document.fileUrl && setPreviewOpen(true)}
                    disabled={!document.fileUrl}
                    title={
                        document.fileUrl
                            ? "Cliquer pour prévisualiser le fichier"
                            : "Aucun fichier joint"
                    }
                    className={cn(
                        "w-full bg-surface-variant relative flex items-center justify-center overflow-hidden border-b border-outline-variant aspect-[4/3] group",
                        document.fileUrl ? "cursor-pointer" : "cursor-not-allowed"
                    )}
                >
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage:
                                "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiM2YjQ0MjMiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==\")",
                        }}
                    />
                    <div className="w-3/4 h-[85%] bg-white shadow-sm border border-outline-variant p-4 flex flex-col relative z-10 group-hover:shadow-lg transition-shadow">
                        <div className="w-1/3 h-2 bg-surface-variant mb-4 rounded" />
                        <div className="w-full h-1 bg-surface-variant mb-2 rounded" />
                        <div className="w-5/6 h-1 bg-surface-variant mb-2 rounded" />
                        <div className="w-full h-1 bg-surface-variant mb-2 rounded" />
                        <div className="w-4/6 h-1 bg-surface-variant mb-6 rounded" />
                        <div className="flex-1 border border-outline-variant flex items-center justify-center text-outline-variant">
                            <span className="material-symbols-outlined text-[40px]">picture_as_pdf</span>
                        </div>
                    </div>
                    {document.fileUrl && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity z-20">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-primary font-body-sm text-body-sm font-semibold shadow-lg">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                Prévisualiser
                            </span>
                        </div>
                    )}
                </button>

                {/* Contenu metadata + description + tags */}
                <div className="px-density-medium py-density-medium flex flex-col gap-density-medium">
                    {/* Titre + chips */}
                    <div>
                        <h2 className="font-h2 text-h2 text-on-surface mb-2 leading-snug">{document.titre}</h2>
                        <div className="flex flex-wrap gap-1.5">
                            <span
                                className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                    cat.chip
                                )}
                            >
                                {cat.label}
                            </span>
                            {dom && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase bg-surface-container-high text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[12px]">{dom.icon}</span>
                                    {dom.label}
                                </span>
                            )}
                            {issue && (
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                        issue.chip
                                    )}
                                >
                                    <span className="material-symbols-outlined text-[12px]">{issue.icon}</span>
                                    {issue.label}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Métadonnées (grid 2 col) */}
                    <section>
                        <h4 className="font-label-caps text-label-caps text-outline uppercase mb-2">Métadonnées</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Meta label="Référence" value={document.reference} mono />
                            <Meta label="Type" value={type} />
                            <Meta label="Juridiction" value={document.juridiction} />
                            <Meta label="Niveau" value={niveau} />
                            <Meta label="Date du document" value={formatDateLong(document.dateDocument)} mono />
                            <Meta label="Auteur" value={document.auteur} />
                            {document.source && <Meta label="Source" value={document.source} className="col-span-2" />}
                        </div>
                    </section>

                    {/* Description */}
                    {document.description && (
                        <section>
                            <h4 className="font-label-caps text-label-caps text-outline uppercase mb-2">
                                Description / Sommaire
                            </h4>
                            <p className="font-body-sm text-body-sm text-on-surface leading-relaxed text-justify">
                                {document.description}
                            </p>
                        </section>
                    )}

                    {/* Articles cités */}
                    {articlesList.length > 0 && (
                        <section>
                            <h4 className="font-label-caps text-label-caps text-outline uppercase mb-2">
                                Articles cités
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {articlesList.map((a) => (
                                    <span
                                        key={a}
                                        className="px-2 py-1 bg-surface-container text-[11px] rounded border border-outline-variant font-mono-num text-on-surface-variant"
                                    >
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Tags */}
                    {tagsList.length > 0 && (
                        <section>
                            <h4 className="font-label-caps text-label-caps text-outline uppercase mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {tagsList.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent/10 text-primary text-[11px] border border-accent/30"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Notes internes */}
                    {document.notes && (
                        <section className="bg-surface-container-low border border-outline-variant rounded p-3">
                            <h4 className="font-label-caps text-label-caps text-outline uppercase mb-1.5 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                Notes internes
                            </h4>
                            <p className="font-body-sm text-[12px] text-on-surface italic">{document.notes}</p>
                        </section>
                    )}

                    {/* Dossiers liés */}
                    {document.dossierIdsLies.length > 0 && (
                        <section>
                            <h4 className="font-label-caps text-label-caps text-outline uppercase mb-2">
                                Dossiers liés ({document.dossierIdsLies.length})
                            </h4>
                            <ul className="space-y-1">
                                {document.dossierIdsLies.map((id) => {
                                    const dossier = dossiersLies.find((d) => d.id === id)
                                    return (
                                        <li key={id}>
                                            <Link
                                                href={`/dossiers/${id}`}
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[12px] transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px] text-outline">
                                                    folder
                                                </span>
                                                {dossier ? (
                                                    <>
                                                        <span className="font-mono-num">{dossier.numero}</span>
                                                        <span className="text-outline truncate max-w-[160px]">
                                                            {dossier.titre}
                                                        </span>
                                                    </>
                                                ) : (
                                                    "Chargement…"
                                                )}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    )}

                    {/* Stats usage */}
                    <section className="text-[11px] text-outline border-t border-outline-variant/40 pt-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                Consulté <strong className="font-mono-num mx-0.5">{document.nbConsultations}</strong> fois
                            </span>
                            <span>·</span>
                            <span>Dernière : {formatRelative(document.derniereConsultation)}</span>
                        </div>
                        {document.fileName && (
                            <div className="flex items-center gap-1 mt-1.5">
                                <span className="material-symbols-outlined text-[14px]">attach_file</span>
                                <span className="truncate">
                                    {document.fileName} ({formatSize(document.fileSize)})
                                </span>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Footer actions — fixe */}
            <footer className="flex-none px-density-medium py-3 border-t border-outline-variant bg-surface-container-low/50 flex flex-col gap-2">
                <button
                    onClick={() => onAttach(document)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded font-body-sm text-body-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    Joindre à un dossier
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        onClick={() => onEdit(document)}
                        className="flex items-center justify-center gap-1 border border-outline-variant text-on-surface py-1.5 rounded font-body-sm text-[12px] hover:bg-surface-container-low transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Modifier
                    </button>
                    <button
                        disabled={!document.fileUrl}
                        onClick={() => setPreviewOpen(true)}
                        className="flex items-center justify-center gap-1 border border-outline-variant text-on-surface py-1.5 rounded font-body-sm text-[12px] hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        Prévisualiser
                    </button>
                    <button
                        disabled={!document.fileUrl}
                        onClick={downloadFile}
                        className="flex items-center justify-center gap-1 border border-outline-variant text-on-surface py-1.5 rounded font-body-sm text-[12px] hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        Télécharger
                    </button>
                </div>
            </footer>

            {/* Modal de prévisualisation universelle */}
            {previewOpen && document.fileUrl && (
                <FilePreviewModal
                    storagePath={document.fileUrl}
                    fileName={document.fileName ?? document.titre}
                    mimeType={document.mimeType}
                    size={document.fileSize}
                    onClose={() => setPreviewOpen(false)}
                />
            )}
        </aside>
    )
}

/* ============================================================
   Meta — bloc clé/valeur réutilisé dans la grid métadonnées
   ============================================================ */

function Meta({
    label,
    value,
    mono,
    className,
}: {
    label: string
    value: string | null
    mono?: boolean
    className?: string
}) {
    return (
        <div className={cn("bg-surface-container-low/40 px-2.5 py-2 rounded border border-outline-variant/60", className)}>
            <div className="font-label-caps text-[9px] text-outline uppercase mb-0.5">{label}</div>
            <div
                className={cn(
                    "text-[12px] text-on-surface font-medium truncate",
                    mono && "font-mono-num"
                )}
                title={value ?? undefined}
            >
                {value || <span className="text-outline-variant font-normal">—</span>}
            </div>
        </div>
    )
}
