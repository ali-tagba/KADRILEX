"use client"

import { useMemo, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import {
    TACHE_PRIORITES,
    TACHE_STATUTS,
    type TachePrioriteKey,
    type TacheStatutKey,
} from "@/lib/constants/legal"
import type { MockTache, MockAudience } from "@/lib/mock/audiences"
import type { MockClient } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"
import { clientDisplayName } from "@/lib/mock/clients"
import { TeamPickerExpanded } from "@/components/equipe/team-picker"

export type TacheLiaisonType = "NONE" | "CLIENT" | "DOSSIER" | "AUDIENCE"

export interface TacheFormDraft {
    titre: string
    description: string
    statut: TacheStatutKey
    priorite: TachePrioriteKey
    /** Responsable principal (1 membre) — backward compat */
    responsableId: string | null
    /** Équipe affectée (peut inclure ou non le responsable) */
    equipeIds: string[]
    echeance: string | null
    liaisonType: TacheLiaisonType
    clientId: string | null
    dossierId: string | null
    audienceId: string | null
}

interface TacheFormDialogProps {
    /** Tâche existante en édition, ou null pour création */
    initial: MockTache | null
    clients: MockClient[]
    dossiers: MockDossier[]
    audiences: MockAudience[]
    onSave: (draft: TacheFormDraft) => void
    onClose: () => void
}

/* ============================================================
   Helpers
   ============================================================ */

function toDatetimeLocal(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromDatetimeLocal(s: string): string | null {
    if (!s) return null
    return new Date(s).toISOString()
}

function deriveLiaisonType(t: MockTache | null): TacheLiaisonType {
    if (!t) return "NONE"
    if (t.audienceId) return "AUDIENCE"
    if (t.dossierId) return "DOSSIER"
    if (t.clientId) return "CLIENT"
    return "NONE"
}

/* ============================================================
   FormDialog
   ============================================================ */

export function TacheFormDialog({
    initial,
    clients,
    dossiers,
    audiences,
    onSave,
    onClose,
}: TacheFormDialogProps) {
    const [draft, setDraft] = useState<TacheFormDraft>(() => ({
        titre: initial?.titre ?? "",
        description: initial?.description ?? "",
        statut: initial?.statut ?? "A_FAIRE",
        priorite: initial?.priorite ?? "MOYENNE",
        responsableId: (initial as { responsableId?: string | null } | null)?.responsableId ?? null,
        equipeIds: (initial as { equipeIds?: string[] } | null)?.equipeIds ?? [],
        echeance: initial?.echeance ?? null,
        liaisonType: deriveLiaisonType(initial),
        clientId: initial?.clientId ?? null,
        dossierId: initial?.dossierId ?? null,
        audienceId: initial?.audienceId ?? null,
    }))

    /* ESC = close */
    useEscapeClose(onClose)

    /* Liste filtrée des dossiers / audiences selon le client choisi (smart picker) */
    const dossiersForLiaison = useMemo(() => {
        if (draft.liaisonType !== "DOSSIER") return []
        // Si un client est sélectionné côté tâche, on filtre par celui-ci ; sinon tous
        if (draft.clientId) return dossiers.filter((d) => d.clientId === draft.clientId)
        return dossiers
    }, [dossiers, draft.liaisonType, draft.clientId])

    const audiencesForLiaison = useMemo(() => {
        if (draft.liaisonType !== "AUDIENCE") return []
        return [...audiences].sort(
            (a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()
        )
    }, [audiences, draft.liaisonType])

    const isValid = draft.titre.trim().length > 0

    /** Quand on change la liaison, on nettoie les autres champs liés */
    const setLiaisonType = (next: TacheLiaisonType) => {
        setDraft((d) => ({
            ...d,
            liaisonType: next,
            clientId: next === "CLIENT" ? d.clientId : next === "DOSSIER" || next === "AUDIENCE" ? d.clientId : null,
            dossierId: next === "DOSSIER" ? d.dossierId : null,
            audienceId: next === "AUDIENCE" ? d.audienceId : null,
        }))
    }

    /** Quand on choisit une audience → autopop le dossierId et clientId déduits */
    const handlePickAudience = (audId: string) => {
        const aud = audiences.find((a) => a.id === audId) ?? null
        const dos = aud ? dossiers.find((d) => d.id === aud.dossierId) ?? null : null
        setDraft((d) => ({
            ...d,
            audienceId: audId || null,
            dossierId: dos?.id ?? null,
            clientId: dos?.clientId ?? null,
        }))
    }

    /** Quand on choisit un dossier → autopop le clientId déduit */
    const handlePickDossier = (dosId: string) => {
        const dos = dossiers.find((d) => d.id === dosId) ?? null
        setDraft((d) => ({
            ...d,
            dossierId: dosId || null,
            clientId: dos?.clientId ?? null,
        }))
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
            onClick={() => onClose()}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex-none px-density-medium py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container">
                    <h3 className="font-h2 text-h2 text-on-background">
                        {initial ? "Modifier la tâche" : "Nouvelle tâche"}
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="text-outline hover:text-on-background transition-colors"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-density-medium flex flex-col gap-4">
                    {/* Titre */}
                    <Field label="Titre" required>
                        <input
                            type="text"
                            value={draft.titre}
                            onChange={(e) => setDraft((d) => ({ ...d, titre: e.target.value }))}
                            placeholder="Ex: Préparer notes de plaidoirie"
                            autoFocus
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </Field>

                    {/* Description */}
                    <Field label="Description (optionnel)">
                        <textarea
                            value={draft.description}
                            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                            placeholder="Détails / contexte de la tâche…"
                            rows={3}
                            className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                        />
                    </Field>

                    {/* Grid 2 col : statut + priorité */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Statut">
                            <select
                                value={draft.statut}
                                onChange={(e) => setDraft((d) => ({ ...d, statut: e.target.value as TacheStatutKey }))}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {(Object.entries(TACHE_STATUTS) as [TacheStatutKey, { label: string }][]).map(
                                    ([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                        <Field label="Priorité">
                            <select
                                value={draft.priorite}
                                onChange={(e) => setDraft((d) => ({ ...d, priorite: e.target.value as TachePrioriteKey }))}
                                className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {(Object.entries(TACHE_PRIORITES) as [TachePrioriteKey, { label: string }][]).map(
                                    ([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>
                    </div>

                    {/* Échéance seule sur sa ligne */}
                    <div className="grid grid-cols-1 gap-3">
                        <Field label="Échéance">
                            <div className="flex items-center gap-1">
                                <input
                                    type="datetime-local"
                                    value={toDatetimeLocal(draft.echeance)}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, echeance: fromDatetimeLocal(e.target.value) }))
                                    }
                                    className="flex-1 min-w-0 border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                />
                                {draft.echeance && (
                                    <button
                                        type="button"
                                        onClick={() => setDraft((d) => ({ ...d, echeance: null }))}
                                        className="p-1.5 rounded text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                                        aria-label="Effacer l'échéance"
                                        title="Effacer"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>
                        </Field>
                    </div>

                    {/* Assignation multi-membres (responsable + équipe) */}
                    <div className="border-t border-outline-variant/40 pt-3">
                        <span className="font-label-caps text-label-caps text-outline uppercase block mb-2">
                            Assignation
                        </span>
                        <TeamPickerExpanded
                            responsableId={draft.responsableId}
                            equipeIds={draft.equipeIds}
                            onChange={(next) =>
                                setDraft((d) => ({
                                    ...d,
                                    responsableId: next.responsableId,
                                    equipeIds: next.equipeIds,
                                }))
                            }
                        />
                    </div>

                    {/* Liaison */}
                    <div className="border-t border-outline-variant/40 pt-3 flex flex-col gap-2.5">
                        <span className="font-label-caps text-label-caps text-outline uppercase">Liaison</span>
                        <div className="grid grid-cols-4 gap-1 bg-surface-container-low border border-outline-variant rounded p-0.5">
                            {(
                                [
                                    { v: "NONE", label: "Aucune", icon: "block" },
                                    { v: "CLIENT", label: "Client", icon: "person" },
                                    { v: "DOSSIER", label: "Dossier", icon: "folder" },
                                    { v: "AUDIENCE", label: "Audience", icon: "gavel" },
                                ] as { v: TacheLiaisonType; label: string; icon: string }[]
                            ).map((opt) => {
                                const active = draft.liaisonType === opt.v
                                return (
                                    <button
                                        key={opt.v}
                                        type="button"
                                        onClick={() => setLiaisonType(opt.v)}
                                        className={cn(
                                            "px-2 py-1.5 rounded font-body-sm text-[12px] flex items-center justify-center gap-1 transition-all",
                                            active
                                                ? "bg-white shadow-sm text-primary-container font-medium"
                                                : "text-on-surface-variant hover:text-primary-container hover:bg-white/50"
                                        )}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                                        {opt.label}
                                    </button>
                                )
                            })}
                        </div>

                        {draft.liaisonType === "CLIENT" && (
                            <Field label="Client">
                                <select
                                    value={draft.clientId ?? ""}
                                    onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value || null }))}
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <option value="">— Choisir un client —</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {clientDisplayName(c)} ({c.numeroClient})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}

                        {draft.liaisonType === "DOSSIER" && (
                            <>
                                <Field label="Filtrer par client (optionnel)">
                                    <select
                                        value={draft.clientId ?? ""}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                clientId: e.target.value || null,
                                                dossierId: null,
                                            }))
                                        }
                                        className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                        <option value="">— Tous les clients —</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {clientDisplayName(c)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Dossier">
                                    <select
                                        value={draft.dossierId ?? ""}
                                        onChange={(e) => handlePickDossier(e.target.value)}
                                        className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                        <option value="">— Choisir un dossier —</option>
                                        {dossiersForLiaison.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.numero} · {d.titre}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </>
                        )}

                        {draft.liaisonType === "AUDIENCE" && (
                            <Field label="Audience">
                                <select
                                    value={draft.audienceId ?? ""}
                                    onChange={(e) => handlePickAudience(e.target.value)}
                                    className="w-full border border-outline-variant rounded px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                                >
                                    <option value="">— Choisir une audience —</option>
                                    {audiencesForLiaison.map((a) => {
                                        const date = new Date(a.dateDebut).toLocaleDateString("fr-FR", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "2-digit",
                                        })
                                        return (
                                            <option key={a.id} value={a.id}>
                                                {date} · {a.numero} · {a.titre.slice(0, 40)}
                                                {a.titre.length > 40 ? "…" : ""}
                                            </option>
                                        )
                                    })}
                                </select>
                            </Field>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
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
                        className="px-3 py-1.5 bg-accent text-white rounded font-body-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                        {initial ? "Enregistrer" : "Créer la tâche"}
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
