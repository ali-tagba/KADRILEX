"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
    DOSSIER_KIND,
    DOSSIER_STATUTS,
    DOSSIER_TYPES,
    ETATS_PROCEDURE_SUGGESTIONS,
    JURIDICTIONS_NIGER,
    NATURES_AFFAIRE,
    PHASES_HONORAIRES,
    MODE_HONORAIRE,
    type DossierKindKey,
    type DossierStatutKey,
    type DossierTypeKey,
    type PhaseHonoraires,
    type ModeHonoraire,
} from "@/lib/constants/legal"
import type { DossierHonoraire, DossierRetrocession, DossierProvision } from "@/lib/mock/dossiers"
import { type MockClient, clientDisplayName } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"
import { mockDossiers } from "@/lib/mock/dossiers"
import { TeamPickerExpanded } from "@/components/equipe/team-picker"

/* ============================================================
   Form draft — exposé pour qu'app/dossiers/page.tsx crée un MockDossier.
   ============================================================ */

export interface DossierFormDraft {
    kind: DossierKindKey
    type: DossierTypeKey
    nature: string // libre (combobox + Autre)
    titre: string
    statut: DossierStatutKey
    etatProcedure: string
    juridiction: string
    clientId: string | null
    partiesAdverses: string[]
    description: string
    honoraires: DossierHonoraire[]
    provisionsVersees: DossierProvision[]
    retrocession: DossierRetrocession | null
    notesObservations: string
    responsableId: string | null
    equipeIds: string[]
}

interface DossierFormDialogProps {
    initial?: MockDossier | null
    /** Si fourni, pré-sélectionne et verrouille le client (depuis fiche client) */
    presetClientId?: string | null
    clients: MockClient[]
    onSave: (draft: DossierFormDraft) => void
    onClose: () => void
}

export function DossierFormDialog({
    initial,
    presetClientId,
    clients,
    onSave,
    onClose,
}: DossierFormDialogProps) {
    const [kind, setKind] = useState<DossierKindKey>(initial?.kind ?? "CLIENT")
    const [type, setType] = useState<DossierTypeKey>(initial?.type ?? "COMMERCIAL")
    const [nature, setNature] = useState<string>(initial?.nature ?? "")
    const [titre, setTitre] = useState<string>(initial?.titre ?? "")
    const [statut, setStatut] = useState<DossierStatutKey>(initial?.statut ?? "EN_COURS")
    const [etatProcedure, setEtatProcedure] = useState<string>(initial?.etatProcedure ?? "")
    const [juridiction, setJuridiction] = useState<string>(initial?.juridiction ?? "")
    const [clientId, setClientId] = useState<string | null>(
        initial?.clientId ?? presetClientId ?? null
    )
    const [partiesAdverses, setPartiesAdverses] = useState<string>(
        // Guard : Array.isArray() au cas où l'API renvoie null/undefined accidentellement
        Array.isArray(initial?.partiesAdverses) ? initial!.partiesAdverses.join(", ") : ""
    )
    const [description, setDescription] = useState<string>(initial?.description ?? "")
    const [honorairesList, setHonorairesList] = useState<DossierHonoraire[]>(initial?.honoraires ?? [])
    const [provisionsList, setProvisionsList] = useState<DossierProvision[]>(initial?.provisionsVersees ?? [])
    const [retrocessionEnabled, setRetrocessionEnabled] = useState(!!initial?.retrocession)
    const [retrocession, setRetrocession] = useState<DossierRetrocession>(
        initial?.retrocession ?? { beneficiaire: "", type: "POURCENTAGE", montant: 0 }
    )
    const [notes, setNotes] = useState<string>("")
    const [responsableId, setResponsableId] = useState<string | null>(
        initial?.responsableId ?? null
    )
    const [equipeIds, setEquipeIds] = useState<string[]>(initial?.equipeIds ?? [])

    /* Recherche client */
    const [clientSearch, setClientSearch] = useState("")
    const filteredClients = useMemo(() => {
        const q = clientSearch.trim().toLowerCase()
        if (!q) return clients.slice(0, 20)
        return clients.filter((c) => {
            const hay = [
                clientDisplayName(c),
                c.numeroClient,
                c.email,
                c.telephone,
                c.ville,
            ]
                .join(" ")
                .toLowerCase()
            return hay.includes(q)
        })
    }, [clients, clientSearch])

    const selectedClient = clientId ? clients.find((c) => c.id === clientId) ?? null : null
    const clientLocked = !!presetClientId

    /**
     * Parties adverses déjà connues pour le client sélectionné — agrégées depuis
     * TOUS les dossiers existants de ce client (exclut le dossier en cours d'édition).
     * Utilisées comme chips de suggestion rapide dans le picker partiesAdverses.
     */
    const suggestedParties = useMemo(() => {
        if (!clientId) return [] as string[]
        const set = new Set<string>()
        for (const d of mockDossiers) {
            if (d.clientId !== clientId) continue
            if (initial && d.id === initial.id) continue // exclut le dossier en cours
            for (const p of d.partiesAdverses ?? []) {
                if (p.trim()) set.add(p.trim())
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
    }, [clientId, initial])

    /* Liste des parties adverses déjà sélectionnées dans le draft (parsée CSV) */
    const currentParties = useMemo(() => {
        return partiesAdverses
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
    }, [partiesAdverses])

    function addPartySuggestion(name: string) {
        if (currentParties.includes(name)) return
        const next = [...currentParties, name].join(", ")
        setPartiesAdverses(next)
    }

    /* Pré-remplit titre + équipe quand on choisit un client (héritage) */
    const handleSelectClient = (c: MockClient) => {
        setClientId(c.id)
        if (!titre) setTitre(`${clientDisplayName(c)} c/ — `)
        if (responsableId === null && c.responsableId) {
            setResponsableId(c.responsableId)
        }
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const isEdit = !!initial
    const canSave = titre.trim().length > 0 && (kind === "ADMIN" || clientId !== null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave) return
        onSave({
            kind,
            type,
            nature: nature.trim(),
            titre: titre.trim(),
            statut,
            etatProcedure: etatProcedure.trim(),
            juridiction: juridiction.trim(),
            clientId: kind === "ADMIN" ? null : clientId,
            partiesAdverses: partiesAdverses
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            description: description.trim(),
            honoraires: honorairesList,
            provisionsVersees: provisionsList,
            retrocession: retrocessionEnabled && retrocession.beneficiaire.trim() !== "" ? retrocession : null,
            notesObservations: notes.trim(),
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
                            {isEdit ? "Modifier le dossier" : "Nouveau dossier"}
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            {selectedClient
                                ? `Pour ${clientDisplayName(selectedClient)} (${selectedClient.numeroClient})`
                                : kind === "ADMIN"
                                ? "Dossier interne (sans client)"
                                : "Sélectionnez un client pour commencer"}
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
                    {/* Type de dossier */}
                    <Section title="Type de dossier">
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(DOSSIER_KIND) as [DossierKindKey, { label: string }][]).map(
                                ([k, m]) => (
                                    <KindOption
                                        key={k}
                                        active={kind === k}
                                        onClick={() => {
                                            setKind(k)
                                            if (k === "ADMIN") setClientId(null)
                                        }}
                                        icon={k === "CLIENT" ? "folder_open" : "folder_managed"}
                                        title={m.label}
                                        desc={
                                            k === "CLIENT"
                                                ? "Affaire pour un client externe"
                                                : "Dossier administratif interne au cabinet"
                                        }
                                    />
                                )
                            )}
                        </div>
                    </Section>

                    {/* Sélection client (si CLIENT) */}
                    {kind === "CLIENT" && (
                        <Section
                            title={clientLocked ? "Client (verrouillé)" : "Client"}
                            required
                        >
                            {selectedClient ? (
                                <div className="flex items-center gap-3 p-2 bg-surface-container-low border border-outline-variant rounded">
                                    <div className="w-9 h-9 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[18px]">
                                            {selectedClient.iconHint}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                            {clientDisplayName(selectedClient)}
                                        </p>
                                        <p className="font-mono-num text-[10px] text-outline">
                                            {selectedClient.numeroClient} ·{" "}
                                            {selectedClient.email}
                                        </p>
                                    </div>
                                    {!clientLocked && (
                                        <button
                                            type="button"
                                            onClick={() => setClientId(null)}
                                            className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30"
                                            title="Changer de client"
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
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                        placeholder="Rechercher un client (nom, n°, email…)"
                                        className={inputCls}
                                        autoFocus
                                    />
                                    <ul className="max-h-[200px] overflow-y-auto overscroll-contain scrollbar-thin border border-outline-variant rounded divide-y divide-outline-variant/40">
                                        {filteredClients.length === 0 ? (
                                            <li className="px-3 py-2 text-center font-body-xs text-[11px] text-outline italic">
                                                Aucun client trouvé
                                            </li>
                                        ) : (
                                            filteredClients.map((c) => (
                                                <li key={c.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectClient(c)}
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

                    {/* Identité du dossier */}
                    <Section title="Identité">
                        <Field label="Titre / Intitulé" required>
                            <input
                                type="text"
                                value={titre}
                                onChange={(e) => setTitre(e.target.value)}
                                className={inputCls}
                                placeholder="Ex : SONITEL c/ État du Niger"
                                required
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Type de procédure">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as DossierTypeKey)}
                                    className={inputCls}
                                >
                                    {(
                                        Object.entries(DOSSIER_TYPES) as [
                                            DossierTypeKey,
                                            { code: string; label: string },
                                        ][]
                                    ).map(([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.code} — {m.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Statut initial">
                                <select
                                    value={statut}
                                    onChange={(e) => setStatut(e.target.value as DossierStatutKey)}
                                    className={inputCls}
                                >
                                    {(
                                        Object.entries(DOSSIER_STATUTS) as [
                                            DossierStatutKey,
                                            { label: string },
                                        ][]
                                    ).map(([k, m]) => (
                                        <option key={k} value={k}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="Nature de l'affaire"
                                hint="Suggestions à la frappe — saisie libre possible"
                            >
                                <input
                                    type="text"
                                    value={nature}
                                    onChange={(e) => setNature(e.target.value)}
                                    list="natures-affaire"
                                    className={inputCls}
                                    placeholder="Ex : Droit Bancaire, Recouvrement…"
                                />
                                <datalist id="natures-affaire">
                                    {NATURES_AFFAIRE.map((n) => (
                                        <option key={n} value={n} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="Juridiction" hint="Suggestions Niger + saisie libre">
                                <input
                                    type="text"
                                    value={juridiction}
                                    onChange={(e) => setJuridiction(e.target.value)}
                                    list="juridictions-niger"
                                    className={inputCls}
                                    placeholder="Ex : TGI Niamey, CCJA…"
                                />
                                <datalist id="juridictions-niger">
                                    {JURIDICTIONS_NIGER.map((j) => (
                                        <option key={j} value={j} />
                                    ))}
                                </datalist>
                            </Field>
                        </div>
                        <Field
                            label="État de la procédure"
                            hint="Suggestions standards + saisie libre"
                        >
                            <input
                                type="text"
                                value={etatProcedure}
                                onChange={(e) => setEtatProcedure(e.target.value)}
                                list="etats-procedure"
                                className={inputCls}
                                placeholder="Ex : Mise en état, Délibéré en cours…"
                            />
                            <datalist id="etats-procedure">
                                {ETATS_PROCEDURE_SUGGESTIONS.map((e) => (
                                    <option key={e} value={e} />
                                ))}
                            </datalist>
                        </Field>
                        <Field
                            label="Parties adverses"
                            hint={
                                suggestedParties.length > 0
                                    ? `${suggestedParties.length} partie${suggestedParties.length > 1 ? "s" : ""} déjà connue${suggestedParties.length > 1 ? "s" : ""} pour ce client — clique pour ajouter`
                                    : "Séparées par des virgules — ex : État du Niger, Ministère…"
                            }
                        >
                            <input
                                type="text"
                                value={partiesAdverses}
                                onChange={(e) => setPartiesAdverses(e.target.value)}
                                className={inputCls}
                                placeholder="Partie A, Partie B…"
                            />
                            {/* Suggestions agrégées depuis tous les dossiers du client */}
                            {suggestedParties.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {suggestedParties.map((name) => {
                                        const isPicked = currentParties.includes(name)
                                        return (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => addPartySuggestion(name)}
                                                disabled={isPicked}
                                                title={
                                                    isPicked
                                                        ? "Déjà ajoutée à ce dossier"
                                                        : `Ajouter « ${name} » à ce dossier`
                                                }
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors",
                                                    isPicked
                                                        ? "bg-accent/15 border-accent/40 text-accent cursor-default"
                                                        : "bg-surface border-outline-variant text-on-surface-variant hover:bg-error-container/40 hover:text-on-error-container hover:border-error/40"
                                                )}
                                            >
                                                <span className="material-symbols-outlined text-[12px]">
                                                    {isPicked ? "check" : "add"}
                                                </span>
                                                {name}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </Field>
                    </Section>

                    {/* Engagement honoraires */}
                    <Section title="Honoraires convenus" hint="Définir un honoraire global ou par phase">
                        <div className="space-y-3">
                            {honorairesList.map((h, i) => (
                                <div key={h.id} className="flex items-center gap-2 bg-surface-container-low p-2 border border-outline-variant rounded">
                                    <select
                                        value={h.phase}
                                        onChange={e => {
                                            const v = [...honorairesList]
                                            v[i].phase = e.target.value as PhaseHonoraires
                                            setHonorairesList(v)
                                        }}
                                        className={inputCls}
                                    >
                                        {PHASES_HONORAIRES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <select
                                        value={h.type}
                                        onChange={e => {
                                            const v = [...honorairesList]
                                            v[i].type = e.target.value as ModeHonoraire
                                            setHonorairesList(v)
                                        }}
                                        className={cn(inputCls, "w-32")}
                                    >
                                        {MODE_HONORAIRE.map(m => <option key={m} value={m}>{m === "FORFAIT" ? "Forfait" : "Pourcentage"}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        min={0}
                                        value={h.montant || ""}
                                        onChange={e => {
                                            const v = [...honorairesList]
                                            v[i].montant = Number(e.target.value)
                                            setHonorairesList(v)
                                        }}
                                        placeholder={h.type === "FORFAIT" ? "Montant FCFA" : "% du résultat"}
                                        className={cn(inputCls, "font-mono-num text-right w-32")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setHonorairesList(honorairesList.filter((_, idx) => idx !== i))}
                                        className="text-error hover:bg-error-container p-1 rounded"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setHonorairesList([...honorairesList, { id: "h-" + Math.random().toString(36).substr(2, 9), phase: "Unique / Global", type: "FORFAIT", montant: 0 }])}
                                className="text-accent text-sm font-medium hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Ajouter des honoraires
                            </button>
                        </div>
                    </Section>

                    {/* Provisions Versées */}
                    <Section title="Provisions versées (PV)" hint="Enregistrer les acomptes ou paiements partiels reçus">
                        <div className="space-y-3">
                            {provisionsList.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-2 bg-surface-container-low p-2 border border-outline-variant rounded">
                                    <input
                                        type="date"
                                        value={p.date}
                                        onChange={e => {
                                            const v = [...provisionsList]
                                            v[i].date = e.target.value
                                            setProvisionsList(v)
                                        }}
                                        className={cn(inputCls, "w-36")}
                                    />
                                    <input
                                        type="text"
                                        value={p.description}
                                        onChange={e => {
                                            const v = [...provisionsList]
                                            v[i].description = e.target.value
                                            setProvisionsList(v)
                                        }}
                                        placeholder="Description (ex: Avance sur frais)"
                                        className={cn(inputCls, "flex-1")}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        value={p.montant || ""}
                                        onChange={e => {
                                            const v = [...provisionsList]
                                            v[i].montant = Number(e.target.value)
                                            setProvisionsList(v)
                                        }}
                                        placeholder="Montant FCFA"
                                        className={cn(inputCls, "font-mono-num text-right w-32")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setProvisionsList(provisionsList.filter((_, idx) => idx !== i))}
                                        className="text-error hover:bg-error-container p-1 rounded"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setProvisionsList([...provisionsList, { id: "p-" + Math.random().toString(36).substr(2, 9), date: new Date().toISOString().slice(0, 10), montant: 0, description: "" }])}
                                className="text-accent text-sm font-medium hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Ajouter une provision
                            </button>
                        </div>
                    </Section>

                    {/* Rétrocession */}
                    <Section title="Rétrocession d'honoraires">
                        <label className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                checked={retrocessionEnabled}
                                onChange={e => setRetrocessionEnabled(e.target.checked)}
                                className="rounded text-accent focus:ring-accent"
                            />
                            <span className="text-sm font-medium text-on-surface">Activer la rétrocession</span>
                        </label>
                        {retrocessionEnabled && (
                            <div className="flex items-center gap-2 bg-surface-container-low p-2 border border-outline-variant rounded">
                                <input
                                    type="text"
                                    value={retrocession.beneficiaire}
                                    onChange={e => setRetrocession({ ...retrocession, beneficiaire: e.target.value })}
                                    placeholder="Bénéficiaire (ex: Confrère)"
                                    className={cn(inputCls, "flex-1")}
                                />
                                <select
                                    value={retrocession.type}
                                    onChange={e => setRetrocession({ ...retrocession, type: e.target.value as ModeHonoraire })}
                                    className={cn(inputCls, "w-32")}
                                >
                                    {MODE_HONORAIRE.map(m => <option key={m} value={m}>{m === "FORFAIT" ? "Forfait" : "Pourcentage"}</option>)}
                                </select>
                                <input
                                    type="number"
                                    min={0}
                                    value={retrocession.montant || ""}
                                    onChange={e => setRetrocession({ ...retrocession, montant: Number(e.target.value) })}
                                    placeholder={retrocession.type === "FORFAIT" ? "Montant FCFA" : "% du résultat"}
                                    className={cn(inputCls, "font-mono-num text-right w-32")}
                                />
                            </div>
                        )}
                    </Section>

                    {/* Équipe */}
                    <Section
                        title="Équipe affectée"
                        hint="Hérité du client par défaut, modifiable"
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

                    {/* Description */}
                    <Section title="Description">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className={cn(inputCls, "resize-none")}
                            placeholder="Contexte de l'affaire, faits, prétentions des parties…"
                        />
                    </Section>

                    {/* Notes & observations */}
                    <Section title="Notes & observations internes">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className={cn(inputCls, "resize-none")}
                            placeholder="Points d'attention, stratégie, échanges informels…"
                        />
                        <p className="font-body-xs text-[10px] text-outline italic mt-1">
                            Visibles uniquement par les membres de l&apos;équipe affectée au dossier.
                        </p>
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
                            {isEdit ? "save" : "folder_open"}
                        </span>
                        {isEdit ? "Enregistrer" : "Créer le dossier"}
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

function KindOption({
    active,
    onClick,
    icon,
    title,
    desc,
}: {
    active: boolean
    onClick: () => void
    icon: string
    title: string
    desc: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "p-2.5 rounded border text-left transition-all",
                active
                    ? "border-accent bg-accent/10 ring-1 ring-accent/20"
                    : "border-outline-variant hover:bg-surface-container-low"
            )}
        >
            <div className="flex items-center gap-1.5 mb-0.5">
                <span
                    className={cn(
                        "material-symbols-outlined text-[16px]",
                        active ? "text-accent" : "text-outline"
                    )}
                >
                    {icon}
                </span>
                <span className="font-body-sm text-body-sm font-medium text-on-surface">
                    {title}
                </span>
            </div>
            <p className="font-body-xs text-[10px] text-outline leading-tight">{desc}</p>
        </button>
    )
}
