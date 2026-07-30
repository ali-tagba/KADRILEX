"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    CATEGORIES_DEPENSE,
    formatFCFA,
    formatFCFACompact,
    formatMoisLong,
    type CategorieDepenseKey,
} from "@/lib/constants/finance"
import {
    type MockFacture,
} from "@/lib/mock/invoices"
import {
    type MockDepense,
} from "@/lib/mock/depenses"
import {
    type MockBulletin,
} from "@/lib/mock/bulletins"
import { mockEmployes } from "@/lib/mock/employes"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"

interface FinanceDashboardProps {
    factures: MockFacture[]
    depenses: MockDepense[]
    bulletins: MockBulletin[]
}

/* ============================================================
   Période sélectionnable
   ============================================================ */

type PeriodPreset = "MONTH" | "QUARTER" | "YEAR" | "YTD"

function getPeriodRange(preset: PeriodPreset, anchor = new Date()): { start: Date; end: Date; label: string } {
    if (preset === "MONTH") {
        return {
            start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
            end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
            label: formatMoisLong(anchor.getFullYear(), anchor.getMonth() + 1),
        }
    }
    if (preset === "QUARTER") {
        const q = Math.floor(anchor.getMonth() / 3)
        return {
            start: new Date(anchor.getFullYear(), q * 3, 1),
            end: new Date(anchor.getFullYear(), q * 3 + 3, 1),
            label: `T${q + 1} ${anchor.getFullYear()}`,
        }
    }
    if (preset === "YEAR") {
        return {
            start: new Date(anchor.getFullYear(), 0, 1),
            end: new Date(anchor.getFullYear() + 1, 0, 1),
            label: `Année ${anchor.getFullYear()}`,
        }
    }
    // YTD = depuis 1er janvier jusqu'à aujourd'hui
    return {
        start: new Date(anchor.getFullYear(), 0, 1),
        end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
        label: `YTD ${anchor.getFullYear()}`,
    }
}

/* ============================================================
   Component principal
   ============================================================ */

export function FinanceDashboard({ factures, depenses, bulletins }: FinanceDashboardProps) {
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH")
    const [trendMonths, setTrendMonths] = useState<3 | 6 | 12>(6)
    const period = useMemo(() => getPeriodRange(periodPreset), [periodPreset])

    /* Animation au mount : on flip un état après le premier paint pour laisser
       les bars / segments démarrer à 0 puis transition vers leur valeur cible. */
    const [animateIn, setAnimateIn] = useState(false)
    useEffect(() => {
        const id = window.requestAnimationFrame(() => setAnimateIn(true))
        return () => window.cancelAnimationFrame(id)
    }, [])

    /* === Calculs financiers globaux et période ===
       Toutes les valeurs sont dérivées des props (factures, depenses, bulletins)
       qui viennent de l'API. On n'utilise PAS les helpers globaux qui lisent
       des arrays mock potentiellement désynchronisés. */

    /** Stats cabinet (cumul, statuts validés uniquement) */
    const cabinetFinance = useMemo(() => {
        const emises = factures.filter(
            (f) => f.direction === "EMISE" && f.statut !== "BROUILLON" && f.statut !== "ANNULEE"
        )
        const recues = factures.filter((f) => f.direction === "RECUE" && f.statut !== "ANNULEE")
        const chiffreAffaires = emises.reduce((s, f) => s + f.montantTTC, 0)
        const encaisse = emises.reduce((s, f) => s + f.montantPaye, 0)
        return {
            chiffreAffaires,
            encaisse,
            enAttenteEncaissement: chiffreAffaires - encaisse,
            enRetardClients: emises.filter((f) => f.statut === "EN_RETARD").length,
            enRetardFournisseurs: recues.filter((f) => f.statut === "EN_RETARD").length,
        }
    }, [factures])

    const caPeriode = useMemo(() => {
        return factures
            .filter((f) => f.direction === "EMISE" && f.statut !== "BROUILLON" && f.statut !== "ANNULEE")
            .filter((f) => {
                const d = new Date(f.date)
                return d >= period.start && d < period.end
            })
            .reduce((s, f) => s + f.montantTTC, 0)
    }, [factures, period])

    /** Encaissé période : seulement paiements rattachés à une facture non ANNULEE */
    const encaissePeriode = useMemo(() => {
        let total = 0
        for (const f of factures) {
            if (f.statut === "ANNULEE") continue
            for (const p of f.paiements ?? []) {
                const d = new Date(p.date)
                if (d >= period.start && d < period.end) total += p.montant
            }
        }
        return total
    }, [factures, period])

    /** Charges (dépenses internes + factures reçues payées) sur la période */
    const charges = useMemo(() => {
        const dans = depenses.filter((d) => {
            const dt = new Date(d.date)
            return dt >= period.start && dt < period.end
        })
        const parCategorie = {} as Record<CategorieDepenseKey, number>
        let total = 0
        let recurrent = 0
        let ponctuel = 0
        for (const d of dans) {
            total += d.montantTTC
            parCategorie[d.categorie] = (parCategorie[d.categorie] ?? 0) + d.montantTTC
            if (d.recurrent) recurrent += d.montantTTC
            else ponctuel += d.montantTTC
        }
        return { total, parCategorie, recurrent, ponctuel, nbDepenses: dans.length }
    }, [depenses, period])

    const massePeriode = useMemo(() => {
        const inPeriod = bulletins.filter((b) => {
            const d = new Date(b.annee, b.mois - 1, 15)
            return d >= period.start && d < period.end
        })
        const verses = inPeriod.filter((b) => b.statut === "VERSE" || b.statut === "VALIDE")
        return verses.reduce((s, b) => s + b.coutTotalEmployeur, 0)
    }, [bulletins, period])

    const bilanPeriode = encaissePeriode - charges.total - massePeriode

    /* Taux recouvrement */
    const tauxRecouvrement = caPeriode > 0 ? Math.round((encaissePeriode / caPeriode) * 100) : 0

    /* Trésorerie estimée (cumul historique)
       = (encaissé sur factures émises non annulées)
       − (dépenses payées)
       − (bulletins versés) */
    const tresorerie = useMemo(() => {
        const totalEncaisse = cabinetFinance.encaisse
        const totalDepenses = depenses
            .filter((d) => d.statut === "PAYEE")
            .reduce((s, d) => s + d.montantTTC, 0)
        const totalSalaires = bulletins
            .filter((b) => b.statut === "VERSE")
            .reduce((s, b) => s + b.coutTotalEmployeur, 0)
        return totalEncaisse - totalDepenses - totalSalaires
    }, [cabinetFinance, depenses, bulletins])

    /* === Données graphes === */

    /** Donut : répartition CA par client (top 5) */
    const caParClient = useMemo(() => {
        const map = new Map<string, number>()
        for (const f of factures) {
            if (f.direction !== "EMISE" || f.statut === "BROUILLON" || f.statut === "ANNULEE") continue
            const d = new Date(f.date)
            if (d < period.start || d >= period.end) continue
            if (!f.clientId) continue
            map.set(f.clientId, (map.get(f.clientId) ?? 0) + f.montantTTC)
        }
        const arr = Array.from(map.entries())
            .map(([id, total]) => {
                const c = mockClients.find((x) => x.id === id)
                return { id, name: c ? clientDisplayName(c) : "Inconnu", total }
            })
            .sort((a, b) => b.total - a.total)
        const top = arr.slice(0, 5)
        const autres = arr.slice(5).reduce((s, x) => s + x.total, 0)
        if (autres > 0) top.push({ id: "_autres", name: "Autres", total: autres })
        return top
    }, [factures, period])

    /** Donut : répartition charges par catégorie */
    const chargesParCategorie = useMemo(() => {
        const arr = (Object.entries(charges.parCategorie) as [CategorieDepenseKey, number][])
            .filter(([, v]) => v > 0)
            .map(([k, v]) => ({
                key: k,
                label: CATEGORIES_DEPENSE[k].label,
                icon: CATEGORIES_DEPENSE[k].icon,
                total: v,
            }))
            .sort((a, b) => b.total - a.total)
        return arr
    }, [charges])

    /** Bar N derniers mois : CA + encaissé (configurable via trendMonths) */
    const trendCA = useMemo(() => {
        const out: { label: string; ca: number; encaisse: number }[] = []
        const now = new Date()
        for (let i = trendMonths - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
            const ca = factures
                .filter((f) => f.direction === "EMISE" && f.statut !== "BROUILLON" && f.statut !== "ANNULEE")
                .filter((f) => {
                    const dd = new Date(f.date)
                    return dd >= d && dd < next
                })
                .reduce((s, f) => s + f.montantTTC, 0)
            let enc = 0
            for (const f of factures) {
                for (const p of f.paiements ?? []) {
                    const dd = new Date(p.date)
                    if (dd >= d && dd < next) enc += p.montant
                }
            }
            out.push({
                label: d
                    .toLocaleDateString("fr-FR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase(),
                ca,
                encaisse: enc,
            })
        }
        return out
    }, [factures, trendMonths])

    /** Évolution masse salariale N derniers mois (brut + coût employeur) */
    const trendPaie = useMemo(() => {
        const out: { label: string; brut: number; cout: number }[] = []
        const now = new Date()
        for (let i = trendMonths - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const annee = d.getFullYear()
            const mois = d.getMonth() + 1
            const monthBulletins = bulletins.filter(
                (b) => b.annee === annee && b.mois === mois && b.statut !== "BROUILLON"
            )
            const brut = monthBulletins.reduce((s, b) => s + b.salaireBrut + b.primes - b.retenues, 0)
            const cout = monthBulletins.reduce((s, b) => s + b.coutTotalEmployeur, 0)
            out.push({
                label: d
                    .toLocaleDateString("fr-FR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase(),
                brut,
                cout,
            })
        }
        return out
    }, [bulletins, trendMonths])

    /** Coût total par employé (mois courant) — bar horizontal stratégique */
    const coutParEmploye = useMemo(() => {
        const now = new Date()
        const annee = now.getFullYear()
        const mois = now.getMonth() + 1
        const monthBulletins = bulletins.filter(
            (b) => b.annee === annee && b.mois === mois && b.statut !== "BROUILLON"
        )
        return monthBulletins
            .map((b) => {
                const emp = mockEmployes.find((e) => e.id === b.employeId)
                let anciennete: string | null = null
                if (emp?.dateEmbauche) {
                    const embauche = new Date(emp.dateEmbauche)
                    const annees = Math.floor(
                        (now.getTime() - embauche.getTime()) / (365.25 * 24 * 3600 * 1000)
                    )
                    anciennete =
                        annees < 1
                            ? `Depuis ${embauche.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`
                            : `${annees} an${annees > 1 ? "s" : ""} · depuis ${embauche.getFullYear()}`
                }
                return {
                    id: b.employeId,
                    name: emp ? `${emp.prenom} ${emp.nom}` : "Inconnu",
                    fonction: emp?.fonction ?? "",
                    anciennete,
                    cout: b.coutTotalEmployeur,
                    net: b.salaireNet,
                }
            })
            .sort((a, b) => b.cout - a.cout)
    }, [bulletins])

    /* Top 5 clients en retard */
    const topRetards = useMemo(() => {
        return factures
            .filter((f) => f.direction === "EMISE" && f.statut === "EN_RETARD")
            .map((f) => {
                const c = f.clientId ? mockClients.find((x) => x.id === f.clientId) : null
                return { facture: f, name: c ? clientDisplayName(c) : "Inconnu", restant: f.montantTTC - f.montantPaye }
            })
            .sort((a, b) => b.restant - a.restant)
            .slice(0, 5)
    }, [factures])

    const fraisARefacturer = useMemo(
        () => factures.filter((f) => f.direction === "RECUE" && f.refacturable && !f.refactureeViaFactureId),
        [factures]
    )

    const bulletinsAValider = useMemo(() => bulletins.filter((b) => b.statut === "BROUILLON"), [bulletins])

    return (
        <div className="flex flex-col gap-density-loose pb-density-loose">
            {/* Header dashboard avec sélecteur de période */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-h2 text-h2 text-primary-container">Tableau de bord financier</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Vue stratégique des indicateurs clés du cabinet
                    </p>
                </div>
                <div className="flex bg-surface-container-low border border-outline-variant rounded p-0.5">
                    {(
                        [
                            { v: "MONTH" as PeriodPreset, label: "Mois" },
                            { v: "QUARTER" as PeriodPreset, label: "Trimestre" },
                            { v: "YEAR" as PeriodPreset, label: "Année" },
                            { v: "YTD" as PeriodPreset, label: "YTD" },
                        ]
                    ).map((opt) => {
                        const isActive = periodPreset === opt.v
                        return (
                            <button
                                key={opt.v}
                                onClick={() => setPeriodPreset(opt.v)}
                                className={cn(
                                    "px-3 py-1.5 rounded font-body-sm text-body-sm transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-white shadow-sm text-primary-container font-medium"
                                        : "text-on-surface-variant hover:bg-white/50 hover:text-primary-container"
                                )}
                            >
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 4 KPI principaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
                <KPICard
                    label="Trésorerie globale"
                    value={formatFCFACompact(tresorerie)}
                    icon="account_balance"
                    sublabel="Solde théorique cumulé"
                    tone={tresorerie >= 0 ? "success" : "error"}
                    accent
                />
                <KPICard
                    label={`CA facturé (${period.label})`}
                    value={formatFCFACompact(caPeriode)}
                    icon="request_quote"
                    sublabel={`${factures.filter((f) => f.direction === "EMISE" && f.statut !== "BROUILLON").length} factures émises au total`}
                />
                <KPICard
                    label={`Encaissé (${period.label})`}
                    value={formatFCFACompact(encaissePeriode)}
                    icon="price_check"
                    sublabel={`${tauxRecouvrement}% de recouvrement`}
                    tone="success"
                    progress={tauxRecouvrement}
                />
                <KPICard
                    label="Solde dû clients"
                    value={formatFCFACompact(cabinetFinance.enAttenteEncaissement)}
                    icon="schedule"
                    sublabel={
                        cabinetFinance.enRetardClients > 0
                            ? `${cabinetFinance.enRetardClients} en retard`
                            : "Aucun retard"
                    }
                    tone={cabinetFinance.enRetardClients > 0 ? "error" : "default"}
                />
            </div>

            {/* Bilan principal + Donut CA par client */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                {/* Bilan opérationnel (8 col) */}
                <section className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
                    <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant flex items-center justify-between">
                        <h3 className="font-h2 text-h2 text-primary-container">Bilan opérationnel — {period.label}</h3>
                        <span
                            className={cn(
                                "font-mono-num text-mono-num text-base font-semibold",
                                bilanPeriode > 0 ? "text-[#166534]" : bilanPeriode < 0 ? "text-error" : "text-on-surface"
                            )}
                        >
                            {bilanPeriode >= 0 ? "+" : ""}
                            {formatFCFACompact(bilanPeriode)}
                        </span>
                    </header>
                    <div className="p-density-loose flex-1 flex flex-col items-center justify-center gap-density-loose">
                        <div className="text-center">
                            <p className="font-label-caps text-label-caps text-outline uppercase mb-2">
                                Résultat net opérationnel
                            </p>
                            <p
                                className={cn(
                                    "font-mono-num text-5xl font-semibold tracking-tight tabular-nums",
                                    bilanPeriode > 0 ? "text-[#166534]" : bilanPeriode < 0 ? "text-error" : "text-on-surface"
                                )}
                            >
                                {bilanPeriode >= 0 ? "+" : ""}
                                {formatFCFA(bilanPeriode)}
                            </p>
                            {bilanPeriode < 0 && (
                                <p className="font-body-sm text-body-sm text-error mt-2 inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">warning</span>
                                    Déficit sur la période
                                </p>
                            )}
                        </div>

                        {/* Décomposition (3 cols) */}
                        <div className="w-full max-w-2xl grid grid-cols-3 gap-3">
                            <BilanCell label="Encaissé" value={encaissePeriode} icon="trending_up" sign="+" tone="success" />
                            <BilanCell label="Charges" value={charges.total} icon="trending_down" sign="−" tone="warning" />
                            <BilanCell label="Salaires" value={massePeriode} icon="trending_down" sign="−" tone="warning" />
                        </div>
                    </div>
                </section>

                {/* Donut CA par client (4 col) */}
                <section className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)] flex flex-col">
                    <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-outline">pie_chart</span>
                            CA par client
                        </h3>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center p-density-medium gap-3">
                        <DonutChart
                            data={caParClient.map((c, i) => ({
                                label: c.name,
                                value: c.total,
                                color: DONUT_COLORS[i % DONUT_COLORS.length],
                            }))}
                            centerLabel={formatFCFACompact(caPeriode)}
                            centerSublabel="Total"
                        />
                    </div>
                </section>
            </div>

            {/* Évolution N mois (bar chart) + Donut charges */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                {/* Évolution CA N mois */}
                <section className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
                    <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-outline">bar_chart</span>
                            Évolution CA &amp; encaissements
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 text-[11px]">
                                <Legend color="#502e0f" label="Facturé" />
                                <Legend color="#c8772f" label="Encaissé" />
                            </div>
                            <RangeSwitch value={trendMonths} onChange={setTrendMonths} />
                        </div>
                    </header>
                    <div className="p-density-medium">
                        <BarChartTrend
                            data={trendCA.map((m) => ({
                                label: m.label,
                                series: [
                                    { value: m.ca, color: "#502e0f", title: `Facturé : ${formatFCFA(m.ca)}` },
                                    {
                                        value: m.encaisse,
                                        color: "#c8772f",
                                        title: `Encaissé : ${formatFCFA(m.encaisse)}`,
                                    },
                                ],
                            }))}
                            animateIn={animateIn}
                        />
                    </div>
                </section>

                {/* Donut charges par catégorie */}
                <section className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
                    <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-outline">donut_small</span>
                            Charges par catégorie
                        </h3>
                    </header>
                    <div className="p-density-medium flex flex-col items-center gap-3">
                        {chargesParCategorie.length === 0 ? (
                            <p className="text-body-sm text-outline italic py-8">Aucune charge sur la période</p>
                        ) : (
                            <DonutChart
                                data={chargesParCategorie.slice(0, 6).map((c, i) => ({
                                    label: c.label,
                                    value: c.total,
                                    color: DONUT_COLORS[i % DONUT_COLORS.length],
                                }))}
                                centerLabel={formatFCFACompact(charges.total)}
                                centerSublabel="Charges"
                                animateIn={animateIn}
                            />
                        )}
                    </div>
                </section>
            </div>

            {/* Section stratégique Paie : évolution masse salariale + coût par employé */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                <section className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
                    <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-outline">groups</span>
                            Évolution masse salariale
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 text-[11px]">
                                <Legend color="#7f5533" label="Brut payé" />
                                <Legend color="#502e0f" label="Coût total cabinet" />
                            </div>
                        </div>
                    </header>
                    <div className="p-density-medium">
                        <BarChartTrend
                            data={trendPaie.map((m) => ({
                                label: m.label,
                                series: [
                                    {
                                        value: m.brut,
                                        color: "#7f5533",
                                        title: `Brut net versé : ${formatFCFA(m.brut)}`,
                                    },
                                    {
                                        value: m.cout,
                                        color: "#502e0f",
                                        title: `Coût total cabinet : ${formatFCFA(m.cout)}`,
                                    },
                                ],
                            }))}
                            animateIn={animateIn}
                        />
                    </div>
                </section>

                <section className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)]">
                    <header className="bg-surface-container px-density-medium py-3 border-b border-outline-variant flex items-center justify-between gap-2">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface inline-flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-outline">badge</span>
                            Coût par employé — mois courant
                        </h3>
                        <Link
                            href="/facturation?tab=paie"
                            className="text-primary-container hover:text-accent text-[11px] inline-flex items-center gap-0.5 transition-colors"
                        >
                            Voir
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                    </header>
                    <div className="p-density-medium">
                        <HorizontalBars
                            data={coutParEmploye.map((e, i) => ({
                                label: e.name,
                                sublabel: e.fonction,
                                meta: e.anciennete,
                                value: e.cout,
                                netValue: e.net,
                                color: DONUT_COLORS[i % DONUT_COLORS.length],
                            }))}
                            animateIn={animateIn}
                            emptyText="Aucun bulletin pour le mois courant"
                        />
                    </div>
                </section>
            </div>

            {/* 3 listes prioritaires en bas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
                <PriorityListCard
                    title="Top retards clients"
                    icon="warning"
                    iconColor="text-error"
                    actionHref="/facturation?tab=facturation"
                    emptyText="Aucune facture en retard"
                    items={topRetards.map((r) => ({
                        id: r.facture.id,
                        primary: r.name,
                        secondary: r.facture.numero,
                        right: formatFCFA(r.restant),
                        rightClass: "text-error font-medium",
                    }))}
                />
                <PriorityListCard
                    title="Frais à refacturer"
                    icon="forward_to_inbox"
                    iconColor="text-on-tertiary-fixed-variant"
                    actionHref="/facturation?tab=frais-externes"
                    emptyText="Aucun frais à refacturer"
                    items={fraisARefacturer.slice(0, 5).map((f) => ({
                        id: f.id,
                        primary: f.fournisseurNomLibre ?? f.numero,
                        secondary: f.dossierId ?? "",
                        right: formatFCFA(f.montantTTC),
                        rightClass: "text-on-surface font-medium",
                    }))}
                />
                <PriorityListCard
                    title="Bulletins à valider"
                    icon="task_alt"
                    iconColor="text-primary-container"
                    actionHref="/facturation?tab=paie"
                    emptyText="Aucun bulletin en attente"
                    items={bulletinsAValider.slice(0, 5).map((b) => {
                        const emp = mockEmployes.find((e) => e.id === b.employeId)
                        return {
                            id: b.id,
                            primary: emp ? `${emp.prenom} ${emp.nom}` : "Inconnu",
                            secondary: formatMoisLong(b.annee, b.mois),
                            right: formatFCFA(b.salaireNet),
                            rightClass: "text-on-surface font-medium",
                        }
                    })}
                />
            </div>
        </div>
    )
}

/* ============================================================
   Sub-composants : KPI Card / Bilan Cell / Donut / Bar / Legend / List
   ============================================================ */

const DONUT_COLORS = ["#502e0f", "#7f5533", "#c8772f", "#e3c193", "#f3bb91", "#83746b", "#5a431f"]

function KPICard({
    label,
    value,
    icon,
    sublabel,
    tone = "default",
    accent = false,
    progress,
}: {
    label: string
    value: string
    icon: string
    sublabel: string
    tone?: "default" | "success" | "warning" | "error"
    accent?: boolean
    progress?: number
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
            <p className={cn("font-mono-num text-2xl font-semibold mb-1 tabular-nums", valueColor)}>{value}</p>
            <p className="font-body-sm text-[12px] text-on-surface-variant">{sublabel}</p>
            {progress !== undefined && (
                <div className="mt-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            progress >= 80 ? "bg-[#166534]" : progress >= 50 ? "bg-secondary" : "bg-error"
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                </div>
            )}
        </div>
    )
}

function BilanCell({
    label,
    value,
    icon,
    sign,
    tone,
}: {
    label: string
    value: number
    icon: string
    sign: "+" | "−"
    tone: "success" | "warning"
}) {
    return (
        <div className="p-3 border border-outline-variant rounded bg-surface-container-low/50 flex items-center justify-between">
            <div className="min-w-0 flex-1">
                <p className="font-label-caps text-label-caps text-outline uppercase mb-1">{label}</p>
                <p className="font-mono-num text-base text-on-surface tabular-nums">
                    {sign}
                    {formatFCFACompact(value)}
                </p>
            </div>
            <span className={cn("material-symbols-outlined text-[18px] flex-shrink-0", tone === "success" ? "text-[#166534]" : "text-secondary")}>
                {icon}
            </span>
        </div>
    )
}

/* ============================================================
   DonutChart custom (SVG, sans lib externe)
   ============================================================ */

function DonutChart({
    data,
    centerLabel,
    centerSublabel,
    size = 180,
    thickness = 28,
    animateIn = true,
}: {
    data: { label: string; value: number; color: string }[]
    centerLabel: string
    centerSublabel?: string
    size?: number
    thickness?: number
    animateIn?: boolean
}) {
    const total = data.reduce((s, d) => s + d.value, 0)
    const [hoverIdx, setHoverIdx] = useState<number | null>(null)
    const isEmpty = total === 0
    const radius = (size - thickness) / 2
    const circumference = 2 * Math.PI * radius
    let cumulativeOffset = 0

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className={cn("-rotate-90", isEmpty && "opacity-70")}
                    style={{ filter: "drop-shadow(0 1px 2px rgba(31,26,20,0.08))" }}
                >
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#ece1d7"
                        strokeWidth={thickness}
                        strokeDasharray={isEmpty ? "4 6" : undefined}
                    />
                    {/* Segments — animation : on grandit le dasharray de 0 à dash */}
                    {!isEmpty && data.map((d, i) => {
                        const fraction = d.value / total
                        const dash = fraction * circumference
                        const targetDash = animateIn ? dash : 0
                        const isHover = hoverIdx === i
                        const seg = (
                            <circle
                                key={`${d.label}-${i}`}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={d.color}
                                strokeWidth={isHover ? thickness + 4 : thickness}
                                strokeDasharray={`${targetDash} ${circumference}`}
                                strokeDashoffset={-cumulativeOffset}
                                strokeLinecap="butt"
                                onMouseEnter={() => setHoverIdx(i)}
                                onMouseLeave={() => setHoverIdx(null)}
                                style={{
                                    transition: `stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 80}ms, stroke-width 200ms ease-out`,
                                    cursor: "pointer",
                                }}
                            />
                        )
                        cumulativeOffset += dash
                        return seg
                    })}
                </svg>
                {/* Centre — fade-in après début anim */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700"
                    style={{ opacity: animateIn ? 1 : 0, transitionDelay: "300ms" }}
                >
                    {isEmpty ? (
                        <>
                            <span className="font-mono-num text-base font-semibold text-outline tabular-nums">
                                {centerLabel}
                            </span>
                            <span className="font-label-caps text-[10px] text-outline uppercase mt-0.5 italic">
                                Aucune donnée
                            </span>
                        </>
                    ) : hoverIdx !== null ? (
                        <>
                            <span className="font-mono-num text-base font-semibold text-on-surface tabular-nums">
                                {formatFCFACompact(data[hoverIdx].value)}
                            </span>
                            <span
                                className="font-label-caps text-[10px] uppercase mt-0.5 truncate max-w-[120px] text-center"
                                style={{ color: data[hoverIdx].color }}
                            >
                                {data[hoverIdx].label}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="font-mono-num text-base font-semibold text-on-surface tabular-nums">
                                {centerLabel}
                            </span>
                            {centerSublabel && (
                                <span className="font-label-caps text-[10px] text-outline uppercase mt-0.5">
                                    {centerSublabel}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Légende — fade-up cascade */}
            {isEmpty && data.length === 0 && (
                <p className="font-body-xs text-body-xs text-outline italic">
                    Aucun élément à afficher
                </p>
            )}
            <ul className="w-full space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin">
                {!isEmpty && data.map((d, i) => {
                    const pct = Math.round((d.value / total) * 100)
                    const isHover = hoverIdx === i
                    return (
                        <li
                            key={`${d.label}-${i}`}
                            onMouseEnter={() => setHoverIdx(i)}
                            onMouseLeave={() => setHoverIdx(null)}
                            className={cn(
                                "flex items-center gap-2 text-[11px] cursor-pointer rounded px-1 -mx-1 py-0.5 transition-all duration-300",
                                isHover && "bg-surface-container-low/60"
                            )}
                            style={{
                                opacity: animateIn ? 1 : 0,
                                transform: animateIn ? "translateY(0)" : "translateY(4px)",
                                transition: `opacity 400ms ease-out ${300 + i * 60}ms, transform 400ms ease-out ${300 + i * 60}ms`,
                            }}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-transform"
                                style={{
                                    backgroundColor: d.color,
                                    transform: isHover ? "scale(1.3)" : "scale(1)",
                                }}
                            />
                            <span className="flex-1 truncate text-on-surface" title={d.label}>
                                {d.label}
                            </span>
                            <span className="font-mono-num text-on-surface-variant tabular-nums">
                                {formatFCFACompact(d.value)}
                            </span>
                            <span className="font-mono-num text-outline tabular-nums w-9 text-right">
                                {pct}%
                            </span>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

/* ============================================================
   RangeSwitch — sélecteur 3 / 6 / 12 mois
   ============================================================ */

function RangeSwitch({
    value,
    onChange,
}: {
    value: 3 | 6 | 12
    onChange: (v: 3 | 6 | 12) => void
}) {
    return (
        <div className="flex bg-surface-container-low border border-outline-variant rounded p-0.5">
            {([3, 6, 12] as const).map((m) => {
                const active = value === m
                return (
                    <button
                        key={m}
                        onClick={() => onChange(m)}
                        className={cn(
                            "px-2 py-0.5 rounded font-label-caps text-[10px] uppercase transition-all whitespace-nowrap",
                            active
                                ? "bg-white shadow-sm text-primary-container font-semibold"
                                : "text-on-surface-variant hover:bg-white/50 hover:text-primary-container"
                        )}
                    >
                        {m}M
                    </button>
                )
            })}
        </div>
    )
}

/* ============================================================
   BarChartTrend — N mois, multi-séries, animé
   - Container hauteur fixe + bars en absolute bottom-0 height: %
   - Animation cascade au mount via animateIn flag
   - Tooltip natif (title) sur chaque barre
   ============================================================ */

interface BarChartTrendDatum {
    label: string
    series: { value: number; color: string; title?: string }[]
}

function BarChartTrend({
    data,
    animateIn = true,
    height = 200,
}: {
    data: BarChartTrendDatum[]
    animateIn?: boolean
    height?: number
}) {
    const allValues = data.flatMap((d) => d.series.map((s) => s.value))
    const max = Math.max(1, ...allValues)
    const seriesCount = data[0]?.series.length ?? 1
    /* Y axis ticks : 0 / 1/4 / 1/2 / 3/4 / max */
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => p * max)

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-body-sm text-outline italic" style={{ height }}>
                Aucune donnée
            </div>
        )
    }

    return (
        <div className="w-full" style={{ height: height + 28 }}>
            <div className="flex w-full" style={{ height }}>
                {/* Y axis labels */}
                <div className="flex flex-col-reverse justify-between pr-2 py-1 text-[9px] text-outline font-mono-num tabular-nums">
                    {ticks.map((t, i) => (
                        <span key={i}>{formatFCFACompact(t)}</span>
                    ))}
                </div>
                {/* Plot area */}
                <div className="relative flex-1">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col-reverse justify-between pointer-events-none">
                        {ticks.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-px w-full",
                                    i === 0 ? "bg-outline-variant" : "bg-outline-variant/40"
                                )}
                            />
                        ))}
                    </div>
                    {/* Bars */}
                    <div className="absolute inset-0 flex items-stretch">
                        {data.map((d, colIdx) => (
                            <div
                                key={`${d.label}-${colIdx}`}
                                className="flex-1 flex items-end justify-center gap-1 px-1"
                            >
                                {d.series.map((s, sIdx) => {
                                    const pct = (s.value / max) * 100
                                    const targetH = animateIn ? `${Math.max(0.3, pct)}%` : "0%"
                                    return (
                                        <div
                                            key={sIdx}
                                            className="relative flex-1 max-w-[18px] h-full group"
                                            title={s.title}
                                        >
                                            <div
                                                className="absolute bottom-0 left-0 right-0 rounded-t-sm group-hover:opacity-80"
                                                style={{
                                                    height: targetH,
                                                    backgroundColor: s.color,
                                                    transition: `height 800ms cubic-bezier(0.22, 1, 0.36, 1) ${
                                                        colIdx * 60 + sIdx * 30
                                                    }ms, opacity 200ms ease-out`,
                                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                                                }}
                                            />
                                            {/* Tooltip on hover (montant uniquement) */}
                                            {s.value > 0 && (
                                                <span
                                                    className="absolute left-1/2 -translate-x-1/2 -top-5 whitespace-nowrap font-mono-num text-[9px] text-on-surface bg-surface-container-lowest border border-outline-variant rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm"
                                                    style={{ zIndex: 10 }}
                                                >
                                                    {formatFCFACompact(s.value)}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* X axis labels */}
            <div className="flex" style={{ paddingLeft: 36 }}>
                {data.map((d, i) => (
                    <div
                        key={`${d.label}-x-${i}`}
                        className="flex-1 text-center font-label-caps text-[10px] text-outline uppercase pt-1.5 tracking-wider"
                        style={{
                            opacity: animateIn ? 1 : 0,
                            transition: `opacity 400ms ease-out ${data.length * 60 + 200}ms`,
                        }}
                    >
                        {d.label}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ============================================================
   HorizontalBars — coût par employé (mois courant)
   ============================================================ */

interface HorizontalBarsDatum {
    label: string
    sublabel?: string
    /** Ligne meta supplémentaire (ex : ancienneté, date) */
    meta?: string | null
    value: number
    netValue?: number
    color: string
}

function HorizontalBars({
    data,
    animateIn = true,
    emptyText = "Aucune donnée",
}: {
    data: HorizontalBarsDatum[]
    animateIn?: boolean
    emptyText?: string
}) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[180px] text-body-sm text-outline italic">
                {emptyText}
            </div>
        )
    }
    const max = Math.max(1, ...data.map((d) => d.value))
    return (
        <ul className="flex flex-col gap-2.5">
            {data.map((d, i) => {
                const pct = (d.value / max) * 100
                return (
                    <li
                        key={`${d.label}-${i}`}
                        className="flex flex-col gap-1"
                        style={{
                            opacity: animateIn ? 1 : 0,
                            transform: animateIn ? "translateX(0)" : "translateX(-8px)",
                            transition: `opacity 400ms ease-out ${i * 60}ms, transform 400ms ease-out ${i * 60}ms`,
                        }}
                    >
                        <div className="flex items-baseline justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <span className="font-body-sm text-body-sm text-on-surface font-medium truncate block">
                                    {d.label}
                                </span>
                                {d.sublabel && (
                                    <span className="font-body-xs text-[10px] text-outline truncate block">
                                        {d.sublabel}
                                    </span>
                                )}
                                {d.meta && (
                                    <span className="font-mono-num text-[10px] text-on-surface-variant truncate block inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">event</span>
                                        {d.meta}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono-num text-mono-num text-body-sm text-on-surface tabular-nums whitespace-nowrap">
                                {formatFCFACompact(d.value)}
                            </span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: animateIn ? `${pct}%` : "0%",
                                    backgroundColor: d.color,
                                    transition: `width 800ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 60 + 100}ms`,
                                }}
                            />
                        </div>
                        {d.netValue !== undefined && (
                            <span className="font-mono-num text-[10px] text-outline tabular-nums">
                                Net {formatFCFACompact(d.netValue)}
                            </span>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-on-surface-variant">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
            {label}
        </span>
    )
}

function PriorityListCard({
    title,
    icon,
    iconColor,
    items,
    emptyText,
    actionHref,
}: {
    title: string
    icon: string
    iconColor: string
    items: { id: string; primary: string; secondary: string; right: string; rightClass: string }[]
    emptyText: string
    actionHref?: string
}) {
    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-[0px_1px_3px_rgba(31,26,20,0.08)] flex flex-col">
            <header className="px-density-medium py-2.5 border-b border-outline-variant bg-surface-container flex items-center gap-1.5">
                <span className={cn("material-symbols-outlined text-[16px]", iconColor)}>{icon}</span>
                <h3 className="font-body-sm text-body-sm font-semibold text-on-surface flex-1">{title}</h3>
                <span className="font-mono-num text-mono-num text-[11px] text-outline">{items.length}</span>
                {actionHref && (
                    <Link
                        href={actionHref}
                        className="text-primary-container hover:text-accent text-[11px] inline-flex items-center gap-0.5 transition-colors"
                    >
                        Voir
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                )}
            </header>
            {items.length === 0 ? (
                <div className="px-density-medium py-6 text-center">
                    <p className="font-body-sm text-body-sm text-on-surface-variant italic">{emptyText}</p>
                </div>
            ) : (
                <ul className="divide-y divide-outline-variant/50">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="px-density-medium py-2 flex items-center justify-between gap-3 hover:bg-surface-container-low/40 transition-colors"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{item.primary}</p>
                                {item.secondary && (
                                    <p className="font-mono-num text-[11px] text-outline truncate">{item.secondary}</p>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "font-mono-num text-mono-num text-[12px] tabular-nums whitespace-nowrap flex-shrink-0",
                                    item.rightClass
                                )}
                            >
                                {item.right}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
