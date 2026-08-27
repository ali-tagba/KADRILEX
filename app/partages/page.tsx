"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { patchEntity, deleteEntity } from "@/lib/api/patch"
import { cn } from "@/lib/utils"

interface Share {
    id: string
    fromMembre: {
        id: string
        prenom: string
        nom: string
        email: string
        role: string
    }
    entityType:
        | "CLIENT"
        | "DOSSIER"
        | "AUDIENCE"
        | "TACHE"
        | "DOCUMENT"
        | "FACTURE"
        | "DEPENSE"
    entityId: string
    entityNumero: string | null
    entityLabel: string | null
    message: string | null
    readAt: string | null
    createdAt: string
}

const ENTITY_HREF: Record<Share["entityType"], (id: string) => string> = {
    CLIENT: (id) => `/clients/${id}`,
    DOSSIER: (id) => `/dossiers/${id}`,
    AUDIENCE: (id) => `/audiences/${id}`,
    TACHE: () => `/taches`,
    DOCUMENT: () => `/bibliotheque`,
    FACTURE: () => `/facturation?tab=facturation`,
    DEPENSE: () => `/facturation?tab=depenses`,
}

const ENTITY_LABEL: Record<Share["entityType"], string> = {
    CLIENT: "Client",
    DOSSIER: "Dossier",
    AUDIENCE: "Audience",
    TACHE: "Tâche",
    DOCUMENT: "Document",
    FACTURE: "Facture",
    DEPENSE: "Dépense",
}

const ENTITY_ICON: Record<Share["entityType"], string> = {
    CLIENT: "group",
    DOSSIER: "folder_open",
    AUDIENCE: "gavel",
    TACHE: "task_alt",
    DOCUMENT: "library_books",
    FACTURE: "receipt_long",
    DEPENSE: "account_balance_wallet",
}

function formatRelative(iso: string): string {
    const d = new Date(iso)
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000)
    if (diffMin < 1) return "À l'instant"
    if (diffMin < 60) return `Il y a ${diffMin} min`
    if (diffMin < 24 * 60) return `Il y a ${Math.floor(diffMin / 60)} h`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function PartagesPage() {
    const [shares, setShares] = useState<Share[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = () => {
        fetch("/api/shares", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : []))
            .then(setShares)
            .catch(() => setShares([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        refresh()
    }, [])

    const markRead = async (id: string) => {
        await patchEntity(`/api/shares/${id}`, {}).catch(() => undefined)
        setShares((prev) =>
            prev.map((s) => (s.id === id ? { ...s, readAt: new Date().toISOString() } : s))
        )
    }

    const remove = async (id: string) => {
        if (!confirm("Supprimer ce partage ?")) return
        await deleteEntity(`/api/shares/${id}`).catch(() => undefined)
        setShares((prev) => prev.filter((s) => s.id !== id))
    }

    const unread = shares.filter((s) => !s.readAt).length

    return (
        <div className="flex-1 overflow-y-auto p-container-margin">
            <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="font-h1 text-h1 text-primary-container">Partages reçus</h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        {shares.length} au total
                        {unread > 0 && (
                            <span className="text-error font-medium ml-2">
                                · {unread} non lu{unread > 1 ? "s" : ""}
                            </span>
                        )}
                    </p>
                </div>
            </header>

            {loading ? (
                <p className="text-center py-12 text-on-surface-variant">Chargement…</p>
            ) : shares.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center">
                    <span className="material-symbols-outlined text-[48px] text-outline mb-3">
                        inbox
                    </span>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                        Aucun partage reçu pour l'instant.
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {shares.map((s) => (
                        <li
                            key={s.id}
                            className={cn(
                                "bg-surface-container-lowest border rounded-lg p-4 transition-colors",
                                s.readAt
                                    ? "border-outline-variant"
                                    : "border-accent/50 bg-accent/5"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary text-[22px]">
                                        {ENTITY_ICON[s.entityType]}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="font-body-sm text-body-sm font-medium text-on-surface">
                                            {s.fromMembre.prenom} {s.fromMembre.nom}
                                        </span>
                                        <span className="text-outline">·</span>
                                        <span className="text-on-surface-variant text-body-sm">
                                            t'a partagé {ENTITY_LABEL[s.entityType].toLowerCase()}
                                        </span>
                                        {!s.readAt && (
                                            <span className="ml-auto bg-accent text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">
                                                Nouveau
                                            </span>
                                        )}
                                    </div>
                                    <Link
                                        href={ENTITY_HREF[s.entityType](s.entityId)}
                                        onClick={() => !s.readAt && markRead(s.id)}
                                        className="font-body-md text-body-md font-semibold text-primary hover:underline"
                                    >
                                        {s.entityNumero && (
                                            <span className="font-mono-num text-primary mr-2">
                                                {s.entityNumero}
                                            </span>
                                        )}
                                        {s.entityLabel ?? "(sans titre)"}
                                    </Link>
                                    {s.message && (
                                        <p className="font-body-sm text-body-sm text-on-surface mt-2 bg-surface-container-low border border-outline-variant/40 rounded px-3 py-2 whitespace-pre-line">
                                            {s.message}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-outline">
                                        <span>{formatRelative(s.createdAt)}</span>
                                        {!s.readAt && (
                                            <button
                                                onClick={() => markRead(s.id)}
                                                className="text-primary hover:underline"
                                            >
                                                Marquer comme lu
                                            </button>
                                        )}
                                        <button
                                            onClick={() => remove(s.id)}
                                            className="text-error hover:underline ml-auto"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
