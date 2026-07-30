"use client"

import { useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import {
    DOC_CATEGORIES,
    DOC_TYPES,
    DOMAINES_JURIDIQUES,
    ISSUES_JURIS,
    NIVEAUX_JURIDICTION,
    type DocCategorieKey,
    type DocTypeKey,
    type DomaineJuridiqueKey,
    type IssueJurisKey,
    type NiveauJuridictionKey,
} from "@/lib/constants/biblio"
import { JURIDICTIONS_NIGER } from "@/lib/constants/legal"
import type { MockDocument } from "@/lib/mock/documents"
import { FileUploadField, type AttachmentInfo } from "@/components/facturation/file-upload-field"

export interface DocumentFormDraft {
    titre: string
    categorie: DocCategorieKey
    type: DocTypeKey | null
    domaineJuridique: DomaineJuridiqueKey | null
    juridiction: string | null
    niveauJuridiction: NiveauJuridictionKey | null
    reference: string | null
    dateDocument: string | null
    description: string | null
    tags: string | null
    auteur: string | null
    source: string | null
    notes: string | null
    articlesCites: string | null
    issue: IssueJurisKey | null
    /** Fichier joint (PDF, DOCX…) uploadé sur Supabase Storage */
    attachment: AttachmentInfo | null
}

interface DocumentFormDialogProps {
    /** null = mode création, document existant = mode édition */
    initial: MockDocument | null
    onSave: (draft: DocumentFormDraft) => void
    onClose: () => void
}

function toDateInput(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fromDateInput(s: string): string | null {
    if (!s) return null
    return new Date(s).toISOString()
}

export function DocumentFormDialog({ initial, onSave, onClose }: DocumentFormDialogProps) {
    const [draft, setDraft] = useState<DocumentFormDraft>(() => ({
        titre: initial?.titre ?? "",
        categorie: initial?.categorie ?? "JURISPRUDENCE",
        type: initial?.type ?? null,
        domaineJuridique: initial?.domaineJuridique ?? null,
        juridiction: initial?.juridiction ?? null,
        niveauJuridiction: initial?.niveauJuridiction ?? null,
        reference: initial?.reference ?? null,
        dateDocument: initial?.dateDocument ?? null,
        description: initial?.description ?? null,
        tags: initial?.tags ?? null,
        auteur: initial?.auteur ?? null,
        source: initial?.source ?? null,
        notes: initial?.notes ?? null,
        articlesCites: initial?.articlesCites ?? null,
        issue: initial?.issue ?? null,
        attachment:
            initial?.fileUrl && initial?.fileName
                ? {
                      name: initial.fileName,
                      size: initial.fileSize ?? 0,
                      url: initial.fileUrl,
                      type: initial.mimeType ?? "application/octet-stream",
                  }
                : null,
    }))

    useEscapeClose(onClose)

    /** Catégorie courante : permet d'afficher le champ "Issue" uniquement si pertinent */
    const isJurisOrDecision = draft.categorie === "JURISPRUDENCE" || draft.categorie === "DECISION_JUSTICE"

    const isValid = draft.titre.trim().length > 0

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
            onClick={() => onClose()}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex-none px-density-medium py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container">
                    <h3 className="font-h2 text-h2 text-on-background">
                        {initial ? "Modifier le document" : "Nouveau document"}
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="text-outline hover:text-on-background transition-colors"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-medium py-density-medium flex flex-col gap-4">
                    {/* Titre */}
                    <Field label="Titre" required>
                        <input
                            type="text"
                            value={draft.titre}
                            onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
                            placeholder="Ex : Arrêt CCJA n°042/2024 — Saisie-attribution"
                            autoFocus
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </Field>

                    {/* Catégorie + Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Catégorie" required>
                            <select
                                value={draft.categorie}
                                onChange={(e) => setDraft({ ...draft, categorie: e.target.value as DocCategorieKey })}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {(Object.entries(DOC_CATEGORIES) as [DocCategorieKey, { label: string }][]).map(
                                    ([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                        <Field label="Type">
                            <select
                                value={draft.type ?? ""}
                                onChange={(e) =>
                                    setDraft({ ...draft, type: (e.target.value || null) as DocTypeKey | null })
                                }
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="">— Choisir un type —</option>
                                {(Object.entries(DOC_TYPES) as [DocTypeKey, string][]).map(([k, label]) => (
                                    <option key={k} value={k}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    {/* Domaine + Niveau */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Domaine juridique">
                            <select
                                value={draft.domaineJuridique ?? ""}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        domaineJuridique: (e.target.value || null) as DomaineJuridiqueKey | null,
                                    })
                                }
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="">— Aucun —</option>
                                {(Object.entries(DOMAINES_JURIDIQUES) as [DomaineJuridiqueKey, { label: string }][]).map(
                                    ([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                        <Field label="Niveau de juridiction">
                            <select
                                value={draft.niveauJuridiction ?? ""}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        niveauJuridiction: (e.target.value || null) as NiveauJuridictionKey | null,
                                    })
                                }
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="">— Aucun —</option>
                                {(Object.entries(NIVEAUX_JURIDICTION) as [NiveauJuridictionKey, string][]).map(
                                    ([k, label]) => (
                                        <option key={k} value={k}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                    </div>

                    {/* Juridiction + Référence */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Juridiction">
                            <input
                                type="text"
                                list="juridictions-niger"
                                value={draft.juridiction ?? ""}
                                onChange={(e) => setDraft({ ...draft, juridiction: e.target.value || null })}
                                placeholder="Ex : CCJA Abidjan, TGI Niamey…"
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                            <datalist id="juridictions-niger">
                                {JURIDICTIONS_NIGER.map((j) => (
                                    <option key={j} value={j} />
                                ))}
                            </datalist>
                        </Field>
                        <Field label="Référence">
                            <input
                                type="text"
                                value={draft.reference ?? ""}
                                onChange={(e) => setDraft({ ...draft, reference: e.target.value || null })}
                                placeholder="Ex : Arrêt n°042/2024"
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono-num"
                            />
                        </Field>
                    </div>

                    {/* Date + Issue */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date du document">
                            <input
                                type="date"
                                value={toDateInput(draft.dateDocument)}
                                onChange={(e) => setDraft({ ...draft, dateDocument: fromDateInput(e.target.value) })}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                        {isJurisOrDecision && (
                            <Field label="Issue de la décision">
                                <select
                                    value={draft.issue ?? ""}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            issue: (e.target.value || null) as IssueJurisKey | null,
                                        })
                                    }
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <option value="">— Non renseigné —</option>
                                    {(Object.entries(ISSUES_JURIS) as [IssueJurisKey, { label: string }][]).map(
                                        ([k, m]) => (
                                            <option key={k} value={k}>
                                                {m.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </Field>
                        )}
                    </div>

                    {/* Description */}
                    <Field label="Description / Sommaire">
                        <textarea
                            value={draft.description ?? ""}
                            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
                            placeholder="Résumé du contenu, points clés, attendus de la décision…"
                            rows={4}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    {/* Articles cités + Tags */}
                    <Field label="Articles cités (séparés par virgule)">
                        <input
                            type="text"
                            value={draft.articlesCites ?? ""}
                            onChange={(e) => setDraft({ ...draft, articlesCites: e.target.value || null })}
                            placeholder="Ex : Art. 28 AUPSRVE, Art. 90 AUDCG"
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono-num"
                        />
                    </Field>

                    <Field label="Tags (séparés par virgule)">
                        <input
                            type="text"
                            value={draft.tags ?? ""}
                            onChange={(e) => setDraft({ ...draft, tags: e.target.value || null })}
                            placeholder="Ex : OHADA, recouvrement, Niger"
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </Field>

                    {/* Auteur + Source */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Auteur">
                            <input
                                type="text"
                                value={draft.auteur ?? ""}
                                onChange={(e) => setDraft({ ...draft, auteur: e.target.value || null })}
                                placeholder="Ex : Pr. P. Santos"
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                        <Field label="Source">
                            <input
                                type="text"
                                value={draft.source ?? ""}
                                onChange={(e) => setDraft({ ...draft, source: e.target.value || null })}
                                placeholder="Ex : Recueil CCJA T.32"
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                    </div>

                    {/* Notes internes */}
                    <Field label="Notes internes (privées)">
                        <textarea
                            value={draft.notes ?? ""}
                            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                            placeholder="Notes confidentielles, usage cabinet uniquement…"
                            rows={2}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    {/* Pièce jointe — upload réel Supabase Storage */}
                    <FileUploadField
                        value={draft.attachment}
                        onChange={(att) => setDraft({ ...draft, attachment: att })}
                        label="Pièce jointe (PDF, DOCX, image…)"
                        hint="10 Mo max — facultatif. Pourra être prévisualisé dans la fiche document."
                        category="documents"
                    />
                </div>

                {/* Footer */}
                <footer className="flex-none px-density-medium py-3 border-t border-outline-variant bg-surface-container-low/40 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="px-3 py-1.5 border border-outline-variant rounded font-body-sm hover:bg-surface-container-low transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave(draft)}
                        disabled={!isValid}
                        className="px-4 py-1.5 bg-accent text-white rounded font-body-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                        {initial ? "Enregistrer" : "Créer le document"}
                    </button>
                </footer>
            </div>
        </div>
    )
}

function Field({
    label,
    required,
    children,
}: {
    label: string
    required?: boolean
    children: React.ReactNode
}) {
    return (
        <label className="block">
            <span className="font-label-caps text-label-caps text-outline uppercase mb-1.5 block">
                {label}
                {required && <span className="text-error ml-0.5">*</span>}
            </span>
            {children}
        </label>
    )
}
