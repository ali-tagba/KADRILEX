"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import type { MockClient } from "@/lib/mock/clients"
import { clientDisplayName, detectConflits, getConflitsActifs, getConflitsHistoriques, type ClientContact } from "@/lib/mock/clients"
import { InlineTextCell } from "@/components/inline"
import { ContactFormDialog, type ContactDraft } from "@/components/clients/contact-form-dialog"
import { ClientFormDialog, type ClientFormDraft } from "@/components/clients/client-form-dialog"
import { ShareButton } from "@/components/shared/share-button"
import { DiligencesSection } from "@/components/diligences/diligences-section"
import { computeClientActivity } from "@/lib/mock/client-activity"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { patchEntity, showApiError } from "@/lib/api/patch"

function formatRelativeOrDate(iso: string): string {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86_400_000)
    if (days === 0) {
        return `Aujourd'hui, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`
    }
    if (days === 1) {
        return `Hier, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`
    }
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatClientSince(iso: string): string {
    const d = new Date(iso)
    const month = d.toLocaleDateString("fr-FR", { month: "long" })
    return `Client depuis ${month} ${d.getFullYear()}`
}

function initials(nom: string | null, prenom: string | null): string {
    const n = (nom ?? "?").charAt(0)
    const p = (prenom ?? "?").charAt(0)
    return `${p}${n}`.toUpperCase()
}

const TYPE_DOSSIER_LABEL: Record<string, string> = {
    CONTENTIEUX: "Contentieux",
    CONSEIL: "Conseil",
    PRE_CONTENTIEUX: "Pré-contentieux",
    TRANSACTIONNEL: "Transactionnel",
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { can } = useCurrentUser()
    const [client, setClient] = useState<MockClient | null>(null)
    const [allClients, setAllClients] = useState<MockClient[]>([])
    const [loading, setLoading] = useState(true)
    const [notFoundFlag, setNotFoundFlag] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const searchParams = useSearchParams()

    // Si l'URL contient ?edit=1 (depuis la liste), ouvre la dialog au boot
    useEffect(() => {
        if (searchParams.get("edit") === "1") setEditOpen(true)
    }, [searchParams])

    useEffect(() => {
        let alive = true

        const fetchDetail: Promise<MockClient | { notFound: true }> = fetch(`/api/clients/${id}`).then(
            async (r) => {
                if (r.status === 404) return { notFound: true as const }
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return (await r.json()) as MockClient
            }
        )

        const fetchAll: Promise<MockClient[]> = fetch("/api/clients")
            .then(async (r) => (r.ok ? ((await r.json()) as MockClient[]) : []))
            .catch(() => [] as MockClient[])

        Promise.all([fetchDetail, fetchAll])
            .then(([detail, all]) => {
                if (!alive) return
                if ("notFound" in detail) {
                    setNotFoundFlag(true)
                    return
                }
                setClient(detail)
                setAllClients(all)
            })
            .catch(() => {
                if (alive) setNotFoundFlag(true)
            })
            .finally(() => {
                if (alive) setLoading(false)
            })

        return () => {
            alive = false
        }
    }, [id])

    const conflitsActifs = useMemo(() => {
        if (!client || allClients.length === 0) return []
        return getConflitsActifs(client, allClients)
    }, [client, allClients])
    const conflitsHistoriques = useMemo(() => {
        if (!client || allClients.length === 0) return []
        return getConflitsHistoriques(client, allClients)
    }, [client, allClients])
    /* Conserve `conflits` pour le ConflictBanner existant (alerte = uniquement actifs) */
    const conflits = conflitsActifs

    /* Hooks d'état des contacts — DOIVENT être déclarés avant tout return conditionnel */
    const [contactDialogOpen, setContactDialogOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<ClientContact | null>(null)

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto p-container-margin">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center font-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            </div>
        )
    }
    if (notFoundFlag || !client) return notFound()

    const isPM = client.type === "PERSONNE_MORALE"
    const name = clientDisplayName(client)

    const handleCopy = async (label: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(label)
            setTimeout(() => setCopied(null), 1800)
        } catch {
            /* noop */
        }
    }

    /** Patch local + sync API. Update optimiste : on update le state immédiatement puis on
     *  envoie le PATCH. Si erreur API, on rollback. */
    const patchClient = (patch: Partial<MockClient>) => {
        const prev = client
        setClient((p) => (p ? { ...p, ...patch } : p))
        if (!prev) return
        patchEntity(`/api/clients/${prev.id}`, patch as Record<string, unknown>).catch((e) => {
            setClient(prev)
            showApiError("Échec sauvegarde")(e)
        })
    }

    /* CRUD contacts secondaires (state déclaré plus haut, avant l'early return) */

    const handleSaveContact = async (draft: ContactDraft) => {
        try {
            if (editingContact) {
                const res = await fetch(`/api/contacts/${editingContact.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        nom: draft.nom,
                        prenom: draft.prenom || null,
                        fonction: draft.fonction || null,
                        email: draft.email || null,
                        telephone: draft.telephone || null,
                    }),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error ?? `HTTP ${res.status}`)
                }
                const updated: ClientContact = await res.json()
                setClient((prev) =>
                    prev
                        ? {
                              ...prev,
                              contacts: prev.contacts.map((c) =>
                                  c.id === updated.id ? updated : c
                              ),
                          }
                        : prev
                )
            } else if (client) {
                const res = await fetch(`/api/clients/${client.id}/contacts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        nom: draft.nom,
                        prenom: draft.prenom || null,
                        fonction: draft.fonction || null,
                        email: draft.email || null,
                        telephone: draft.telephone || null,
                    }),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error ?? `HTTP ${res.status}`)
                }
                const newContact: ClientContact = await res.json()
                setClient((prev) =>
                    prev ? { ...prev, contacts: [...prev.contacts, newContact] } : prev
                )
            }
            setContactDialogOpen(false)
            return
        } catch (e) {
            toast.error("Échec contact : " + (e instanceof Error ? e.message : "Erreur"))
            return
        }
        setEditingContact(null)
    }

    const handleDeleteContact = async (contactId: string) => {
        try {
            const res = await fetch(`/api/contacts/${contactId}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setClient((prev) =>
                prev ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) } : prev
            )
        } catch (e) {
            toast.error("Échec suppression contact : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const handleSaveEdit = async (draft: ClientFormDraft) => {
        if (!client) return
        const isPM = draft.type === "PERSONNE_MORALE"
        try {
            const res = await fetch(`/api/clients/${client.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    type: draft.type,
                    raisonSociale: isPM ? (draft.raisonSociale || null) : null,
                    formeJuridique: isPM ? (draft.formeJuridique || null) : null,
                    numeroRCCM: isPM ? (draft.numeroRCCM || null) : null,
                    nif: isPM ? (draft.nif || null) : null,
                    conventionnee: draft.conventionnee,
                    siegeSocial: isPM ? (draft.siegeSocial || null) : null,
                    representantLegal: isPM ? (draft.representantLegal || null) : null,
                    nom: !isPM ? (draft.nom || null) : null,
                    prenom: !isPM ? (draft.prenom || null) : null,
                    profession: !isPM ? (draft.profession || null) : null,
                    pieceIdentite: !isPM ? (draft.pieceIdentite || null) : null,
                    nationalite: !isPM ? (draft.nationalite || null) : null,
                    dateNaissance: !isPM && draft.dateNaissance
                        ? new Date(draft.dateNaissance + "T10:00").toISOString()
                        : null,
                    lieuNaissance: !isPM ? (draft.lieuNaissance || null) : null,
                    whatsapp: !isPM ? (draft.whatsapp || null) : null,
                    email: draft.email || null,
                    telephone: draft.telephone || null,
                    adresse: draft.adresse || null,
                    ville: draft.ville || null,
                    pays: draft.pays || "Niger",
                    notes: draft.notes || null,
                    actif: draft.actif,
                    honorairesConvenus: draft.honorairesConvenus || null,
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            const updated: MockClient = await res.json()
            setClient(updated)
            setEditOpen(false)
        } catch (e) {
            toast.error("Échec modification : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const handleDelete = async () => {
        if (!client) return
        if (!confirm(`Supprimer définitivement le client "${clientDisplayName(client)}" ?\n\nSi des dossiers y sont liés, il sera juste archivé (actif=false).`)) {
            return
        }
        setDeleting(true)
        try {
            const res = await fetch(`/api/clients/${client.id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }
            router.push("/clients")
            router.refresh()
        } catch (e) {
            toast.error("Échec suppression : " + (e instanceof Error ? e.message : "Erreur"))
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-container-margin">
            {/* Back link */}
            <Link
                href="/clients"
                className="inline-flex items-center gap-1 text-outline hover:text-on-surface font-body-sm text-body-sm mb-4 transition-colors"
            >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Tous les clients
            </Link>

            {/* Bandeau conflit d'intérêts ACTIF (alerte rouge) */}
            {conflits.length > 0 && <ConflictBanner conflits={conflits} />}

            {/* Conflits HISTORIQUES (silencieux) — l'un des clients est inactif */}
            {conflitsHistoriques.length > 0 && (
                <div className="mb-density-medium px-3 py-2 bg-surface-container-low border border-outline-variant rounded font-body-xs text-[11px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                    <span className="material-symbols-outlined text-[14px] text-outline">history</span>
                    <span>
                        {conflitsHistoriques.length} conflit
                        {conflitsHistoriques.length > 1 ? "s" : ""} historique
                        {conflitsHistoriques.length > 1 ? "s" : ""} — relation
                        {conflitsHistoriques.length > 1 ? "s" : ""} terminée
                        {conflitsHistoriques.length > 1 ? "s" : ""}, pas d&apos;alerte
                    </span>
                    <span className="text-outline">·</span>
                    {conflitsHistoriques.slice(0, 3).map((c) => (
                        <Link
                            key={`${c.clientEnConflit.id}-${c.dossierNumero}`}
                            href={`/clients/${c.clientEnConflit.id}`}
                            className="text-primary-container hover:text-accent transition-colors underline-offset-2 hover:underline"
                        >
                            {c.clientEnConflit.displayName}
                        </Link>
                    ))}
                    {conflitsHistoriques.length > 3 && (
                        <span className="text-outline">
                            +{conflitsHistoriques.length - 3} autres
                        </span>
                    )}
                </div>
            )}

            {/* Header de fiche */}
            <div className="mb-8">
                <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-4">
                    <div className="flex gap-4 items-start">
                        <div
                            className={cn(
                                "w-16 h-16 flex items-center justify-center flex-shrink-0 border border-outline-variant",
                                isPM
                                    ? "bg-surface-container rounded-lg"
                                    : "bg-tertiary-fixed-dim rounded-full"
                            )}
                        >
                            <span
                                className={cn(
                                    "material-symbols-outlined text-display-md",
                                    isPM ? "text-primary" : "text-tertiary"
                                )}
                            >
                                {client.iconHint}
                            </span>
                        </div>
                        <div>
                            <h1 className="font-h1 text-h1 text-on-surface mb-1">{name}</h1>
                            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
                                {isPM ? "Personne Morale" : "Personne Physique"}
                                <span>·</span>
                                <span className="font-mono-num text-mono-num text-primary">
                                    {client.numeroClient}
                                </span>
                                <span>·</span>
                                {formatClientSince(client.createdAt)}
                            </p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap font-body-sm text-body-sm">
                                {client.avocatEnCharge && (
                                    <span className="inline-flex items-center gap-1 text-on-surface-variant">
                                        <span className="material-symbols-outlined text-[14px] text-outline">
                                            badge
                                        </span>
                                        {client.avocatEnCharge}
                                    </span>
                                )}
                                {client.honorairesConvenus && (
                                    <>
                                        <span className="text-outline-variant">·</span>
                                        <span className="inline-flex items-center gap-1 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[14px] text-outline">
                                                payments
                                            </span>
                                            {client.honorairesConvenus}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <ShareButton
                            entityType="CLIENT"
                            entityId={client.id}
                            entityNumero={client.numeroClient}
                            entityLabel={name}
                            className="px-4 py-2 border border-outline-variant rounded bg-transparent text-primary font-body-sm text-body-sm hover:bg-surface-container-low transition-colors inline-flex items-center gap-1.5"
                        />
                        <button
                            onClick={() => setEditOpen(true)}
                            className="px-4 py-2 border border-outline-variant rounded bg-transparent text-primary font-body-sm text-body-sm hover:bg-surface-container-low transition-colors"
                        >
                            Modifier
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-2 border border-error/30 rounded bg-transparent text-error font-body-sm text-body-sm hover:bg-error-container/30 disabled:opacity-50 transition-colors"
                        >
                            {deleting ? "Suppression…" : "Supprimer"}
                        </button>
                        <Link
                            href={`/dossiers?clientId=${client.id}&new=1`}
                            className="px-4 py-2 rounded bg-accent text-white font-body-sm text-body-sm hover:bg-opacity-90 transition-colors shadow-[0px_1px_3px_rgba(31,26,20,0.08)] active:scale-[0.98] duration-150 ease-out flex items-center gap-1.5"
                            title={`Créer un dossier pour ${name} — le client sera pré-sélectionné`}
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Nouveau dossier
                        </Link>
                    </div>
                </div>
            </div>

            {/* Toast simple */}
            {copied && (
                <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded bg-inverse-surface text-inverse-on-surface font-body-sm shadow-lg">
                    {copied} copié dans le presse-papier
                </div>
            )}

            {/* Layout 2/3 + 1/3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-container-margin">
                {/* Colonne gauche */}
                <div className="lg:col-span-2 space-y-container-margin">
                    {/* Coordonnées */}
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                        <div className="bg-surface-container px-4 py-3 border-b border-outline-variant">
                            <h2 className="font-h2 text-h2 text-primary">Coordonnées</h2>
                        </div>
                        <div className="p-density-loose grid grid-cols-1 md:grid-cols-3 gap-density-loose">
                            <CoordItem
                                label="Email"
                                value={client.email ?? ""}
                                href={client.email ? `mailto:${client.email}` : undefined}
                                onCopy={() => handleCopy("Email", client.email ?? "")}
                                onChange={(v) => patchClient({ email: v || null })}
                                mono={false}
                            />
                            <CoordItem
                                label="Téléphone"
                                value={client.telephone ?? ""}
                                href={
                                    client.telephone
                                        ? `tel:${client.telephone.replace(/\s/g, "")}`
                                        : undefined
                                }
                                onCopy={() => handleCopy("Téléphone", client.telephone ?? "")}
                                onChange={(v) => patchClient({ telephone: v || null })}
                                mono
                            />
                            <CoordItem
                                label="Adresse"
                                value={client.adresse ?? ""}
                                onCopy={() =>
                                    handleCopy(
                                        "Adresse",
                                        `${client.adresse ?? ""} ${client.ville} ${client.pays}`.trim()
                                    )
                                }
                                onChange={(v) => patchClient({ adresse: v })}
                                multiline
                                mono={false}
                            />
                            <CoordItem
                                label="Ville"
                                value={client.ville}
                                onCopy={() => handleCopy("Ville", client.ville)}
                                onChange={(v) => patchClient({ ville: v })}
                                mono={false}
                            />
                            <CoordItem
                                label="Pays"
                                value={client.pays}
                                onCopy={() => handleCopy("Pays", client.pays)}
                                onChange={(v) => patchClient({ pays: v })}
                                mono={false}
                            />
                            <CoordItem
                                label="WhatsApp"
                                value={client.whatsapp ?? ""}
                                href={
                                    client.whatsapp
                                        ? `https://wa.me/${client.whatsapp.replace(/[^0-9+]/g, "")}`
                                        : undefined
                                }
                                onCopy={() => handleCopy("WhatsApp", client.whatsapp ?? "")}
                                onChange={(v) => patchClient({ whatsapp: v || null })}
                                icon="chat"
                                mono
                                placeholder="+227 …"
                            />
                        </div>
                    </section>

                    {/* Identité juridique */}
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                        <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                            <h2 className="font-h2 text-h2 text-primary">Identité juridique</h2>
                            <span
                                className="font-body-xs text-[10px] text-outline italic"
                                title="Cliquez sur n'importe quelle valeur pour la modifier"
                            >
                                <span className="material-symbols-outlined text-[12px] align-middle">
                                    edit
                                </span>
                                {" "}Cliquer pour modifier
                            </span>
                        </div>
                        <div>
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {isPM ? (
                                        <>
                                            <DetailRow
                                                label="Forme juridique"
                                                value={client.formeJuridique}
                                                onChange={(v) => patchClient({ formeJuridique: v || null })}
                                            />
                                            <DetailRow
                                                label="RCCM"
                                                value={client.numeroRCCM}
                                                mono
                                                onChange={(v) => patchClient({ numeroRCCM: v || null })}
                                            />
                                            <DetailRow
                                                label="NIF"
                                                value={client.nif}
                                                mono
                                                onChange={(v) => patchClient({ nif: v || null })}
                                            />
                                            <ConventionRow
                                                conventionnee={client.conventionnee}
                                                onChange={(v) => patchClient({ conventionnee: v })}
                                            />
                                            <DetailRow
                                                label="Siège social"
                                                value={client.siegeSocial}
                                                onChange={(v) => patchClient({ siegeSocial: v || null })}
                                            />
                                            <DetailRow
                                                label="Représentant légal"
                                                value={client.representantLegal}
                                                last
                                                onChange={(v) => patchClient({ representantLegal: v || null })}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <DetailRow
                                                label="Profession"
                                                value={client.profession}
                                                onChange={(v) => patchClient({ profession: v || null })}
                                            />
                                            <DetailRow
                                                label="Nationalité"
                                                value={client.nationalite}
                                                onChange={(v) => patchClient({ nationalite: v || null })}
                                            />
                                            <DetailRow
                                                label="Pièce d'identité"
                                                value={client.pieceIdentite}
                                                mono
                                                onChange={(v) => patchClient({ pieceIdentite: v || null })}
                                            />
                                            <DetailRow
                                                label="Date de naissance"
                                                value={
                                                    client.dateNaissance
                                                        ? new Date(client.dateNaissance).toLocaleDateString("fr-FR", {
                                                            day: "2-digit",
                                                            month: "long",
                                                            year: "numeric",
                                                        })
                                                        : null
                                                }
                                            />
                                            <DetailRow
                                                label="Lieu de naissance"
                                                value={client.lieuNaissance}
                                                onChange={(v) => patchClient({ lieuNaissance: v || null })}
                                            />
                                            <ConventionRow
                                                conventionnee={client.conventionnee}
                                                onChange={(v) => patchClient({ conventionnee: v })}
                                            />
                                            <DetailRow label="Ville" value={client.ville} last />
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Parties adverses (Contre) */}
                    <PartiesAdversesSection client={client} allClients={allClients} />

                    {/* Dossiers liés */}
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                        <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                            <h2 className="font-h2 text-h2 text-primary">Dossiers liés</h2>
                            <span className="bg-primary/10 text-primary font-mono-num text-[12px] px-2 py-0.5 rounded">
                                {client.activeDossiers} {client.activeDossiers > 1 ? "Actifs" : "Actif"}
                            </span>
                        </div>
                        {client.dossiers.length === 0 ? (
                            <div className="p-density-loose text-center text-on-surface-variant font-body-sm text-body-sm">
                                Aucun dossier lié
                            </div>
                        ) : (
                            <ul className="divide-y divide-outline-variant/50">
                                {client.dossiers.map((d) => (
                                    <li key={d.id}>
                                        <Link
                                            href={`/dossiers/${d.id}`}
                                            className="px-4 py-3 hover:bg-[#E8B27D]/10 flex justify-between items-center transition-colors cursor-pointer group"
                                        >
                                            <div>
                                                <div className="font-body-md text-body-md text-on-surface font-medium group-hover:text-primary transition-colors">
                                                    {d.titre}
                                                </div>
                                                <div className="font-mono-num text-[12px] text-outline mt-1">
                                                    {d.numero}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-2 py-1 bg-surface-dim text-on-surface-variant font-label-caps text-[10px] rounded uppercase">
                                                    {TYPE_DOSSIER_LABEL[d.type] ?? d.type}
                                                </span>
                                                <span className="material-symbols-outlined text-outline group-hover:text-primary">
                                                    chevron_right
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Diligences liées au client */}
                    <DiligencesSection client={client} />
                </div>

                {/* Colonne droite */}
                <div className="space-y-container-margin">
                    {/* Contacts secondaires */}
                    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
                        <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                            <h2 className="font-h2 text-h2 text-primary">Contacts secondaires</h2>
                            <span className="font-mono-num text-mono-num text-[11px] text-outline">
                                {client.contacts.length}
                            </span>
                        </div>
                        <div className="p-density-medium">
                            {client.contacts.length === 0 ? (
                                <p className="font-body-sm text-body-sm text-on-surface-variant text-center mb-3 italic">
                                    Aucun contact enregistré
                                </p>
                            ) : (
                                client.contacts.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center gap-3 mb-3 pb-3 border-b border-outline-variant/30 last:mb-0 last:pb-0 last:border-b-0 group/contact"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-surface-variant text-on-surface flex items-center justify-center font-body-sm font-medium flex-shrink-0">
                                            {initials(c.nom, c.prenom)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                                {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                                            </div>
                                            <div className="font-body-sm text-[12px] text-outline truncate">
                                                {c.fonction || "—"}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-0.5 text-[11px]">
                                                {c.email && (
                                                    <a
                                                        href={`mailto:${c.email}`}
                                                        className="text-accent hover:underline truncate max-w-[160px]"
                                                        title={c.email}
                                                    >
                                                        {c.email}
                                                    </a>
                                                )}
                                                {c.telephone && (
                                                    <a
                                                        href={`tel:${c.telephone.replace(/\s/g, "")}`}
                                                        className="font-mono-num text-on-surface-variant hover:text-accent transition-colors"
                                                    >
                                                        {c.telephone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/contact:opacity-100 transition-opacity flex-shrink-0">
                                            <button
                                                onClick={() => {
                                                    setEditingContact(c)
                                                    setContactDialogOpen(true)
                                                }}
                                                className="p-1 rounded hover:bg-surface-container-low text-outline hover:text-primary transition-colors"
                                                title="Modifier"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    edit
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteContact(c.id)}
                                                className="p-1 rounded hover:bg-error-container/30 text-outline hover:text-error transition-colors"
                                                title="Supprimer"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    delete
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                            <button
                                onClick={() => {
                                    setEditingContact(null)
                                    setContactDialogOpen(true)
                                }}
                                className="w-full text-center text-primary font-body-sm text-body-sm font-medium hover:bg-surface-container-low rounded py-1.5 inline-flex items-center justify-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    person_add
                                </span>
                                Ajouter un contact
                            </button>
                        </div>
                    </section>

                    {/* Activité récente — dérivée des dossiers, audiences, factures */}
                    <ActiviteRecenteSection client={client} canSeeFinance={can("finance.view")} />
                </div>
            </div>

            {/* Dialog ajout / édition contact secondaire */}
            {contactDialogOpen && (
                <ContactFormDialog
                    initial={editingContact}
                    onSave={handleSaveContact}
                    onClose={() => {
                        setContactDialogOpen(false)
                        setEditingContact(null)
                    }}
                />
            )}

            {/* Dialog édition du client */}
            {editOpen && client && (
                <ClientFormDialog
                    initial={client}
                    existingClients={allClients}
                    onSave={handleSaveEdit}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </div>
    )
}

/* ============================================================
   ActiviteRecenteSection — agrégation live (dossiers, audiences, factures)
   ============================================================ */

function ActiviteRecenteSection({
    client,
    canSeeFinance,
}: {
    client: MockClient
    canSeeFinance: boolean
}) {
    const items = useMemo(
        () => computeClientActivity(client, { canSeeFinance, limit: 30 }),
        [client, canSeeFinance]
    )
    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                <h2 className="font-h2 text-h2 text-primary">Activité récente</h2>
                <span className="font-mono-num text-mono-num text-[11px] text-outline">
                    {items.length}
                </span>
            </div>
            <div className="p-density-medium max-h-[400px] overflow-y-auto scrollbar-thin">
                {items.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-center italic">
                        Aucune activité enregistrée pour ce client.
                    </p>
                ) : (
                    <div className="relative pl-4 border-l-2 border-outline-variant/30 space-y-5">
                        {items.map((item) => (
                            <div key={item.id} className="relative">
                                <div
                                    className={cn(
                                        "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest",
                                        item.important
                                            ? "bg-primary"
                                            : "bg-outline-variant"
                                    )}
                                />
                                <div className="font-mono-num text-[11px] text-outline mb-0.5">
                                    {formatRelativeOrDate(item.at)}
                                </div>
                                <div className="font-body-sm text-body-sm text-on-surface">
                                    {item.label}
                                    {item.sublabel && (
                                        <>
                                            {" "}
                                            <span className="text-outline">— {item.sublabel}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!canSeeFinance && (
                    <p className="mt-3 font-body-xs text-[10px] text-outline italic flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        Montants masqués (permission Finance requise)
                    </p>
                )}
            </div>
        </section>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

interface ConflictBannerProps {
    conflits: ReturnType<typeof detectConflits>
}

function ConflictBanner({ conflits }: ConflictBannerProps) {
    return (
        <div
            role="alert"
            className="mb-6 bg-error-container/60 border border-error/40 rounded-lg p-density-medium flex gap-3"
        >
            <span className="material-symbols-outlined text-error text-[24px] flex-shrink-0 mt-0.5">
                warning
            </span>
            <div className="flex-1">
                <h3 className="font-body-md text-body-md text-on-error-container font-bold mb-1">
                    {conflits.length === 1
                        ? "1 conflit d'intérêts détecté"
                        : `${conflits.length} conflits d'intérêts détectés`}
                </h3>
                <p className="font-body-sm text-body-sm text-on-error-container/80 mb-2">
                    Ce client est lié à {conflits.length > 1 ? "des dossiers" : "un dossier"} où une partie
                    adverse est elle-même cliente du cabinet. Vérifier la déontologie avant toute action.
                </p>
                <ul className="space-y-1">
                    {conflits.map((c, i) => (
                        <li key={`${c.dossierNumero}-${i}`} className="font-body-sm text-body-sm">
                            <span className="text-on-error-container">
                                <strong>{c.partieAdverse}</strong> — adverse dans{" "}
                                <span className="font-mono-num text-[12px]">{c.dossierNumero}</span>
                            </span>
                            <span className="text-on-error-container/70">
                                {" — "}
                                aussi client :{" "}
                            </span>
                            <Link
                                href={`/clients/${c.clientEnConflit.id}`}
                                className="text-on-error-container font-medium hover:underline"
                            >
                                {c.clientEnConflit.displayName}
                            </Link>
                            <span className="font-mono-num text-[11px] text-on-error-container/70 ml-1">
                                ({c.clientEnConflit.numeroClient})
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

interface PartiesAdversesSectionProps {
    client: MockClient
    allClients: MockClient[]
}

function PartiesAdversesSection({ client, allClients }: PartiesAdversesSectionProps) {
    /**
     * Pour chaque partie adverse, on cherche si elle correspond à un client existant.
     * Si oui, on affiche un badge "Aussi client" + lien vers sa fiche (= signal de conflit).
     */
    const partiesAvecMatch = useMemo(
        () =>
            client.partiesAdverses.map((p) => {
                const matched = allClients.find(
                    (c) => c.id !== client.id && clientDisplayName(c) === p.nom
                )
                return { ...p, matchedClient: matched ?? null }
            }),
        [client, allClients]
    )

    const totalParties = partiesAvecMatch.length

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="font-h2 text-h2 text-primary">Parties adverses</h2>
                    {totalParties > 0 && (
                        <span className="bg-primary/10 text-primary font-mono-num text-[12px] px-2 py-0.5 rounded">
                            {totalParties}
                        </span>
                    )}
                </div>
                <Link
                    href={`/dossiers?clientId=${client.id}&new=1`}
                    className="text-primary hover:text-accent transition-colors font-body-sm text-body-sm font-medium inline-flex items-center gap-1"
                    title="Les parties adverses se renseignent à la création d'un dossier (champ 'Parties adverses')"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Ajouter (via dossier)
                </Link>
            </div>
            {totalParties === 0 ? (
                <div className="p-density-loose text-center text-on-surface-variant font-body-sm text-body-sm">
                    Aucune partie adverse — les parties adverses sont saisies à la création
                    {" "}d&apos;un dossier dans le champ « Parties adverses ».
                </div>
            ) : (
                <ul className="divide-y divide-outline-variant/50">
                    {partiesAvecMatch.map((p, i) => (
                        <li
                            key={`${p.dossierNumero}-${i}`}
                            className="px-4 py-3 flex justify-between items-center hover:bg-[#E8B27D]/5 transition-colors group"
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span className="material-symbols-outlined text-outline text-[20px] mt-0.5 flex-shrink-0">
                                    {p.type === "PERSONNE_MORALE"
                                        ? "domain"
                                        : p.type === "PERSONNE_PHYSIQUE"
                                            ? "person"
                                            : "help"}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="font-body-md text-body-md text-on-surface font-medium truncate">
                                        {p.nom}
                                    </div>
                                    <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap mt-0.5">
                                        <span className="font-mono-num text-[12px] text-outline">
                                            {p.dossierNumero}
                                        </span>
                                        {p.matchedClient && (
                                            <Link
                                                href={`/clients/${p.matchedClient.id}`}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container/60 text-on-error-container border border-error/30 font-body-sm text-[11px] font-medium hover:bg-error-container transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">
                                                    warning
                                                </span>
                                                Conflit — aussi client {p.matchedClient.numeroClient}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

interface CoordItemProps {
    label: string
    value: string
    href?: string
    onCopy: () => void
    multiline?: boolean
    mono: boolean
    icon?: string
    /** Si fourni, single-click → édition inline (pattern Notion/Excel/Airtable) */
    onChange?: (next: string) => void
    placeholder?: string
}

function CoordItem({
    label,
    value,
    href,
    onCopy,
    multiline,
    mono,
    icon,
    onChange,
    placeholder,
}: CoordItemProps) {
    const valueClass = cn(
        "text-on-surface inline-flex items-center gap-1.5",
        mono ? "font-mono-num text-mono-num" : "font-body-md text-body-md",
        href && !mono && "hover:text-accent transition-colors"
    )
    const content = (
        <>
            {icon && (
                <span className="material-symbols-outlined text-[16px] text-outline">{icon}</span>
            )}
            <span style={multiline ? { whiteSpace: "pre-line" } : undefined}>{value}</span>
        </>
    )
    return (
        <div>
            <h3 className="font-label-caps text-label-caps text-outline mb-1 uppercase">{label}</h3>
            <div className={cn("flex items-start justify-between group gap-2")}>
                {onChange ? (
                    /* Mode édition rapide single-click */
                    <div className="flex-1 min-w-0">
                        <InlineTextCell
                            value={value}
                            onChange={onChange}
                            placeholder={placeholder ?? `Renseigner ${label.toLowerCase()}`}
                            multiline={multiline}
                            displayClassName={cn(
                                "block w-full",
                                mono ? "font-mono-num text-mono-num" : "font-body-md text-body-md",
                                href && !mono ? "text-accent" : "text-on-surface"
                            )}
                            title={`Cliquer pour modifier ${label.toLowerCase()}`}
                        />
                    </div>
                ) : href ? (
                    <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noreferrer" : undefined}
                        className={valueClass}
                    >
                        {content}
                    </a>
                ) : (
                    <span className={valueClass}>{content}</span>
                )}
                <button
                    onClick={onCopy}
                    className="text-outline opacity-0 group-hover:opacity-100 hover:text-primary transition-all flex-shrink-0 mt-0.5"
                    title="Copier"
                    aria-label={`Copier ${label}`}
                >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
            </div>
        </div>
    )
}

interface DetailRowProps {
    label: string
    value: string | null
    mono?: boolean
    last?: boolean
    /** Single-click pour éditer (pattern Notion/Excel/Airtable) */
    onChange?: (next: string) => void
}

function DetailRow({ label, value, mono, last, onChange }: DetailRowProps) {
    return (
        <tr
            className={cn(
                "hover:bg-[#E8B27D]/5 transition-colors",
                !last && "border-b border-outline-variant/50"
            )}
        >
            <th className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant font-normal w-1/3">
                {label}
            </th>
            <td
                className={cn(
                    "py-3 px-4 text-on-surface font-medium",
                    mono ? "font-mono-num text-mono-num" : "font-body-md text-body-md"
                )}
            >
                {onChange ? (
                    <InlineTextCell
                        value={value ?? ""}
                        onChange={onChange}
                        placeholder={`Renseigner ${label.toLowerCase()}`}
                        displayClassName={cn(
                            "block w-full",
                            mono ? "font-mono-num text-mono-num" : "font-body-md text-body-md"
                        )}
                        title={`Cliquer pour modifier ${label.toLowerCase()}`}
                    />
                ) : value ? (
                    value
                ) : (
                    <span className="text-outline-variant">—</span>
                )}
            </td>
        </tr>
    )
}

function ConventionRow({
    conventionnee,
    onChange,
}: {
    conventionnee: boolean | null
    onChange?: (next: boolean) => void
}) {
    const click = () => {
        if (onChange) onChange(!conventionnee)
    }
    return (
        <tr className="hover:bg-[#E8B27D]/5 transition-colors border-b border-outline-variant/50">
            <th className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant font-normal w-1/3">
                Convention cadre
            </th>
            <td className="py-3 px-4">
                {onChange ? (
                    <button
                        onClick={click}
                        className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded font-body-sm text-[12px] font-medium border transition-colors",
                            conventionnee
                                ? "bg-[#e8f5e9] text-[#166534] border-[#c8e6c9] hover:bg-[#dcedc8]"
                                : "bg-surface-container-high text-on-surface-variant border-outline-variant hover:bg-surface-container"
                        )}
                        title={
                            conventionnee
                                ? "Cliquer pour passer en hors convention"
                                : "Cliquer pour marquer comme conventionnée"
                        }
                    >
                        <span className="material-symbols-outlined text-[14px]">
                            {conventionnee ? "verified" : "highlight_off"}
                        </span>
                        {conventionnee ? "Conventionnée" : "Hors convention"}
                    </button>
                ) : conventionnee === true ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e8f5e9] text-[#166534] font-body-sm text-[12px] font-medium">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Conventionnée
                    </span>
                ) : conventionnee === false ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-body-sm text-[12px] font-medium">
                        Hors convention
                    </span>
                ) : (
                    <span className="text-outline-variant">—</span>
                )}
            </td>
        </tr>
    )
}
