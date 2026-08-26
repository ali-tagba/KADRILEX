"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatFCFA, formatMoisLong } from "@/lib/constants/finance"
import type { Membre, Prisma } from "@prisma/client"
import { ApportFormDialog, type ApportFormDraft } from "./apport-form-dialog"

export type ApportFull = Prisma.ApportGetPayload<{
    include: {
        dossier: { select: { id: true; numero: true; titre: true } }
        client: true
        beneficiaires: { include: { membre: true } }
    }
}>

interface ApportsTabProps {
    membres: Membre[]
    dossiers: { id: string; numero: string; titre: string }[]
    canWrite: boolean
    presetMembreId?: string | null
}

export function ApportsTab({ membres, dossiers, canWrite, presetMembreId }: ApportsTabProps) {
    const now = new Date()
    const [annee, setAnnee] = useState(now.getFullYear())
    const [membreFiltre, setMembreFiltre] = useState<string>(presetMembreId ?? "")
    const [allApports, setAllApports] = useState<ApportFull[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<ApportFull | null>(null)
    const [yearAutoSelected, setYearAutoSelected] = useState(false)

    // Charge TOUTES les années (filtré seulement par avocat) : le sélecteur d'année
    // doit lister les années réellement présentes, pas seulement celle affichée.
    const load = () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (membreFiltre) params.set("membreId", membreFiltre)
        fetch(`/api/apports?${params.toString()}`, { credentials: "include" })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<ApportFull[]>
            })
            .then((data) => {
                setAllApports(data)
                setError(null)
                // Au premier chargement, si l'année courante n'a aucune donnée mais
                // qu'une autre année en a, on bascule sur la plus récente avec des apports.
                if (!yearAutoSelected) {
                    setYearAutoSelected(true)
                    const years = Array.from(new Set(data.map((a) => a.annee))).sort((a, b) => b - a)
                    if (years.length > 0 && !years.includes(now.getFullYear())) {
                        setAnnee(years[0])
                    }
                }
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false))
    }

    useEffect(load, [membreFiltre]) // eslint-disable-line react-hooks/exhaustive-deps

    const availableYears = useMemo(() => {
        const set = new Set<number>([now.getFullYear()])
        for (const a of allApports) set.add(a.annee)
        return Array.from(set).sort((a, b) => b - a)
    }, [allApports, now])

    const apports = useMemo(
        () => allApports.filter((a) => a.annee === annee),
        [allApports, annee]
    )

    const totaux = useMemo(() => {
        const totalHT = apports.reduce((s, a) => s + a.montantHT, 0)
        const totalISB = apports.reduce((s, a) => s + a.montantISB, 0)
        const totalSociete = apports.reduce((s, a) => s + a.montantSociete, 0)
        const totalRetro = apports.reduce((s, a) => s + a.montantRetrocessionTotal, 0)
        return { totalHT, totalISB, totalSociete, totalRetro }
    }, [apports])

    async function handleSave(draft: ApportFormDraft) {
        const { toast } = await import("@/components/ui/toaster")
        try {
            const url = editing ? `/api/apports/${editing.id}` : "/api/apports"
            const method = editing ? "PATCH" : "POST"
            const r = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(draft),
            })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            toast.success(editing ? "Apport modifié." : "Apport ajouté.")
            setFormOpen(false)
            setEditing(null)
            load()
        } catch (e) {
            toast.error("Échec : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    async function handleDelete(a: ApportFull) {
        if (!confirm(`Supprimer cet apport (${formatFCFA(a.montantHT)}) ?`)) return
        const { toast } = await import("@/components/ui/toaster")
        try {
            const r = await fetch(`/api/apports/${a.id}`, { method: "DELETE", credentials: "include" })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            setAllApports((prev) => prev.filter((x) => x.id !== a.id))
            toast.success("Apport supprimé.")
        } catch (e) {
            toast.error("Échec suppression : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    const exportUrl = `/api/apports/export?annee=${annee}`

    return (
        <>
            <div className="flex flex-col gap-density-tight h-full">
                <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                    <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px]">handshake</span>
                        Apports des avocats
                    </h2>

                    <select
                        value={annee}
                        onChange={(e) => setAnnee(Number(e.target.value))}
                        className="bg-surface border border-outline-variant rounded px-2 py-1 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent"
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <select
                        value={membreFiltre}
                        onChange={(e) => setMembreFiltre(e.target.value)}
                        className="bg-surface border border-outline-variant rounded px-2 py-1 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent max-w-[180px]"
                    >
                        <option value="">Tous les avocats</option>
                        {membres.map((m) => (
                            <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                        <InlineStat label="HT" value={formatFCFA(totaux.totalHT)} />
                        <InlineStat label="ISB" value={formatFCFA(totaux.totalISB)} />
                        <InlineStat label="Société" value={formatFCFA(totaux.totalSociete)} />
                        <InlineStat label="Rétrocession" value={formatFCFA(totaux.totalRetro)} tone="accent" />
                    </div>

                    <a
                        href={exportUrl}
                        className="px-3 py-1.5 rounded border border-outline-variant text-on-surface-variant font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-surface-container-low transition-colors"
                        title="Exporter en Excel (une feuille par avocat + une maîtresse)"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Excel
                    </a>

                    {canWrite && (
                        <button
                            onClick={() => {
                                setEditing(null)
                                setFormOpen(true)
                            }}
                            className="px-3 py-1.5 rounded bg-accent text-white font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Nouvel apport
                        </button>
                    )}
                </header>

                <div className="flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center font-body-sm text-on-surface-variant">
                            Chargement…
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex items-center justify-center font-body-sm text-error">
                            {error}
                        </div>
                    ) : apports.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">handshake</span>
                            <p className="font-body-md text-body-md text-on-surface font-medium">
                                Aucun apport pour {annee}
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto scrollbar-thin">
                            <table className="w-full text-left border-collapse min-w-[1100px]">
                                <thead className="sticky top-0 z-10 bg-surface-container">
                                    <tr className="border-b border-outline-variant">
                                        <Th width="110px">Mois</Th>
                                        <Th>Avocat(s)</Th>
                                        <Th>Client</Th>
                                        <Th>Référence</Th>
                                        <Th width="120px" align="right">HT</Th>
                                        <Th width="110px" align="right">ISB</Th>
                                        <Th width="110px" align="right">Société</Th>
                                        <Th width="130px" align="right">Rétrocession</Th>
                                        <Th width="90px" align="center">Statut</Th>
                                        {canWrite && <Th width="70px" align="center" />}
                                    </tr>
                                </thead>
                                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                                    {apports.map((a) => (
                                        <tr key={a.id} className="hover:bg-surface-container-low/40 transition-colors h-12">
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-[11px] text-on-surface-variant whitespace-nowrap">
                                                {formatMoisLong(a.annee, a.mois)}
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {a.beneficiaires.map((b) => (
                                                        <span
                                                            key={b.id}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px]"
                                                            title={`${Number(b.pourcentage)}% — ${formatFCFA(b.montant)}`}
                                                        >
                                                            {b.membre.prenom} {b.membre.nom}
                                                            {a.beneficiaires.length > 1 && ` (${Number(b.pourcentage)}%)`}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-on-surface truncate max-w-[180px]">
                                                {a.client?.raisonSociale ?? a.client?.nom ?? a.clientLibre ?? "—"}
                                            </td>
                                            <td className="py-2 px-3 text-on-surface-variant truncate max-w-[220px]" title={a.dossier?.numero ?? a.referenceLibre ?? ""}>
                                                {a.dossier ? `${a.dossier.numero} — ${a.dossier.titre}` : (a.referenceLibre ?? "—")}
                                            </td>
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums text-on-surface">
                                                {formatFCFA(a.montantHT)}
                                            </td>
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums text-outline">
                                                {formatFCFA(a.montantISB)}
                                            </td>
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums text-outline">
                                                {formatFCFA(a.montantSociete)}
                                            </td>
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums text-primary font-semibold">
                                                {formatFCFA(a.montantRetrocessionTotal)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase",
                                                    a.valide ? "bg-[#e8f5e9] text-[#166534]" : "bg-surface-container-high text-on-surface-variant"
                                                )}>
                                                    {a.valide ? "Validé" : "Brouillon"}
                                                </span>
                                            </td>
                                            {canWrite && (
                                                <td className="py-2 px-3 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setEditing(a)
                                                            setFormOpen(true)
                                                        }}
                                                        className="p-1 text-outline hover:text-primary-container rounded"
                                                        title="Modifier"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(a)}
                                                        className="p-1 text-outline hover:text-error rounded"
                                                        title="Supprimer"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {formOpen && (
                <ApportFormDialog
                    apport={editing}
                    membres={membres}
                    dossiers={dossiers}
                    defaultAnnee={annee}
                    defaultMois={now.getMonth() + 1}
                    onSave={handleSave}
                    onClose={() => {
                        setFormOpen(false)
                        setEditing(null)
                    }}
                />
            )}
        </>
    )
}

function InlineStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "accent" }) {
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{label}</span>
            <span className={cn(
                "font-mono-num text-mono-num text-body-sm font-semibold tabular-nums",
                tone === "accent" ? "text-primary" : "text-on-surface"
            )}>
                {value}
            </span>
        </div>
    )
}

function Th({ children, width, align = "left" }: { children?: React.ReactNode; width?: string; align?: "left" | "center" | "right" }) {
    return (
        <th
            className={cn(
                "py-2.5 px-3 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap",
                align === "right" && "text-right",
                align === "center" && "text-center"
            )}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
