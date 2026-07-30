"use client"

import { useEffect, useMemo, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"
import { mockDossiers, type MockDossier } from "@/lib/mock/dossiers"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"
import { postEntity, deleteEntity } from "@/lib/api/patch"
import { toast } from "@/components/ui/toaster"
import type { MockDocument } from "@/lib/mock/documents"

interface Props {
    document: MockDocument
    /** Liste à jour des dossierIds déjà liés à ce document. */
    initialDossierIds: string[]
    onClose: () => void
    /** Notifie le parent du nouvel ensemble de liaisons (pour update locale). */
    onChange: (dossierIds: string[]) => void
}

export function AttachDossierDialog({ document, initialDossierIds, onClose, onChange }: Props) {
    useEscapeClose(onClose)
    const [search, setSearch] = useState("")
    const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set(initialDossierIds))
    const [pending, setPending] = useState<Set<string>>(new Set())

    // Rafraîchit l'état local quand la prop change (édition d'un autre doc)
    useEffect(() => {
        setLinkedIds(new Set(initialDossierIds))
    }, [initialDossierIds])

    const dossiersActifs = useMemo(() => {
        const q = search.trim().toLowerCase()
        return mockDossiers
            .filter((d) => d.kind === "CLIENT" && d.statut !== "ARCHIVE")
            .filter((d) => {
                if (!q) return true
                const client = mockClients.find((c) => c.id === d.clientId)
                const clientName = client ? clientDisplayName(client) : ""
                return (
                    d.numero.toLowerCase().includes(q) ||
                    d.titre.toLowerCase().includes(q) ||
                    clientName.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => a.numero.localeCompare(b.numero, "fr"))
    }, [search])

    async function toggle(d: MockDossier) {
        if (pending.has(d.id)) return
        const isLinked = linkedIds.has(d.id)
        setPending((p) => new Set(p).add(d.id))
        try {
            if (isLinked) {
                await deleteEntity(`/api/documents/${document.id}/dossiers?dossierId=${d.id}`)
                const next = new Set(linkedIds)
                next.delete(d.id)
                setLinkedIds(next)
                onChange(Array.from(next))
                toast.success(`${d.numero} dissocié du document`)
            } else {
                await postEntity(`/api/documents/${document.id}/dossiers`, { dossierId: d.id })
                const next = new Set(linkedIds).add(d.id)
                setLinkedIds(next)
                onChange(Array.from(next))
                toast.success(`${d.numero} associé au document`)
            }
        } catch (e) {
            toast.error("Échec liaison : " + (e instanceof Error ? e.message : "Erreur"))
        } finally {
            setPending((p) => {
                const next = new Set(p)
                next.delete(d.id)
                return next
            })
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex-none px-density-medium py-3 border-b border-outline-variant bg-surface-container flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-h2 text-h2 text-primary truncate">
                            Joindre à un dossier
                        </h3>
                        <p className="font-body-sm text-[12px] text-on-surface-variant truncate mt-0.5">
                            {document.titre}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-outline hover:text-on-background transition-colors ml-2"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </header>

                {/* Search */}
                <div className="flex-none px-density-medium py-3 border-b border-outline-variant">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
                            search
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher (numéro, titre, client…)"
                            className="w-full pl-9 pr-3 py-2 rounded border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-body-sm text-body-sm"
                            autoFocus
                        />
                    </div>
                    {linkedIds.size > 0 && (
                        <p className="mt-2 font-body-sm text-[11px] text-on-surface-variant">
                            <span className="font-mono-num text-accent font-semibold">{linkedIds.size}</span>{" "}
                            dossier{linkedIds.size > 1 ? "s" : ""} déjà lié{linkedIds.size > 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {/* Liste */}
                <div className="flex-1 overflow-y-auto scrollbar-thin px-density-medium py-2">
                    {dossiersActifs.length === 0 ? (
                        <div className="py-8 text-center font-body-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-[32px] text-outline-variant block mb-2">
                                folder_off
                            </span>
                            Aucun dossier trouvé
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {dossiersActifs.map((d) => {
                                const isLinked = linkedIds.has(d.id)
                                const isPending = pending.has(d.id)
                                const client = mockClients.find((c) => c.id === d.clientId)
                                return (
                                    <li key={d.id}>
                                        <button
                                            type="button"
                                            onClick={() => toggle(d)}
                                            disabled={isPending}
                                            className={cn(
                                                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded border transition-all",
                                                isLinked
                                                    ? "bg-accent/8 border-accent/40 hover:bg-accent/15"
                                                    : "bg-surface border-outline-variant hover:bg-surface-container-low",
                                                isPending && "opacity-50 cursor-progress"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "material-symbols-outlined text-[20px] flex-shrink-0",
                                                    isLinked ? "text-accent" : "text-outline"
                                                )}
                                                style={isLinked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                            >
                                                {isPending
                                                    ? "progress_activity"
                                                    : isLinked
                                                    ? "check_circle"
                                                    : "folder"}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                                                    <span className="font-mono-num text-[11px] text-outline mr-1.5">
                                                        {d.numero}
                                                    </span>
                                                    {d.titre}
                                                </p>
                                                {client && (
                                                    <p className="font-body-sm text-[11px] text-outline truncate mt-0.5">
                                                        {clientDisplayName(client)}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="font-label-caps text-[9px] uppercase text-outline-variant whitespace-nowrap">
                                                {isLinked ? "Lié" : "Lier"}
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <footer className="flex-none px-density-medium py-3 border-t border-outline-variant bg-surface-container-low/40 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-primary text-on-primary rounded font-body-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Terminé
                    </button>
                </footer>
            </div>
        </div>
    )
}
