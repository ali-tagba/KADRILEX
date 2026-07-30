"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
    formatDateCourte,
    formatFCFA,
    formatFCFACompact,
    STATUTS_FACTURE,
    MODES_PAIEMENT,
} from "@/lib/constants/finance"
import type { MockFacture } from "@/lib/mock/invoices"
import { mockFournisseurs } from "@/lib/mock/invoices"
import type { MockDepense } from "@/lib/mock/depenses"
import type { MockBulletin } from "@/lib/mock/bulletins"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"
import { mockDossiers } from "@/lib/mock/dossiers"
import { mockMembres } from "@/lib/mock/employes"
import { fullName } from "@/lib/constants/team"

/* ============================================================
   Types : ligne unifiée du registre
   ============================================================ */

type FluxKind =
    | "FACTURE_EMISE"
    | "FACTURE_RECUE"
    | "FRAIS_EXTERNE"
    | "DEPENSE_INTERNE"
    | "PAIEMENT_RECU"
    | "BULLETIN_PAIE"

interface FluxLine {
    id: string
    kind: FluxKind
    /** Date principale (émission, paiement, mois bulletin) */
    date: string // ISO
    numero: string
    libelle: string
    /** Tiers (client, fournisseur, employé) */
    tiers: string
    /** Lien dossier optionnel */
    dossierNumero: string | null
    /** Montant signé : positif = entrée d'argent, négatif = sortie */
    montant: number
    statut: string
    statutChip: string
    mode: string | null
}

const KIND_META: Record<FluxKind, { label: string; icon: string; chipClass: string; sign: 1 | -1 }> = {
    FACTURE_EMISE: {
        label: "Facture émise",
        icon: "north_east",
        chipClass: "bg-primary-fixed text-primary",
        sign: 1,
    },
    PAIEMENT_RECU: {
        label: "Paiement reçu",
        icon: "savings",
        chipClass: "bg-[#e8f5e9] text-[#166534]",
        sign: 1,
    },
    FACTURE_RECUE: {
        label: "Facture reçue",
        icon: "south_west",
        chipClass: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant",
        sign: -1,
    },
    FRAIS_EXTERNE: {
        label: "Frais externe",
        icon: "inbox",
        chipClass: "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant",
        sign: -1,
    },
    DEPENSE_INTERNE: {
        label: "Dépense interne",
        icon: "account_balance_wallet",
        chipClass: "bg-secondary-fixed text-on-secondary-fixed-variant",
        sign: -1,
    },
    BULLETIN_PAIE: {
        label: "Salaire",
        icon: "groups",
        chipClass: "bg-surface-container-high text-on-surface-variant",
        sign: -1,
    },
}

/* ============================================================
   Component
   ============================================================ */

interface VueEnsembleTabProps {
    factures: MockFacture[]
    depenses: MockDepense[]
    bulletins: MockBulletin[]
}

export function VueEnsembleTab({ factures, depenses, bulletins }: VueEnsembleTabProps) {
    const [search, setSearch] = useState("")
    const [activeKinds, setActiveKinds] = useState<Set<FluxKind>>(
        new Set(Object.keys(KIND_META) as FluxKind[])
    )
    const [periodPreset, setPeriodPreset] = useState<"30" | "90" | "365" | "ALL">("ALL")
    const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "montant_desc">(
        "date_desc"
    )

    const toggleKind = (k: FluxKind) =>
        setActiveKinds((s) => {
            const next = new Set(s)
            if (next.has(k)) next.delete(k)
            else next.add(k)
            return next
        })

    /* === Construction de la liste unifiée === */
    const allLines = useMemo<FluxLine[]>(() => {
        const lines: FluxLine[] = []

        for (const f of factures) {
            if (f.statut === "BROUILLON" || f.statut === "ANNULEE") continue
            const dossier = f.dossierId
                ? mockDossiers.find((d) => d.id === f.dossierId) ?? null
                : null
            const stat = STATUTS_FACTURE[f.statut]

            if (f.direction === "EMISE") {
                const client = f.clientId
                    ? mockClients.find((c) => c.id === f.clientId) ?? null
                    : null
                lines.push({
                    id: `inv-${f.id}`,
                    kind: "FACTURE_EMISE",
                    date: f.date,
                    numero: f.numero,
                    libelle: f.description ?? f.lignes[0]?.libelle ?? "Honoraires",
                    tiers: client ? clientDisplayName(client) : "Client inconnu",
                    dossierNumero: dossier?.numero ?? null,
                    montant: f.montantTTC,
                    statut: stat.label,
                    statutChip: stat.chip,
                    mode: null,
                })
                /* Paiements reçus (si la facture a été partiellement ou totalement encaissée) */
                for (const p of f.paiements) {
                    lines.push({
                        id: `pai-${p.id}`,
                        kind: "PAIEMENT_RECU",
                        date: p.date,
                        numero: p.reference ?? f.numero,
                        libelle: `Paiement ${f.numero}`,
                        tiers: client ? clientDisplayName(client) : "Client",
                        dossierNumero: dossier?.numero ?? null,
                        montant: p.montant,
                        statut: "Encaissé",
                        statutChip: "bg-[#e8f5e9] text-[#166534]",
                        mode: MODES_PAIEMENT[p.mode]?.label ?? p.mode,
                    })
                }
            } else {
                /* RECUE — c'est un frais externe ou cabinet */
                const fournisseur = f.fournisseurId
                    ? mockFournisseurs.find((x) => x.id === f.fournisseurId) ?? null
                    : null
                const isFraisExterne = f.refacturable || (dossier !== null && f.clientId !== null)
                lines.push({
                    id: `inv-${f.id}`,
                    kind: isFraisExterne ? "FRAIS_EXTERNE" : "FACTURE_RECUE",
                    date: f.date,
                    numero: f.numero,
                    libelle: f.description ?? f.lignes[0]?.libelle ?? "Frais",
                    tiers: fournisseur?.nom ?? f.fournisseurNomLibre ?? "Fournisseur",
                    dossierNumero: dossier?.numero ?? null,
                    montant: f.montantTTC,
                    statut: stat.label,
                    statutChip: stat.chip,
                    mode: null,
                })
            }
        }

        for (const d of depenses) {
            const fournisseur = d.fournisseurId
                ? mockFournisseurs.find((x) => x.id === d.fournisseurId) ?? null
                : null
            lines.push({
                id: `dep-${d.id}`,
                kind: "DEPENSE_INTERNE",
                date: d.date,
                numero: d.id.slice(-6).toUpperCase(),
                libelle: d.libelle,
                tiers: fournisseur?.nom ?? d.fournisseurNomLibre ?? "—",
                dossierNumero: null,
                montant: d.montantTTC,
                statut: d.statut === "PAYEE" ? "Payée" : "À payer",
                statutChip:
                    d.statut === "PAYEE"
                        ? "bg-[#e8f5e9] text-[#166534]"
                        : "bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant",
                mode: MODES_PAIEMENT[d.mode]?.label ?? d.mode,
            })
        }

        for (const b of bulletins) {
            if (b.statut === "BROUILLON") continue
            const emp = mockMembres.find((m) => m.id === b.employeId) ?? null
            const date = new Date(b.annee, b.mois - 1, 28).toISOString()
            lines.push({
                id: `bul-${b.id}`,
                kind: "BULLETIN_PAIE",
                date,
                numero: `${b.annee}-${String(b.mois).padStart(2, "0")}`,
                libelle: `Salaire ${new Date(b.annee, b.mois - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
                tiers: emp ? fullName(emp) : "Employé inconnu",
                dossierNumero: null,
                montant: b.coutTotalEmployeur,
                statut: b.statut === "VERSE" ? "Versé" : "Validé",
                statutChip:
                    b.statut === "VERSE"
                        ? "bg-[#e8f5e9] text-[#166534]"
                        : "bg-primary-fixed text-primary",
                mode: b.modeVersement ? MODES_PAIEMENT[b.modeVersement]?.label ?? b.modeVersement : null,
            })
        }

        return lines
    }, [factures, depenses, bulletins])

    /* `now` figé au mount (lazy useState) — évite l'appel impur Date.now() en render */
    const [now] = useState(() => Date.now())
    /* === Filtrage === */
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const periodLimit =
            periodPreset === "ALL"
                ? null
                : now - Number(periodPreset) * 24 * 3600 * 1000
        return allLines.filter((l) => {
            if (!activeKinds.has(l.kind)) return false
            if (periodLimit !== null && new Date(l.date).getTime() < periodLimit) return false
            if (q) {
                const hay = [l.numero, l.libelle, l.tiers, l.dossierNumero ?? ""]
                    .join(" ")
                    .toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [allLines, activeKinds, periodPreset, search, now])

    const sorted = useMemo(() => {
        const arr = [...filtered]
        if (sortBy === "date_desc") {
            arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        } else if (sortBy === "date_asc") {
            arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        } else {
            arr.sort((a, b) => b.montant - a.montant)
        }
        return arr
    }, [filtered, sortBy])

    /* === Totaux par catégorie (sur les lignes filtrées) === */
    const totaux = useMemo(() => {
        const byKind: Record<FluxKind, { count: number; montant: number }> = {
            FACTURE_EMISE: { count: 0, montant: 0 },
            PAIEMENT_RECU: { count: 0, montant: 0 },
            FACTURE_RECUE: { count: 0, montant: 0 },
            FRAIS_EXTERNE: { count: 0, montant: 0 },
            DEPENSE_INTERNE: { count: 0, montant: 0 },
            BULLETIN_PAIE: { count: 0, montant: 0 },
        }
        for (const l of filtered) {
            byKind[l.kind].count += 1
            byKind[l.kind].montant += l.montant
        }
        const entrees = byKind.PAIEMENT_RECU.montant
        const sorties =
            byKind.FACTURE_RECUE.montant +
            byKind.FRAIS_EXTERNE.montant +
            byKind.DEPENSE_INTERNE.montant +
            byKind.BULLETIN_PAIE.montant
        return { byKind, entrees, sorties, solde: entrees - sorties, count: filtered.length }
    }, [filtered])

    return (
        <div className="flex flex-col gap-density-tight h-full">
            {/* Header compact + stats */}
            <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">dataset</span>
                    Vue d&apos;ensemble
                </h2>
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                    <InlineStat
                        label="Lignes"
                        value={String(totaux.count)}
                        tone="neutral"
                    />
                    <InlineStat
                        label="Entrées"
                        value={formatFCFACompact(totaux.entrees)}
                        tone="success"
                    />
                    <InlineStat
                        label="Sorties"
                        value={formatFCFACompact(totaux.sorties)}
                        tone="warning"
                    />
                    <InlineStat
                        label="Solde"
                        value={formatFCFACompact(totaux.solde)}
                        tone={totaux.solde >= 0 ? "success" : "error"}
                    />
                </div>
                <div className="flex bg-surface-container-low border border-outline-variant rounded p-0.5">
                    {(
                        [
                            { v: "30" as const, label: "30 j" },
                            { v: "90" as const, label: "90 j" },
                            { v: "365" as const, label: "1 an" },
                            { v: "ALL" as const, label: "Tout" },
                        ]
                    ).map((opt) => {
                        const active = periodPreset === opt.v
                        return (
                            <button
                                key={opt.v}
                                onClick={() => setPeriodPreset(opt.v)}
                                className={cn(
                                    "px-2 py-1 rounded font-body-sm text-[11px] transition-all whitespace-nowrap",
                                    active
                                        ? "bg-white shadow-[0px_1px_3px_rgba(31,26,20,0.08)] text-primary-container font-semibold"
                                        : "text-outline hover:text-on-surface"
                                )}
                            >
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            </header>

            {/* Toolbar : search + chips de catégories + tri */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-tight flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                        search
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher (n°, libellé, client, fournisseur…)"
                        className="w-full pl-10 pr-3 py-2 bg-transparent border-0 font-body-sm text-body-sm focus:outline-none placeholder:text-outline"
                    />
                </div>

                <div className="h-6 w-px bg-outline-variant" />

                {/* Chips catégories */}
                <div className="flex items-center gap-1 flex-wrap">
                    {(Object.entries(KIND_META) as [FluxKind, typeof KIND_META[FluxKind]][]).map(
                        ([k, meta]) => {
                            const active = activeKinds.has(k)
                            const count = totaux.byKind[k].count
                            return (
                                <button
                                    key={k}
                                    onClick={() => toggleKind(k)}
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded font-body-sm text-[11px] border transition-all whitespace-nowrap",
                                        active
                                            ? "border-accent/40 bg-accent/5 text-on-surface"
                                            : "border-outline-variant text-outline hover:bg-surface-container-low"
                                    )}
                                    title={`${active ? "Masquer" : "Afficher"} les ${meta.label.toLowerCase()}`}
                                >
                                    <span className="material-symbols-outlined text-[12px]">
                                        {meta.icon}
                                    </span>
                                    {meta.label}
                                    {count > 0 && (
                                        <span
                                            className={cn(
                                                "ml-0.5 font-mono-num text-[10px] tabular-nums",
                                                active ? "text-on-surface" : "text-outline"
                                            )}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        }
                    )}
                </div>

                <div className="h-6 w-px bg-outline-variant" />

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-surface border border-outline-variant rounded px-2 py-1.5 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent"
                >
                    <option value="date_desc">Date ↓ (récent → ancien)</option>
                    <option value="date_asc">Date ↑ (ancien → récent)</option>
                    <option value="montant_desc">Montant ↓</option>
                </select>
            </div>

            {/* Tableau unifié */}
            <div className="flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                {sorted.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <span className="material-symbols-outlined text-[48px] text-outline-variant">
                            search_off
                        </span>
                        <p className="font-body-md text-body-md text-on-surface font-medium mt-2">
                            Aucun mouvement à afficher
                        </p>
                        <p className="font-body-sm text-body-sm text-outline">
                            Ajustez les filtres ou la période.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto scrollbar-thin">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                            <thead className="sticky top-0 z-10 bg-surface-container-low">
                                <tr className="border-b border-outline-variant">
                                    <Th width="32px" />
                                    <Th width="100px">Date</Th>
                                    <Th width="140px">Type</Th>
                                    <Th width="110px">N°</Th>
                                    <Th>Libellé</Th>
                                    <Th>Tiers</Th>
                                    <Th width="100px">Dossier</Th>
                                    <Th width="120px" align="right">Montant</Th>
                                    <Th width="110px">Statut</Th>
                                    <Th width="120px">Mode</Th>
                                </tr>
                            </thead>
                            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                                {sorted.map((l) => {
                                    const meta = KIND_META[l.kind]
                                    const isEntree = meta.sign === 1
                                    return (
                                        <tr
                                            key={l.id}
                                            className="hover:bg-surface-container-low/40 transition-colors h-11"
                                        >
                                            <td className="py-1.5 px-3">
                                                <span
                                                    className={cn(
                                                        "material-symbols-outlined text-[14px]",
                                                        isEntree ? "text-[#166534]" : "text-secondary"
                                                    )}
                                                    title={meta.label}
                                                >
                                                    {meta.icon}
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-3 font-mono-num text-mono-num text-[11px] text-on-surface-variant whitespace-nowrap tabular-nums">
                                                {formatDateCourte(l.date)}
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase tracking-wider whitespace-nowrap",
                                                        meta.chipClass
                                                    )}
                                                >
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-3 font-mono-num text-mono-num text-[11px] text-on-surface-variant whitespace-nowrap">
                                                {l.numero}
                                            </td>
                                            <td className="py-1.5 px-3 text-on-surface truncate max-w-[280px]" title={l.libelle}>
                                                {l.libelle}
                                            </td>
                                            <td className="py-1.5 px-3 text-on-surface-variant truncate max-w-[200px]" title={l.tiers}>
                                                {l.tiers}
                                            </td>
                                            <td className="py-1.5 px-3 font-mono-num text-mono-num text-[10px] text-outline whitespace-nowrap">
                                                {l.dossierNumero ?? "—"}
                                            </td>
                                            <td className="py-1.5 px-3 text-right">
                                                <span
                                                    className={cn(
                                                        "font-mono-num text-mono-num font-semibold tabular-nums whitespace-nowrap",
                                                        isEntree
                                                            ? "text-[#166534]"
                                                            : "text-on-surface"
                                                    )}
                                                >
                                                    {isEntree ? "+" : "−"} {formatFCFA(l.montant)}
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase tracking-wider whitespace-nowrap",
                                                        l.statutChip
                                                    )}
                                                >
                                                    {l.statut}
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-3 text-[11px] text-outline whitespace-nowrap">
                                                {l.mode ?? "—"}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

function InlineStat({
    label,
    value,
    tone = "neutral",
}: {
    label: string
    value: string
    tone?: "neutral" | "success" | "warning" | "error"
}) {
    const valueClass =
        tone === "success"
            ? "text-[#166534]"
            : tone === "error"
            ? "text-error"
            : tone === "warning"
            ? "text-secondary"
            : "text-on-surface"
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {label}
            </span>
            <span
                className={cn(
                    "font-mono-num text-mono-num text-body-sm font-semibold tabular-nums",
                    valueClass
                )}
            >
                {value}
            </span>
        </div>
    )
}

function Th({
    children,
    width,
    align = "left",
}: {
    children?: React.ReactNode
    width?: string
    align?: "left" | "right" | "center"
}) {
    return (
        <th
            className={cn(
                "py-2 px-3 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap",
                align === "right" && "text-right",
                align === "center" && "text-center"
            )}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
