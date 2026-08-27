"use client"

import { useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import { MODES_PAIEMENT, formatFCFA, type ModePaiementKey } from "@/lib/constants/finance"
import type { MockFacture } from "@/lib/mock/invoices"
import { FileUploadField, type AttachmentInfo } from "./file-upload-field"

export interface PaiementDraft {
    factureId: string
    date: string
    montant: number
    mode: ModePaiementKey
    reference: string | null
    notes: string | null
    /** Preuve de paiement (path Supabase Storage) — optionnel mais recommandé */
    preuveUrl?: string | null
    preuveAttachment?: AttachmentInfo | null
}

interface PaiementDialogProps {
    facture: MockFacture
    onSave: (draft: PaiementDraft) => void
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

export function PaiementDialog({ facture, onSave, onClose }: PaiementDialogProps) {
    useEscapeClose(onClose)

    const restant = facture.montantTTC - facture.montantPaye

    const [draft, setDraft] = useState<PaiementDraft>({
        factureId: facture.id,
        date: todayISO(),
        montant: restant, // pré-rempli avec le reste à payer
        mode: "VIREMENT",
        reference: null,
        notes: null,
        preuveUrl: null,
        preuveAttachment: null,
    })

    const isValid = draft.montant > 0 && draft.montant <= restant

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
            onClick={() => onClose()}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-none px-density-medium py-3 border-b border-outline-variant bg-surface-container flex items-center justify-between">
                    <div>
                        <h3 className="font-h2 text-h2 text-on-surface">Enregistrer un paiement</h3>
                        <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                            Facture {facture.numero}
                        </p>
                    </div>
                    <button
                        onClick={() => onClose()}
                        className="text-outline hover:text-on-background transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-medium py-density-medium space-y-4">
                    {/* Récap facture */}
                    <div className="bg-surface-container-low border border-outline-variant rounded p-3 font-mono-num text-mono-num space-y-1.5">
                        <div className="flex justify-between text-on-surface-variant">
                            <span>Total facture</span>
                            <span className="tabular-nums">{formatFCFA(facture.montantTTC)}</span>
                        </div>
                        <div className="flex justify-between text-on-surface-variant">
                            <span>Déjà encaissé</span>
                            <span className="tabular-nums text-success">
                                {formatFCFA(facture.montantPaye)}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-outline-variant flex justify-between font-medium">
                            <span className="text-on-surface">Reste à payer</span>
                            <span className="tabular-nums text-error">{formatFCFA(restant)}</span>
                        </div>
                    </div>

                    {/* Montant */}
                    <Field label="Montant du paiement (FCFA)" required>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={draft.montant}
                                onChange={(e) => setDraft({ ...draft, montant: Number(e.target.value) || 0 })}
                                min={0}
                                max={restant}
                                step={1000}
                                autoFocus
                                className="flex-1 border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 text-right tabular-nums"
                            />
                            <button
                                type="button"
                                onClick={() => setDraft({ ...draft, montant: restant })}
                                className="px-2 py-1.5 border border-outline-variant rounded font-body-sm text-[11px] text-on-surface-variant hover:bg-surface-container-low transition-colors whitespace-nowrap"
                            >
                                Solder
                            </button>
                        </div>
                        {draft.montant > restant && (
                            <p className="text-error text-[11px] mt-1 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                Le montant dépasse le reste à payer
                            </p>
                        )}
                    </Field>

                    {/* Date */}
                    <Field label="Date du paiement" required>
                        <input
                            type="date"
                            value={toDateInput(draft.date)}
                            onChange={(e) => setDraft({ ...draft, date: new Date(e.target.value).toISOString() })}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </Field>

                    {/* Mode de paiement */}
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

                    {/* Référence */}
                    <Field label="Référence (optionnel)">
                        <input
                            type="text"
                            value={draft.reference ?? ""}
                            onChange={(e) => setDraft({ ...draft, reference: e.target.value || null })}
                            placeholder="Ex : VIR-BIN-2024-088, CHQ-1234, MOMO-001234"
                            className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </Field>

                    {/* Notes */}
                    <Field label="Notes (optionnel)">
                        <textarea
                            value={draft.notes ?? ""}
                            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                            placeholder="Commentaires internes…"
                            rows={2}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    {/* Preuve de paiement — capture mobile money, scan virement, reçu… */}
                    <FileUploadField
                        value={draft.preuveAttachment ?? null}
                        onChange={(att) =>
                            setDraft({
                                ...draft,
                                preuveAttachment: att,
                                preuveUrl: att?.url ?? null,
                            })
                        }
                        label="Preuve de paiement (optionnel)"
                        hint="Reçu, capture mobile money, ordre de virement… 10 Mo max."
                        category="factures"
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
                        disabled={!isValid}
                        className="px-4 py-1.5 bg-accent text-white rounded font-body-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                        Enregistrer le paiement
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
