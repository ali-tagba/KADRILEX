"use client"

import { useMemo, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import {
    MODES_PAIEMENT,
    STATUTS_BULLETIN,
    formatFCFA,
    formatMoisLong,
    type ModePaiementKey,
    type StatutBulletinKey,
} from "@/lib/constants/finance"
import { calcChargesSociales, type MockBulletin } from "@/lib/mock/bulletins"
import type { MockEmploye } from "@/lib/mock/employes"

export interface BulletinFormDraft {
    salaireBrut: number
    primes: number
    retenues: number
    statut: StatutBulletinKey
    dateVersement: string | null
    modeVersement: ModePaiementKey | null
    reference: string | null
    notes: string | null
}

interface BulletinFormDialogProps {
    employe: MockEmploye
    bulletin: MockBulletin
    onSave: (draft: BulletinFormDraft) => void
    onClose: () => void
}

function toDateInput(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function BulletinFormDialog({ employe, bulletin, onSave, onClose }: BulletinFormDialogProps) {
    useEscapeClose(onClose)

    const [draft, setDraft] = useState<BulletinFormDraft>({
        salaireBrut: bulletin.salaireBrut,
        primes: bulletin.primes,
        retenues: bulletin.retenues,
        statut: bulletin.statut,
        dateVersement: bulletin.dateVersement,
        modeVersement: bulletin.modeVersement ?? employe.modeVersementParDefaut,
        reference: bulletin.reference,
        notes: bulletin.notes,
    })

    /* Calcul auto */
    const charges = useMemo(() => calcChargesSociales(draft.salaireBrut), [draft.salaireBrut])
    const net = draft.salaireBrut + draft.primes - draft.retenues - charges.chargesSalariales
    const coutTotal = draft.salaireBrut + draft.primes + charges.chargesPatronales

    const isValid = draft.salaireBrut > 0

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
                    <div>
                        <h3 className="font-h2 text-h2 text-on-surface">Bulletin de paie</h3>
                        <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                            {employe.prenom} {employe.nom} · {formatMoisLong(bulletin.annee, bulletin.mois)}
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
                    {/* Brut + primes + retenues */}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Salaire brut (FCFA)" required>
                            <input
                                type="number"
                                value={draft.salaireBrut}
                                onChange={(e) => setDraft({ ...draft, salaireBrut: Number(e.target.value) || 0 })}
                                min={0}
                                step={1000}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 text-right tabular-nums"
                            />
                        </Field>
                        <Field label="Primes (FCFA)">
                            <input
                                type="number"
                                value={draft.primes}
                                onChange={(e) => setDraft({ ...draft, primes: Number(e.target.value) || 0 })}
                                min={0}
                                step={1000}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 text-right tabular-nums"
                            />
                        </Field>
                        <Field label="Retenues (FCFA)">
                            <input
                                type="number"
                                value={draft.retenues}
                                onChange={(e) => setDraft({ ...draft, retenues: Number(e.target.value) || 0 })}
                                min={0}
                                step={1000}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 text-right tabular-nums"
                            />
                        </Field>
                    </div>

                    {/* Récap calculs auto */}
                    <div className="bg-surface-container-low border border-outline-variant rounded p-3 font-mono-num text-mono-num space-y-1.5">
                        <Line label="Salaire brut" value={formatFCFA(draft.salaireBrut)} />
                        {draft.primes > 0 && (
                            <Line label="Primes" value={`+${formatFCFA(draft.primes)}`} valueClass="text-[#166534]" />
                        )}
                        {draft.retenues > 0 && (
                            <Line label="Retenues" value={`-${formatFCFA(draft.retenues)}`} valueClass="text-error" />
                        )}
                        <Line
                            label="CNSS salarié (5,25%)"
                            value={`-${formatFCFA(charges.chargesSalariales)}`}
                            valueClass="text-on-surface-variant"
                        />
                        <div className="pt-2 border-t border-outline-variant flex justify-between text-base font-semibold">
                            <span className="text-on-surface">Net à verser</span>
                            <span className="text-on-surface tabular-nums">{formatFCFA(net)}</span>
                        </div>
                        <Line
                            label="CNSS patronale (16,5%)"
                            value={`+${formatFCFA(charges.chargesPatronales)}`}
                            valueClass="text-on-surface-variant"
                        />
                        <div className="pt-2 border-t border-outline-variant flex justify-between font-medium text-secondary">
                            <span>Coût total cabinet</span>
                            <span className="tabular-nums">{formatFCFA(coutTotal)}</span>
                        </div>
                    </div>

                    {/* Statut + versement */}
                    <Field label="Statut">
                        <select
                            value={draft.statut}
                            onChange={(e) => setDraft({ ...draft, statut: e.target.value as StatutBulletinKey })}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        >
                            {(Object.entries(STATUTS_BULLETIN) as [StatutBulletinKey, { label: string }][]).map(
                                ([k, m]) => (
                                    <option key={k} value={k}>
                                        {m.label}
                                    </option>
                                )
                            )}
                        </select>
                    </Field>

                    {draft.statut === "VERSE" && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Date de versement">
                                <input
                                    type="date"
                                    value={toDateInput(draft.dateVersement)}
                                    onChange={(e) =>
                                        setDraft({
                                            ...draft,
                                            dateVersement: e.target.value ? new Date(e.target.value).toISOString() : null,
                                        })
                                    }
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </Field>
                            <Field label="Mode de versement">
                                <select
                                    value={draft.modeVersement ?? "VIREMENT"}
                                    onChange={(e) =>
                                        setDraft({ ...draft, modeVersement: e.target.value as ModePaiementKey })
                                    }
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
                            <Field label="Référence (optionnel)" className="col-span-2">
                                <input
                                    type="text"
                                    value={draft.reference ?? ""}
                                    onChange={(e) => setDraft({ ...draft, reference: e.target.value || null })}
                                    placeholder="Ex : VIR-PAIE-2026-05"
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-mono-num text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                            </Field>
                        </div>
                    )}

                    <Field label="Notes (optionnel)">
                        <textarea
                            value={draft.notes ?? ""}
                            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                            rows={2}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>
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
                        Enregistrer
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
    valueClass,
}: {
    label: string
    value: string
    valueClass?: string
}) {
    return (
        <div className="flex justify-between text-on-surface-variant">
            <span>{label}</span>
            <span className={cn("tabular-nums", valueClass)}>{value}</span>
        </div>
    )
}
