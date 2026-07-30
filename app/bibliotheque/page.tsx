"use client"

import { useEffect, useMemo, useState } from "react"
import type { MockDocument } from "@/lib/mock/documents"
import { patchEntity, showApiError } from "@/lib/api/patch"
import {
    INITIAL_FILTERS,
    applyFilters,
    sortByRelevance,
    type BibliothequeFiltersState,
} from "@/components/bibliotheque/filters-state"
import { BibliothequeToolbar } from "@/components/bibliotheque/bibliotheque-toolbar"
import { BibliothequeFilterDrawer } from "@/components/bibliotheque/bibliotheque-filter-drawer"
import { DocumentTableView } from "@/components/bibliotheque/document-table-view"
import { DocumentGalleryView } from "@/components/bibliotheque/document-gallery-view"
import { DocumentVeilleView } from "@/components/bibliotheque/document-veille-view"
import { DocumentDetailPanel } from "@/components/bibliotheque/document-detail-panel"
import {
    DocumentFormDialog,
    type DocumentFormDraft,
} from "@/components/bibliotheque/document-form-dialog"
import { AttachDossierDialog } from "@/components/bibliotheque/attach-dossier-dialog"
import { usePersistedFilters } from "@/lib/hooks/use-persisted-filters"

export default function BibliothequePage() {
    const [documents, setDocuments] = useState<MockDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    /* Filtres + vue */
    const [filters, setFilters] = usePersistedFilters<BibliothequeFiltersState>("bibliotheque", INITIAL_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)

    /* Mutations locales (mock mode) */
    const [patches, setPatches] = useState<Record<string, Partial<MockDocument>>>({})
    const [created, setCreated] = useState<MockDocument[]>([])
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

    /* Sélection (side panel) + form dialog */
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState<MockDocument | null>(null)
    /* Dialog "Joindre à un dossier" */
    const [attachDoc, setAttachDoc] = useState<MockDocument | null>(null)

    useEffect(() => {
        let alive = true
        fetch("/api/documents")
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<MockDocument[]>
            })
            .then((data) => {
                if (alive) setDocuments(data)
            })
            .catch((e) => {
                if (alive) setError(e instanceof Error ? e.message : "Erreur inconnue")
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [])

    /** Documents consolidés : (serveur + créés) - supprimés + patches */
    const consolidated = useMemo<MockDocument[]>(() => {
        const all = [...documents, ...created].filter((d) => !deletedIds.has(d.id))
        return all.map((d) => ({ ...d, ...(patches[d.id] ?? {}) }))
    }, [documents, created, deletedIds, patches])

    /** Listes peuplant les filtres drawer */
    const availableJuridictions = useMemo(() => {
        const set = new Set<string>()
        for (const d of consolidated) if (d.juridiction) set.add(d.juridiction)
        return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
    }, [consolidated])

    const availableAuteurs = useMemo(() => {
        const set = new Set<string>()
        for (const d of consolidated) if (d.auteur) set.add(d.auteur)
        return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
    }, [consolidated])

    /** Documents filtrés + triés */
    const filtered = useMemo(() => {
        return sortByRelevance(applyFilters(consolidated, filters))
    }, [consolidated, filters])

    /** Compteurs (sur consolidated, indépendants des filtres) */
    const counters = useMemo(() => {
        let jurisp = 0
        let decis = 0
        let doctrine = 0
        let modele = 0
        let interne = 0
        let favoris = 0
        for (const d of consolidated) {
            if (d.statut === "ARCHIVE") continue
            if (d.categorie === "JURISPRUDENCE") jurisp++
            else if (d.categorie === "DECISION_JUSTICE") decis++
            else if (d.categorie === "DOCTRINE") doctrine++
            else if (d.categorie === "MODELE") modele++
            else if (d.categorie === "INTERNE" || d.categorie === "AUTRE") interne++
            if (d.estFavori) favoris++
        }
        return { jurisp, decis, doctrine, modele, interne, favoris }
    }, [consolidated])

    const selectedDocument = useMemo(
        () => (selectedId ? consolidated.find((d) => d.id === selectedId) ?? null : null),
        [selectedId, consolidated]
    )

    /* ============================================================
       Mutations
       ============================================================ */

    const patchDoc = (id: string, changes: Partial<MockDocument>) => {
        const before = patches[id] ?? {}
        setPatches((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...changes } }))
        patchEntity(`/api/documents/${id}`, changes as Record<string, unknown>).catch((e) => {
            setPatches((prev) => ({ ...prev, [id]: before }))
            showApiError("Échec sauvegarde document")(e)
        })
    }

    const handleToggleFavori = (id: string) => {
        const current = consolidated.find((d) => d.id === id)
        if (!current) return
        patchDoc(id, { estFavori: !current.estFavori })
    }

    const openCreate = () => {
        setEditingDoc(null)
        setFormOpen(true)
    }

    const openEdit = (doc: MockDocument) => {
        setEditingDoc(doc)
        setFormOpen(true)
    }

    const handleSaveDraft = async (draft: DocumentFormDraft) => {
        const now = new Date().toISOString()
        if (editingDoc) {
            patchDoc(editingDoc.id, {
                titre: draft.titre.trim(),
                categorie: draft.categorie,
                type: draft.type,
                domaineJuridique: draft.domaineJuridique,
                juridiction: draft.juridiction,
                niveauJuridiction: draft.niveauJuridiction,
                reference: draft.reference,
                dateDocument: draft.dateDocument,
                description: draft.description,
                tags: draft.tags,
                auteur: draft.auteur,
                source: draft.source,
                notes: draft.notes,
                articlesCites: draft.articlesCites,
                issue: draft.issue,
                fileName: draft.attachment?.name ?? null,
                fileSize: draft.attachment?.size ?? null,
                fileUrl: draft.attachment?.url ?? null,
                mimeType: draft.attachment?.type ?? null,
                updatedAt: now,
            })
        } else {
            try {
                const res = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        titre: draft.titre.trim(),
                        categorie: draft.categorie,
                        type: draft.type ?? null,
                        domaineJuridique: draft.domaineJuridique ?? null,
                        juridiction: draft.juridiction ?? null,
                        niveauJuridiction: draft.niveauJuridiction ?? null,
                        reference: draft.reference ?? null,
                        dateDocument: draft.dateDocument
                            ? new Date(draft.dateDocument + "T10:00").toISOString()
                            : null,
                        description: draft.description ?? null,
                        tags: draft.tags ?? "",
                        auteur: draft.auteur ?? null,
                        source: draft.source ?? null,
                        notes: draft.notes ?? null,
                        articlesCites: draft.articlesCites ?? null,
                        issue: draft.issue ?? null,
                        fileName: draft.attachment?.name ?? null,
                        fileSize: draft.attachment?.size ?? null,
                        fileUrl: draft.attachment?.url ?? null,
                    }),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error ?? `HTTP ${res.status}`)
                }
                const newDoc: MockDocument = await res.json()
                setCreated((prev) => [newDoc, ...prev])
            } catch (e) {
                alert("Échec création document : " + (e instanceof Error ? e.message : "Erreur"))
                return
            }
        }
        setFormOpen(false)
        setEditingDoc(null)
    }

    const handleDelete = async (id: string) => {
        const prevDeleted = deletedIds
        setDeletedIds((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
        })
        if (selectedId === id) setSelectedId(null)
        try {
            const r = await fetch(`/api/documents/${id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            const { toast } = await import("@/components/ui/toaster")
            toast.success("Document supprimé.")
        } catch (e) {
            setDeletedIds(prevDeleted)
            const { toast } = await import("@/components/ui/toaster")
            toast.error("Échec : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const handleDuplicate = (doc: MockDocument) => {
        const copy: MockDocument = {
            ...doc,
            id: `doc-local-${Date.now()}`,
            titre: `${doc.titre} (copie)`,
            estFavori: false,
            nbConsultations: 0,
            derniereConsultation: null,
            dossierIdsLies: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        setCreated((prev) => [copy, ...prev])
    }

    const handleAttach = (doc: MockDocument) => {
        setAttachDoc(doc)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden p-container-margin gap-density-medium">
            {/* Header — kicker + titre + ligne de pills compteurs (style mockup) */}
            <header className="flex-none flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                            Productivité
                        </p>
                        <h1 className="font-h1 text-h1 text-primary-container">Bibliothèque</h1>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap font-body-sm text-body-sm text-on-surface-variant">
                        <CounterPill value={counters.jurisp} label="jurisprudences" />
                        <CounterPill value={counters.decis} label="décisions" />
                        <CounterPill value={counters.doctrine} label="doctrines" />
                        <CounterPill value={counters.modele} label="modèles" />
                        <CounterPill value={counters.interne} label="internes" />
                        {counters.favoris > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-container/30 border border-secondary-container/50 text-secondary font-medium">
                                <span
                                    className="material-symbols-outlined text-[14px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    star
                                </span>
                                <span className="font-mono-num">{counters.favoris}</span> favoris
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={openCreate}
                    className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded font-body-sm text-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98] duration-150 ease-out"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nouveau document
                </button>
            </header>

            {/* Toolbar */}
            <div className="flex-none">
                <BibliothequeToolbar
                    filters={filters}
                    onSearchChange={(q) => setFilters((f) => ({ ...f, search: q }))}
                    onClearSearch={() => setFilters((f) => ({ ...f, search: "" }))}
                    onOpenFilters={() => setDrawerOpen(true)}
                    onViewModeChange={(m) => setFilters((f) => ({ ...f, viewMode: m }))}
                />
            </div>

            {/* Contenu : table flex-1 + side panel optionnel (clic row pour ouvrir/fermer) */}
            <div className="flex-1 min-h-0 overflow-hidden flex gap-density-medium">
                <div className="flex-1 min-h-0 min-w-0">
                    {loading ? (
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant h-full flex items-center justify-center">
                            Chargement…
                        </div>
                    ) : error ? (
                        <div className="bg-error-container border border-outline-variant rounded-lg p-6 text-center">
                            <p className="font-body-sm text-on-error-container">
                                Impossible de charger les documents ({error})
                            </p>
                        </div>
                    ) : filters.viewMode === "table" ? (
                        <DocumentTableView
                            documents={filtered}
                            selectedId={selectedId}
                            onSelect={(d) => setSelectedId((cur) => (cur === d.id ? null : d.id))}
                            onToggleFavori={handleToggleFavori}
                            onEdit={openEdit}
                            onDuplicate={handleDuplicate}
                            onAttach={handleAttach}
                            onArchive={handleDelete}
                            onPatch={patchDoc}
                        />
                    ) : filters.viewMode === "gallery" ? (
                        <DocumentGalleryView
                            documents={filtered}
                            selectedId={selectedId}
                            onSelect={(d) => setSelectedId((cur) => (cur === d.id ? null : d.id))}
                            onToggleFavori={handleToggleFavori}
                            onEdit={openEdit}
                            onDuplicate={handleDuplicate}
                            onAttach={handleAttach}
                            onArchive={handleDelete}
                        />
                    ) : (
                        <DocumentVeilleView
                            documents={filtered}
                            selectedId={selectedId}
                            onSelect={(d) => setSelectedId((cur) => (cur === d.id ? null : d.id))}
                            onToggleFavori={handleToggleFavori}
                            onEdit={openEdit}
                            onDuplicate={handleDuplicate}
                            onAttach={handleAttach}
                            onArchive={handleDelete}
                        />
                    )}
                </div>

                {selectedDocument && (
                    <DocumentDetailPanel
                        document={selectedDocument}
                        onClose={() => setSelectedId(null)}
                        onToggleFavori={handleToggleFavori}
                        onEdit={openEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onAttach={handleAttach}
                    />
                )}
            </div>

            {/* Drawer filtres */}
            <BibliothequeFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                availableJuridictions={availableJuridictions}
                availableAuteurs={availableAuteurs}
            />

            {/* Form dialog (create + edit) */}
            {formOpen && (
                <DocumentFormDialog
                    initial={editingDoc}
                    onSave={handleSaveDraft}
                    onClose={() => {
                        setFormOpen(false)
                        setEditingDoc(null)
                    }}
                />
            )}

            {/* Dialog "Joindre à un dossier" */}
            {attachDoc && (
                <AttachDossierDialog
                    document={attachDoc}
                    initialDossierIds={attachDoc.dossierIdsLies}
                    onClose={() => setAttachDoc(null)}
                    onChange={(dossierIds) => {
                        // Met à jour le state local uniquement (l'API est déjà appelée
                        // dans le dialog au moment du toggle). On n'appelle PAS patchDoc
                        // car dossierIdsLies est une relation, pas un champ de Document.
                        setPatches((prev) => ({
                            ...prev,
                            [attachDoc.id]: { ...(prev[attachDoc.id] ?? {}), dossierIdsLies: dossierIds },
                        }))
                    }}
                />
            )}
        </div>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

function CounterPill({ value, label }: { value: number; label: string }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 text-on-surface-variant">
            <span className="font-mono-num text-mono-num text-primary-container mr-1">{value}</span>
            {label}
        </span>
    )
}

