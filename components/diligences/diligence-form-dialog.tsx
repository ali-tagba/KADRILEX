"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
    DILIGENCE_TYPES,
    DILIGENCE_STATUTS,
    TACHE_PRIORITES,
    type DiligenceTypeKey,
    type DiligenceStatutKey,
    type TachePrioriteKey,
} from "@/lib/constants/legal"
import type { DiligenceFormDraft, DiligenceRecord } from "@/lib/types/diligence"
import type { MockDossier } from "@/lib/mock/dossiers"
import { type MockClient, clientDisplayName } from "@/lib/mock/clients"
import { TeamPickerExpanded } from "@/components/equipe/team-picker"

interface DiligenceFormDialogProps {
    initial?: DiligenceRecord | null
    presetDossierId?: string | null
    presetClientId?: string | null
    dossiers: MockDossier[]
    clients: MockClient[]
    onSave: (draft: DiligenceFormDraft) => void
    onClose: () => void
}

/** ISO → yyyy-mm-dd local */
function isoToDateInput(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function DiligenceFormDialog({
    initial,
    presetDossierId,
    presetClientId,
    dossiers,
    clients,
    onSave,
    onClose,
}: DiligenceFormDialogProps) {
    const [titre, setTitre] = useState(initial?.titre ?? "")
    const [type, setType] = useState<DiligenceTypeKey>(initial?.type ?? "AUTRE")
    const [statut, setStatut] = useState<DiligenceStatutKey>(initial?.statut ?? "A_FAIRE")
    const [priorite, setPriorite] = useState<TachePrioriteKey>(initial?.priorite ?? "MOYENNE")
    const [dateEcheance, setDateEcheance] = useState(isoToDateInput(initial?.dateEcheance ?? null))
    const [description, setDescription] = useState(initial?.description ?? "")
    const [dossierId, setDossierId] = useState<string | null>(
        initial?.dossierId ?? presetDossierId ?? null
    )
    const [clientId, setClientId] = useState<string | null>(
        initial?.clientId ?? presetClientId ?? null
    )
    const [responsableId, setResponsableId] = useState<string | null>(initial?.responsableId ?? null)
    const [equipeIds, setEquipeIds] = useState<string[]>(initial?.equipeIds ?? [])

    const [dossierSearch, setDossierSearch] = useState("")
    const [clientSearch, setClientSearch] = useState("")

    const selectedDossier = dossierId ? dossiers.find((d) => d.id === dossierId) ?? null : null
    const directClient = clientId ? clients.find((c) => c.id === clientId) ?? null : null

    const filteredDossiers = useMemo(() => {
        const q = dossierSearch.trim().toLowerCase()
        if (!q) return dossiers.slice(0, 20)
        return dossiers.filter((d) =>
            [d.numero, d.titre, d.juridiction ?? ""].join(" ").toLowerCase().includes(q)
        )
    }, [dossiers, dossierSearch])

    const filteredClients = useMemo(() => {
        const q = clientSearch.trim().toLowerCase()
        if (!q) return clients.slice(0, 20)
        return clients.filter((c) =>
            [clientDisplayName(c), c.numeroClient, c.email, c.ville].join(" ").toLowerCase().includes(q)
        )
    }, [clients, clientSearch])

    function handleSelectDossier(d: MockDossier) {
        setDossierId(d.id)
        if (d.clientId) setClientId(d.clientId)
        setDossierSearch("")
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const isEdit = !!initial
    const canSave = titre.trim().length > 0

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSave) return
        onSave({
            titre: titre.trim(),
            description: description.trim(),
            type,
            statut,
            priorite,
            dateEcheance,
            dossierId,
            clientId,
            audienceId: initial?.audienceId ?? null,
            responsableId,
            equipeIds,
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
                            {isEdit ? "Modifier la diligence" : "Nouvelle diligence"}
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            {selectedDossier
                                ? `${selectedDossier.numero} — ${selectedDossier.titre}`
                                : directClient
                                ? clientDisplayName(directClient)
                                : "Acte ou démarche à accomplir"}
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
                    {/* Identité */}
                    <Section title="Diligence">
                        <Field label="Intitulé" required>
                            <input
                                type="text"
                                value={titre}
                                onChange={(e) => setTitre(e.target.value)}
                                className={inputCls}
                                placeholder="Ex : Déposer les conclusions en réplique"
                                required
                                autoFocus
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Nature de l'acte">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as DiligenceTypeKey)}
                                    className={inputCls}
                                >
                                    {(Object.entries(DILIGENCE_TYPES) as [DiligenceTypeKey, { label: string }][]).map(
                                        ([k, m]) => (
                                            <option key={k} value={k}>
                                                {m.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </Field>
                            <Field label="Statut">
                                <select
                                    value={statut}
                                    onChange={(e) => setStatut(e.target.value as DiligenceStatutKey)}
                                    className={inputCls}
                                >
                                    {(Object.entries(DILIGENCE_STATUTS) as [DiligenceStatutKey, { label: string }][]).map(
                                        ([k, m]) => (
                                            <option key={k} value={k}>
                                                {m.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </Field>
                        </div>
                    </Section>

                    {/* Délai + priorité */}
                    <Section title="Délai & priorité">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Échéance (délai)" hint="optionnel mais recommandé">
                                <input
                                    type="date"
                                    value={dateEcheance}
                                    onChange={(e) => setDateEcheance(e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Priorité">
                                <div className="grid grid-cols-2 gap-1.5">
                                    {(Object.entries(TACHE_PRIORITES) as [TachePrioriteKey, { label: string }][]).map(
                                        ([k, m]) => {
                                            const active = priorite === k
                                            return (
                                                <button
                                                    key={k}
                                                    type="button"
                                                    onClick={() => setPriorite(k)}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded border font-body-sm text-[11px] transition-all",
                                                        active
                                                            ? "border-accent bg-accent/10 font-medium text-on-surface"
                                                            : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                                    )}
                                                >
                                                    {m.label}
                                                </button>
                                            )
                                        }
                                    )}
                                </div>
                            </Field>
                        </div>
                    </Section>

                    {/* Rattachement dossier (optionnel) */}
                    <Section title="Dossier rattaché" hint="optionnel">
                        {selectedDossier ? (
                            <div className="flex items-center gap-3 p-2 bg-surface-container-low border border-outline-variant rounded">
                                <div className="w-9 h-9 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">folder_open</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                        {selectedDossier.titre}
                                    </p>
                                    <p className="font-mono-num text-[10px] text-outline">{selectedDossier.numero}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDossierId(null)}
                                    className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30"
                                    title="Détacher le dossier"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={dossierSearch}
                                    onChange={(e) => setDossierSearch(e.target.value)}
                                    placeholder="Rechercher un dossier (n°, titre…)"
                                    className={inputCls}
                                />
                                <ul className="max-h-[180px] overflow-y-auto overscroll-contain scrollbar-thin border border-outline-variant rounded divide-y divide-outline-variant/40">
                                    {dossiers.length === 0 ? (
                                        <li className="px-3 py-2 text-center font-body-xs text-[11px] text-outline italic">
                                            Aucun dossier disponible
                                        </li>
                                    ) : filteredDossiers.length === 0 ? (
                                        <li className="px-3 py-2 text-center font-body-xs text-[11px] text-outline italic">
                                            Aucun dossier trouvé
                                        </li>
                                    ) : (
                                        filteredDossiers.map((d) => (
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
                                                </button>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        )}
                    </Section>

                    {/* Rattachement client (optionnel, si pas de dossier) */}
                    {!selectedDossier && (
                        <Section title="Client rattaché" hint="optionnel">
                            {directClient ? (
                                <div className="flex items-center gap-3 p-2 bg-surface-container-low border border-outline-variant rounded">
                                    <div className="w-9 h-9 rounded-full bg-tertiary-fixed-dim text-tertiary flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[18px]">{directClient.iconHint}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                            {clientDisplayName(directClient)}
                                        </p>
                                        <p className="font-mono-num text-[10px] text-outline">{directClient.numeroClient}</p>
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
                                        placeholder="Rechercher un client…"
                                        className={inputCls}
                                    />
                                    <ul className="max-h-[180px] overflow-y-auto overscroll-contain scrollbar-thin border border-outline-variant rounded divide-y divide-outline-variant/40">
                                        {clients.length === 0 ? (
                                            <li className="px-3 py-2 text-center font-body-xs text-[11px] text-outline italic">
                                                Aucun client disponible
                                            </li>
                                        ) : filteredClients.length === 0 ? (
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
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Équipe */}
                    <Section title="Responsable & équipe" hint="hérité du dossier par défaut">
                        <TeamPickerExpanded
                            responsableId={responsableId}
                            equipeIds={equipeIds}
                            onChange={(next) => {
                                setResponsableId(next.responsableId)
                                setEquipeIds(next.equipeIds)
                            }}
                        />
                    </Section>

                    {/* Description */}
                    <Section title="Détails (optionnel)">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className={cn(inputCls, "resize-none")}
                            placeholder="Précisions sur l'acte, références, instructions…"
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
                            {isEdit ? "save" : "add_task"}
                        </span>
                        {isEdit ? "Enregistrer" : "Créer la diligence"}
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
    hint,
    children,
}: {
    title: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <section>
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-2 flex items-center gap-1">
                {title}
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
                <span className="font-body-xs text-[10px] text-outline italic block mt-0.5">{hint}</span>
            )}
        </label>
    )
}
