"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { FileUploadField, type AttachmentInfo } from "./file-upload-field"
import {
    TVA_NIGER,
    calcTTC,
    calcTVA,
    formatFCFA,
    MODES_PAIEMENT,
    type ModePaiementKey,
} from "@/lib/constants/finance"
import type { MockDossier } from "@/lib/mock/dossiers"
import type { MockClient } from "@/lib/mock/clients"
import { clientDisplayName } from "@/lib/mock/clients"

export interface AjouterFraisDraft {
    date: string // ISO yyyy-mm-dd
    fournisseurNomLibre: string | null
    libelle: string
    dossierId: string | null
    montantHT: number
    /** Taux TVA (0 si exonéré) — initialisé à TVA Niger 19 % */
    tvaRate: number
    refacturable: boolean
    modeRegle: ModePaiementKey | null
    /** Optionnel : marquer comme déjà payé (sinon EN_ATTENTE) */
    dejaPaye: boolean
    notes: string | null
    attachment: AttachmentInfo | null
}

interface AjouterFraisDialogProps {
    dossiers: MockDossier[]
    clients: MockClient[]
    onSave: (draft: AjouterFraisDraft) => void
    onClose: () => void
}

export function AjouterFraisExterneDialog({
    dossiers,
    clients,
    onSave,
    onClose,
}: AjouterFraisDialogProps) {
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
    const [fournisseurNomLibre, setFournisseurNomLibre] = useState<string>("")
    const [libelle, setLibelle] = useState<string>("")
    const [dossierId, setDossierId] = useState<string>("")
    const [montantHT, setMontantHT] = useState<number>(0)
    const [tvaRate, setTvaRate] = useState<number>(TVA_NIGER)
    const [refacturable, setRefacturable] = useState<boolean>(true)
    const [dejaPaye, setDejaPaye] = useState<boolean>(false)
    const [modeRegle, setModeRegle] = useState<ModePaiementKey>("VIREMENT")
    const [notes, setNotes] = useState<string>("")
    const [attachment, setAttachment] = useState<AttachmentInfo | null>(null)

    const dossiersTries = useMemo(
        () => [...dossiers].sort((a, b) => a.numero.localeCompare(b.numero)),
        [dossiers]
    )

    const tva = calcTVA(montantHT, tvaRate)
    const ttc = calcTTC(montantHT, tvaRate)

    const dossierChoisi = dossiers.find((d) => d.id === dossierId) ?? null
    const clientDossier =
        dossierChoisi?.clientId ? clients.find((c) => c.id === dossierChoisi.clientId) ?? null : null

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const canSave =
        montantHT > 0 &&
        fournisseurNomLibre.trim().length > 0 &&
        libelle.trim().length > 0

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave) return
        onSave({
            date,
            fournisseurNomLibre: fournisseurNomLibre.trim() || null,
            libelle: libelle.trim(),
            dossierId: dossierId || null,
            montantHT,
            tvaRate,
            refacturable,
            modeRegle: dejaPaye ? modeRegle : null,
            dejaPaye,
            notes: notes.trim() || null,
            attachment,
        })
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
                    <div>
                        <h2 className="font-h3 text-h3 text-primary-container">
                            Ajouter un frais externe
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            Frais avancé pour un client (huissier, expert, greffe…) — refacturable au
                            client par défaut
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-density-loose space-y-density-medium scrollbar-thin">
                    {/* Date + Dossier */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date du frais" required>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={inputCls}
                                required
                            />
                        </Field>
                        <Field
                            label="Dossier associé"
                            hint={dossierChoisi ? `Client : ${clientDossier ? clientDisplayName(clientDossier) : "—"}` : "Optionnel — laisser vide si frais cabinet pur"}
                        >
                            <select
                                value={dossierId}
                                onChange={(e) => setDossierId(e.target.value)}
                                className={inputCls}
                            >
                                <option value="">— Aucun dossier —</option>
                                {dossiersTries.map((d) => {
                                    const c = d.clientId
                                        ? clients.find((x) => x.id === d.clientId)
                                        : null
                                    return (
                                        <option key={d.id} value={d.id}>
                                            {d.numero} — {d.titre.substring(0, 40)}
                                            {c ? ` (${clientDisplayName(c)})` : ""}
                                        </option>
                                    )
                                })}
                            </select>
                        </Field>
                    </div>

                    {/* Fournisseur — saisie libre */}
                    <Field label="Fournisseur" required>
                        <input
                            type="text"
                            value={fournisseurNomLibre}
                            onChange={(e) => setFournisseurNomLibre(e.target.value)}
                            placeholder="Nom du fournisseur (huissier, expert, greffe…)"
                            className={inputCls}
                        />
                    </Field>

                    {/* Libellé */}
                    <Field label="Libellé du frais" required>
                        <input
                            type="text"
                            value={libelle}
                            onChange={(e) => setLibelle(e.target.value)}
                            placeholder="Ex : Honoraires huissier signification, Frais de greffe TGI…"
                            className={inputCls}
                            required
                        />
                    </Field>

                    {/* Montant + TVA */}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Montant HT (FCFA)" required>
                            <input
                                type="number"
                                min={0}
                                step={1000}
                                value={montantHT}
                                onChange={(e) => setMontantHT(Number(e.target.value) || 0)}
                                className={cn(inputCls, "text-right font-mono-num")}
                                required
                            />
                        </Field>
                        <Field label="Taux TVA (%)">
                            <select
                                value={String(tvaRate)}
                                onChange={(e) => setTvaRate(Number(e.target.value))}
                                className={inputCls}
                            >
                                <option value="19">19 % (Niger standard)</option>
                                <option value="0">Exonéré (0 %)</option>
                                <option value="9">9 %</option>
                            </select>
                        </Field>
                        <Field label="Total TTC">
                            <div className="px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded text-right font-mono-num text-mono-num text-on-surface tabular-nums">
                                {formatFCFA(ttc)}
                            </div>
                        </Field>
                    </div>
                    <p className="font-body-xs text-[10px] text-outline -mt-2">
                        TVA : {formatFCFA(tva)} · Total HT : {formatFCFA(montantHT)}
                    </p>

                    {/* Refacturable + déjà payé */}
                    <div className="grid grid-cols-2 gap-3">
                        <ToggleRow
                            label="Refacturable au client"
                            description="Cocher si ce frais sera répercuté au client via une facture"
                            checked={refacturable}
                            onChange={setRefacturable}
                            disabled={!dossierId}
                            disabledReason="Nécessite un dossier associé"
                        />
                        <ToggleRow
                            label="Déjà payé par le cabinet"
                            description="Cocher si le règlement est effectif"
                            checked={dejaPaye}
                            onChange={setDejaPaye}
                        />
                    </div>

                    {dejaPaye && (
                        <Field label="Mode de règlement">
                            <select
                                value={modeRegle}
                                onChange={(e) =>
                                    setModeRegle(e.target.value as ModePaiementKey)
                                }
                                className={inputCls}
                            >
                                {(
                                    Object.entries(MODES_PAIEMENT) as [
                                        ModePaiementKey,
                                        { label: string },
                                    ][]
                                ).map(([k, m]) => (
                                    <option key={k} value={k}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {/* Pièce jointe (justificatif fournisseur) */}
                    <FileUploadField
                        value={attachment}
                        onChange={setAttachment}
                        label="Justificatif"
                        hint="Facture du fournisseur, reçu, devis — facultatif"
                    />

                    {/* Notes */}
                    <Field label="Notes (optionnel)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Contexte particulier…"
                            className={cn(inputCls, "resize-none")}
                        />
                    </Field>
                </div>

                <footer className="px-density-loose py-density-medium border-t border-outline-variant flex items-center justify-between gap-2">
                    <span className="font-mono-num text-[11px] text-outline">
                        Total enregistré : <span className="font-semibold text-on-surface">{formatFCFA(ttc)}</span>
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!canSave}
                            className={cn(
                                "px-4 py-1.5 rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm",
                                canSave
                                    ? "bg-accent text-white hover:bg-opacity-90 active:scale-[0.98]"
                                    : "bg-surface-container text-outline cursor-not-allowed"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Enregistrer le frais
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    )
}

const inputCls =
    "w-full bg-white border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"

function Field({
    label,
    required = false,
    hint,
    children,
}: {
    label: string
    required?: boolean
    hint?: string
    children: React.ReactNode
}) {
    return (
        <label className="block">
            <span className="font-body-xs text-[11px] text-on-surface-variant block mb-0.5">
                {label} {required && <span className="text-error">*</span>}
            </span>
            {children}
            {hint && (
                <span className="font-body-xs text-[10px] text-outline italic block mt-0.5">
                    {hint}
                </span>
            )}
        </label>
    )
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled = false,
    disabledReason,
}: {
    label: string
    description?: string
    checked: boolean
    onChange: (v: boolean) => void
    disabled?: boolean
    disabledReason?: string
}) {
    return (
        <div
            className={cn(
                "p-2 rounded border flex items-start gap-2 transition-all",
                disabled
                    ? "border-outline-variant/40 bg-surface-container/40 opacity-60"
                    : checked
                    ? "border-accent/40 bg-accent/5"
                    : "border-outline-variant"
            )}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 accent-accent"
            />
            <div className="min-w-0 flex-1">
                <span className="font-body-sm text-body-sm text-on-surface">{label}</span>
                {description && (
                    <p className="font-body-xs text-[10px] text-outline">
                        {disabled && disabledReason ? disabledReason : description}
                    </p>
                )}
            </div>
        </div>
    )
}
