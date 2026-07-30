"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
    AUDIENCE_NATURES,
    AUDIENCE_STATUTS,
    JURIDICTIONS_NIGER,
    type AudienceNatureKey,
    type AudienceStatutKey,
} from "@/lib/constants/legal"
import type { MockAudience } from "@/lib/mock/audiences"
import type { MockDossier } from "@/lib/mock/dossiers"
import { type MockClient, clientDisplayName } from "@/lib/mock/clients"
import { TeamPickerExpanded } from "@/components/equipe/team-picker"

export interface AudienceFormDraft {
    titre: string
    nature: AudienceNatureKey
    statut: AudienceStatutKey
    /** Date locale yyyy-mm-dd */
    date: string
    /** Heure locale hh:mm */
    heure: string
    dureeMinutes: number
    juridiction: string
    salleAudience: string
    /** Optionnel : audience « sèche » sans dossier */
    dossierId: string | null
    /** Optionnel : client rattaché directement (sans dossier) */
    clientId: string | null
    responsableId: string | null
    equipeIds: string[]
    notes: string
}

interface AudienceFormDialogProps {
    initial?: MockAudience | null
    /** Préselection depuis fiche dossier */
    presetDossierId?: string | null
    dossiers: MockDossier[]
    clients: MockClient[]
    onSave: (draft: AudienceFormDraft) => void
    onClose: () => void
}

/* Durées suggérées (en min) */
const DUREES = [30, 60, 90, 120, 180, 240]

export function AudienceFormDialog({
    initial,
    presetDossierId,
    dossiers,
    clients,
    onSave,
    onClose,
}: AudienceFormDialogProps) {
    const initialDate = initial
        ? new Date(initial.dateDebut)
        : (() => {
              const d = new Date()
              d.setHours(d.getHours() + 1, 0, 0, 0)
              return d
          })()

    const [titre, setTitre] = useState(initial?.titre ?? "")
    const [nature, setNature] = useState<AudienceNatureKey>(initial?.nature ?? "PLAIDOIRIE")
    const [statut, setStatut] = useState<AudienceStatutKey>(initial?.statut ?? "A_VENIR")
    const [date, setDate] = useState<string>(
        `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, "0")}-${String(initialDate.getDate()).padStart(2, "0")}`
    )
    const [heure, setHeure] = useState<string>(
        `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}`
    )
    const [dureeMinutes, setDureeMinutes] = useState(initial?.dureeMinutes ?? 60)
    const [juridiction, setJuridiction] = useState(initial?.juridiction ?? "")
    const [salleAudience, setSalleAudience] = useState(initial?.salleAudience ?? "")
    const [dossierId, setDossierId] = useState<string>(
        initial?.dossierId ?? presetDossierId ?? ""
    )
    const [clientId, setClientId] = useState<string | null>(
        initial?.clientId ?? null
    )
    const [clientSearch, setClientSearch] = useState("")
    const [responsableId, setResponsableId] = useState<string | null>(
        initial?.responsableId ?? null
    )
    const [equipeIds, setEquipeIds] = useState<string[]>(initial?.equipeIds ?? [])
    const [notes, setNotes] = useState(initial?.notes ?? "")

    const [dossierSearch, setDossierSearch] = useState("")
    const filteredDossiers = useMemo(() => {
        const q = dossierSearch.trim().toLowerCase()
        if (!q) return dossiers.slice(0, 30)
        return dossiers.filter((d) => {
            const client = d.clientId
                ? clients.find((c) => c.id === d.clientId) ?? null
                : null
            const hay = [
                d.numero,
                d.titre,
                d.juridiction ?? "",
                client ? clientDisplayName(client) : "",
            ]
                .join(" ")
                .toLowerCase()
            return hay.includes(q)
        })
    }, [dossiers, clients, dossierSearch])

    const selectedDossier = dossierId ? dossiers.find((d) => d.id === dossierId) ?? null : null
    const selectedClient =
        selectedDossier?.clientId
            ? clients.find((c) => c.id === selectedDossier.clientId) ?? null
            : null
    const dossierLocked = !!presetDossierId

    /* Quand on choisit un dossier, on hérite juridiction + équipe + client par défaut */
    const handleSelectDossier = (d: MockDossier) => {
        setDossierId(d.id)
        if (d.clientId) setClientId(d.clientId)
        if (!juridiction && d.juridiction) setJuridiction(d.juridiction)
        if (!titre) {
            setTitre(d.titre)
        }
        if (responsableId === null && d.responsableId) {
            setResponsableId(d.responsableId)
        }
    }

    /* Client choisi directement (audience sans dossier) */
    const directClient = clientId ? clients.find((c) => c.id === clientId) ?? null : null
    const filteredClients = useMemo(() => {
        const q = clientSearch.trim().toLowerCase()
        if (!q) return clients.slice(0, 20)
        return clients.filter((c) => {
            const hay = [clientDisplayName(c), c.numeroClient, c.email, c.ville]
                .join(" ")
                .toLowerCase()
            return hay.includes(q)
        })
    }, [clients, clientSearch])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const isEdit = !!initial
    // Dossier n'est plus obligatoire — une audience peut être « sèche ».
    const canSave = titre.trim().length > 0 && !!date && !!heure

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave) return
        onSave({
            titre: titre.trim(),
            nature,
            statut,
            date,
            heure,
            dureeMinutes,
            juridiction: juridiction.trim(),
            salleAudience: salleAudience.trim(),
            dossierId: dossierId || null,
            clientId,
            responsableId,
            equipeIds,
            notes: notes.trim(),
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
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
            >
                <header className="px-density-loose py-density-medium border-b border-outline-variant flex items-center justify-between">
                    <div>
                        <h2 className="font-h3 text-h3 text-primary-container">
                            {isEdit ? "Modifier l'audience" : "Programmer une audience"}
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            {selectedDossier
                                ? `${selectedDossier.numero} — ${selectedClient ? clientDisplayName(selectedClient) : "Interne"}`
                                : directClient
                                ? `Sans dossier — ${clientDisplayName(directClient)}`
                                : "Dossier et client optionnels"}
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

                <div className="flex-1 overflow-y-auto p-density-loose space-y-density-loose scrollbar-thin">
                    {/* Dossier rattaché — OPTIONNEL */}
                    <Section
                        title={dossierLocked ? "Dossier (verrouillé)" : "Dossier rattaché"}
                        hint={dossierLocked ? undefined : "optionnel"}
                    >
                        {selectedDossier ? (
                            <div className="flex items-center gap-3 p-2 bg-surface-container-low border border-outline-variant rounded">
                                <div className="w-9 h-9 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">
                                        folder_open
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                        {selectedDossier.titre}
                                    </p>
                                    <p className="font-mono-num text-[10px] text-outline">
                                        {selectedDossier.numero}{" "}
                                        {selectedClient && `· ${clientDisplayName(selectedClient)}`}
                                    </p>
                                </div>
                                {!dossierLocked && (
                                    <button
                                        type="button"
                                        onClick={() => setDossierId("")}
                                        className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30"
                                        title="Changer de dossier"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            close
                                        </span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={dossierSearch}
                                    onChange={(e) => setDossierSearch(e.target.value)}
                                    placeholder="Rechercher un dossier (n°, titre, client…)"
                                    className={inputCls}
                                    autoFocus
                                />
                                <ul className="max-h-[200px] overflow-y-auto overscroll-contain scrollbar-thin border border-outline-variant rounded divide-y divide-outline-variant/40">
                                    {filteredDossiers.length === 0 ? (
                                        <li className="px-3 py-2 text-center font-body-xs text-[11px] text-outline italic">
                                            Aucun dossier trouvé
                                        </li>
                                    ) : (
                                        filteredDossiers.map((d) => {
                                            const c = d.clientId
                                                ? clients.find((x) => x.id === d.clientId) ?? null
                                                : null
                                            return (
                                                <li key={d.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectDossier(d)}
                                                        className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="font-mono-num text-[10px] text-outline w-[80px] flex-shrink-0">
                                                            {d.numero}
                                                        </span>
                                                        <span className="font-body-sm text-body-sm text-on-surface truncate flex-1">
                                                            {d.titre}
                                                        </span>
                                                        {c && (
                                                            <span className="text-[10px] text-outline truncate max-w-[120px]">
                                                                {clientDisplayName(c)}
                                                            </span>
                                                        )}
                                                    </button>
                                                </li>
                                            )
                                        })
                                    )}
                                </ul>
                            </div>
                        )}
                    </Section>

                    {/* Client rattaché — visible seulement si aucun dossier (sinon hérité) */}
                    {!selectedDossier && (
                        <Section title="Client rattaché" hint="optionnel — pour une audience sans dossier">
                            {directClient ? (
                                <div className="flex items-center gap-3 p-2 bg-surface-container-low border border-outline-variant rounded">
                                    <div className="w-9 h-9 rounded-full bg-tertiary-fixed-dim text-tertiary flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[18px]">
                                            {directClient.iconHint}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                            {clientDisplayName(directClient)}
                                        </p>
                                        <p className="font-mono-num text-[10px] text-outline">
                                            {directClient.numeroClient}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setClientId(null)}
                                        className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30"
                                        title="Retirer le client"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                        placeholder="Rechercher un client (nom, n°, email…)"
                                        className={inputCls}
                                    />
                                    {clientSearch.trim() !== "" && (
                                        <ul className="max-h-[180px] overflow-y-auto overscroll-contain scrollbar-thin border border-outline-variant rounded divide-y divide-outline-variant/40">
                                            {filteredClients.length === 0 ? (
                                                <li className="px-3 py-2 text-center font-body-xs text-[11px] text-outline italic">
                                                    Aucun client trouvé
                                                </li>
                                            ) : (
                                                filteredClients.map((c) => (
                                                    <li key={c.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setClientId(c.id)
                                                                setClientSearch("")
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 hover:bg-surface-container-low transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px] text-outline flex-shrink-0">
                                                                {c.iconHint}
                                                            </span>
                                                            <span className="font-body-sm text-body-sm text-on-surface truncate flex-1">
                                                                {clientDisplayName(c)}
                                                            </span>
                                                            <span className="font-mono-num text-[10px] text-outline">
                                                                {c.numeroClient}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Identité audience */}
                    <Section title="Audience">
                        <Field label="Titre" required>
                            <input
                                type="text"
                                value={titre}
                                onChange={(e) => setTitre(e.target.value)}
                                className={inputCls}
                                placeholder="Ex : Plaidoirie SONITEL c/ État du Niger"
                                required
                            />
                        </Field>

                        <Field label="Nature">
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                                {(
                                    Object.entries(AUDIENCE_NATURES) as [
                                        AudienceNatureKey,
                                        { label: string; chip: string; color: string },
                                    ][]
                                ).map(([k, m]) => {
                                    const active = nature === k
                                    return (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => setNature(k)}
                                            className={cn(
                                                "px-2 py-1 rounded border font-body-sm text-[11px] transition-all",
                                                active
                                                    ? "border-accent bg-accent/10 font-medium text-on-surface"
                                                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                            )}
                                        >
                                            {m.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </Field>
                    </Section>

                    {/* Date / Heure / Durée */}
                    <Section title="Quand">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Date" required>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className={inputCls}
                                    required
                                />
                            </Field>
                            <Field label="Heure" required>
                                <input
                                    type="time"
                                    value={heure}
                                    onChange={(e) => setHeure(e.target.value)}
                                    className={inputCls}
                                    required
                                />
                            </Field>
                            <Field label="Durée (min)">
                                <select
                                    value={dureeMinutes}
                                    onChange={(e) => setDureeMinutes(Number(e.target.value))}
                                    className={inputCls}
                                >
                                    {DUREES.map((d) => (
                                        <option key={d} value={d}>
                                            {d} min
                                            {d >= 60 ? ` (${Math.floor(d / 60)}h${d % 60 ? String(d % 60).padStart(2, "0") : ""})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </Section>

                    {/* Lieu */}
                    <Section title="Lieu">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Juridiction" hint="Suggestions Niger + saisie libre">
                                <input
                                    type="text"
                                    value={juridiction}
                                    onChange={(e) => setJuridiction(e.target.value)}
                                    list="juridictions-niger-aud"
                                    className={inputCls}
                                    placeholder="Ex : TGI Niamey…"
                                />
                                <datalist id="juridictions-niger-aud">
                                    {JURIDICTIONS_NIGER.map((j) => (
                                        <option key={j} value={j} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="Salle">
                                <input
                                    type="text"
                                    value={salleAudience}
                                    onChange={(e) => setSalleAudience(e.target.value)}
                                    className={inputCls}
                                    placeholder="Ex : Salle 3"
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* Statut */}
                    <Section title="Statut">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {(
                                Object.entries(AUDIENCE_STATUTS) as [
                                    AudienceStatutKey,
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
                                            "px-2 py-1.5 rounded border font-body-sm text-[11px] transition-all text-center",
                                            active
                                                ? "border-accent bg-accent/10 font-medium"
                                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase",
                                                m.chip
                                            )}
                                        >
                                            {m.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </Section>

                    {/* Équipe (avocat plaidant + équipe) */}
                    <Section
                        title="Avocat plaidant & équipe"
                        hint="Hérité du dossier par défaut"
                    >
                        <TeamPickerExpanded
                            responsableId={responsableId}
                            equipeIds={equipeIds}
                            onChange={(next) => {
                                setResponsableId(next.responsableId)
                                setEquipeIds(next.equipeIds)
                            }}
                        />
                    </Section>

                    {/* Notes */}
                    <Section title="Notes (optionnel)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className={cn(inputCls, "resize-none")}
                            placeholder="Stratégie, points à plaider, témoins prévus…"
                        />
                    </Section>
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
                            {isEdit ? "save" : "event"}
                        </span>
                        {isEdit ? "Enregistrer" : "Programmer"}
                    </button>
                </footer>
            </form>
        </div>
    )
}

const inputCls =
    "w-full bg-white border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"

function Section({
    title,
    required = false,
    hint,
    children,
}: {
    title: string
    required?: boolean
    hint?: string
    children: React.ReactNode
}) {
    return (
        <section>
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-2 flex items-center gap-1">
                {title}
                {required && <span className="text-error">*</span>}
                {hint && (
                    <span className="font-body-xs text-[10px] text-outline normal-case tracking-normal italic">
                        — {hint}
                    </span>
                )}
            </h3>
            <div className="space-y-3">{children}</div>
        </section>
    )
}

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
