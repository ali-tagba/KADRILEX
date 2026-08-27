"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
    STATUTS_FACTURE,
    formatDateCourte,
    formatFCFA,
    type StatutFactureKey,
} from "@/lib/constants/finance"
import type { MockFacture } from "@/lib/mock/invoices"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"
import { mockDossiers } from "@/lib/mock/dossiers"
import { factureClientName } from "@/lib/mock/invoices"
import { FactureActionsMenu } from "./facture-actions-menu"
import { InlineDateCell, InlineSelectCell, type InlineOption } from "./inline-cell-editor"
import { StatusDot } from "@/components/ui/status-dot"

interface FactureGroupedViewProps {
    factures: MockFacture[]
    selectedId: string | null
    onSelect: (f: MockFacture) => void
    onEdit: (f: MockFacture) => void
    onPaiement: (f: MockFacture) => void
    onDuplicate: (f: MockFacture) => void
    onCancel: (id: string) => void
    onDelete?: (id: string) => void
    onChangeDate?: (id: string, iso: string) => void
    onChangeEcheance?: (id: string, iso: string | null) => void
    onChangeStatut?: (id: string, statut: StatutFactureKey) => void
}

/* ============================================================
   Aggregation : clients → dossiers
   ============================================================ */

interface DossierGroup {
    dossierId: string | null
    numero: string
    titre: string | null
    factures: MockFacture[]
    totalEmis: number
    totalRecu: number
    encaisse: number
    soldeDu: number
}

interface ClientGroup {
    /** null = factures reçues sans client (frais cabinet purs) */
    clientId: string | null
    nom: string
    dossiers: DossierGroup[]
    totalEmis: number
    totalRecu: number
    encaisse: number
    soldeDu: number
    enRetard: number
}

function aggregate(factures: MockFacture[]): ClientGroup[] {
    const clientMap = new Map<string, ClientGroup>()
    const SANS_CLIENT_KEY = "__SANS_CLIENT__"

    for (const f of factures) {
        const clientKey = f.clientId ?? SANS_CLIENT_KEY
        const clientId = f.clientId
        let cg = clientMap.get(clientKey)
        if (!cg) {
            const embedded = f.client ? factureClientName(f.client) : null
            const c = clientId ? mockClients.find((x) => x.id === clientId) : null
            cg = {
                clientId,
                nom:
                    embedded ??
                    (c
                        ? clientDisplayName(c)
                        : f.direction === "RECUE"
                        ? "Frais cabinet (sans client)"
                        : "Client inconnu"),
                dossiers: [],
                totalEmis: 0,
                totalRecu: 0,
                encaisse: 0,
                soldeDu: 0,
                enRetard: 0,
            }
            clientMap.set(clientKey, cg)
        }

        const dossierKey = f.dossierId ?? "__SANS_DOSSIER__"
        let dg = cg.dossiers.find((d) => (d.dossierId ?? "__SANS_DOSSIER__") === dossierKey)
        if (!dg) {
            const dos = f.dossier ?? (f.dossierId ? mockDossiers.find((x) => x.id === f.dossierId) : null)
            dg = {
                dossierId: f.dossierId,
                numero: dos?.numero ?? "Sans dossier",
                titre: dos?.titre ?? null,
                factures: [],
                totalEmis: 0,
                totalRecu: 0,
                encaisse: 0,
                soldeDu: 0,
            }
            cg.dossiers.push(dg)
        }

        dg.factures.push(f)
        if (f.direction === "EMISE") {
            if (f.statut !== "BROUILLON" && f.statut !== "ANNULEE") {
                dg.totalEmis += f.montantTTC
                dg.encaisse += f.montantPaye
                dg.soldeDu += f.montantTTC - f.montantPaye
                cg.totalEmis += f.montantTTC
                cg.encaisse += f.montantPaye
                cg.soldeDu += f.montantTTC - f.montantPaye
                if (f.statut === "EN_RETARD") cg.enRetard += 1
            }
        } else {
            if (f.statut !== "BROUILLON" && f.statut !== "ANNULEE") {
                dg.totalRecu += f.montantTTC
                cg.totalRecu += f.montantTTC
            }
        }
    }

    /* Tri factures dans chaque dossier (date desc) */
    for (const cg of clientMap.values()) {
        for (const dg of cg.dossiers) {
            dg.factures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }
        /* Sans dossier en dernier */
        cg.dossiers.sort((a, b) => {
            if (a.dossierId === null) return 1
            if (b.dossierId === null) return -1
            return a.numero.localeCompare(b.numero)
        })
    }

    /* Tri clients : par solde dû desc, puis CA desc, puis nom */
    return Array.from(clientMap.values()).sort((a, b) => {
        if (b.soldeDu !== a.soldeDu) return b.soldeDu - a.soldeDu
        if (b.totalEmis !== a.totalEmis) return b.totalEmis - a.totalEmis
        return a.nom.localeCompare(b.nom)
    })
}

/* ============================================================
   Status options (réutilisé pour InlineSelectCell)
   ============================================================ */

const statutOptions: InlineOption<StatutFactureKey>[] = (Object.entries(STATUTS_FACTURE) as [
    StatutFactureKey,
    (typeof STATUTS_FACTURE)[StatutFactureKey],
][]).map(([key, meta]) => ({
    value: key,
    label: meta.label,
    preview: <StatusDot tone={meta.tone} label={meta.label} />,
}))

/* ============================================================
   View
   ============================================================ */

export function FactureGroupedView({
    factures,
    selectedId,
    onSelect,
    onEdit,
    onPaiement,
    onDuplicate,
    onCancel,
    onDelete,
    onChangeDate,
    onChangeEcheance,
    onChangeStatut,
}: FactureGroupedViewProps) {
    const groups = useMemo(() => aggregate(factures), [factures])
    const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set())
    const [collapsedDossiers, setCollapsedDossiers] = useState<Set<string>>(new Set())

    const toggleClient = (key: string) =>
        setCollapsedClients((s) => {
            const n = new Set(s)
            if (n.has(key)) n.delete(key)
            else n.add(key)
            return n
        })
    const toggleDossier = (key: string) =>
        setCollapsedDossiers((s) => {
            const n = new Set(s)
            if (n.has(key)) n.delete(key)
            else n.add(key)
            return n
        })

    if (groups.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px] text-outline">account_tree</span>
                <p className="font-body-sm text-body-sm">Aucune facture à grouper.</p>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-auto h-full">
            <div className="flex flex-col gap-density-tight p-density-tight">
                {groups.map((cg) => {
                    const clientKey = cg.clientId ?? "__SANS_CLIENT__"
                    const clientCollapsed = collapsedClients.has(clientKey)
                    const dossiersCount = cg.dossiers.length
                    const facturesCount = cg.dossiers.reduce((s, d) => s + d.factures.length, 0)

                    return (
                        <section
                            key={clientKey}
                            className="bg-white border border-outline-variant rounded-lg overflow-hidden"
                        >
                            {/* Header client */}
                            <header
                                onClick={() => toggleClient(clientKey)}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container-low/50 transition-colors border-b border-outline-variant"
                            >
                                <span
                                    className={cn(
                                        "material-symbols-outlined text-[20px] text-on-surface-variant transition-transform",
                                        !clientCollapsed && "rotate-90"
                                    )}
                                >
                                    chevron_right
                                </span>
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px]">
                                        {cg.clientId ? "account_circle" : "store"}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-display text-body-md text-on-surface truncate">
                                        {cg.nom}
                                    </h3>
                                    <p className="font-body-xs text-body-xs text-on-surface-variant">
                                        {dossiersCount} dossier{dossiersCount > 1 ? "s" : ""} · {facturesCount}{" "}
                                        facture{facturesCount > 1 ? "s" : ""}
                                        {cg.enRetard > 0 && (
                                            <span className="ml-2 text-error font-medium">
                                                · {cg.enRetard} en retard
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="hidden md:flex items-center gap-4 text-right">
                                    <ClientStat label="CA facturé" value={cg.totalEmis} />
                                    <ClientStat label="Encaissé" value={cg.encaisse} tone="positive" />
                                    <ClientStat
                                        label="Solde dû"
                                        value={cg.soldeDu}
                                        tone={cg.soldeDu > 0 ? "warning" : "muted"}
                                    />
                                    {cg.totalRecu > 0 && (
                                        <ClientStat label="Frais reçus" value={cg.totalRecu} tone="muted" />
                                    )}
                                </div>
                            </header>

                            {/* Liste dossiers (si non collapsed) */}
                            {!clientCollapsed && (
                                <div className="flex flex-col gap-density-tight p-density-tight bg-surface-container-low/30">
                                    {cg.dossiers.map((dg) => {
                                        const dossierKey = `${clientKey}::${dg.dossierId ?? "__"}`
                                        const dossierCollapsed = collapsedDossiers.has(dossierKey)
                                        return (
                                            <div
                                                key={dossierKey}
                                                className="bg-white border border-outline-variant rounded overflow-hidden"
                                            >
                                                <div
                                                    onClick={() => toggleDossier(dossierKey)}
                                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-container-low/40 transition-colors border-b border-outline-variant"
                                                >
                                                    <span
                                                        className={cn(
                                                            "material-symbols-outlined text-[18px] text-on-surface-variant transition-transform",
                                                            !dossierCollapsed && "rotate-90"
                                                        )}
                                                    >
                                                        chevron_right
                                                    </span>
                                                    <span className="material-symbols-outlined text-[18px] text-accent">
                                                        folder_open
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-mono-num text-mono-num text-body-sm text-on-surface">
                                                            {dg.numero}
                                                        </span>
                                                        {dg.titre && (
                                                            <span className="ml-2 font-body-sm text-body-sm text-on-surface-variant truncate">
                                                                — {dg.titre}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-right font-body-xs text-body-xs">
                                                        <span className="text-on-surface-variant">
                                                            {dg.factures.length} facture
                                                            {dg.factures.length > 1 ? "s" : ""}
                                                        </span>
                                                        {dg.totalEmis > 0 && (
                                                            <span className="text-on-surface">
                                                                Émis{" "}
                                                                <span className="font-mono-num font-medium">
                                                                    {formatFCFA(dg.totalEmis)}
                                                                </span>
                                                            </span>
                                                        )}
                                                        <span
                                                            className={cn(
                                                                "font-mono-num font-medium",
                                                                dg.soldeDu > 0
                                                                    ? "text-error"
                                                                    : "text-success"
                                                            )}
                                                        >
                                                            {dg.soldeDu > 0
                                                                ? `Reste ${formatFCFA(dg.soldeDu)}`
                                                                : "Soldé"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Tableau factures du dossier */}
                                                {!dossierCollapsed && (
                                                    <table className="w-full font-body-sm text-body-sm">
                                                        <thead className="bg-surface-container-low/40 text-on-surface-variant">
                                                            <tr>
                                                                <th className="text-left px-3 py-1.5 font-medium w-[8px]"></th>
                                                                <th className="text-left px-2 py-1.5 font-medium">
                                                                    N°
                                                                </th>
                                                                <th className="text-left px-2 py-1.5 font-medium w-[110px]">
                                                                    Date
                                                                </th>
                                                                <th className="text-left px-2 py-1.5 font-medium w-[110px]">
                                                                    Échéance
                                                                </th>
                                                                <th className="text-left px-2 py-1.5 font-medium">
                                                                    Description
                                                                </th>
                                                                <th className="text-right px-2 py-1.5 font-medium w-[120px]">
                                                                    Montant TTC
                                                                </th>
                                                                <th className="text-right px-2 py-1.5 font-medium w-[110px]">
                                                                    Encaissé
                                                                </th>
                                                                <th className="text-left px-2 py-1.5 font-medium w-[140px]">
                                                                    Statut
                                                                </th>
                                                                <th className="w-[40px]"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dg.factures.map((f) => (
                                                                <FactureRow
                                                                    key={f.id}
                                                                    facture={f}
                                                                    selected={selectedId === f.id}
                                                                    onSelect={onSelect}
                                                                    onEdit={onEdit}
                                                                    onPaiement={onPaiement}
                                                                    onDuplicate={onDuplicate}
                                                                    onCancel={onCancel}
                                                                    onDelete={onDelete}
                                                                    onChangeDate={onChangeDate}
                                                                    onChangeEcheance={onChangeEcheance}
                                                                    onChangeStatut={onChangeStatut}
                                                                />
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    )
                })}
            </div>
        </div>
    )
}

/* ============================================================
   Sub-components
   ============================================================ */

function ClientStat({
    label,
    value,
    tone = "neutral",
}: {
    label: string
    value: number
    tone?: "neutral" | "positive" | "warning" | "muted"
}) {
    return (
        <div className="flex flex-col items-end leading-tight">
            <span className="font-body-xs text-body-xs text-on-surface-variant">{label}</span>
            <span
                className={cn(
                    "font-mono-num text-mono-num text-body-sm font-medium",
                    tone === "positive" && "text-success",
                    tone === "warning" && value > 0 && "text-error",
                    tone === "muted" && "text-on-surface-variant",
                    tone === "neutral" && "text-on-surface"
                )}
            >
                {formatFCFA(value)}
            </span>
        </div>
    )
}

interface FactureRowProps {
    facture: MockFacture
    selected: boolean
    onSelect: (f: MockFacture) => void
    onEdit: (f: MockFacture) => void
    onPaiement: (f: MockFacture) => void
    onDuplicate: (f: MockFacture) => void
    onCancel: (id: string) => void
    onDelete?: (id: string) => void
    onChangeDate?: (id: string, iso: string) => void
    onChangeEcheance?: (id: string, iso: string | null) => void
    onChangeStatut?: (id: string, statut: StatutFactureKey) => void
}

function FactureRow({
    facture: f,
    selected,
    onSelect,
    onEdit,
    onPaiement,
    onDuplicate,
    onCancel,
    onDelete,
    onChangeDate,
    onChangeEcheance,
    onChangeStatut,
}: FactureRowProps) {
    const statutMeta = STATUTS_FACTURE[f.statut]
    const isEmise = f.direction === "EMISE"
    const directionIcon = isEmise ? "north_east" : "south_west"
    const directionTone = isEmise ? "text-success" : "text-warning"
    const directionTitle = isEmise ? "Facture émise (sortante)" : "Facture reçue (entrante)"
    const description = f.description || f.lignes[0]?.libelle || "—"

    return (
        <tr
            onClick={() => onSelect(f)}
            className={cn(
                "border-t border-outline-variant cursor-pointer transition-colors",
                selected ? "bg-accent/10" : "hover:bg-surface-container-low/40"
            )}
        >
            <td className="px-3 py-2">
                <span
                    title={directionTitle}
                    className={cn("material-symbols-outlined text-[16px]", directionTone)}
                >
                    {directionIcon}
                </span>
            </td>
            <td className="px-2 py-2">
                <span className="font-mono-num text-mono-num text-body-sm text-on-surface">
                    {f.numero}
                </span>
            </td>
            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                {onChangeDate ? (
                    <InlineDateCell
                        value={f.date}
                        onChange={(iso) => iso && onChangeDate(f.id, iso)}
                        title="Modifier la date d'émission"
                    />
                ) : (
                    <span className="font-mono-num text-mono-num text-body-sm">
                        {formatDateCourte(f.date)}
                    </span>
                )}
            </td>
            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                {onChangeEcheance ? (
                    <InlineDateCell
                        value={f.dateEcheance}
                        nullable
                        placeholder="+ échéance"
                        title="Modifier l'échéance"
                        onChange={(iso) => onChangeEcheance(f.id, iso)}
                    />
                ) : (
                    <span className="font-mono-num text-mono-num text-body-sm text-on-surface-variant">
                        {f.dateEcheance ? formatDateCourte(f.dateEcheance) : "—"}
                    </span>
                )}
            </td>
            <td className="px-2 py-2">
                <span className="text-on-surface line-clamp-1" title={description}>
                    {description}
                </span>
            </td>
            <td className="px-2 py-2 text-right">
                <span className="font-mono-num text-mono-num text-body-sm text-on-surface">
                    {formatFCFA(f.montantTTC)}
                </span>
            </td>
            <td className="px-2 py-2 text-right">
                <span
                    className={cn(
                        "font-mono-num text-mono-num text-body-sm",
                        f.montantPaye > 0 ? "text-success" : "text-on-surface-variant"
                    )}
                >
                    {formatFCFA(f.montantPaye)}
                </span>
            </td>
            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                {onChangeStatut ? (
                    <InlineSelectCell<StatutFactureKey>
                        trigger={
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <StatusDot tone={statutMeta.tone} label={statutMeta.label} />
                                <span className="material-symbols-outlined text-[10px] opacity-60">
                                    expand_more
                                </span>
                            </span>
                        }
                        options={statutOptions}
                        selected={f.statut}
                        onSelect={(v) => onChangeStatut(f.id, v)}
                        title="Changer le statut"
                        menuHeader="Statut facture"
                        align="start"
                    />
                ) : (
                    <StatusDot tone={statutMeta.tone} label={statutMeta.label} />
                )}
            </td>
            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                <FactureActionsMenu
                    onView={() => onSelect(f)}
                    onEdit={() => onEdit(f)}
                    onPaiement={() => onPaiement(f)}
                    onDuplicate={() => onDuplicate(f)}
                    onCancel={() => onCancel(f.id)}
                    onDelete={onDelete ? () => onDelete(f.id) : undefined}
                    canEdit={
                        f.statut === "BROUILLON" || f.statut === "EMISE" || f.statut === "EN_RETARD"
                    }
                    canPaiement={
                        f.direction === "EMISE" &&
                        (f.statut === "EMISE" ||
                            f.statut === "EN_RETARD" ||
                            f.statut === "PARTIELLE")
                    }
                    canCancel={f.statut !== "ANNULEE" && f.statut !== "PAYEE"}
                    canDelete={!!onDelete}
                />
            </td>
        </tr>
    )
}
