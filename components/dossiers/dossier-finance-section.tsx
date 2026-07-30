"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { MockDossier, DossierHonoraire, DossierRetrocession } from "@/lib/mock/dossiers"
import type { MockFacture } from "@/lib/mock/invoices"
import { FacturationTab } from "@/components/facturation/facturation-tab"
import { syncCollection, facturePostBody, facturePatchBody } from "@/lib/api/sync-collection"

/**
 * Section Finance d'un dossier.
 *
 * Réutilise EXACTEMENT le module Facturation (FacturationTab) pré-filtré sur le
 * dossier : mêmes endpoints /api/invoices → synchronisation automatique avec la
 * page Finance. Edit inline des statuts (brouillon/émis/partiel/payé/en retard/
 * annulé), enregistrement de paiements, génération PDF et formulaire de saisie
 * fonctionnent à l'identique.
 *
 * Au-dessus : compteurs (honoraires convenus / facturé / reste à facturer /
 * encaissé / impayé) calculés à la volée depuis les factures réelles.
 */
interface DossierFinanceSectionProps {
    dossier: MockDossier
}

function formatFCFA(value: number): string {
    return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA"
}

function formatCompactFCFA(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M FCFA`
    }
    if (Math.abs(value) >= 1_000) {
        return `${Math.round(value / 1_000)}K FCFA`
    }
    return formatFCFA(value)
}

export function DossierFinanceSection({ dossier }: DossierFinanceSectionProps) {
    const [factures, setFactures] = useState<MockFacture[]>([])
    const [sequestre, setSequestre] = useState<{ montantRecu: number, montantReverse: number } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let alive = true
        setLoading(true)
        fetch(`/api/invoices?dossierId=${encodeURIComponent(dossier.id)}`, { credentials: "include" })
            .then((r) => (r.ok ? (r.json() as Promise<MockFacture[]>) : []))
            .then((list) => {
                if (alive) setFactures(list)
            })
            .catch(() => {
                if (alive) setFactures([])
            })
            
        fetch(`/api/comptabilite/sequestre?dossierId=${encodeURIComponent(dossier.id)}`, { credentials: "include" })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (alive && data) setSequestre(data)
            })
            .catch(() => {})
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [dossier.id])

    /** Sync local → API (mêmes endpoints que la page Finance). */
    const syncFactures = (next: MockFacture[]) => {
        const prev = factures
        setFactures(next)
        void syncCollection<MockFacture>(
            prev,
            next,
            "/api/invoices",
            (f) => facturePostBody(f),
            (f) => facturePatchBody(f),
            setFactures,
            (id) => id.startsWith("fac-local-")
        )
    }

    /* ---- Compteurs (honoraires vs facturé vs payé) ---- */
    const summary = useMemo(() => {
        let honos: DossierHonoraire[] = Array.isArray(dossier.honoraires)
            ? (dossier.honoraires as DossierHonoraire[])
            : []
            
        let provisions = Array.isArray(dossier.provisionsVersees) 
            ? (dossier.provisionsVersees as any[]) 
            : []
            
        // Fallback for CRM flat JSON import
        const rawProvisions = dossier.provisionsVersees as any
        if (rawProvisions && !Array.isArray(rawProvisions) && typeof rawProvisions === 'object') {
            if (rawProvisions.honorairesConvenus) {
                const val = parseFloat(String(rawProvisions.honorairesConvenus).replace(/\s/g, ''))
                if (!isNaN(val) && val > 0) {
                    honos = [{ id: "h-auto-1", phase: "Unique / Global", type: "FORFAIT", montant: val }]
                }
            }
            if (rawProvisions.provisionsVersees) {
                const val = parseFloat(String(rawProvisions.provisionsVersees).replace(/\s/g, ''))
                if (!isNaN(val) && val > 0) {
                    provisions = [{ id: 'import-prov', date: dossier.dateOuverture, montant: val, description: "Provision d'ouverture" }]
                }
            }
        }

        const retrocession: DossierRetrocession | null =
            dossier.retrocession &&
            typeof dossier.retrocession === "object" &&
            !Array.isArray(dossier.retrocession)
                ? (dossier.retrocession as DossierRetrocession)
                : null

        const emises = factures.filter((f) => f.direction === "EMISE")
        const emisesHonorairesFrais = emises.filter((f) => f.type === "HONORAIRES" || f.type === "FRAIS" || !f.type)
        const emisesProvisions = emises.filter((f) => f.type === "PROVISION")

        const totalHonorairesForfait = honos
            .filter((h) => h.type === "FORFAIT")
            .reduce((a, h) => a + h.montant, 0)

        const montantFactureHT = emisesHonorairesFrais.reduce((s, f) => s + f.montantHT, 0)
        const montantFactureTTC = emisesHonorairesFrais.reduce((s, f) => s + f.montantTTC, 0)
        
        // Les provisions incluent les provisions manuelles + l'argent encaissé via les factures de type "PROVISION"
        const provisionsManuelles = provisions.reduce((acc, p) => acc + p.montant, 0)
        const provisionsFactureesPayees = emisesProvisions.reduce((s, f) => s + f.montantPaye, 0)
        const montantProvisions = provisionsManuelles + provisionsFactureesPayees
        
        // Encaissé = TOUT ce qui est payé (Honoraires, Frais, Provisions manuelles et Provisions facturées)
        const montantPaye = emises.reduce((s, f) => s + f.montantPaye, 0) + provisionsManuelles
        
        // Impayé = le reste à payer sur les factures d'Honoraires/Frais, PLUS le reste à payer sur les factures de Provision (optionnel, mais logique)
        const montantImpaye = emises.reduce((s, f) => s + Math.max(0, f.montantTTC - f.montantPaye), 0)

        const hasForfait = totalHonorairesForfait > 0
        const resteAFacturer = hasForfait ? Math.max(0, totalHonorairesForfait - montantFactureHT) : null
        const tauxFacturation = hasForfait ? Math.min(1, montantFactureHT / totalHonorairesForfait) : null
        const tauxRecouvrement = montantFactureTTC > 0 ? montantPaye / montantFactureTTC : 0

        return {
            honos,
            retrocession,
            totalHonorairesForfait,
            facturesEmises: emises.length,
            montantFactureTTC,
            montantPaye,
            montantImpaye,
            resteAFacturer,
            tauxFacturation,
            tauxRecouvrement,
            provisions,
            montantProvisions,
        }
    }, [dossier.honoraires, dossier.provisionsVersees, dossier.retrocession, factures])

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="font-h2 text-h2 text-primary">Finance</h2>
                    <span className="font-body-sm text-[11px] text-outline">
                        Synchronisé avec le module Facturation
                    </span>
                </div>
            </header>

            {/* Bandeau résumé */}
            <div
                className={cn(
                    "grid divide-y md:divide-y-0 md:divide-x divide-outline-variant border-b border-outline-variant",
                    "grid-cols-2 md:grid-cols-5" // Force 5 columns since we add Provisions
                )}
            >
                <SummaryCell
                    icon="handshake"
                    label="Honoraires convenus"
                    value={
                        summary.totalHonorairesForfait > 0
                            ? formatCompactFCFA(summary.totalHonorairesForfait)
                            : summary.honos.length > 0
                            ? "Pourcentage"
                            : "Non défini"
                    }
                    sublabel={
                        summary.honos.length === 0
                            ? "Renseigner via Modifier"
                            : summary.honos
                                  .map((h) => (h.type === "POURCENTAGE" ? `${h.phase} (${h.montant}%)` : h.phase))
                                  .join(" · ")
                    }
                    highlight={summary.honos.length === 0}
                />
                <SummaryCell
                    icon="upload_file"
                    label="Facturé TTC"
                    value={formatCompactFCFA(summary.montantFactureTTC)}
                    progress={summary.tauxFacturation}
                    sublabel={
                        summary.tauxFacturation !== null
                            ? `${Math.round(summary.tauxFacturation * 100)}% du convenu`
                            : `${summary.facturesEmises} facture${summary.facturesEmises !== 1 ? "s" : ""} émise${summary.facturesEmises !== 1 ? "s" : ""}`
                    }
                />
                <SummaryCell
                    icon="savings"
                    label="Provisions"
                    value={summary.montantProvisions > 0 ? formatCompactFCFA(summary.montantProvisions) : "0 FCFA"}
                    sublabel={summary.provisions.length > 0 ? `${summary.provisions.length} versement(s)` : "Aucune provision"}
                />
                {summary.totalHonorairesForfait > 0 && (
                    <SummaryCell
                        icon="pending_actions"
                        label="Reste à facturer"
                        value={
                            summary.resteAFacturer !== null && summary.resteAFacturer > 0
                                ? formatCompactFCFA(summary.resteAFacturer)
                                : "—"
                        }
                        sublabel={summary.resteAFacturer === 0 ? "Entièrement facturé" : "Non encore facturé"}
                        valueColor={
                            summary.resteAFacturer !== null && summary.resteAFacturer > 0
                                ? "text-[#f57f17]"
                                : "text-[#1b5e20]"
                        }
                    />
                )}
                <SummaryCell
                    icon="payments"
                    label="Encaissé"
                    value={formatCompactFCFA(summary.montantPaye)}
                    progress={summary.montantFactureTTC > 0 ? summary.tauxRecouvrement : null}
                    sublabel={
                        summary.montantFactureTTC > 0
                            ? `${Math.round(summary.tauxRecouvrement * 100)}% du facturé`
                            : "Aucune facture émise"
                    }
                    valueColor={summary.tauxRecouvrement >= 0.8 ? "text-[#1b5e20]" : "text-primary-container"}
                />
                <SummaryCell
                    icon={summary.montantImpaye > 0 ? "warning" : "check_circle"}
                    label="Impayé"
                    value={formatCompactFCFA(summary.montantImpaye)}
                    sublabel={summary.montantImpaye > 0 ? "Reste à recouvrer" : "Tout est à jour"}
                    valueColor={summary.montantImpaye > 0 ? "text-error" : "text-[#1b5e20]"}
                />
            </div>

            {/* FOND SEQUESTRE (CARPA) */}
            {sequestre && (sequestre.montantRecu > 0 || sequestre.montantReverse > 0) && (
                <div className="px-4 py-3 bg-[#FAFAFA] border-b-2 border-[#1b5e20] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1b5e20]/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#1b5e20]">account_balance</span>
                        </div>
                        <div>
                            <div className="font-label-caps text-label-caps text-on-surface">Fonds Séquestres (CARPA)</div>
                            <div className="text-xs text-on-surface-variant font-medium mt-0.5">Fonds de tiers consignés sur ce dossier</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Reçu</div>
                            <div className="font-mono-num text-sm font-semibold text-gray-900">{formatFCFA(sequestre.montantRecu)}</div>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Reversé</div>
                            <div className="font-mono-num text-sm font-semibold text-gray-900">{formatFCFA(sequestre.montantReverse)}</div>
                        </div>
                        <div className="pl-6 border-l border-border/40">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Solde Actuel</div>
                            <div className="font-mono-num text-lg font-bold text-[#1b5e20]">
                                {formatFCFA(sequestre.montantRecu - sequestre.montantReverse)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Historique Provisions Versées */}
            <div className="px-4 py-3 bg-surface-container border-b border-outline-variant">
                <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                    <span className="font-label-caps text-label-caps text-on-surface">
                        Provisions Versées (PV) : {formatFCFA(summary.montantProvisions)}
                    </span>
                </div>
                {/* Provisions manuelles */}
                {summary.provisions.length > 0 && (
                    <ul className="space-y-1">
                        {summary.provisions.map((p) => (
                            <li key={p.id} className="flex justify-between text-sm items-center py-1 border-t border-outline-variant/30 first:border-0">
                                <span className="text-on-surface-variant">
                                    <span className="font-mono-num text-[11px] text-outline mr-2">{new Date(p.date).toLocaleDateString("fr-FR")}</span>
                                    {p.description || "Provision"}
                                </span>
                                <span className="font-mono-num font-medium text-primary-container">
                                    {formatFCFA(p.montant)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                
                {/* Provisions via factures */}
                {factures.filter(f => f.direction === "EMISE" && f.type === "PROVISION" && f.montantPaye > 0).length > 0 && (
                    <ul className="space-y-1 mt-1 border-t border-outline-variant/30 pt-1">
                        {factures.filter(f => f.direction === "EMISE" && f.type === "PROVISION" && f.montantPaye > 0).map((f) => (
                            <li key={f.id} className="flex justify-between text-sm items-center py-1">
                                <span className="text-on-surface-variant">
                                    <span className="font-mono-num text-[11px] text-outline mr-2">{new Date(f.date).toLocaleDateString("fr-FR")}</span>
                                    Facture {f.numero} (Provision)
                                </span>
                                <span className="font-mono-num font-medium text-primary-container">
                                    {formatFCFA(f.montantPaye)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {summary.montantProvisions === 0 && (
                    <div className="text-sm text-outline italic">
                        Aucune provision versée.
                    </div>
                )}
            </div>

            {/* Rétrocession d'honoraires */}
            {summary.retrocession && (
                <div className="px-4 py-3 bg-surface-container border-b border-outline-variant flex items-center justify-between">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                        <span className="font-label-caps text-label-caps text-on-surface">
                            Rétrocession prévue — {summary.retrocession.beneficiaire}
                        </span>
                    </div>
                    <div className="font-mono-num text-mono-num text-sm font-semibold text-primary">
                        {summary.retrocession.type === "FORFAIT"
                            ? formatFCFA(summary.retrocession.montant)
                            : `${summary.retrocession.montant}% des honoraires encaissés`}
                    </div>
                </div>
            )}

            {/* Module Facturation complet, pré-filtré sur le dossier */}
            <div className="p-density-medium">
                {loading ? (
                    <div className="py-10 text-center font-body-sm text-body-sm text-on-surface-variant">
                        Chargement des factures…
                    </div>
                ) : (
                    <div className="h-[640px]">
                        <FacturationTab
                            factures={factures}
                            onChangeFactures={syncFactures}
                            presetClientId={dossier.clientId}
                            presetDossierId={dossier.id}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}

interface SummaryCellProps {
    icon: string
    label: string
    value: string
    sublabel: string
    progress?: number | null
    valueColor?: string
    highlight?: boolean
}

function SummaryCell({ icon, label, value, sublabel, progress, valueColor, highlight }: SummaryCellProps) {
    return (
        <div className={cn("p-density-medium flex flex-col", highlight && "bg-surface-container-low")}>
            <div className={cn("flex items-center gap-2 mb-1", highlight ? "text-outline" : "text-on-surface-variant")}>
                <span className={cn("material-symbols-outlined text-[16px]", highlight && "text-outline")}>{icon}</span>
                <span className="font-label-caps text-label-caps">{label}</span>
            </div>
            <div
                className={cn(
                    "font-mono-num text-mono-num text-xl font-bold",
                    highlight ? "text-outline" : valueColor ?? "text-primary-container"
                )}
            >
                {value}
            </div>
            {progress !== undefined && progress !== null && (
                <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden mt-2">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            progress >= 0.8 ? "bg-[#4caf50]" : "bg-accent"
                        )}
                        style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
                    />
                </div>
            )}
            <p
                className={cn(
                    "font-body-sm text-body-sm mt-1.5 truncate",
                    highlight ? "text-outline italic" : "text-on-surface-variant"
                )}
            >
                {sublabel}
            </p>
        </div>
    )
}
