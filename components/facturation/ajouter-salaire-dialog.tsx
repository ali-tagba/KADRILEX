"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { FileUploadField, type AttachmentInfo } from "./file-upload-field"
import {
    formatFCFA,
    formatMoisLong,
    MODES_PAIEMENT,
    STATUTS_BULLETIN,
    type ModePaiementKey,
    type StatutBulletinKey,
} from "@/lib/constants/finance"
import { fullName } from "@/lib/constants/team"
import type { Membre } from "@prisma/client"

export interface AjouterSalaireDraft {
    employeId: string
    annee: number
    mois: number
    salaireBrut: number
    primes: number
    retenues: number
    statut: StatutBulletinKey
    dateVersement: string | null
    modeVersement: ModePaiementKey | null
    reference: string | null
    notes: string | null
    /** Fiche de paie / justificatif optionnel (PDF, image, doc) */
    attachment: AttachmentInfo | null
}

interface AjouterSalaireDialogProps {
    /** Membres parmi lesquels choisir — typiquement les actifs sans bulletin du mois courant */
    membresDispo: Membre[]
    /** Tous les membres actifs (fallback si déjà payés ce mois) */
    membresActifs: Membre[]
    annee: number
    mois: number
    onSave: (draft: AjouterSalaireDraft) => void
    onClose: () => void
}

export function AjouterSalaireDialog({
    membresDispo,
    membresActifs,
    annee,
    mois,
    onSave,
    onClose,
}: AjouterSalaireDialogProps) {
    /* Si la liste "dispo" est vide (tous payés), on permet quand même de saisir
       un complément/avenant en sélectionnant parmi tous les actifs. */
    const candidates = membresDispo.length > 0 ? membresDispo : membresActifs
    const initialEmploye = candidates[0] ?? null
    const [employeId, setEmployeId] = useState<string>(initialEmploye?.id ?? "")

    /* Init basé sur le premier candidat — re-set au onChange du select pour
       éviter un useEffect avec setState (anti-pattern react-hooks/set-state-in-effect) */
    const [salaireBrut, setSalaireBrut] = useState<number>(initialEmploye?.salaireBaseBrut ?? 0)
    const [primes, setPrimes] = useState<number>(0)
    const [retenues, setRetenues] = useState<number>(0)
    const [statut, setStatut] = useState<StatutBulletinKey>("BROUILLON")
    const [dateVersement, setDateVersement] = useState<string>(
        new Date().toISOString().slice(0, 10)
    )
    const [modeVersement, setModeVersement] = useState<ModePaiementKey>(
        initialEmploye?.modeVersementParDefaut ?? "VIREMENT"
    )
    const [reference, setReference] = useState<string>("")
    const [notes, setNotes] = useState<string>("")
    const [attachment, setAttachment] = useState<AttachmentInfo | null>(null)

    /** Quand on change d'employé via le select, on resync les defaults d'un coup */
    const handleSelectEmploye = (id: string) => {
        const m = membresActifs.find((x) => x.id === id)
        setEmployeId(id)
        if (m) {
            setSalaireBrut(m.salaireBaseBrut)
            setModeVersement(m.modeVersementParDefaut)
        }
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!employeId) return
        onSave({
            employeId,
            annee,
            mois,
            salaireBrut,
            primes,
            retenues,
            statut,
            dateVersement: statut === "VERSE" ? dateVersement : null,
            modeVersement: statut === "VERSE" ? modeVersement : null,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
            attachment,
        })
    }

    const isVerse = statut === "VERSE"

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
                            Ajouter un salaire
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            {formatMoisLong(annee, mois)} ·{" "}
                            {membresDispo.length > 0
                                ? `${membresDispo.length} employé${
                                      membresDispo.length > 1 ? "s" : ""
                                  } sans bulletin ce mois`
                                : "Tous les employés ont déjà un bulletin — saisie d'un complément"}
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
                    {/* Sélecteur employé */}
                    <Field label="Employé" required>
                        <select
                            value={employeId}
                            onChange={(e) => handleSelectEmploye(e.target.value)}
                            className={inputCls}
                            required
                        >
                            {candidates.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {fullName(m)} — {m.fonction ?? "—"} (
                                    {formatFCFA(m.salaireBaseBrut)})
                                </option>
                            ))}
                        </select>
                    </Field>

                    {/* Montants */}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Salaire brut" required>
                            <input
                                type="number"
                                min={0}
                                step={1000}
                                value={salaireBrut}
                                onChange={(e) => setSalaireBrut(Number(e.target.value) || 0)}
                                className={cn(inputCls, "text-right font-mono-num")}
                                required
                            />
                        </Field>
                        <Field label="Primes (+)">
                            <input
                                type="number"
                                min={0}
                                step={1000}
                                value={primes}
                                onChange={(e) => setPrimes(Number(e.target.value) || 0)}
                                className={cn(inputCls, "text-right font-mono-num")}
                            />
                        </Field>
                        <Field label="Retenues (−)">
                            <input
                                type="number"
                                min={0}
                                step={1000}
                                value={retenues}
                                onChange={(e) => setRetenues(Number(e.target.value) || 0)}
                                className={cn(inputCls, "text-right font-mono-num")}
                            />
                        </Field>
                    </div>

                    {/* Aperçu net estimé (calcul approx — recomputeBulletin recalcule charges côté save) */}
                    <div className="bg-surface-container-low border border-outline-variant rounded p-2.5 flex items-center justify-between">
                        <div>
                            <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                                Aperçu (avant CNSS)
                            </span>
                            <p className="font-mono-num text-mono-num text-base text-on-surface tabular-nums">
                                {formatFCFA(salaireBrut + primes - retenues)}
                            </p>
                        </div>
                        <span className="font-body-xs text-[11px] text-outline italic">
                            Le net définitif est calculé à la sauvegarde<br />
                            (CNSS Niger 5,25 % part salariale).
                        </span>
                    </div>

                    {/* Statut */}
                    <Field label="Statut du bulletin" required>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(
                                Object.entries(STATUTS_BULLETIN) as [
                                    StatutBulletinKey,
                                    { label: string; chip: string },
                                ][]
                            ).map(([k, m]) => {
                                const active = statut === k
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setStatut(k)}
                                        className={cn(
                                            "p-2 rounded border text-center transition-all font-body-sm text-body-sm",
                                            active
                                                ? "border-accent bg-accent/10 font-medium text-primary-container"
                                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase tracking-wider mb-1",
                                                m.chip
                                            )}
                                        >
                                            {m.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </Field>

                    {/* Détails versement (visible si VERSE) */}
                    {isVerse && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Date du versement">
                                <input
                                    type="date"
                                    value={dateVersement}
                                    onChange={(e) => setDateVersement(e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Mode de versement">
                                <select
                                    value={modeVersement}
                                    onChange={(e) =>
                                        setModeVersement(e.target.value as ModePaiementKey)
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
                            <Field label="Référence (optionnel)">
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="N° transaction / chèque"
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    )}

                    {/* Pièce jointe (fiche de paie / justificatif) */}
                    <FileUploadField
                        value={attachment}
                        onChange={setAttachment}
                        label="Fiche de paie / Justificatif"
                        hint="PDF de la fiche de paie ou justificatif de virement — facultatif"
                    />

                    {/* Notes */}
                    <Field label="Notes (optionnel)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Avenant, prime exceptionnelle, contexte particulier…"
                            className={cn(inputCls, "resize-none")}
                        />
                    </Field>
                </div>

                <footer className="px-density-loose py-density-medium border-t border-outline-variant flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={!employeId}
                        className={cn(
                            "px-4 py-1.5 rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm",
                            employeId
                                ? "bg-accent text-white hover:bg-opacity-90 active:scale-[0.98]"
                                : "bg-surface-container text-outline cursor-not-allowed"
                        )}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {isVerse ? "task_alt" : "save"}
                        </span>
                        {isVerse ? "Enregistrer & marquer versé" : "Créer le bulletin"}
                    </button>
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
    children,
}: {
    label: string
    required?: boolean
    children: React.ReactNode
}) {
    return (
        <label className="block">
            <span className="font-body-xs text-[11px] text-on-surface-variant block mb-0.5">
                {label} {required && <span className="text-error">*</span>}
            </span>
            {children}
        </label>
    )
}
