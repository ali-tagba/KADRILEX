"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
    ROLES,
    ROLE_KEYS,
    type RoleKey,
} from "@/lib/constants/team"
import {
    STATUTS_CONTRAT,
    type StatutContratKey,
    type ModePaiementKey,
    MODES_PAIEMENT,
} from "@/lib/constants/finance"
import type { MockMembre } from "@/lib/mock/employes"

export interface MembreFormDraft {
    prenom: string
    nom: string
    role: RoleKey
    email: string
    telephone: string
    fonction: string
    statutContrat: StatutContratKey
    salaireBaseBrut: number
    dateEmbauche: string
    rib: string
    banque: string
    mobileMoney: string
    modeVersementParDefaut: ModePaiementKey
    notes: string
}

const EMPTY: MembreFormDraft = {
    prenom: "",
    nom: "",
    role: "AVOCAT",
    email: "",
    telephone: "",
    fonction: "",
    statutContrat: "COLLABORATEUR_CDI",
    salaireBaseBrut: 0,
    dateEmbauche: new Date().toISOString().slice(0, 10),
    rib: "",
    banque: "",
    mobileMoney: "",
    modeVersementParDefaut: "VIREMENT",
    notes: "",
}

interface MembreFormDialogProps {
    initial?: MockMembre | null
    onSave: (draft: MembreFormDraft) => void
    onClose: () => void
}

export function MembreFormDialog({ initial, onSave, onClose }: MembreFormDialogProps) {
    const [draft, setDraft] = useState<MembreFormDraft>(() =>
        initial
            ? {
                prenom: initial.prenom,
                nom: initial.nom,
                role: initial.role,
                email: initial.email,
                telephone: initial.telephone ?? "",
                fonction: initial.fonction ?? "",
                statutContrat: initial.statutContrat,
                salaireBaseBrut: initial.salaireBaseBrut,
                dateEmbauche: initial.dateEmbauche.slice(0, 10),
                rib: initial.rib ?? "",
                banque: initial.banque ?? "",
                mobileMoney: initial.mobileMoney ?? "",
                modeVersementParDefaut: initial.modeVersementParDefaut,
                notes: initial.notes ?? "",
            }
            : EMPTY
    )

    const dialogRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const isEdit = !!initial
    const canSave = draft.prenom.trim() && draft.nom.trim() && draft.email.trim()

    const update = <K extends keyof MembreFormDraft>(k: K, v: MembreFormDraft[K]) =>
        setDraft((d) => ({ ...d, [k]: v }))

    return (
        <div
            className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                ref={dialogRef}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                <header className="px-density-loose py-density-medium border-b border-outline-variant flex items-center justify-between">
                    <div>
                        <h2 className="font-h3 text-h3 text-primary-container">
                            {isEdit ? "Modifier le membre" : "Inviter un membre"}
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            {isEdit
                                ? "Modifications enregistrées immédiatement"
                                : "Le membre recevra un lien d'invitation par email"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-density-loose scrollbar-thin">
                    <Section title="Identité">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Prénom" required>
                                <input
                                    type="text"
                                    value={draft.prenom}
                                    onChange={(e) => update("prenom", e.target.value)}
                                    className={inputCls}
                                    autoFocus
                                />
                            </Field>
                            <Field label="Nom" required>
                                <input
                                    type="text"
                                    value={draft.nom}
                                    onChange={(e) => update("nom", e.target.value.toUpperCase())}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Email" required>
                                <input
                                    type="email"
                                    value={draft.email}
                                    onChange={(e) => update("email", e.target.value)}
                                    className={inputCls}
                                    placeholder="prenom.nom@kadrilegal.ne"
                                />
                            </Field>
                            <Field label="Téléphone">
                                <input
                                    type="tel"
                                    value={draft.telephone}
                                    onChange={(e) => update("telephone", e.target.value)}
                                    className={inputCls}
                                    placeholder="+227 9X XX XX XX"
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Rôle applicatif">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ROLE_KEYS.map((k) => {
                                const r = ROLES[k]
                                const active = draft.role === k
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => update("role", k)}
                                        className={cn(
                                            "p-2 rounded border text-left transition-all",
                                            active
                                                ? "border-accent bg-accent/10"
                                                : "border-outline-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span
                                                className={cn(
                                                    "material-symbols-outlined text-[14px]",
                                                    active ? "text-accent" : "text-outline"
                                                )}
                                            >
                                                {r.icon}
                                            </span>
                                            <span className="font-body-sm text-body-sm font-medium text-on-surface">
                                                {r.label}
                                            </span>
                                        </div>
                                        <p className="font-body-xs text-[10px] text-outline leading-tight">
                                            {r.description}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </Section>

                    <Section title="Contrat & paie">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Statut contrat">
                                <select
                                    value={draft.statutContrat}
                                    onChange={(e) =>
                                        update("statutContrat", e.target.value as StatutContratKey)
                                    }
                                    className={inputCls}
                                >
                                    {(
                                        Object.entries(STATUTS_CONTRAT) as [
                                            StatutContratKey,
                                            { label: string },
                                        ][]
                                    ).map(([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Fonction">
                                <input
                                    type="text"
                                    value={draft.fonction}
                                    onChange={(e) => update("fonction", e.target.value)}
                                    className={inputCls}
                                    placeholder="Avocat collaborateur"
                                />
                            </Field>
                            <Field label="Salaire de base brut (FCFA)">
                                <input
                                    type="number"
                                    min={0}
                                    value={draft.salaireBaseBrut}
                                    onChange={(e) =>
                                        update("salaireBaseBrut", Number(e.target.value) || 0)
                                    }
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Date d'embauche">
                                <input
                                    type="date"
                                    value={draft.dateEmbauche}
                                    onChange={(e) => update("dateEmbauche", e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Mode de versement par défaut">
                                <select
                                    value={draft.modeVersementParDefaut}
                                    onChange={(e) =>
                                        update("modeVersementParDefaut", e.target.value as ModePaiementKey)
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
                            <Field label="Mobile Money">
                                <input
                                    type="tel"
                                    value={draft.mobileMoney}
                                    onChange={(e) => update("mobileMoney", e.target.value)}
                                    className={inputCls}
                                    placeholder="+227 9X XX XX XX"
                                />
                            </Field>
                            <Field label="RIB / Compte bancaire">
                                <input
                                    type="text"
                                    value={draft.rib}
                                    onChange={(e) => update("rib", e.target.value)}
                                    className={inputCls}
                                    placeholder="NEXXX XXXXX XXXXXXXXXXX XX"
                                />
                            </Field>
                            <Field label="Banque">
                                <input
                                    type="text"
                                    value={draft.banque}
                                    onChange={(e) => update("banque", e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Notes (interne)">
                        <textarea
                            value={draft.notes}
                            onChange={(e) => update("notes", e.target.value)}
                            rows={3}
                            className={cn(inputCls, "resize-none")}
                            placeholder="Particularités du contrat, préférences de versement…"
                        />
                    </Section>
                </div>

                <footer className="px-density-loose py-density-medium border-t border-outline-variant flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => canSave && onSave(draft)}
                        disabled={!canSave}
                        className={cn(
                            "px-4 py-1.5 rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm",
                            canSave
                                ? "bg-accent text-white hover:bg-opacity-90 active:scale-[0.98]"
                                : "bg-surface-container text-outline cursor-not-allowed"
                        )}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {isEdit ? "save" : "send"}
                        </span>
                        {isEdit ? "Enregistrer" : "Inviter"}
                    </button>
                </footer>
            </div>
        </div>
    )
}

const inputCls =
    "w-full bg-white border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-density-loose last:mb-0">
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-2">
                {title}
            </h3>
            {children}
        </section>
    )
}

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
