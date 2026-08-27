"use client"

import { useEffect, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { postEntity, showApiError } from "@/lib/api/patch"
import { cn } from "@/lib/utils"

export type ShareEntityType =
    | "CLIENT"
    | "DOSSIER"
    | "AUDIENCE"
    | "TACHE"
    | "DOCUMENT"
    | "FACTURE"
    | "DEPENSE"

interface Membre {
    id: string
    prenom: string
    nom: string
    email: string
    role: string
    actif: boolean
}

interface Props {
    open: boolean
    entityType: ShareEntityType
    entityId: string
    entityLabel?: string | null
    entityNumero?: string | null
    onClose: () => void
}

const ENTITY_LABELS: Record<ShareEntityType, string> = {
    CLIENT: "le client",
    DOSSIER: "le dossier",
    AUDIENCE: "l'audience",
    TACHE: "la tâche",
    DOCUMENT: "le document",
    FACTURE: "la facture",
    DEPENSE: "la dépense",
}

export function ShareDialog({
    open,
    entityType,
    entityId,
    entityLabel,
    entityNumero,
    onClose,
}: Props) {
    useEscapeClose(onClose)
    const [membres, setMembres] = useState<Membre[]>([])
    const [toMembreId, setToMembreId] = useState<string>("")
    const [message, setMessage] = useState("")
    const [search, setSearch] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [meId, setMeId] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        fetch("/api/membres?actif=true", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then(setMembres)
            .catch(() => setMembres([]))
        fetch("/api/me", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setMeId(d.membre?.id ?? null))
            .catch(() => undefined)
    }, [open])

    if (!open) return null

    const filtered = membres
        .filter((m) => m.actif && m.id !== meId)
        .filter((m) => {
            if (!search.trim()) return true
            const q = search.trim().toLowerCase()
            return (
                `${m.prenom} ${m.nom}`.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q)
            )
        })

    const submit = async () => {
        if (!toMembreId) {
            alert("Choisis un membre destinataire.")
            return
        }
        setSubmitting(true)
        try {
            await postEntity("/api/shares", {
                toMembreId,
                entityType,
                entityId,
                entityNumero: entityNumero ?? null,
                entityLabel: entityLabel ?? null,
                message: message.trim() || null,
            })
            onClose()
            setMessage("")
            setToMembreId("")
            setSearch("")
            alert("✅ Partage envoyé.")
        } catch (e) {
            showApiError("Échec partage")(e)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-surface rounded-lg shadow-xl p-6 space-y-4">
                <header className="space-y-1">
                    <h2 className="font-h2 text-h2 text-primary">Partager</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Envoyer {ENTITY_LABELS[entityType]}{" "}
                        {entityNumero && (
                            <span className="font-mono-num text-primary">{entityNumero}</span>
                        )}{" "}
                        à un membre de l'équipe.
                    </p>
                </header>

                <div className="space-y-2">
                    <label className="font-label-caps text-label-caps text-outline block">
                        Destinataire
                    </label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher (nom, email…)"
                        className="w-full px-3 py-2 rounded border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-body-sm text-body-sm"
                    />
                    <div className="max-h-48 overflow-y-auto border border-outline-variant rounded">
                        {filtered.length === 0 ? (
                            <p className="px-3 py-2 text-on-surface-variant font-body-sm text-body-sm">
                                Aucun membre trouvé
                            </p>
                        ) : (
                            filtered.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setToMembreId(m.id)}
                                    className={cn(
                                        "w-full px-3 py-2 flex items-center justify-between text-left border-b border-outline-variant/40 last:border-b-0 transition-colors",
                                        toMembreId === m.id
                                            ? "bg-accent/15"
                                            : "hover:bg-surface-container-low"
                                    )}
                                >
                                    <div>
                                        <p className="font-body-sm text-body-sm font-medium text-on-surface">
                                            {m.prenom} {m.nom}
                                        </p>
                                        <p className="font-body-sm text-[11px] text-outline">
                                            {m.email}
                                        </p>
                                    </div>
                                    {toMembreId === m.id && (
                                        <span className="material-symbols-outlined text-accent text-[18px]">
                                            check_circle
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-outline block">
                        Message (optionnel)
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Pourquoi tu partages ?"
                        className="w-full px-3 py-2 rounded border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-body-sm text-body-sm"
                    />
                </div>

                <footer className="flex gap-2 justify-end pt-2 border-t border-outline-variant">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container-low font-body-sm text-body-sm"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!toMembreId || submitting}
                        className="px-4 py-2 rounded bg-primary text-on-primary font-body-sm text-body-sm hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        {submitting ? "Envoi…" : "Partager"}
                    </button>
                </footer>
            </div>
        </div>
    )
}
