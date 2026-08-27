"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatFCFA } from "@/lib/constants/finance"
import { TAUX_ISB_DEFAUT, TAUX_SOCIETE_DEFAUT, recomputeApport } from "@/lib/server/finance"
import type { Membre } from "@prisma/client"
import type { ApportFull } from "./apports-tab"

export interface ApportFormDraft {
    annee: number
    mois: number
    dossierId: string | null
    clientId: string | null
    referenceLibre: string | null
    clientLibre: string | null
    montantHT: number
    fraisDossier: number
    tauxISB: number
    tauxSociete: number
    notes: string | null
    beneficiaires: { membreId: string; pourcentage: number }[]
}

export interface ApportDossierOption {
    id: string
    numero: string
    titre: string
    clientId: string | null
    client?: { raisonSociale: string | null; nom: string | null } | null
}

function dossierClientLabel(d: ApportDossierOption | undefined | null): string {
    if (!d?.client) return ""
    return d.client.raisonSociale ?? d.client.nom ?? ""
}

interface ApportFormDialogProps {
    apport: ApportFull | null // null = création
    membres: Membre[]
    dossiers: ApportDossierOption[]
    defaultAnnee: number
    defaultMois: number
    onSave: (draft: ApportFormDraft) => Promise<void> | void
    onClose: () => void
    /** Ouvre le formulaire pré-rattaché à ce dossier (depuis la fiche Dossier) —
     *  dossier + client ne sont alors plus modifiables, évite de les ressaisir. */
    lockedDossierId?: string
    /** Bénéficiaire suggéré par défaut (ex. responsable du dossier) — reste modifiable. */
    defaultBeneficiaireId?: string | null
}

const MOIS_LABELS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

export function ApportFormDialog({
    apport,
    membres,
    dossiers,
    defaultAnnee,
    defaultMois,
    onSave,
    onClose,
    lockedDossierId,
    defaultBeneficiaireId,
}: ApportFormDialogProps) {
    const [annee, setAnnee] = useState(apport?.annee ?? defaultAnnee)
    const [mois, setMois] = useState(apport?.mois ?? defaultMois)
    const [dossierId, setDossierId] = useState(apport?.dossierId ?? lockedDossierId ?? "")
    const selectedDossier = dossiers.find((d) => d.id === dossierId)
    const clientDeDossier = dossierClientLabel(selectedDossier)
    const [clientLibre, setClientLibre] = useState(
        apport?.clientLibre ?? apport?.client?.raisonSociale ?? apport?.client?.nom ?? clientDeDossier
    )
    const [referenceLibre, setReferenceLibre] = useState(apport?.referenceLibre ?? "")
    const [montantHT, setMontantHT] = useState(apport?.montantHT ?? 0)
    const [fraisDossier, setFraisDossier] = useState(apport?.fraisDossier ?? 0)
    const [tauxISB, setTauxISB] = useState(apport?.tauxISB ?? TAUX_ISB_DEFAUT)
    const [tauxSociete, setTauxSociete] = useState(apport?.tauxSociete ?? TAUX_SOCIETE_DEFAUT)
    const [notes, setNotes] = useState(apport?.notes ?? "")
    const [beneficiaires, setBeneficiaires] = useState<{ membreId: string; pourcentage: number }[]>(
        apport?.beneficiaires.map((b) => ({ membreId: b.membreId, pourcentage: Number(b.pourcentage) })) ??
            (defaultBeneficiaireId ? [{ membreId: defaultBeneficiaireId, pourcentage: 100 }] : [])
    )
    const [saving, setSaving] = useState(false)

    /* Client dérivé automatiquement du dossier choisi — sinon, le cabinet devrait
       retaper un nom qu'il vient de sélectionner via son dossier. Reste modifiable
       si le dossier n'a pas de client formel rattaché (référence libre). */
    useEffect(() => {
        if (clientDeDossier) setClientLibre(clientDeDossier)
    }, [clientDeDossier])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const computed = useMemo(
        () => recomputeApport({ montantHT, tauxISB, tauxSociete }),
        [montantHT, tauxISB, tauxSociete]
    )

    const totalPourcentage = beneficiaires.reduce((s, b) => s + b.pourcentage, 0)

    const addBeneficiaire = () => {
        const used = new Set(beneficiaires.map((b) => b.membreId))
        const next = membres.find((m) => !used.has(m.id))
        if (!next) return
        setBeneficiaires((prev) => [...prev, { membreId: next.id, pourcentage: prev.length === 0 ? 100 : 0 }])
    }
    const removeBeneficiaire = (membreId: string) => {
        setBeneficiaires((prev) => prev.filter((b) => b.membreId !== membreId))
    }
    const updateBeneficiaire = (membreId: string, patch: Partial<{ membreId: string; pourcentage: number }>) => {
        setBeneficiaires((prev) => prev.map((b) => (b.membreId === membreId ? { ...b, ...patch } : b)))
    }

    const canSave =
        montantHT > 0 &&
        (clientLibre.trim().length > 0 || dossierId) &&
        beneficiaires.length > 0 &&
        beneficiaires.every((b) => b.pourcentage > 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave || saving) return
        setSaving(true)
        try {
            await onSave({
                annee,
                mois,
                dossierId: dossierId || null,
                clientId: selectedDossier?.clientId ?? null,
                referenceLibre: referenceLibre.trim() || null,
                clientLibre: clientLibre.trim() || null,
                montantHT,
                fraisDossier,
                tauxISB,
                tauxSociete,
                notes: notes.trim() || null,
                beneficiaires,
            })
        } finally {
            setSaving(false)
        }
    }

    const inputCls =
        "w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"

    return (
        <div
            className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <form
                onSubmit={handleSubmit}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                <header className="px-density-loose py-density-medium border-b border-outline-variant flex items-center justify-between">
                    <h2 className="font-h3 text-h3 text-primary-container">
                        {apport ? "Modifier l'apport" : "Nouvel apport"}
                    </h2>
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
                            <input
                                type="number"
                                value={annee}
                                onChange={(e) => setAnnee(Number(e.target.value))}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    {lockedDossierId && selectedDossier ? (
                        <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-primary-container">folder</span>
                            <div className="min-w-0">
                                <p className="font-body-sm text-body-sm font-medium text-on-surface truncate">
                                    {selectedDossier.numero} · {selectedDossier.titre}
                                </p>
                                {clientDeDossier && (
                                    <p className="font-body-xs text-body-xs text-outline">Client : {clientDeDossier}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Dossier lié (optionnel)">
                                <select value={dossierId} onChange={(e) => setDossierId(e.target.value)} className={inputCls}>
                                    <option value="">— Aucun —</option>
                                    {dossiers.map((d) => (
                                        <option key={d.id} value={d.id}>{d.numero} · {d.titre.slice(0, 40)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Client" required={!dossierId}>
                                {clientDeDossier ? (
                                    <div className={cn(inputCls, "bg-surface-container-low text-on-surface-variant flex items-center")} title="Dérivé du dossier sélectionné">
                                        {clientDeDossier}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={clientLibre}
                                        onChange={(e) => setClientLibre(e.target.value)}
                                        placeholder="Nom du client"
                                        className={inputCls}
                                    />
                                )}
                            </Field>
                        </div>
                    )}

                    <Field label="Référence (facture…)">
                        <input
                            type="text"
                            value={referenceLibre}
                            onChange={(e) => setReferenceLibre(e.target.value)}
                            placeholder="ex : FACTURE N°FV-2026-01/00012"
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Montant réglé HT" required>
                            <input
                                type="number"
                                min={0}
                                value={montantHT}
                                onChange={(e) => setMontantHT(Number(e.target.value))}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Frais du dossier (mémo)">
                            <input
                                type="number"
                                min={0}
                                value={fraisDossier}
                                onChange={(e) => setFraisDossier(Number(e.target.value))}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Taux ISB (%)">
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={tauxISB}
                                onChange={(e) => setTauxISB(Number(e.target.value))}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Taux Société (%)">
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={tauxSociete}
                                onChange={(e) => setTauxSociete(Number(e.target.value))}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    {/* Calculs en direct */}
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 grid grid-cols-4 gap-2 text-center">
                        <CalcTile label="ISB" value={computed.montantISB} />
                        <CalcTile label="Net après ISB" value={computed.montantNetApresISB} />
                        <CalcTile label="Société" value={computed.montantSociete} />
                        <CalcTile label="Rétrocession" value={computed.montantRetrocessionTotal} accent />
                    </div>

                    {/* Split bénéficiaires */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-label-caps text-label-caps text-outline uppercase">
                                Répartition de la rétrocession
                            </label>
                            <button
                                type="button"
                                onClick={addBeneficiaire}
                                disabled={beneficiaires.length >= membres.length}
                                className="text-primary-container hover:text-accent inline-flex items-center gap-1 font-body-sm text-body-sm font-medium disabled:opacity-40"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Ajouter un bénéficiaire
                            </button>
                        </div>
                        <div className="space-y-2">
                            {beneficiaires.length === 0 && (
                                <p className="font-body-sm text-body-sm text-outline italic">
                                    Aucun bénéficiaire — ajoutez au moins un avocat.
                                </p>
                            )}
                            {beneficiaires.map((b) => {
                                const membre = membres.find((m) => m.id === b.membreId)
                                const montant = Math.round((computed.montantRetrocessionTotal * b.pourcentage) / 100)
                                return (
                                    <div key={b.membreId} className="flex items-center gap-2">
                                        <select
                                            value={b.membreId}
                                            onChange={(e) => updateBeneficiaire(b.membreId, { membreId: e.target.value })}
                                            className="flex-1 border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm bg-surface"
                                        >
                                            {membres.map((m) => (
                                                <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={b.pourcentage}
                                            onChange={(e) => updateBeneficiaire(b.membreId, { pourcentage: Number(e.target.value) })}
                                            className="w-20 border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm bg-surface text-right"
                                        />
                                        <span className="text-outline text-[12px] w-5">%</span>
                                        <span className="w-28 text-right font-mono-num text-mono-num text-[12px] text-on-surface-variant">
                                            {formatFCFA(montant)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeBeneficiaire(b.membreId)}
                                            className="p-1 text-outline hover:text-error rounded"
                                            title={`Retirer ${membre?.prenom ?? ""}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        {beneficiaires.length > 1 && (
                            <p className={cn(
                                "mt-1.5 text-[11px]",
                                totalPourcentage === 100 ? "text-outline" : "text-secondary"
                            )}>
                                Total : {totalPourcentage}%
                                {totalPourcentage !== 100 && " — ne totalise pas 100%, c'est autorisé si voulu"}
                            </p>
                        )}
                    </div>

                    <Field label="Notes (optionnel)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className={inputCls}
                        />
                    </Field>
                </div>

                <footer className="flex-none flex items-center justify-end gap-2 px-density-loose py-density-medium border-t border-outline-variant">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={!canSave || saving}
                        className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm font-medium hover:bg-opacity-90 disabled:opacity-50"
                    >
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
            <p className={cn(
                "font-mono-num text-mono-num text-[13px] font-semibold tabular-nums",
                accent ? "text-primary" : "text-on-surface"
            )}>
                {formatFCFA(value)}
            </p>
        </div>
    )
}
