"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatFCFA, formatMoisLong, formatDateLongue } from "@/lib/constants/finance"

interface EncBloc {
    parMois: Record<string, number[]>
    totals: Record<string, number>
}

interface BilanFull {
    annee: number
    encaissements: {
        autres: EncBloc
        parClient: (EncBloc & { clientId: string; nom: string })[]
        totalEncaissementHT: number
    }
    depenses: {
        categories: { categorie: string; label: string; parMois: number[]; total: number }[]
        retrocessions: { total: number }
        totalCharges: number
        totalChargesParMois: number[]
    }
    soldeProvisoire: { parMois: number[]; total: number }
}

interface ApportRow {
    mois: number
    montantRetrocessionTotal: number
    beneficiaires: { membreId: string; montant: number; membre: { prenom: string; nom: string } }[]
}

function totalEncaisseMois(data: BilanFull, monthIndex: number): number {
    const blocs = [data.encaissements.autres, ...data.encaissements.parClient]
    return blocs.reduce((s, b) => s + (b.parMois.montantHT?.[monthIndex] ?? 0), 0)
}

/**
 * Tableau de bord Finance — reprend la structure de la maquette de référence
 * (bascule de période, gros chiffre héro, listes) sur les vraies données du
 * cabinet. Un seul écart assumé : la maquette met en héro "Encours client à
 * recouvrer" (agrégats de factures) — la table Facture est vide en prod, donc
 * le héro devient "Solde provisoire" (Bilan), qui est la donnée réelle
 * équivalente la plus proche.
 */
export function FinanceDashboard() {
    const [now] = useState(() => new Date())
    const [annee, setAnnee] = useState(now.getFullYear())
    const [periode, setPeriode] = useState<"MOIS" | "EXERCICE">("EXERCICE")
    const [bilan, setBilan] = useState<BilanFull | null>(null)
    const [apports, setApports] = useState<ApportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const isCurrentYear = annee === now.getFullYear()
    const monthIndex = now.getMonth()
    /** "Ce mois" n'a de sens que sur l'année en cours — sur une année passée,
     *  on retombe silencieusement sur "Exercice" (dérivé, pas d'effet nécessaire). */
    const enMois = isCurrentYear && periode === "MOIS"

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetch(`/api/bilan?annee=${annee}`, { credentials: "include" }).then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<BilanFull>
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

    const periodeLabel = enMois ? formatMoisLong(annee, monthIndex + 1) : `Exercice ${annee}`

    const soldeValue = bilan ? (enMois ? bilan.soldeProvisoire.parMois[monthIndex] : bilan.soldeProvisoire.total) : 0
    const encaisseValue = bilan ? (enMois ? totalEncaisseMois(bilan, monthIndex) : bilan.encaissements.totalEncaissementHT) : 0
    const chargesValue = bilan ? (enMois ? bilan.depenses.totalChargesParMois[monthIndex] : bilan.depenses.totalCharges) : 0

    const apportsPeriode = useMemo(
        () => (enMois ? apports.filter((a) => a.mois === monthIndex + 1) : apports),
        [apports, enMois, monthIndex]
    )
    const apportsTotal = useMemo(
        () => apportsPeriode.reduce((s, a) => s + a.montantRetrocessionTotal, 0),
        [apportsPeriode]
    )

    const topCharges = useMemo(() => {
        if (!bilan) return []
        return bilan.depenses.categories
            .map((c) => ({ categorie: c.categorie, label: c.label, valeur: enMois ? c.parMois[monthIndex] : c.total }))
            .filter((c) => c.valeur > 0)
            .sort((a, b) => b.valeur - a.valeur)
            .slice(0, 6)
    }, [bilan, enMois, monthIndex])

    const parAvocat = useMemo(() => {
        const map = new Map<string, { nom: string; total: number; count: number }>()
        for (const a of apportsPeriode) {
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
    }, [apportsPeriode])

    return (
        <div className="flex flex-col">
            {/* Bascule de période + date du jour, comme la maquette */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2.5">
                    <div className="inline-flex items-stretch border border-outline-variant rounded overflow-hidden">
                        {isCurrentYear && (
                            <PeriodPill active={enMois} onClick={() => setPeriode("MOIS")}>
                                Ce mois
                            </PeriodPill>
                        )}
                        <PeriodPill active={!enMois} onClick={() => setPeriode("EXERCICE")}>
                            Exercice {annee}
                        </PeriodPill>
                    </div>
                    {!enMois && (
                        <div className="inline-flex items-center">
                            <button onClick={() => setAnnee((a) => a - 1)} className="px-1 py-0.5 text-outline hover:text-on-surface" aria-label="Année précédente">
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            <button onClick={() => setAnnee((a) => a + 1)} className="px-1 py-0.5 text-outline hover:text-on-surface" aria-label="Année suivante">
                                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
                <span className="font-body-sm text-[12px] text-outline">
                    Données au {formatDateLongue(now.toISOString())}
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 font-body-sm text-on-surface-variant">Chargement…</div>
            ) : error ? (
                <div className="flex items-center justify-center py-16 font-body-sm text-error">{error}</div>
            ) : bilan ? (
                <>
                    {/* Héro : solde provisoire + liste de KPI */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-start pt-6 pb-8 border-b border-outline-variant">
                        <div>
                            <div className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                                Solde provisoire — {periodeLabel}
                            </div>
                            <div className="flex items-baseline gap-2.5 mt-3">
                                <span
                                    className={cn(
                                        "font-mono-num text-mono-num font-semibold leading-none tabular-nums tracking-tight",
                                        soldeValue >= 0 ? "text-primary" : "text-error"
                                    )}
                                    style={{ fontSize: "48px" }}
                                >
                                    {new Intl.NumberFormat("fr-FR").format(Math.round(soldeValue))}
                                </span>
                                <span className="font-body-md text-body-md font-semibold text-on-surface-variant">FCFA</span>
                            </div>
                        </div>
                        <div className="lg:border-l border-outline-variant lg:pl-10">
                            <KpiRow label="Encaissé (HT)" value={formatFCFA(encaisseValue)} />
                            <KpiRow label="Charges" value={formatFCFA(chargesValue)} tone="warning" />
                            <KpiRow
                                label="Rétrocessions versées"
                                value={apportsTotal > 0 ? formatFCFA(apportsTotal) : "—"}
                                last
                            />
                            {apportsTotal === 0 && (
                                <p className="font-body-xs text-body-xs text-secondary mt-2 flex items-start gap-1.5">
                                    <span className="material-symbols-outlined text-[14px] flex-none">info</span>
                                    Aucun apport {periodeLabel.toLowerCase()} saisi pour l&apos;instant dans &quot;Apports avocats&quot;.
                                </p>
                            )}
                            <p className="font-body-xs text-body-xs text-outline mt-3 leading-relaxed text-pretty">
                                Détail mois par mois dans <span className="text-primary-container font-medium">Bilan</span>. Répartition par avocat dans{" "}
                                <span className="text-primary-container font-medium">Apports avocats</span>.
                            </p>
                        </div>
                    </div>

                    {/* Listes : charges principales + rétrocessions par avocat */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 pt-8">
                        <div>
                            <h3 className="font-h3 text-h3 text-on-surface">Principales charges — {periodeLabel}</h3>
                            {topCharges.length === 0 ? (
                                <p className="font-body-sm text-body-sm text-outline italic py-4">Aucune charge enregistrée pour {periodeLabel.toLowerCase()}</p>
                            ) : (
                                <div className="mt-1">
                                    {topCharges.map((c) => (
                                        <div key={c.categorie} className="flex items-center justify-between gap-4 py-3 border-b border-outline-variant/60">
                                            <span className="font-body-sm text-body-sm text-on-surface">{c.label}</span>
                                            <span className="font-mono-num text-mono-num text-body-md font-medium tabular-nums text-on-surface-variant">
                                                {formatFCFA(c.valeur)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-h3 text-h3 text-on-surface">Rétrocessions par avocat — {periodeLabel}</h3>
                            {parAvocat.length === 0 ? (
                                <p className="font-body-sm text-body-sm text-outline italic py-4">
                                    Aucun apport enregistré pour {periodeLabel.toLowerCase()} — à saisir dans l&apos;onglet &quot;Apports avocats&quot;.
                                </p>
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

function PeriodPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 font-body-sm text-[12px] font-semibold transition-colors whitespace-nowrap",
                active ? "bg-primary text-white" : "bg-white text-on-surface-variant hover:bg-surface-container-low"
            )}
        >
            {children}
        </button>
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
