"use client"

import { useMemo, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import {
    DIRECTIONS_FACTURE,
    TVA_NIGER,
    calcTTC,
    calcTVA,
    formatFCFA,
    type DirectionFactureKey,
} from "@/lib/constants/finance"
import type { MockFacture, MockLigneFacture } from "@/lib/mock/invoices"
import { mockClients, clientDisplayName, type MockClient } from "@/lib/mock/clients"
import { mockDossiers, type MockDossier } from "@/lib/mock/dossiers"
import { FileUploadField, type AttachmentInfo } from "./file-upload-field"

export interface FactureFormDraft {
    direction: DirectionFactureKey
    type: "HONORAIRES" | "PROVISION" | "FRAIS" | "AUTRE"
    date: string // ISO
    dateEcheance: string | null
    clientId: string | null
    dossierId: string | null
    audienceId: string | null
    fournisseurId: string | null
    fournisseurNomLibre: string | null
    tvaRate: number
    lignes: MockLigneFacture[]
    description: string | null
    notes: string | null
    /** PDF / image de la facture (signed URL en mock) */
    attachment: AttachmentInfo | null
    /** Action finale */
    saveAs: "BROUILLON" | "EMISE"
}

interface FactureFormDialogProps {
    /** null pour création */
    initial: MockFacture | null
    /** Pré-remplissage depuis l'URL ou la fiche dossier */
    presetClientId?: string | null
    presetDossierId?: string | null
    clients?: any[]
    dossiers?: any[]
    onSave: (draft: FactureFormDraft) => void
    /** Callback déclenché après une (re)génération réussie — pour propager au parent */
    onGenerated?: (updated: { generatedPdfUrl: string; generatedPdfAt: string }) => void
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
function defaultEcheance(): string {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString()
}

export function FactureFormDialog({
    initial,
    presetClientId = null,
    presetDossierId = null,
    clients,
    dossiers,
    onSave,
    onGenerated,
    onClose,
}: FactureFormDialogProps) {
    useEscapeClose(onClose)
    const [generating, setGenerating] = useState(false)
    /** Verrou anti double-clic sur Enregistrer (empêche les doublons en DB) */
    const [saving, setSaving] = useState(false)
    /** Override local après génération réussie — pour rafraîchir l'état du bouton
     *  sans attendre que le parent re-pousse les props. */
    const [localGen, setLocalGen] = useState<{ url: string; at: string } | null>(null)

    function handleSave(saveAs: "BROUILLON" | "EMISE") {
        if (saving) return
        setSaving(true)
        try {
            onSave({ ...draft, saveAs })
        } finally {
            // Petite tempo pour empêcher un re-click avant la fermeture du dialog
            window.setTimeout(() => setSaving(false), 800)
        }
    }

    /* État formulaire */
    const [draft, setDraft] = useState<FactureFormDraft>(() => {
        const today = new Date().toISOString()
        return {
            direction: initial?.direction ?? "EMISE",
            type: initial?.type ?? "HONORAIRES",
            date: initial?.date ?? today,
            dateEcheance: initial?.dateEcheance ?? defaultEcheance(),
            clientId: initial?.clientId ?? presetClientId ?? null,
            dossierId: initial?.dossierId ?? presetDossierId ?? null,
            audienceId: initial?.audienceId ?? null,
            fournisseurId: initial?.fournisseurId ?? null,
            fournisseurNomLibre: initial?.fournisseurNomLibre ?? null,
            tvaRate: initial?.tvaRate ?? TVA_NIGER,
            // Normalise les lignes : Prisma sérialise Decimal en string → on force en Number
            // pour les inputs numériques et les calculs. Garde l'id existant ou en crée un local.
            lignes: initial?.lignes && initial.lignes.length > 0
                ? initial.lignes.map((l) => ({
                      id: l.id,
                      libelle: l.libelle,
                      quantite: Number(l.quantite) || 1,
                      prixUnitaire: Number(l.prixUnitaire) || 0,
                      total: Number(l.total) || 0,
                      audienceId: l.audienceId ?? null,
                  }))
                : [{ id: "lig-new-0", libelle: "", quantite: 1, prixUnitaire: 0, total: 0 }],
            description: initial?.description ?? null,
            notes: initial?.notes ?? null,
            attachment: null,
            saveAs: "EMISE",
        }
    })

    /* Snapshot du draft initial pour détecter les modifications non sauvegardées */
    const [initialDraftSnapshot] = useState(() => JSON.stringify(draft))
    const isDirty = useMemo(
        () => JSON.stringify(draft) !== initialDraftSnapshot,
        [draft, initialDraftSnapshot]
    )

    /**
     * État de génération — calculé depuis localGen (priorité) sinon initial.
     *  - "absent"   : jamais généré → "Générer"
     *  - "stale"    : généré mais modifs depuis → "Régénérer"
     *  - "ok"       : à jour, bouton désactivé
     *
     * Si form dirty → "stale" (l'utilisateur doit sauver avant de générer pour
     * être sûr que le PDF reflète les bonnes données).
     */
    const generationState: "absent" | "stale" | "ok" = useMemo(() => {
        const genAt = localGen?.at ?? initial?.generatedPdfAt
        if (!genAt) return "absent"
        // Si form modifié → considéré comme stale (force save-then-generate)
        if (isDirty) return "stale"
        const gen = new Date(genAt).getTime()
        const upd = new Date(initial?.updatedAt ?? 0).getTime()
        return upd > gen + 1000 ? "stale" : "ok"
    }, [localGen, initial, isDirty])

    async function handleGenerate() {
        if (!initial) return
        if (isDirty) {
            toast.error("Enregistre d'abord tes modifications avant de générer le PDF.")
            return
        }
        setGenerating(true)
        try {
            const r = await fetch(`/api/invoices/${initial.id}/generate?force=1`, {
                method: "POST",
                credentials: "include",
            })
            if (!r.ok) {
                const err = await r.json().catch(() => ({}))
                throw new Error(err.error ?? `HTTP ${r.status}`)
            }
            const data = (await r.json()) as { generatedPdfUrl: string; generatedPdfAt: string }
            // Mise à jour locale immédiate (le bouton passe à "PDF à jour")
            setLocalGen({ url: data.generatedPdfUrl, at: data.generatedPdfAt })
            onGenerated?.(data)
            toast.success("PDF généré · disponible dans l'aperçu document")
        } catch (e) {
            toast.error("Échec génération : " + (e instanceof Error ? e.message : "Erreur"))
        } finally {
            setGenerating(false)
        }
    }

    /* Listes pour pickers */
    const clientsActifs = useMemo(() => clients ?? mockClients, [clients])
    const dossiersFiltrés = useMemo(() => {
        const source = dossiers ?? mockDossiers
        if (!draft.clientId) return source.filter((d: any) => d.kind === "CLIENT")
        return source.filter((d: any) => d.clientId === draft.clientId)
    }, [draft.clientId, dossiers])

    /* Calculs auto */
    const totalHT = useMemo(() => draft.lignes.reduce((s, l) => s + l.total, 0), [draft.lignes])
    const totalTVA = useMemo(() => calcTVA(totalHT, draft.tvaRate), [totalHT, draft.tvaRate])
    const totalTTC = useMemo(() => calcTTC(totalHT, draft.tvaRate), [totalHT, draft.tvaRate])

    /* Mutations sur lignes */
    const addLigne = () => {
        setDraft((d) => ({
            ...d,
            lignes: [...d.lignes, { id: `lig-new-${Date.now()}`, libelle: "", quantite: 1, prixUnitaire: 0, total: 0 }],
        }))
    }
    const removeLigne = (id: string) => {
        setDraft((d) => ({ ...d, lignes: d.lignes.filter((l) => l.id !== id) }))
    }
    const updateLigne = (id: string, patch: Partial<MockLigneFacture>) => {
        setDraft((d) => ({
            ...d,
            lignes: d.lignes.map((l) => {
                if (l.id !== id) return l
                const merged = { ...l, ...patch }
                merged.total = (merged.quantite ?? 0) * (merged.prixUnitaire ?? 0)
                return merged
            }),
        }))
    }

    const isValid =
        draft.lignes.length > 0 &&
        draft.lignes.some((l) => l.libelle.trim().length > 0 && l.total > 0) &&
        ((draft.direction === "EMISE" && draft.clientId) ||
            (draft.direction === "RECUE" && (draft.fournisseurId || draft.fournisseurNomLibre)))

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
            onClick={() => onClose()}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex-none px-density-medium py-3 border-b border-outline-variant bg-surface-container flex items-center justify-between">
                    <h3 className="font-h2 text-h2 text-on-surface">
                        {initial ? "Modifier la facture" : "Nouvelle facture"}
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="text-outline hover:text-on-background transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-medium py-density-medium space-y-density-medium">
                    {/* Direction toggle */}
                    <div>
                        <span className="font-label-caps text-label-caps text-outline uppercase mb-2 block">Type</span>
                        <div className="grid grid-cols-2 gap-2 bg-surface-container-low border border-outline-variant rounded p-1">
                            {(Object.entries(DIRECTIONS_FACTURE) as [DirectionFactureKey, { label: string; icon: string }][]).map(
                                ([key, meta]) => {
                                    const isActive = draft.direction === key
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setDraft((d) => ({ ...d, direction: key }))}
                                            className={cn(
                                                "px-3 py-2 rounded font-body-sm text-body-sm flex items-center justify-center gap-1.5 transition-all",
                                                isActive
                                                    ? "bg-white text-primary-container font-semibold shadow-sm"
                                                    : "text-on-surface-variant hover:bg-white/50"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                                            Facture {meta.label.toLowerCase()}
                                        </button>
                                    )
                                }
                            )}
                        </div>
                    </div>

                    {/* Sélecteur de Type (Provision/Honoraires) pour Facture ÉMISE */}
                    {draft.direction === "EMISE" && (
                        <div>
                            <span className="font-label-caps text-label-caps text-outline uppercase mb-2 block">Nature de la facture</span>
                            <div className="grid grid-cols-3 gap-2">
                                {(["HONORAIRES", "PROVISION", "FRAIS"] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setDraft((d) => ({ ...d, type: t }))}
                                        className={cn(
                                            "px-3 py-2 rounded font-body-sm flex items-center justify-center gap-1.5 transition-all border",
                                            draft.type === t
                                                ? "bg-primary-container border-primary-container text-on-primary-container font-semibold shadow-sm"
                                                : "bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        {t === "HONORAIRES" && <span className="material-symbols-outlined text-[16px]">balance</span>}
                                        {t === "PROVISION" && <span className="material-symbols-outlined text-[16px]">savings</span>}
                                        {t === "FRAIS" && <span className="material-symbols-outlined text-[16px]">receipt_long</span>}
                                        {t === "HONORAIRES" ? "Honoraires" : t === "PROVISION" ? "Provision" : "Frais / Divers"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Côté ÉMISE : Client → Dossier picker */}
                    {draft.direction === "EMISE" ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Client" required>
                                <select
                                    value={draft.clientId ?? ""}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            clientId: e.target.value || null,
                                            dossierId: null, // reset dossier quand on change de client
                                        }))
                                    }
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <option value="">— Choisir un client —</option>
                                    {clientsActifs.map((c: any) => (
                                        <option key={c.id} value={c.id}>
                                            {clientDisplayName(c)} ({c.numeroClient})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Dossier (optionnel)">
                                <select
                                    value={draft.dossierId ?? ""}
                                    onChange={(e) => setDraft((d) => ({ ...d, dossierId: e.target.value || null }))}
                                    disabled={!draft.clientId}
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {draft.clientId ? "— Aucun dossier (facture client globale) —" : "Choisir un client d'abord"}
                                    </option>
                                    {dossiersFiltrés.map((d: any) => (
                                        <option key={d.id} value={d.id}>
                                            {d.numero} · {d.titre.slice(0, 40)}
                                            {d.titre.length > 40 ? "…" : ""}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    ) : (
                        /* Côté REÇUE : Fournisseur en saisie libre */
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Fournisseur" className="col-span-2">
                                <input
                                    type="text"
                                    value={draft.fournisseurNomLibre ?? ""}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            fournisseurNomLibre: e.target.value || null,
                                        }))
                                    }
                                    placeholder="Nom du fournisseur"
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </Field>

                            <Field label="Dossier rattaché (optionnel)" className="col-span-2">
                                <select
                                    value={draft.dossierId ?? ""}
                                    onChange={(e) => setDraft((d) => ({ ...d, dossierId: e.target.value || null }))}
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <option value="">— Aucun (frais cabinet) —</option>
                                    {(dossiers ?? mockDossiers)
                                        .filter((d: any) => d.kind === "CLIENT")
                                        .map((d: any) => (
                                            <option key={d.id} value={d.id}>
                                                {d.numero} · {d.titre.slice(0, 40)}
                                            </option>
                                        ))}
                                </select>
                            </Field>
                        </div>
                    )}

                    {/* Dates + TVA */}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Date" required>
                            <input
                                type="date"
                                value={toDateInput(draft.date)}
                                onChange={(e) => setDraft((d) => ({ ...d, date: fromDateInput(e.target.value) ?? d.date }))}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                        <Field label="Échéance">
                            <input
                                type="date"
                                value={toDateInput(draft.dateEcheance)}
                                onChange={(e) => setDraft((d) => ({ ...d, dateEcheance: fromDateInput(e.target.value) }))}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                        <Field label="Taux TVA (%)">
                            <input
                                type="number"
                                value={draft.tvaRate}
                                onChange={(e) => setDraft((d) => ({ ...d, tvaRate: Number(e.target.value) || 0 }))}
                                min={0}
                                max={100}
                                step={0.1}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                    </div>

                    {/* Lignes de facture */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-label-caps text-label-caps text-outline uppercase">
                                Lignes de facture *
                            </span>
                            <button
                                type="button"
                                onClick={addLigne}
                                className="text-primary-container hover:text-accent inline-flex items-center gap-1 font-body-sm text-[12px] font-medium"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Ajouter une ligne
                            </button>
                        </div>
                        <div className="space-y-2">
                            {draft.lignes.map((l) => (
                                <div
                                    key={l.id}
                                    className="grid grid-cols-[1fr_80px_120px_120px_32px] gap-2 items-start p-2 bg-surface-container-low/50 rounded border border-outline-variant"
                                >
                                    <input
                                        type="text"
                                        value={l.libelle}
                                        onChange={(e) => updateLigne(l.id, { libelle: e.target.value })}
                                        placeholder="Libellé (ex: Honoraires plaidoirie 14/03)"
                                        className="border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    />
                                    <input
                                        type="number"
                                        value={l.quantite}
                                        onChange={(e) => updateLigne(l.id, { quantite: Number(e.target.value) || 0 })}
                                        min={0}
                                        step={0.5}
                                        className="border border-outline-variant rounded px-2 py-1.5 font-mono-num text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 text-right"
                                        title="Quantité"
                                    />
                                    <input
                                        type="number"
                                        value={l.prixUnitaire}
                                        onChange={(e) => updateLigne(l.id, { prixUnitaire: Number(e.target.value) || 0 })}
                                        min={0}
                                        className="border border-outline-variant rounded px-2 py-1.5 font-mono-num text-body-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 text-right"
                                        title="Prix unitaire FCFA"
                                    />
                                    <div className="px-2 py-1.5 font-mono-num text-body-sm tabular-nums text-right text-on-surface font-medium">
                                        {formatFCFA(l.total)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLigne(l.id)}
                                        disabled={draft.lignes.length === 1}
                                        className="p-1 rounded text-error hover:bg-error-container/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                        aria-label="Supprimer la ligne"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-[1fr_80px_120px_120px_32px] gap-2 mt-2 px-2 py-1 text-[11px] text-outline">
                            <span></span>
                            <span className="text-right">Qté</span>
                            <span className="text-right">PU FCFA</span>
                            <span className="text-right">Total FCFA</span>
                            <span></span>
                        </div>
                    </div>

                    {/* Récap montants */}
                    <div className="bg-surface-container border border-outline-variant rounded p-3 space-y-1.5 font-mono-num text-mono-num">
                        <Line label="Total HT" value={formatFCFA(totalHT)} />
                        <Line label={`TVA (${draft.tvaRate}%)`} value={formatFCFA(totalTVA)} />
                        <div className="pt-2 border-t border-outline-variant flex justify-between text-base font-semibold">
                            <span className="text-on-surface">Total TTC</span>
                            <span className="text-on-surface tabular-nums">{formatFCFA(totalTTC)}</span>
                        </div>
                    </div>

                    {/* Description + notes */}
                    <Field label="Description (optionnel)">
                        <textarea
                            value={draft.description ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value || null }))}
                            placeholder="Description visible sur la facture (ex: Honoraires plaidoirie audience SONITEL c/ État)"
                            rows={2}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    <Field label="Notes internes (privées)">
                        <textarea
                            value={draft.notes ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || null }))}
                            placeholder="Notes confidentielles non visibles client"
                            rows={2}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    <FileUploadField
                        value={draft.attachment}
                        onChange={(att) => setDraft((d) => ({ ...d, attachment: att }))}
                        label="Pièce jointe (PDF de la facture, devis…)"
                        hint="Optionnel — la facture PDF sera envoyée au client / archivée"
                    />
                </div>

                {/* Footer */}
                <footer className="flex-none px-density-medium py-3 border-t border-outline-variant bg-surface-container-low/40 flex justify-between items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="px-3 py-1.5 border border-outline-variant rounded font-body-sm hover:bg-surface-container-low transition-colors"
                    >
                        Annuler
                    </button>
                    <div className="flex gap-2 flex-wrap">
                        {/* Bouton Générer/Régénérer — uniquement pour factures émises existantes */}
                        {initial && draft.direction === "EMISE" && (
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generating || generationState === "ok" || isDirty}
                                title={
                                    isDirty
                                        ? "Enregistre tes modifications puis clique sur Régénérer."
                                        : generationState === "ok"
                                        ? "Le PDF est à jour. Modifie la facture pour activer la régénération."
                                        : generationState === "stale"
                                        ? "La facture a été modifiée depuis la dernière génération. Cliquer pour régénérer."
                                        : "Générer le PDF officiel KadriLex (format Niger)"
                                }
                                className={cn(
                                    "px-3 py-1.5 rounded font-body-sm border inline-flex items-center gap-1.5 transition-all disabled:cursor-not-allowed",
                                    !isDirty && generationState === "absent" &&
                                        "border-accent text-accent hover:bg-accent/10",
                                    !isDirty && generationState === "stale" &&
                                        "border-secondary bg-secondary/10 text-secondary hover:bg-secondary/20",
                                    (isDirty || generationState === "ok") &&
                                        "border-outline-variant text-outline opacity-50"
                                )}
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    {generating
                                        ? "progress_activity"
                                        : isDirty
                                        ? "lock"
                                        : generationState === "absent"
                                        ? "auto_awesome"
                                        : generationState === "stale"
                                        ? "refresh"
                                        : "check_circle"}
                                </span>
                                {generating
                                    ? "Génération…"
                                    : isDirty
                                    ? generationState === "absent"
                                        ? "Enregistrer pour générer"
                                        : "Enregistrer pour régénérer"
                                    : generationState === "absent"
                                    ? "Générer la facture"
                                    : generationState === "stale"
                                    ? "Régénérer"
                                    : "PDF à jour"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleSave("BROUILLON")}
                            disabled={!isValid || saving}
                            className="px-3 py-1.5 border border-outline-variant rounded font-body-sm text-on-surface hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? "Enregistrement…" : "Enregistrer en brouillon"}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave("EMISE")}
                            disabled={!isValid || saving}
                            className="px-4 py-1.5 bg-accent text-white rounded font-body-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity inline-flex items-center gap-1.5"
                        >
                            {saving && (
                                <span className="material-symbols-outlined text-[16px] animate-spin">
                                    progress_activity
                                </span>
                            )}
                            {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Émettre la facture"}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}

function Field({
    label,
    required,
    children,
    className,
}: {
    label: string
    required?: boolean
    children: React.ReactNode
    className?: string
}) {
    return (
        <label className={cn("block", className)}>
            <span className="font-label-caps text-label-caps text-outline uppercase mb-1.5 block">
                {label}
                {required && <span className="text-error ml-0.5">*</span>}
            </span>
            {children}
        </label>
    )
}

function Line({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div className="flex justify-between items-center text-on-surface-variant">
            <span>{label}</span>
            <span className="tabular-nums">{value}</span>
        </div>
    )
}
