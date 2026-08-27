"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatFCFA } from "@/lib/constants/finance"

interface BilanSummary {
    annee: number
    encaissements: { totalEncaissementHT: number }
    depenses: {
        categories: { categorie: string; label: string; total: number }[]
        retrocessions: { total: number }
        totalCharges: number
    }
    soldeProvisoire: { total: number }
}

interface ApportRow {
    montantRetrocessionTotal: number
    beneficiaires: { membreId: string; montant: number; membre: { prenom: string; nom: string } }[]
}

/**
 * Tableau de bord Finance — hiérarchie éditoriale (gros chiffre héro + listes),
 * sur les vraies données du cabinet (Bilan + Apports). Pas de KPI "encours
 * factures / aging" comme dans la maquette de référence : la table Facture est
 * vide en prod, ces indicateurs afficheraient toujours 0.
 */
export function FinanceDashboard() {
    const now = new Date()
    const [annee, setAnnee] = useState(now.getFullYear())
    const [bilan, setBilan] = useState<BilanSummary | null>(null)
    const [apports, setApports] = useState<ApportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetch(`/api/bilan?annee=${annee}`, { credentials: "include" }).then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<BilanSummary>
            }),
            fetch(`/api/apports?annee=${annee}`, { credentials: "include" }).then((r) =>
                r.ok ? (r.json() as Promise<ApportRow[]>) : []
            ),
        ])
            .then(([b, ap]) => {
                setBilan(b)
                setApports(ap)
                setError(null)
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false))
    }, [annee])

    const topCharges = useMemo(() => {
        if (!bilan) return []
        return bilan.depenses.categories
            .filter((c) => c.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 6)
    }, [bilan])

    const apportsTotal = useMemo(
        () => apports.reduce((s, a) => s + a.montantRetrocessionTotal, 0),
        [apports]
    )

    const parAvocat = useMemo(() => {
        const map = new Map<string, { nom: string; total: number; count: number }>()
        for (const a of apports) {
            for (const b of a.beneficiaires) {
                const cur = map.get(b.membreId) ?? { nom: `${b.membre.prenom} ${b.membre.nom}`, total: 0, count: 0 }
                cur.total += b.montant
                cur.count += 1
                map.set(b.membreId, cur)
            }
        }
        return Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
    }, [apports])

    return (
        <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                <h2 className="font-h2 text-h2 text-primary-container">Tableau de bord</h2>
                <div className="inline-flex items-center bg-surface-container-low border border-outline-variant rounded">
                    <button onClick={() => setAnnee((a) => a - 1)} className="px-1.5 py-0.5 text-outline hover:text-on-surface" aria-label="Année précédente">
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <span className="px-2 font-mono-num text-mono-num text-body-sm font-medium text-on-surface min-w-[50px] text-center">{annee}</span>
                    <button onClick={() => setAnnee((a) => a + 1)} className="px-1.5 py-0.5 text-outline hover:text-on-surface" aria-label="Année suivante">
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 font-body-sm text-on-surface-variant">Chargement…</div>
            ) : error ? (
                <div className="flex items-center justify-center py-16 font-body-sm text-error">{error}</div>
            ) : bilan ? (
                <>
                    {/* Héro : solde provisoire + liste de KPI */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-end pt-6 pb-8 border-b border-outline-variant">
                        <div>
                            <div className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                                Solde provisoire — {annee}
                            </div>
                            <div className="flex items-baseline gap-2.5 mt-3">
                                <span
                                    className={cn(
                                        "font-mono-num text-mono-num font-semibold leading-none tabular-nums tracking-tight",
                                        bilan.soldeProvisoire.total >= 0 ? "text-primary" : "text-error"
                                    )}
                                    style={{ fontSize: "48px" }}
                                >
                                    {new Intl.NumberFormat("fr-FR").format(Math.round(bilan.soldeProvisoire.total))}
                                </span>
                                <span className="font-body-md text-body-md font-semibold text-on-surface-variant">FCFA</span>
                            </div>
                        </div>
                        <div className="lg:border-l border-outline-variant lg:pl-10">
                            <KpiRow label="Encaissé (HT)" value={formatFCFA(bilan.encaissements.totalEncaissementHT)} />
                            <KpiRow label="Charges" value={formatFCFA(bilan.depenses.totalCharges)} tone="warning" />
                            <KpiRow label="Rétrocessions versées" value={formatFCFA(apportsTotal)} last />
                            <p className="font-body-xs text-body-xs text-outline mt-3 leading-relaxed text-pretty">
                                Détail mois par mois dans <span className="text-primary-container font-medium">Bilan</span>. Répartition par avocat dans{" "}
                                <span className="text-primary-container font-medium">Apports avocats</span>.
                            </p>
                        </div>
                    </div>

                    {/* Listes : charges principales + rétrocessions par avocat */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 pt-8">
                        <div>
                            <h3 className="font-h3 text-h3 text-on-surface">Principales charges — {annee}</h3>
                            {topCharges.length === 0 ? (
                                <p className="font-body-sm text-body-sm text-outline italic py-4">Aucune charge enregistrée pour {annee}</p>
                            ) : (
                                <div className="mt-1">
                                    {topCharges.map((c) => (
                                        <div key={c.categorie} className="flex items-center justify-between gap-4 py-3 border-b border-outline-variant/60">
                                            <span className="font-body-sm text-body-sm text-on-surface">{c.label}</span>
                                            <span className="font-mono-num text-mono-num text-body-md font-medium tabular-nums text-on-surface-variant">
                                                {formatFCFA(c.total)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-h3 text-h3 text-on-surface">Rétrocessions par avocat — {annee}</h3>
                            {parAvocat.length === 0 ? (
                                <p className="font-body-sm text-body-sm text-outline italic py-4">Aucun apport enregistré pour {annee}</p>
                            ) : (
                                <div className="mt-1">
                                    {parAvocat.map((av) => (
                                        <div key={av.nom} className="flex items-baseline justify-between gap-5 py-3 border-b border-outline-variant/60">
                                            <div>
                                                <div className="font-body-sm text-body-sm font-medium text-on-surface">{av.nom}</div>
                                                <div className="font-body-xs text-body-xs text-outline mt-0.5">
                                                    {av.count} ligne{av.count > 1 ? "s" : ""}
                                                </div>
                                            </div>
                                            <span className="font-mono-num text-mono-num font-semibold tabular-nums text-primary" style={{ fontSize: "17px" }}>
                                                {formatFCFA(av.total)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    )
}

function KpiRow({
    label,
    value,
    tone = "default",
    last = false,
}: {
    label: string
    value: string
    tone?: "default" | "warning"
    last?: boolean
}) {
    return (
        <div className={cn("flex items-baseline justify-between gap-4 py-3", !last && "border-b border-outline-variant/60")}>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
            <span
                className={cn(
                    "font-mono-num text-mono-num font-medium tabular-nums",
                    tone === "warning" ? "text-secondary" : "text-on-surface"
                )}
                style={{ fontSize: "17px" }}
            >
                {value}
            </span>
        </div>
    )
}
