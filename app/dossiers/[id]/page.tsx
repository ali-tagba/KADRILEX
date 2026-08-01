"use client"

import { useState } from "react"
import Link from "next/link"
import { cn, formatRelativeFr } from "@/lib/utils"
import { toast } from "@/components/ui/toaster"
import { useDossier, type DossierConflit } from "@/components/dossiers/dossier-context"
import { DiligencesSection } from "@/components/diligences/diligences-section"
import { clientDisplayName } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"

const AUDIENCE_STATUT_LABEL: Record<string, string> = {
    A_VENIR: "À venir",
    TERMINEE: "Terminée",
    REPORTEE: "Reportée",
    ANNULEE: "Annulée",
}

const AUDIENCE_STATUT_CHIP: Record<string, string> = {
    A_VENIR: "bg-primary-fixed text-primary",
    TERMINEE: "bg-surface-container-high text-on-surface-variant",
    REPORTEE: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant",
    ANNULEE: "bg-error-container text-on-error-container",
}

export default function DossierOverviewPage() {
    const { dossier, client, conflits } = useDossier()

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-container-margin">
            <div className="lg:col-span-2 space-y-container-margin">
                {dossier.kind === "CLIENT" && <PartiesSection dossier={dossier} client={client} conflits={conflits} />}
                <AudiencesSection dossier={dossier} />
                <DiligencesSection dossier={dossier} />
                <NotesSection dossier={dossier} />
            </div>
            <div className="space-y-container-margin">
                <ActivitySection dossier={dossier} />
            </div>
        </div>
    )
}

function NotesSection({ dossier }: { dossier: MockDossier }) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(dossier.description ?? "")
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            const r = await fetch(`/api/dossiers/${dossier.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ description: value || null }),
            })
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            // Update local context — quick hack: mutate the prop (sera resynchronised au prochain reload)
            ;(dossier as MockDossier).description = value || null
            setEditing(false)
        } catch (e) {
            toast.error("Échec sauvegarde : " + (e instanceof Error ? e.message : "Erreur"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                <h2 className="font-h2 text-h2 text-primary">Notes & Observations</h2>
                {!editing && (
                    <button
                        onClick={() => setEditing(true)}
                        className="text-primary font-body-sm text-body-sm font-medium hover:underline inline-flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        {dossier.description ? "Modifier" : "Ajouter"}
                    </button>
                )}
            </header>
            <div className="p-density-loose">
                {editing ? (
                    <div className="space-y-2">
                        <textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2 rounded border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
                            placeholder="Notes internes, contexte, observations…"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setEditing(false); setValue(dossier.description ?? "") }}
                                className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="px-3 py-1.5 rounded bg-primary text-on-primary font-body-sm text-body-sm hover:opacity-90 disabled:opacity-50"
                            >
                                {saving ? "Sauvegarde…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                ) : dossier.description ? (
                    <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">
                        {dossier.description}
                    </p>
                ) : (
                    <p className="font-body-md text-body-md text-on-surface-variant italic">
                        Aucune note. Clique "Ajouter" pour en saisir une.
                    </p>
                )}
            </div>
        </section>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

function PartiesSection({
    dossier,
    client,
    conflits,
}: {
    dossier: MockDossier
    client: ReturnType<typeof useDossier>["client"]
    conflits: DossierConflit[]
}) {
    const [addingParty, setAddingParty] = useState(false)
    const [partyName, setPartyName] = useState("")
    const [savingParty, setSavingParty] = useState(false)

    async function addParty() {
        const nom = partyName.trim()
        if (!nom) return
        setSavingParty(true)
        try {
            const nouvelles = [...dossier.partiesAdverses, nom]
            const r = await fetch(`/api/dossiers/${dossier.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ partiesAdverses: nouvelles }),
            })
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            toast.success(`Partie adverse « ${nom} » ajoutée`)
            setPartyName("")
            setAddingParty(false)
            // Refresh côté layout — on garde le reload pour propager au DossierContext
            location.reload()
        } catch (e) {
            toast.error("Échec ajout : " + (e instanceof Error ? e.message : "Erreur"))
        } finally {
            setSavingParty(false)
        }
    }

    async function removeParty(name: string) {
        if (!confirm(`Retirer « ${name} » des parties adverses ?`)) return
        try {
            const nouvelles = dossier.partiesAdverses.filter((p) => p !== name)
            const r = await fetch(`/api/dossiers/${dossier.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ partiesAdverses: nouvelles }),
            })
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            toast.success("Partie adverse retirée")
            location.reload()
        } catch (e) {
            toast.error("Échec suppression : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                <h2 className="font-h2 text-h2 text-primary">Parties</h2>
            </header>
            <div className="divide-y divide-outline-variant/50">
                {client && (
                    <Link
                        href={`/clients/${client.id}`}
                        className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors group"
                    >
                        <div className={cn(
                            "w-10 h-10 flex items-center justify-center border border-outline-variant flex-shrink-0",
                            client.type === "PERSONNE_MORALE" ? "rounded bg-surface-container" : "rounded-full bg-tertiary-fixed-dim"
                        )}>
                            <span className={cn(
                                "material-symbols-outlined text-[20px]",
                                client.type === "PERSONNE_MORALE" ? "text-primary" : "text-tertiary"
                            )}>
                                {client.iconHint}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-body-md text-body-md font-medium text-on-surface group-hover:text-accent transition-colors">
                                    {clientDisplayName(client)}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-primary-fixed/60 text-on-primary-fixed font-label-caps text-[10px]">
                                    Client
                                </span>
                            </div>
                            <span className="font-mono-num text-[11px] text-outline">{client.numeroClient}</span>
                        </div>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary">chevron_right</span>
                    </Link>
                )}
                {dossier.partiesAdverses.length === 0 ? (
                    <div className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                        Aucune partie adverse — affaire de conseil
                    </div>
                ) : (
                    dossier.partiesAdverses.map((p, i) => {
                        const matched = conflits.find((c) => c.partie === p)?.client ?? null
                        return (
                            <div key={`${p}-${i}`} className="group px-4 py-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-error-container/30 border border-outline-variant flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-[20px] text-error">gavel</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-body-md text-body-md font-medium text-on-surface">{p}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-[10px]">
                                            Partie adverse
                                        </span>
                                    </div>
                                    {matched && (
                                        <Link
                                            href={`/clients/${matched.id}`}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-error-container/60 text-on-error-container border border-error/30 font-body-sm text-[11px] font-medium hover:bg-error-container transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">warning</span>
                                            Conflit — aussi client {matched.numeroClient}
                                        </Link>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeParty(p)}
                                    title={`Retirer ${p}`}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-outline hover:text-error hover:bg-error-container/30 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                        )
                    })
                )}

                {/* Zone d'ajout inline — pas de prompt() */}
                {addingParty ? (
                    <div className="px-4 py-3 bg-surface-container-low/50 border-t border-outline-variant flex items-center gap-2">
                        <input
                            type="text"
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") addParty()
                                if (e.key === "Escape") {
                                    setAddingParty(false)
                                    setPartyName("")
                                }
                            }}
                            placeholder="Nom de la partie adverse (entreprise ou personne)"
                            autoFocus
                            disabled={savingParty}
                            className="flex-1 border border-outline-variant rounded px-3 py-1.5 font-body-sm text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                        <button
                            type="button"
                            onClick={addParty}
                            disabled={!partyName.trim() || savingParty}
                            className="px-3 py-1.5 rounded bg-accent text-white font-body-sm text-[12px] font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            {savingParty ? "Ajout…" : "Ajouter"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAddingParty(false)
                                setPartyName("")
                            }}
                            disabled={savingParty}
                            className="px-2 py-1.5 rounded text-outline hover:bg-surface-container-low font-body-sm text-[12px]"
                        >
                            Annuler
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setAddingParty(true)}
                        className="w-full text-center text-primary font-body-sm text-body-sm font-medium hover:underline py-3 hover:bg-surface-container-low transition-colors inline-flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Ajouter une partie adverse
                    </button>
                )}
            </div>
        </section>
    )
}

function AudiencesSection({ dossier }: { dossier: MockDossier }) {
    const upcoming = dossier.audiences.filter((a) => a.statut === "A_VENIR").length
    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="font-h2 text-h2 text-primary">Audiences liées</h2>
                    <span className="font-mono-num text-mono-num text-[12px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {dossier.audiences.length} {upcoming > 0 ? `· ${upcoming} à venir` : ""}
                    </span>
                </div>
                <Link href="/audiences" className="font-body-sm text-body-sm text-primary-container hover:text-accent transition-colors">
                    Voir tout
                </Link>
            </header>
            {dossier.audiences.length === 0 ? (
                <div className="p-density-loose text-center font-body-sm text-body-sm text-on-surface-variant">
                    Aucune audience programmée
                </div>
            ) : (
                <ul className="divide-y divide-outline-variant/50">
                    {dossier.audiences.map((a) => (
                        <li key={a.id} className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-surface-container border border-outline-variant flex flex-col items-center justify-center flex-shrink-0">
                                <span className="font-label-caps text-[9px] text-outline uppercase">
                                    {new Date(a.date).toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                                </span>
                                <span className="font-mono-num text-mono-num text-base font-bold text-primary leading-none">
                                    {String(new Date(a.date).getDate()).padStart(2, "0")}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-body-md text-body-md font-medium text-on-surface truncate">
                                    {a.titre}
                                </div>
                                <div className="font-body-sm text-[12px] text-outline">
                                    {a.juridiction || "—"}
                                    {a.heure && (
                                        <>
                                            <span className="mx-1">·</span>
                                            <span className="font-mono-num">{a.heure}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap",
                                AUDIENCE_STATUT_CHIP[a.statut]
                            )}>
                                {AUDIENCE_STATUT_LABEL[a.statut] ?? a.statut}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

function ActivitySection({ dossier }: { dossier: MockDossier }) {
    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-4 py-3 border-b border-outline-variant">
                <h2 className="font-h2 text-h2 text-primary">Activité récente</h2>
            </header>
            <div className="p-density-medium">
                {dossier.activity.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
                        Aucune activité
                    </p>
                ) : (
                    <div className="relative pl-4 border-l-2 border-outline-variant/30 space-y-6">
                        {dossier.activity.map((item) => (
                            <div key={item.id} className="relative">
                                <div className={cn(
                                    "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest",
                                    item.important ? "bg-accent" : "bg-outline-variant"
                                )} />
                                <div className="font-mono-num text-[11px] text-outline mb-0.5">
                                    {formatRelativeFr(item.at)}
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
            </div>
        </section>
    )
}
