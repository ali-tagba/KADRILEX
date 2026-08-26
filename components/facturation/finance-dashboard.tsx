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

/**
 * Tableau de bord Finance — vue simple, honnête, sur les vraies données du cabinet
 * (Bilan + Apports). Remplace l'ancien dashboard (donuts/graphes animés) qui
 * dépendait entièrement du système Factures/Paie, jamais utilisé par le cabinet
 * (0 facture, 0 bulletin en base) — il affichait des chiffres à 0 ou faux.
 */
export function FinanceDashboard() {
    const now = new Date()
    const [annee, setAnnee] = useState(now.getFullYear())
    const [bilan, setBilan] = useState<BilanSummary | null>(null)
    const [apportsTotal, setApportsTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetch(`/api/bilan?annee=${annee}`, { credentials: "include" }).then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<BilanSummary>
            }),
            fetch(`/api/apports?annee=${annee}`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : []))
                .then((rows: { montantRetrocessionTotal: number }[]) =>
                    rows.reduce((s, a) => s + a.montantRetrocessionTotal, 0)
                ),
        ])
            .then(([b, apTotal]) => {
                setBilan(b)
                setApportsTotal(apTotal)
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

    return (
        <div className="flex flex-col gap-density-medium">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-h2 text-h2 text-primary-container">Tableau de bord</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Vue d'ensemble simple du cabinet — {annee}
                    </p>
                </div>
                <div className="inline-flex items-center bg-surface-container-low border border-outline-variant rounded">
                    <button onClick={() => setAnnee((a) => a - 1)} className="px-1.5 py-0.5 text-outline hover:text-on-surface" aria-label="Année précédente">
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <span className="px-2 font-body-sm text-body-sm font-medium text-on-surface min-w-[50px] text-center">{annee}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
                        <KPICard label="Encaissé (HT)" value={formatFCFA(bilan.encaissements.totalEncaissementHT)} icon="payments" />
                        <KPICard label="Charges" value={formatFCFA(bilan.depenses.totalCharges)} icon="trending_down" tone="warning" />
                        <KPICard
                            label="Solde provisoire"
                            value={formatFCFA(bilan.soldeProvisoire.total)}
                            icon="account_balance"
                            tone={bilan.soldeProvisoire.total >= 0 ? "success" : "error"}
                            accent
                        />
                        <KPICard label="Rétrocessions versées" value={formatFCFA(apportsTotal)} icon="handshake" />
                    </div>

                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium">
                        <h3 className="font-h3 text-h3 text-primary-container mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">table_chart</span>
                            Principales charges — {annee}
                        </h3>
                        {topCharges.length === 0 ? (
                            <p className="font-body-sm text-body-sm text-outline italic py-4">Aucune charge enregistrée pour {annee}</p>
                        ) : (
                            <ul className="divide-y divide-outline-variant/50">
                                {topCharges.map((c) => (
                                    <li key={c.categorie} className="flex items-center justify-between py-2">
                                        <span className="font-body-sm text-body-sm text-on-surface">{c.label}</span>
                                        <span className="font-mono-num text-mono-num text-body-sm text-on-surface-variant tabular-nums">
                                            {formatFCFA(c.total)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <p className="font-body-xs text-body-xs text-outline italic">
                        Détail complet mois par mois dans l'onglet "Bilan". Détail par avocat dans l'onglet "Apports avocats".
                    </p>
                </>
            ) : null}
        </div>
    )
}

function KPICard({
    label,
    value,
    icon,
    tone = "default",
    accent = false,
}: {
    label: string
    value: string
    icon: string
    tone?: "default" | "success" | "warning" | "error"
    accent?: boolean
}) {
    const valueColor =
        tone === "success" ? "text-[#166534]"
            : tone === "error" ? "text-error"
                : tone === "warning" ? "text-secondary"
                    : "text-on-surface"
    return (
        <div
            className={cn(
                "bg-surface-container-lowest border rounded-lg p-density-medium shadow-[0px_1px_3px_rgba(31,26,20,0.08)] relative overflow-hidden",
                accent ? "border-accent/40" : "border-outline-variant"
            )}
        >
            {accent && <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />}
            <div className="flex items-center justify-between mb-2">
                <span className="font-label-caps text-label-caps text-outline uppercase">{label}</span>
                <span className="material-symbols-outlined text-[18px] text-outline">{icon}</span>
            </div>
            <p className={cn("font-mono-num text-xl font-semibold tabular-nums", valueColor)}>{value}</p>
        </div>
    )
}
