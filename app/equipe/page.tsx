"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import {
    ROLES,
    ROLE_KEYS,
    fullName,
    type RoleKey,
} from "@/lib/constants/team"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import type { Membre } from "@prisma/client"
import { MembreTableView } from "@/components/equipe/membre-table-view"
import { MembreGalleryView } from "@/components/equipe/membre-gallery-view"
import {
    MembreFormDialog,
    type MembreFormDraft,
} from "@/components/equipe/membre-form-dialog"

type ViewMode = "table" | "gallery"
type ActifFilter = "ALL" | "ACTIFS" | "ARCHIVES"

function sortMembres(membres: Membre[]): Membre[] {
    const ROLE_RANG: Record<string, number> = {
        ASSOCIE_GERANT: 1,
        ASSOCIE: 2,
        AVOCAT: 3,
        JURISTE: 4,
        STAGIAIRE: 5,
        SECRETAIRE: 6,
    }
    return [...membres].sort((a, b) => {
        if (a.actif !== b.actif) return a.actif ? -1 : 1
        const ra = ROLE_RANG[a.role] ?? 99
        const rb = ROLE_RANG[b.role] ?? 99
        if (ra !== rb) return ra - rb
        return a.nom.localeCompare(b.nom, "fr")
    })
}

export default function EquipePage() {
    const { can } = useCurrentUser()
    const canWrite = can("equipe.write")
    const [membres, setMembres] = useState<Membre[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<RoleKey | "ALL">("ALL")
    const [actifFilter, setActifFilter] = useState<ActifFilter>("ACTIFS")
    const [viewMode, setViewMode] = useState<ViewMode>("table")

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Membre | null>(null)

    useEffect(() => {
        fetch("/api/membres")
            .then(res => res.json())
            .then(data => {
                setMembres(sortMembres(data))
                setLoading(false)
            })
            .catch(err => {
                toast.error("Erreur lors du chargement de l'équipe")
                setLoading(false)
            })
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return membres.filter((m) => {
            if (actifFilter === "ACTIFS" && !m.actif) return false
            if (actifFilter === "ARCHIVES" && m.actif) return false
            if (roleFilter !== "ALL" && m.role !== roleFilter) return false
            if (q) {
                const hay = [
                    fullName(m),
                    m.email,
                    m.telephone ?? "",
                    m.fonction ?? "",
                    ROLES[m.role].label,
                ]
                    .join(" ")
                    .toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [membres, search, roleFilter, actifFilter])

    /* Compteurs strip header */
    const counts = useMemo(() => {
        const total = membres.length
        const actifs = membres.filter((m) => m.actif).length
        const invites = membres.filter((m) => m.invitationStatut === "INVITE").length
        const archives = total - actifs
        const byRole: Partial<Record<RoleKey, number>> = {}
        for (const m of membres) {
            if (!m.actif) continue
            byRole[m.role] = (byRole[m.role] ?? 0) + 1
        }
        return { total, actifs, invites, archives, byRole }
    }, [membres])

    const handleSave = async (draft: MembreFormDraft) => {
        const payload = {
            prenom: draft.prenom.trim(),
            nom: draft.nom.trim(),
            role: draft.role,
            email: draft.email.trim(),
            telephone: draft.telephone.trim() || null,
            fonction: draft.fonction.trim() || null,
            statutContrat: draft.statutContrat,
            salaireBaseBrut: draft.salaireBaseBrut,
            dateEmbauche: new Date(draft.dateEmbauche).toISOString(),
            rib: draft.rib.trim() || null,
            banque: draft.banque.trim() || null,
            mobileMoney: draft.mobileMoney.trim() || null,
            modeVersementParDefaut: draft.modeVersementParDefaut,
            notes: draft.notes.trim() || null,
        }
        try {
            if (editing) {
                const r = await fetch(`/api/membres/${editing.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                })
                if (!r.ok) {
                    const e = await r.json().catch(() => ({}))
                    throw new Error(e.error ?? `HTTP ${r.status}`)
                }
                const updated: Membre = await r.json()
                setMembres((list) => sortMembres(list.map((m) => (m.id === editing.id ? updated : m))))
            } else {
                const r = await fetch("/api/membres", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                })
                if (!r.ok) {
                    const e = await r.json().catch(() => ({}))
                    throw new Error(e.error ?? `HTTP ${r.status}`)
                }
                const result: { membre: Membre; codeAccesClair: string } = await r.json()
                setMembres((list) => sortMembres([result.membre, ...list]))
                alert(
                    `✅ Membre créé : ${result.membre.prenom} ${result.membre.nom}\n\nCode d'accès (à transmettre 1 fois) :\n${result.codeAccesClair}\n\nCe code ne sera plus jamais affiché.`
                )
            }
            setFormOpen(false)
            setEditing(null)
        } catch (e) {
            toast.error("Échec : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const handleEdit = (m: Membre) => {
        setEditing(m)
        setFormOpen(true)
    }
    const handleInvite = (m: Membre) => {
        const updated: Membre = {
            ...m,
            invitationStatut: "INVITE",
            updatedAt: new Date(),
        }
        setMembres((list) => list.map((x) => (x.id === m.id ? updated : x)))
        toast.info(`Invitation envoyée à ${m.email}`)
    }
    const handleDeactivate = async (m: Membre) => {
        // Désactivation = transfert atomique des entités vers un autre membre.
        const others = membres.filter((x) => x.actif && x.id !== m.id)
        if (others.length === 0) {
            toast.error("Aucun autre membre actif pour le transfert.")
            return
        }
        const cible = prompt(
            `Transférer les clients/dossiers/audiences/tâches de ${m.prenom} ${m.nom} vers quel membre ?\n\n${others.map((x, i) => `${i + 1}. ${x.prenom} ${x.nom} (${x.role})`).join("\n")}\n\nEntre le numéro :`
        )
        if (!cible) return
        const idx = Number(cible) - 1
        const transfertVers = others[idx]
        if (!transfertVers) {
            toast.error("Sélection invalide")
            return
        }
        try {
            const r = await fetch(`/api/membres/${m.id}/deactivate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ transfertVers: transfertVers.id }),
            })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            const result = await r.json()
            const updated: Membre = {
                ...m,
                actif: false,
                invitationStatut: "DESACTIVE",
                dateSortie: new Date(),
                updatedAt: new Date(),
            }
            setMembres((list) => sortMembres(list.map((x) => (x.id === m.id ? updated : x))))
            const t = result.transferts
            alert(
                `✅ ${m.prenom} désactivé.\nTransferts vers ${transfertVers.prenom} :\n• ${t.clients} clients\n• ${t.dossiers} dossiers\n• ${t.audiences} audiences\n• ${t.taches} tâches`
            )
        } catch (e) {
            toast.error("Échec désactivation : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }
    const handleReactivate = async (m: Membre) => {
        try {
            const r = await fetch(`/api/membres/${m.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    actif: true,
                    invitationStatut: "ACTIF",
                    dateSortie: null,
                    motifSortie: null,
                }),
            })
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            const updated: Membre = {
                ...m,
                actif: true,
                invitationStatut: "ACTIF",
                dateSortie: null,
                motifSortie: null,
                updatedAt: new Date(),
            }
            setMembres((list) => sortMembres(list.map((x) => (x.id === m.id ? updated : x))))
        } catch (e) {
            toast.error("Échec réactivation : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }
    const handleDelete = async (m: Membre) => {
        if (m.actif) {
            toast.error("Désactive d'abord le membre (transfert entités) avant suppression.")
            return
        }
        try {
            const r = await fetch(`/api/membres/${m.id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            setMembres((list) => list.filter((x) => x.id !== m.id))
            toast.success(`${m.prenom} ${m.nom} supprimé.`)
        } catch (e) {
            toast.error("Échec suppression : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden px-container-margin pt-container-margin pb-density-medium">
            {/* Header style mockup : titre h1 + counters inline avec dots, bouton primary à droite */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-density-medium">
                <div>
                    <h1 className="font-h1 text-h1 text-on-background mb-1.5 inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[24px] text-primary-container">
                            groups
                        </span>
                        Annuaire de l&apos;équipe
                    </h1>
                    <div className="flex items-center gap-3 text-on-surface-variant font-body-sm text-body-sm flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">groups</span>
                            Total {counts.total}
                        </span>
                        <Dot />
                        <span className="inline-flex items-center gap-1 text-[#166534]">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Actifs {counts.actifs}
                        </span>
                        {counts.invites > 0 && (
                            <>
                                <Dot />
                                <span className="inline-flex items-center gap-1 text-secondary">
                                    <span className="material-symbols-outlined text-[14px]">mail</span>
                                    Invités {counts.invites}
                                </span>
                            </>
                        )}
                        {counts.archives > 0 && (
                            <>
                                <Dot />
                                <span className="inline-flex items-center gap-1 text-outline">
                                    <span className="material-symbols-outlined text-[14px]">archive</span>
                                    Archivés {counts.archives}
                                </span>
                            </>
                        )}
                        <Dot />
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-outline">
                            {ROLE_KEYS.filter((r) => (counts.byRole[r] ?? 0) > 0).map((r, i, arr) => (
                                <span key={r}>
                                    <span className="font-mono-num font-semibold text-on-surface tabular-nums">
                                        {counts.byRole[r]}
                                    </span>{" "}
                                    {ROLES[r].labelCourt}
                                    {i < arr.length - 1 && " ·"}
                                </span>
                            ))}
                        </span>
                    </div>
                </div>
                {canWrite ? (
                    <button
                        onClick={() => {
                            setEditing(null)
                            setFormOpen(true)
                        }}
                        className="bg-primary-container text-on-primary font-body-sm text-body-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary transition-colors h-10 w-fit shadow-sm active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[20px]">person_add</span>
                        Inviter un membre
                    </button>
                ) : (
                    <span
                        className="bg-surface-container text-outline font-body-sm text-body-sm py-2 px-4 rounded-lg inline-flex items-center gap-2 h-10 w-fit cursor-not-allowed"
                        title="Réservé à l'Associé gérant"
                    >
                        <span className="material-symbols-outlined text-[20px]">lock</span>
                        Inviter
                    </span>
                )}
            </header>

            {/* Toolbar style mockup : search + filter compact + tabs actif + view switch */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-density-medium shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-1 md:max-w-[280px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                            search
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un membre…"
                            className="w-full pl-10 pr-9 py-2 bg-surface border border-outline-variant rounded focus:border-secondary-container focus:ring-0 font-body-sm text-body-sm h-10 outline-none transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        )}
                    </div>

                    {/* Filtre actifs/tous/archivés en pills */}
                    <div className="flex bg-surface-container rounded p-0.5">
                        {(
                            [
                                { v: "ACTIFS" as ActifFilter, label: "Actifs" },
                                { v: "ALL" as ActifFilter, label: "Tous" },
                                { v: "ARCHIVES" as ActifFilter, label: "Archivés" },
                            ]
                        ).map((opt) => {
                            const active = actifFilter === opt.v
                            return (
                                <button
                                    key={opt.v}
                                    onClick={() => setActifFilter(opt.v)}
                                    className={cn(
                                        "px-3 py-1.5 rounded font-body-sm text-body-sm transition-all whitespace-nowrap",
                                        active
                                            ? "bg-surface shadow-[0px_1px_3px_rgba(31,26,20,0.08)] text-primary-container font-medium"
                                            : "text-outline hover:text-on-surface"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Filtre rôles dropdown compact */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as RoleKey | "ALL")}
                        className="bg-surface border border-outline-variant rounded px-3 py-2 font-body-sm text-body-sm text-on-surface h-10 hover:bg-surface-container-highest transition-colors outline-none focus:border-secondary-container"
                    >
                        <option value="ALL">Tous rôles</option>
                        {ROLE_KEYS.map((k) => (
                            <option key={k} value={k}>
                                {ROLES[k].label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* View switch à droite */}
                <div className="flex items-center bg-surface-container rounded p-1 w-full md:w-auto justify-end">
                    <button
                        onClick={() => setViewMode("table")}
                        title="Vue Table"
                        className={cn(
                            "px-3 py-1.5 rounded flex items-center justify-center transition-all",
                            viewMode === "table"
                                ? "bg-surface shadow-[0px_1px_3px_rgba(31,26,20,0.08)] text-primary-container"
                                : "text-outline hover:text-on-surface"
                        )}
                    >
                        <span className="material-symbols-outlined text-[20px]">table_rows</span>
                    </button>
                    <button
                        onClick={() => setViewMode("gallery")}
                        title="Vue Galerie"
                        className={cn(
                            "px-3 py-1.5 rounded flex items-center justify-center transition-all",
                            viewMode === "gallery"
                                ? "bg-surface shadow-[0px_1px_3px_rgba(31,26,20,0.08)] text-primary-container"
                                : "text-outline hover:text-on-surface"
                        )}
                    >
                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                    </button>
                </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="material-symbols-outlined animate-spin text-[32px] text-outline">sync</span>
                    </div>
                ) : viewMode === "table" ? (
                    <MembreTableView
                        membres={filtered}
                        canWrite={canWrite}
                        onEdit={handleEdit}
                        onInvite={handleInvite}
                        onDeactivate={handleDeactivate}
                        onReactivate={handleReactivate}
                        onDelete={handleDelete}
                    />
                ) : (
                    <MembreGalleryView
                        membres={filtered}
                        canWrite={canWrite}
                        onEdit={handleEdit}
                        onInvite={handleInvite}
                        onDeactivate={handleDeactivate}
                        onReactivate={handleReactivate}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {formOpen && canWrite && (
                <MembreFormDialog
                    initial={editing}
                    onSave={handleSave}
                    onClose={() => {
                        setFormOpen(false)
                        setEditing(null)
                    }}
                />
            )}
        </div>
    )
}

function Dot() {
    return (
        <span className="w-1 h-1 rounded-full bg-outline-variant inline-block flex-shrink-0" />
    )
}

