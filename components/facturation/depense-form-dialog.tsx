"use client"

import { useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import {
    CATEGORIES_DEPENSE,
    FREQUENCES_RECURRENCE,
    MODES_PAIEMENT,
    formatFCFA,
    type CategorieDepenseKey,
    type FrequenceRecurrenceKey,
    type ModePaiementKey,
} from "@/lib/constants/finance"
import type { MockDepense } from "@/lib/mock/depenses"
import { FileUploadField, type AttachmentInfo } from "./file-upload-field"

export interface DepenseFormDraft {
    libelle: string
    categorie: CategorieDepenseKey
    date: string
    montantHT: number
    tvaRate: number
    mode: ModePaiementKey
    reference: string | null
    recurrent: boolean
    recurrenceFrequence: FrequenceRecurrenceKey | null
    fournisseurNomLibre: string | null
    employeId: string | null
    notes: string | null
    attachment: AttachmentInfo | null
    statut: "A_PAYER" | "PAYEE"
}

interface DepenseFormDialogProps {
    initial: MockDepense | null
    employes?: any[]
    saving?: boolean
    onSave: (draft: DepenseFormDraft) => void
    onClose: () => void
}

function todayISO(): string {
    return new Date().toISOString()
}
function toDateInput(iso: string): string {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function DepenseFormDialog({ initial, employes = [], saving = false, onSave, onClose }: DepenseFormDialogProps) {
    useEscapeClose(onClose)

    const [draft, setDraft] = useState<DepenseFormDraft>(() => ({
        libelle: initial?.libelle ?? "",
        categorie: initial?.categorie ?? "FOURNITURES",
        date: initial?.date ?? todayISO(),
        montantHT: initial?.montantHT ?? 0,
        tvaRate: initial?.tvaRate ?? 19,
        mode: initial?.mode ?? "VIREMENT",
        statut: initial?.statut ?? "A_PAYER",
        reference: initial?.reference ?? null,
        recurrent: initial?.recurrent ?? false,
        recurrenceFrequence: initial?.recurrenceFrequence ?? null,
        fournisseurNomLibre: initial?.fournisseurNomLibre ?? null,
        employeId: initial?.employeId ?? null,
        notes: initial?.notes ?? null,
        attachment: null,
    }))

    /* Quand on change la catégorie, on suggère la TVA et la récurrence */
    const handleCategorieChange = (cat: CategorieDepenseKey) => {
        const meta = CATEGORIES_DEPENSE[cat]
        setDraft((d) => ({
            ...d,
            categorie: cat,
            tvaRate: meta.tvaSuggeree,
            recurrent: d.recurrent || meta.recurrentParDefaut,
            recurrenceFrequence:
                d.recurrent || meta.recurrentParDefaut ? d.recurrenceFrequence ?? "MENSUEL" : null,
        }))
    }

    const tva = Math.round((draft.montantHT * draft.tvaRate) / 100)
    const ttc = draft.montantHT + tva

    const isValid = draft.libelle.trim().length > 0 && draft.montantHT > 0

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
            onClick={() => onClose()}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-none px-density-medium py-3 border-b border-outline-variant bg-surface-container flex items-center justify-between">
                    <h3 className="font-h2 text-h2 text-on-surface">
                        {initial ? "Modifier la dépense" : "Nouvelle dépense"}
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="text-outline hover:text-on-background transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-medium py-density-medium space-y-4">
                    <Field label="Libellé" required>
                        <input
                            type="text"
                            value={draft.libelle}
                            onChange={(e) => setDraft({ ...draft, libelle: e.target.value })}
                            placeholder="Ex : Loyer cabinet — mai 2026"
                            autoFocus
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Catégorie" required>
                            <select
                                value={draft.categorie}
                                onChange={(e) => handleCategorieChange(e.target.value as CategorieDepenseKey)}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {(Object.entries(CATEGORIES_DEPENSE) as [CategorieDepenseKey, { label: string }][]).map(
                                    ([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                        <Field label="Date" required>
                            <input
                                type="date"
                                value={toDateInput(draft.date)}
                                onChange={(e) => setDraft({ ...draft, date: new Date(e.target.value).toISOString() })}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Montant HT (FCFA)" required>
                            <input
                                type="number"
                                value={draft.montantHT}
                                onChange={(e) => setDraft({ ...draft, montantHT: Number(e.target.value) || 0 })}
                                min={0}
                                step={1000}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 text-right tabular-nums"
                            />
                        </Field>
                        <Field label="TVA (%)">
                            <input
                                type="number"
                                value={draft.tvaRate}
                                onChange={(e) => setDraft({ ...draft, tvaRate: Number(e.target.value) || 0 })}
                                min={0}
                                max={100}
                                step={0.5}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                    </div>

                    {/* Récap */}
                    <div className="bg-surface-container-low border border-outline-variant rounded p-3 font-mono-num text-mono-num space-y-1.5">
                        <div className="flex justify-between text-on-surface-variant">
                            <span>HT</span>
                            <span className="tabular-nums">{formatFCFA(draft.montantHT)}</span>
                        </div>
                        <div className="flex justify-between text-on-surface-variant">
                            <span>TVA ({draft.tvaRate}%)</span>
                            <span className="tabular-nums">{formatFCFA(tva)}</span>
                        </div>
                        <div className="pt-2 border-t border-outline-variant flex justify-between font-medium">
                            <span className="text-on-surface">TTC</span>
                            <span className="text-on-surface tabular-nums">{formatFCFA(ttc)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Statut" required>
                            <select
                                value={draft.statut}
                                onChange={(e) => setDraft({ ...draft, statut: e.target.value as "A_PAYER" | "PAYEE" })}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="A_PAYER">À Payer</option>
                                <option value="PAYEE">Payée (Immédiat)</option>
                            </select>
                        </Field>
                        <Field label="Mode de paiement" required>
                            <select
                                value={draft.mode}
                                onChange={(e) => setDraft({ ...draft, mode: e.target.value as ModePaiementKey })}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {(Object.entries(MODES_PAIEMENT) as [ModePaiementKey, { label: string }][]).map(
                                    ([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                        <Field label="Référence (optionnel)">
                            <input
                                type="text"
                                value={draft.reference ?? ""}
                                onChange={(e) => setDraft({ ...draft, reference: e.target.value || null })}
                                placeholder="Ex : VIR-LOYER-MAI"
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                    </div>

                    {draft.categorie === "SALAIRES" ? (
                        <Field label="Employé / Collaborateur" required>
                            <select
                                value={draft.employeId ?? ""}
                                onChange={(e) => setDraft({ ...draft, employeId: e.target.value || null })}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="">Sélectionner un collaborateur...</option>
                                {employes.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.prenom} {emp.nom} {emp.role ? `(${emp.role})` : ""}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    ) : (
                        <Field label="Fournisseur (optionnel)">
                            <input
                                type="text"
                                value={draft.fournisseurNomLibre ?? ""}
                                onChange={(e) => setDraft({ ...draft, fournisseurNomLibre: e.target.value || null })}
                                placeholder="Ex : NIGELEC, Sahel Immobilier…"
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </Field>
                    )}

                    {/* Récurrence */}
                    <div className="border-t border-outline-variant/40 pt-3 flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={draft.recurrent}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        recurrent: e.target.checked,
                                        recurrenceFrequence: e.target.checked
                                            ? draft.recurrenceFrequence ?? "MENSUEL"
                                            : null,
                                    })
                                }
                                className="accent-accent"
                            />
                            <span className="font-body-sm text-body-sm text-on-surface inline-flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-outline">
                                    event_repeat
                                </span>
                                Dépense récurrente
                            </span>
                        </label>
                        {draft.recurrent && (
                            <Field label="Fréquence">
                                <select
                                    value={draft.recurrenceFrequence ?? "MENSUEL"}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            recurrenceFrequence: e.target.value as FrequenceRecurrenceKey,
                                        })
                                    }
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    {(Object.entries(FREQUENCES_RECURRENCE) as [FrequenceRecurrenceKey, { label: string }][]).map(
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

                    <Field label="Notes (optionnel)">
                        <textarea
                            value={draft.notes ?? ""}
                            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                            placeholder="Commentaires"
                            rows={2}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    <FileUploadField
                        value={draft.attachment}
                        onChange={(att) => setDraft({ ...draft, attachment: att })}
                        label="Justificatif"
                        hint="Reçu, facture fournisseur, photo — facultatif"
                    />
                </div>

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
                        disabled={!isValid || saving}
                        className="px-4 py-1.5 bg-accent text-white rounded font-body-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                    >
                        {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Créer la dépense"}
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
