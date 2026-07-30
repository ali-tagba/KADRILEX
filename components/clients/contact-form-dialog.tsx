"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { POSTES_SUGGESTIONS } from "@/lib/constants/postes"
import type { ClientContact } from "@/lib/mock/clients"

export interface ContactDraft {
    nom: string
    prenom: string
    fonction: string
    email: string
    telephone: string
}

interface ContactFormDialogProps {
    initial?: ClientContact | null
    onSave: (draft: ContactDraft) => void
    onClose: () => void
}

export function ContactFormDialog({ initial, onSave, onClose }: ContactFormDialogProps) {
    const [nom, setNom] = useState(initial?.nom ?? "")
    const [prenom, setPrenom] = useState(initial?.prenom ?? "")
    const [fonction, setFonction] = useState(initial?.fonction ?? "")
    const [email, setEmail] = useState(initial?.email ?? "")
    const [telephone, setTelephone] = useState(initial?.telephone ?? "")

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const isEdit = !!initial
    const canSave = nom.trim().length > 0

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave) return
        onSave({
            nom: nom.trim(),
            prenom: prenom.trim(),
            fonction: fonction.trim(),
            email: email.trim(),
            telephone: telephone.trim(),
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
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
                <header className="px-density-loose py-density-medium border-b border-outline-variant flex items-center justify-between">
                    <div>
                        <h2 className="font-h3 text-h3 text-primary-container">
                            {isEdit ? "Modifier le contact" : "Ajouter un contact"}
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            Saisie 100 % libre. Le poste propose des suggestions à la frappe.
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
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Prénom">
                            <input
                                type="text"
                                value={prenom}
                                onChange={(e) => setPrenom(e.target.value)}
                                className={inputCls}
                                autoFocus
                            />
                        </Field>
                        <Field label="Nom" required>
                            <input
                                type="text"
                                value={nom}
                                onChange={(e) => setNom(e.target.value)}
                                className={inputCls}
                                required
                            />
                        </Field>
                    </div>

                    <Field
                        label="Poste / Fonction"
                        hint="Saisie libre — suggestions à la frappe"
                    >
                        <input
                            type="text"
                            value={fonction}
                            onChange={(e) => setFonction(e.target.value)}
                            list="postes-suggestions"
                            placeholder="Ex : Directeur Financier, Avocat, Représentant Légal…"
                            className={inputCls}
                        />
                        <datalist id="postes-suggestions">
                            {POSTES_SUGGESTIONS.map((p) => (
                                <option key={p} value={p} />
                            ))}
                        </datalist>
                    </Field>

                    <Field label="Email">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputCls}
                            placeholder="prenom.nom@…"
                        />
                    </Field>

                    <Field label="Téléphone">
                        <input
                            type="tel"
                            value={telephone}
                            onChange={(e) => setTelephone(e.target.value)}
                            className={inputCls}
                            placeholder="+227 9X XX XX XX"
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
                        disabled={!canSave}
                        className={cn(
                            "px-4 py-1.5 rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm",
                            canSave
                                ? "bg-accent text-white hover:bg-opacity-90 active:scale-[0.98]"
                                : "bg-surface-container text-outline cursor-not-allowed"
                        )}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {isEdit ? "save" : "person_add"}
                        </span>
                        {isEdit ? "Enregistrer" : "Ajouter le contact"}
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
