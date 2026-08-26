"use client"

import { useEffect, useMemo, useState } from "react"
import { formatFCFA } from "@/lib/constants/finance"
import { TAUX_BIC_DEFAUT, TAUX_TVA_ENCAISSEMENT_DEFAUT, recomputeEncaissement } from "@/lib/server/finance"

export interface EncaissementFormDraft {
    annee: number
    mois: number
    clientId: string | null
    montantHT: number
    tauxTVA: number
    tauxBIC: number
    montantRetenueBIC: number
    montantTVARetenueSource: number
    notes: string | null
}

interface EncaissementFormDialogProps {
    defaultAnnee: number
    defaultMois: number
    clients: { id: string; label: string }[]
    onSave: (draft: EncaissementFormDraft) => Promise<void> | void
    onClose: () => void
}

const MOIS_LABELS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

export function EncaissementFormDialog({
    defaultAnnee,
    defaultMois,
    clients,
    onSave,
    onClose,
}: EncaissementFormDialogProps) {
    const [annee, setAnnee] = useState(defaultAnnee)
    const [mois, setMois] = useState(defaultMois)
    const [clientId, setClientId] = useState("")
    const [montantHT, setMontantHT] = useState(0)
    const [tauxTVA, setTauxTVA] = useState(TAUX_TVA_ENCAISSEMENT_DEFAUT)
    const [tauxBIC, setTauxBIC] = useState(TAUX_BIC_DEFAUT)
    const [montantRetenueBIC, setMontantRetenueBIC] = useState(0)
    const [montantTVARetenueSource, setMontantTVARetenueSource] = useState(0)
    const [notes, setNotes] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const computed = useMemo(
        () => recomputeEncaissement({ montantHT, tauxTVA, tauxBIC, montantRetenueBIC, montantTVARetenueSource }),
        [montantHT, tauxTVA, tauxBIC, montantRetenueBIC, montantTVARetenueSource]
    )

    const canSave = montantHT > 0
    const inputCls =
        "w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave || saving) return
        setSaving(true)
        try {
            await onSave({
                annee,
                mois,
                clientId: clientId || null,
                montantHT,
                tauxTVA,
                tauxBIC,
                montantRetenueBIC,
                montantTVARetenueSource,
                notes: notes.trim() || null,
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <form
                onSubmit={handleSubmit}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                <header className="px-density-loose py-density-medium border-b border-outline-variant flex items-center justify-between">
                    <h2 className="font-h3 text-h3 text-primary-container">Encaissement du mois</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-loose py-density-medium space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Mois" required>
                            <select value={mois} onChange={(e) => setMois(Number(e.target.value))} className={inputCls}>
                                {MOIS_LABELS.map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Année" required>
                            <input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className={inputCls} />
                        </Field>
                    </div>

                    <Field label="Bloc client (optionnel — laisser vide pour 'Autres encaissements')">
                        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                            <option value="">— Autres (général) —</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Honoraires HT encaissés" required>
                        <input
                            type="number"
                            min={0}
                            value={montantHT}
                            onChange={(e) => setMontantHT(Number(e.target.value))}
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Taux TVA (%)">
                            <input type="number" min={0} max={100} value={tauxTVA} onChange={(e) => setTauxTVA(Number(e.target.value))} className={inputCls} />
                        </Field>
                        <Field label="Taux BIC (%)">
                            <input type="number" min={0} max={100} value={tauxBIC} onChange={(e) => setTauxBIC(Number(e.target.value))} className={inputCls} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Retenue BIC reçue (attestation client)">
                            <input type="number" min={0} value={montantRetenueBIC} onChange={(e) => setMontantRetenueBIC(Number(e.target.value))} className={inputCls} />
                        </Field>
                        <Field label="TVA retenue à la source reçue">
                            <input type="number" min={0} value={montantTVARetenueSource} onChange={(e) => setMontantTVARetenueSource(Number(e.target.value))} className={inputCls} />
                        </Field>
                    </div>

                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                        <CalcTile label="TTC" value={computed.montantTTC} />
                        <CalcTile label="BIC collecté" value={computed.montantBICCollecte} />
                        <CalcTile label="Encaissé net" value={computed.montantEncaisse} accent />
                    </div>

                    <Field label="Notes (optionnel)">
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
                    </Field>
                </div>

                <footer className="flex-none flex items-center justify-end gap-2 px-density-loose py-density-medium border-t border-outline-variant">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low">
                        Annuler
                    </button>
                    <button type="submit" disabled={!canSave || saving} className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm font-medium hover:bg-opacity-90 disabled:opacity-50">
                        {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </footer>
            </form>
        </div>
    )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block font-label-caps text-label-caps text-outline uppercase mb-1">
                {label} {required && <span className="text-error">*</span>}
            </span>
            {children}
        </label>
    )
}

function CalcTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div>
            <p className="font-label-caps text-[9px] text-outline uppercase tracking-wider">{label}</p>
            <p className={`font-mono-num text-mono-num text-[13px] font-semibold tabular-nums ${accent ? "text-primary" : "text-on-surface"}`}>
                {formatFCFA(value)}
            </p>
        </div>
    )
}
