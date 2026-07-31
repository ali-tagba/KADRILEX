"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
    HONORAIRES_TYPES,
    type AvocatCabinet,
    type HonorairesType,
} from "@/lib/constants/legal"
import type { ClientType, MockClient } from "@/lib/mock/clients"

/* ============================================================
   Form draft — exposé pour qu'app/clients/page.tsx puisse créer un MockClient.
   ============================================================ */

export interface ClientFormDraft {
    type: ClientType
    /* PM */
    raisonSociale: string
    formeJuridique: string
    numeroRCCM: string
    nif: string
    /** Conventionné(e) = a une convention cadre signée avec le cabinet (PM et PP) */
    conventionnee: boolean | null
    siegeSocial: string
    representantLegal: string
    /* PP */
    nom: string
    prenom: string
    profession: string
    pieceIdentite: string
    nationalite: string
    dateNaissance: string
    lieuNaissance: string
    whatsapp: string
    /* Communs */
    email: string
    telephone: string
    adresse: string
    ville: string
    pays: string
    notes: string
    /* Métadonnées */
    actif: boolean
    avocatEnCharge: AvocatCabinet | ""
    honorairesConvenus: HonorairesType | ""
    createdAt?: string
}

interface ClientFormDialogProps {
    initial?: MockClient | null
    onSave: (draft: ClientFormDraft) => void
    onClose: () => void
    existingClients?: MockClient[]
}

const VILLES_NIGER = [
    "Niamey",
    "Maradi",
    "Zinder",
    "Tahoua",
    "Agadez",
    "Diffa",
    "Dosso",
    "Tillabéri",
] as const

const FORMES_JURIDIQUES = [
    "SARL",
    "SARLU",
    "SA",
    "SAS",
    "SCS",
    "SNC",
    "GIE",
    "Coopérative",
    "Association",
    "ONG",
    "EI (Entreprise Individuelle)",
    "Établissement Public",
    "Société Étrangère",
] as const

export function ClientFormDialog({ initial, onSave, onClose, existingClients = [] }: ClientFormDialogProps) {
    const [type, setType] = useState<ClientType>(initial?.type ?? "PERSONNE_MORALE")

    const [raisonSociale, setRaisonSociale] = useState(initial?.raisonSociale ?? "")
    const [formeJuridique, setFormeJuridique] = useState(initial?.formeJuridique ?? "")
    const [numeroRCCM, setNumeroRCCM] = useState(initial?.numeroRCCM ?? "")
    const [nif, setNif] = useState(initial?.nif ?? "")
    const [conventionnee, setConventionnee] = useState<boolean | null>(
        initial?.conventionnee ?? null
    )
    const [siegeSocial, setSiegeSocial] = useState(initial?.siegeSocial ?? "")
    const [representantLegal, setRepresentantLegal] = useState(initial?.representantLegal ?? "")

    const [nom, setNom] = useState(initial?.nom ?? "")
    const [prenom, setPrenom] = useState(initial?.prenom ?? "")
    const [profession, setProfession] = useState(initial?.profession ?? "")
    const [pieceIdentite, setPieceIdentite] = useState(initial?.pieceIdentite ?? "")
    const [nationalite, setNationalite] = useState(initial?.nationalite ?? "Nigérienne")
    const [dateNaissance, setDateNaissance] = useState(
        initial?.dateNaissance ? initial.dateNaissance.slice(0, 10) : ""
    )
    const [lieuNaissance, setLieuNaissance] = useState(initial?.lieuNaissance ?? "")
    const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "")

    const [email, setEmail] = useState(initial?.email ?? "")
    const [telephone, setTelephone] = useState(initial?.telephone ?? "")
    const [adresse, setAdresse] = useState(initial?.adresse ?? "")
    const [ville, setVille] = useState(initial?.ville ?? "Niamey")
    const [pays, setPays] = useState(initial?.pays ?? "Niger")
    const [notes, setNotes] = useState(initial?.notes ?? "")
    const [actif, setActif] = useState<boolean>(initial?.actif ?? true)
    /* avocatEnCharge legacy — l'attribution réelle se fait via TeamPicker côté fiche.
       On le préserve à l'identique pour la rétrocompat du draft. */
    const [avocatEnCharge] = useState<AvocatCabinet | "">(initial?.avocatEnCharge ?? "")
    const [honorairesConvenus, setHonorairesConvenus] = useState<HonorairesType | "">(
        initial?.honorairesConvenus ?? ""
    )
    const [createdAt, setCreatedAt] = useState(
        initial?.createdAt ? new Date(initial.createdAt).toISOString().slice(0, 10) : ""
    )

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const isEdit = !!initial
    const isPM = type === "PERSONNE_MORALE"
    /* Validation : nom requis selon le type */
    const canSave = isPM
        ? raisonSociale.trim().length > 0
        : nom.trim().length > 0

    // Détection de conflit d'intérêt (même nom, même téléphone/email, et actif)
    const duplicateClient = existingClients.find((c) => {
        if (c.id === initial?.id) return false
        if (!c.actif) return false
        
        const currentName = isPM ? raisonSociale.trim().toLowerCase() : `${prenom.trim()} ${nom.trim()}`.trim().toLowerCase()
        const cName = c.type === "PERSONNE_MORALE" 
            ? (c.raisonSociale ?? "").toLowerCase() 
            : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim().toLowerCase()
            
        if (currentName === cName && currentName.length > 0) {
            if (c.telephone && telephone && c.telephone === telephone) return true
            if (c.email && email && c.email === email) return true
        }
        return false
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSave) return
        onSave({
            type,
            raisonSociale: raisonSociale.trim(),
            formeJuridique: formeJuridique.trim(),
            numeroRCCM: numeroRCCM.trim(),
            nif: nif.trim(),
            conventionnee,
            siegeSocial: siegeSocial.trim(),
            representantLegal: representantLegal.trim(),
            nom: nom.trim(),
            prenom: prenom.trim(),
            profession: profession.trim(),
            pieceIdentite: pieceIdentite.trim(),
            nationalite: nationalite.trim(),
            dateNaissance: dateNaissance,
            lieuNaissance: lieuNaissance.trim(),
            whatsapp: whatsapp.trim(),
            email: email.trim(),
            telephone: telephone.trim(),
            adresse: adresse.trim(),
            ville: ville.trim(),
            pays: pays.trim(),
            notes: notes.trim(),
            actif,
            avocatEnCharge,
            honorairesConvenus,
            createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
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
                            {isEdit ? "Modifier le client" : "Nouveau client"}
                        </h2>
                        <p className="font-body-xs text-[11px] text-outline mt-0.5">
                            {isPM ? "Personne morale" : "Personne physique"}
                            {conventionnee
                                ? " · conventionné"
                                : conventionnee === false
                                    ? " · hors convention"
                                    : ""}
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
                    {duplicateClient && (
                        <div className="bg-error-container/20 border border-error/50 rounded-lg p-4 mb-4 flex items-start gap-3">
                            <span className="material-symbols-outlined text-error mt-0.5">warning</span>
                            <div>
                                <h4 className="font-label-caps text-error mb-1">Conflit d'intérêts potentiel</h4>
                                <p className="font-body-sm text-on-surface text-sm">
                                    Un client actif nommé <strong>{isPM ? duplicateClient.raisonSociale : `${duplicateClient.prenom} ${duplicateClient.nom}`}</strong> avec les mêmes coordonnées existe déjà dans la base.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Type de client (toggle visuel) */}
                    <Section title="Type de client">
                        <div className="grid grid-cols-2 gap-2">
                            <TypeOption
                                active={isPM}
                                onClick={() => setType("PERSONNE_MORALE")}
                                icon="domain"
                                title="Personne morale"
                                desc="Société, association, ONG, GIE…"
                            />
                            <TypeOption
                                active={!isPM}
                                onClick={() => setType("PERSONNE_PHYSIQUE")}
                                icon="person"
                                title="Personne physique"
                                desc="Particulier, professionnel libéral"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <ConvOption
                                active={conventionnee === true}
                                onClick={() => setConventionnee(true)}
                                icon="verified"
                                title={isPM ? "Conventionnée" : "Conventionné"}
                                desc="Convention cadre signée — tarification préférentielle"
                            />
                            <ConvOption
                                active={conventionnee === false}
                                onClick={() => setConventionnee(false)}
                                icon="highlight_off"
                                title="Hors convention"
                                desc="Pas de convention cadre"
                            />
                        </div>
                    </Section>

                    {/* Identité — adaptatif selon le type */}
                    {isPM ? (
                        <Section title="Identité juridique (PM)">
                            <Field label="Raison sociale" required>
                                <input
                                    type="text"
                                    value={raisonSociale}
                                    onChange={(e) => setRaisonSociale(e.target.value)}
                                    className={inputCls}
                                    placeholder="Ex : SONITEL, BIN…"
                                    required
                                    autoFocus
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Forme juridique">
                                    <input
                                        type="text"
                                        value={formeJuridique}
                                        onChange={(e) => setFormeJuridique(e.target.value)}
                                        list="formes-juridiques"
                                        placeholder="SARL, SA, GIE…"
                                        className={inputCls}
                                    />
                                    <datalist id="formes-juridiques">
                                        {FORMES_JURIDIQUES.map((f) => (
                                            <option key={f} value={f} />
                                        ))}
                                    </datalist>
                                </Field>
                                <Field label="N° RCCM">
                                    <input
                                        type="text"
                                        value={numeroRCCM}
                                        onChange={(e) => setNumeroRCCM(e.target.value)}
                                        className={inputCls}
                                        placeholder="NI-NIA-2018-B-1234"
                                    />
                                </Field>
                                <Field label="NIF (Numéro d'Identification Fiscale)">
                                    <input
                                        type="text"
                                        value={nif}
                                        onChange={(e) => setNif(e.target.value)}
                                        className={inputCls}
                                        placeholder="Requis pour facturer"
                                    />
                                </Field>
                                <Field label="Représentant légal">
                                    <input
                                        type="text"
                                        value={representantLegal}
                                        onChange={(e) => setRepresentantLegal(e.target.value)}
                                        className={inputCls}
                                        placeholder="M. Amadou Sissoko"
                                    />
                                </Field>
                            </div>
                            <Field label="Siège social">
                                <input
                                    type="text"
                                    value={siegeSocial}
                                    onChange={(e) => setSiegeSocial(e.target.value)}
                                    className={inputCls}
                                    placeholder="Quartier Plateau, Niamey"
                                />
                            </Field>
                        </Section>
                    ) : (
                        <Section title="Identité (PP)">
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
                                        onChange={(e) => setNom(e.target.value.toUpperCase())}
                                        className={inputCls}
                                        required
                                    />
                                </Field>
                                <Field label="Profession">
                                    <input
                                        type="text"
                                        value={profession}
                                        onChange={(e) => setProfession(e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Pièce d'identité">
                                    <input
                                        type="text"
                                        value={pieceIdentite}
                                        onChange={(e) => setPieceIdentite(e.target.value)}
                                        className={inputCls}
                                        placeholder="CNI, passeport…"
                                    />
                                </Field>
                                <Field label="Nationalité">
                                    <input
                                        type="text"
                                        value={nationalite}
                                        onChange={(e) => setNationalite(e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Date de naissance">
                                    <input
                                        type="date"
                                        value={dateNaissance}
                                        onChange={(e) => setDateNaissance(e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Lieu de naissance">
                                    <input
                                        type="text"
                                        value={lieuNaissance}
                                        onChange={(e) => setLieuNaissance(e.target.value)}
                                        className={inputCls}
                                        placeholder="Niamey, Niger"
                                    />
                                </Field>
                                <Field label="WhatsApp">
                                    <input
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className={inputCls}
                                        placeholder="+227 9X XX XX XX"
                                    />
                                </Field>
                            </div>
                        </Section>
                    )}

                    {/* Coordonnées (commun PM/PP) */}
                    <Section title="Coordonnées">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Email">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Téléphone">
                                <input
                                    type="tel"
                                    value={telephone}
                                    onChange={(e) => setTelephone(e.target.value)}
                                    className={inputCls}
                                    placeholder="+227 …"
                                />
                            </Field>
                            <Field label="Adresse">
                                <input
                                    type="text"
                                    value={adresse}
                                    onChange={(e) => setAdresse(e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Ville">
                                <input
                                    type="text"
                                    value={ville}
                                    onChange={(e) => setVille(e.target.value)}
                                    list="villes-niger"
                                    className={inputCls}
                                />
                                <datalist id="villes-niger">
                                    {VILLES_NIGER.map((v) => (
                                        <option key={v} value={v} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="Pays">
                                <input
                                    type="text"
                                    value={pays}
                                    onChange={(e) => setPays(e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* Métadonnées cabinet */}
                    <Section title="Suivi cabinet">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Honoraires convenus">
                                <select
                                    value={honorairesConvenus}
                                    onChange={(e) =>
                                        setHonorairesConvenus(e.target.value as HonorairesType | "")
                                    }
                                    className={inputCls}
                                >
                                    <option value="">— Non défini —</option>
                                    {HONORAIRES_TYPES.map((h) => (
                                        <option key={h} value={h}>
                                            {h}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Statut">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActif(true)}
                                        className={cn(
                                            "flex-1 px-2 py-1.5 rounded border font-body-sm text-body-sm transition-colors",
                                            actif
                                                ? "border-[#166534] bg-[#e8f5e9] text-[#166534] font-medium"
                                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        Actif
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActif(false)}
                                        className={cn(
                                            "flex-1 px-2 py-1.5 rounded border font-body-sm text-body-sm transition-colors",
                                            !actif
                                                ? "border-outline bg-surface-container text-on-surface font-medium line-through"
                                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                                        )}
                                    >
                                        Inactif
                                    </button>
                                </div>
                            </Field>
                            <Field label="Date d'entrée (Optionnel)">
                                <input
                                    type="date"
                                    value={createdAt}
                                    onChange={(e) => setCreatedAt(e.target.value)}
                                    className={inputCls}
                                />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Notes (optionnel)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className={cn(inputCls, "resize-none")}
                            placeholder="Particularités, contexte commercial, points d'attention…"
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
                            {isEdit ? "save" : "person_add"}
                        </span>
                        {isEdit ? "Enregistrer" : "Créer le client"}
                    </button>
                </footer>
            </form>
        </div>
    )
}

const inputCls =
    "w-full bg-white border border-outline-variant rounded px-2 py-1.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-2">
                {title}
            </h3>
            <div className="space-y-3">{children}</div>
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

function TypeOption({
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

function ConvOption({
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
                "p-2 rounded border text-left transition-all",
                active
                    ? "border-[#166534] bg-[#e8f5e9]/40 ring-1 ring-[#166534]/20"
                    : "border-outline-variant hover:bg-surface-container-low"
            )}
        >
            <div className="flex items-center gap-1.5 mb-0.5">
                <span
                    className={cn(
                        "material-symbols-outlined text-[14px]",
                        active ? "text-[#166534]" : "text-outline"
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
