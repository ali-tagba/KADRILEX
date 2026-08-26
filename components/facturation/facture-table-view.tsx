"use client"

import { cn } from "@/lib/utils"
import {
    DIRECTIONS_FACTURE,
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

interface FactureTableViewProps {
    factures: MockFacture[]
    selectedId: string | null
    onSelect: (f: MockFacture) => void
    onEdit: (f: MockFacture) => void
    onPaiement: (f: MockFacture) => void
    onDuplicate: (f: MockFacture) => void
    onCancel: (id: string) => void
    /** Suppression définitive (hard delete) — distinct de onCancel */
    onDelete?: (id: string) => void
    /** Édition inline date d'émission */
    onChangeDate?: (id: string, iso: string) => void
    /** Édition inline date d'échéance */
    onChangeEcheance?: (id: string, iso: string | null) => void
    /** Édition inline statut */
    onChangeStatut?: (id: string, statut: StatutFactureKey) => void
}

function factureLateBadge(f: MockFacture): boolean {
    if (f.statut !== "EN_RETARD") return false
    return true
}

interface Recipient {
    primary: string
    /** Chip dossier (numéro court, ex DOS-26-041) */
    dossierChip: string | null
    /** Tooltip complet du dossier (titre) */
    dossierTitle: string | null
    isClient: boolean
}

function getRecipient(f: MockFacture): Recipient {
    // Préfère les relations embarquées (API), fallback sur les mocks (dev local).
    const dossier = f.dossier ?? (f.dossierId ? mockDossiers.find((d) => d.id === f.dossierId) : null)
    if (f.direction === "EMISE") {
        const embedded = f.client ? factureClientName(f.client) : null
        const client = f.clientId ? mockClients.find((c) => c.id === f.clientId) : null
        return {
            primary: embedded ?? (client ? clientDisplayName(client) : "Client inconnu"),
            dossierChip: dossier?.numero ?? null,
            dossierTitle: dossier?.titre ?? null,
            isClient: true,
        }
    }
    const fr = f.fournisseur
    return {
        primary: fr?.nom ?? f.fournisseurNomLibre ?? "Fournisseur inconnu",
        dossierChip: dossier?.numero ?? null,
        dossierTitle: dossier?.titre ?? null,
        isClient: false,
    }
}

export function FactureTableView({
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
}: FactureTableViewProps) {
    const statutOptions: InlineOption<StatutFactureKey>[] = (
        Object.entries(STATUTS_FACTURE) as [StatutFactureKey, { label: string; chip: string }][]
    ).map(([k, m]) => ({
        value: k,
        label: m.label,
        preview: <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase", m.chip)}>{m.label}</span>,
    }))
    if (factures.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">receipt_long</span>
                <p className="font-body-md text-body-md text-on-surface font-medium">Aucune facture</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Ajustez les filtres ou créez une nouvelle facture.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest border-r border-outline-variant h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead className="sticky top-0 z-10 bg-[#FBF7F0] shadow-sm">
                        <tr className="border-b border-outline-variant">
                            <Th width="40px" align="center">
                                <span className="sr-only">Direction</span>
                            </Th>
                            <Th>N°</Th>
                            <Th width="100px">Date</Th>
                            <Th width="120px">Échéance</Th>
                            <Th>Client / Fournisseur</Th>
                            <Th width="130px" align="right">Montant TTC</Th>
                            <Th width="130px" align="right">Encaissé</Th>
                            <Th width="130px" align="right">Restant</Th>
                            <Th width="110px" align="center">Statut</Th>
                            <Th width="50px" align="center">PDF</Th>
                            <Th width="40px" align="center">⋮</Th>
                        </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                        {factures.map((f) => {
                            const isSelected = selectedId === f.id
                            const stat = STATUTS_FACTURE[f.statut]
                            const dir = DIRECTIONS_FACTURE[f.direction]
                            const recipient = getRecipient(f)
                            const restant = f.montantTTC - f.montantPaye
                            const isLate = factureLateBadge(f)
                            return (
                                <tr
                                    key={f.id}
                                    onClick={() => onSelect(f)}
                                    className={cn(
                                        "h-10 border-b border-[#E8DCC8] hover:bg-surface-container-low transition-colors cursor-pointer group relative",
                                        isSelected && "bg-[#E8B27D]/10 hover:bg-[#E8B27D]/15"
                                    )}
                                >
                                    {isSelected && <td className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8772F]"></td>}
                                    {/* Direction icon */}
                                    <td className="py-2 px-3 text-center">
                                        <span
                                            className={cn(
                                                "material-symbols-outlined text-[18px]",
                                                f.direction === "EMISE" ? "text-primary-container" : "text-outline"
                                            )}
                                            title={dir.label}
                                        >
                                            {dir.icon}
                                        </span>
                                    </td>

                                    {/* N° */}
                                    <td className="py-2 px-3 font-mono-num text-mono-num text-on-surface">{f.numero}</td>

                                    {/* Date émission — inline editable */}
                                    <td className="py-2 px-3">
                                        {onChangeDate ? (
                                            <InlineDateCell
                                                value={f.date}
                                                onChange={(iso) => iso && onChangeDate(f.id, iso)}
                                                title="Modifier la date d'émission"
                                                triggerClassName="text-[12px] text-on-surface-variant px-1 py-0.5"
                                            />
                                        ) : (
                                            <span className="font-mono-num text-[12px] text-on-surface-variant">
                                                {formatDateCourte(f.date)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Échéance — inline editable + badge retard */}
                                    <td className="py-2 px-3">
                                        <div className="flex items-center gap-1.5">
                                            {onChangeEcheance ? (
                                                <InlineDateCell
                                                    value={f.dateEcheance}
                                                    onChange={(iso) => onChangeEcheance(f.id, iso)}
                                                    placeholder="+ échéance"
                                                    title="Modifier l'échéance"
                                                    nullable
                                                    triggerClassName={cn(
                                                        "text-[12px] px-1 py-0.5",
                                                        isLate ? "text-error font-medium" : "text-on-surface-variant"
                                                    )}
                                                />
                                            ) : (
                                                <span className={cn("font-mono-num text-[12px]", isLate ? "text-error" : "text-on-surface-variant")}>
                                                    {f.dateEcheance ? formatDateCourte(f.dateEcheance) : "—"}
                                                </span>
                                            )}
                                            {isLate && (
                                                <span className="px-1 py-0.5 bg-error-container/60 text-on-error-container rounded text-[9px] font-bold leading-none">
                                                    Retard
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Client/Fournisseur + chip dossier visible (multi-dossier same client) */}
                                    <td className="py-2 px-3 min-w-0">
                                        <p className="font-body-md text-body-md font-medium text-on-surface truncate inline-flex items-center gap-1.5">
                                            {recipient.isClient ? (
                                                <span className="material-symbols-outlined text-[14px] text-outline flex-shrink-0">
                                                    person
                                                </span>
                                            ) : (
                                                <span className="material-symbols-outlined text-[14px] text-outline flex-shrink-0">
                                                    storefront
                                                </span>
                                            )}
                                            <span className="truncate">{recipient.primary}</span>
                                        </p>
                                        {recipient.dossierChip && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono-num text-[10px]"
                                                    title={recipient.dossierTitle ?? ""}
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">folder</span>
                                                    {recipient.dossierChip}
                                                </span>
                                                {recipient.dossierTitle && (
                                                    <span className="text-[11px] text-outline truncate min-w-0" title={recipient.dossierTitle}>
                                                        · {recipient.dossierTitle.slice(0, 30)}
                                                        {recipient.dossierTitle.length > 30 ? "…" : ""}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Montant TTC */}
                                    <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums">
                                        {formatFCFA(f.montantTTC)}
                                    </td>

                                    {/* Encaissé */}
                                    <td
                                        className={cn(
                                            "py-2 px-3 font-mono-num text-mono-num text-right tabular-nums",
                                            f.montantPaye > 0 ? "text-[#166534]" : "text-outline-variant"
                                        )}
                                    >
                                        {f.montantPaye > 0 ? formatFCFA(f.montantPaye) : "—"}
                                    </td>

                                    {/* Restant */}
                                    <td
                                        className={cn(
                                            "py-2 px-3 font-mono-num text-mono-num text-right tabular-nums font-medium",
                                            restant > 0 ? "text-error" : "text-outline-variant"
                                        )}
                                    >
                                        {restant > 0 ? formatFCFA(restant) : "—"}
                                    </td>

                                    {/* Statut — inline editable */}
                                    <td className="py-2 px-3 text-center">
                                        {onChangeStatut ? (
                                            <InlineSelectCell<StatutFactureKey>
                                                trigger={
                                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase whitespace-nowrap", stat.chip)}>
                                                        {stat.label}
                                                        <span className="material-symbols-outlined text-[10px] opacity-60">expand_more</span>
                                                    </span>
                                                }
                                                options={statutOptions}
                                                selected={f.statut}
                                                onSelect={(v) => onChangeStatut(f.id, v)}
                                                title="Changer le statut"
                                                menuHeader="Statut facture"
                                                align="end"
                                            />
                                        ) : (
                                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded font-label-caps text-[10px] uppercase whitespace-nowrap", stat.chip)}>
                                                {stat.label}
                                            </span>
                                        )}
                                    </td>

                                    {/* PDF — bouton direct selon le type de facture */}
                                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        {f.direction === "EMISE" ? (
                                            // Facture émise : télécharge le PDF KadriLex
                                            //  - si déjà généré → depuis Storage (instant)
                                            //  - sinon → /pdf qui le génère à la volée
                                            <a
                                                href={
                                                    f.generatedPdfUrl
                                                        ? `/api/storage/file?path=${encodeURIComponent(f.generatedPdfUrl)}&name=${encodeURIComponent(f.numero + ".pdf")}&download=1`
                                                        : `/api/invoices/${f.id}/pdf`
                                                }
                                                download={`${f.numero}.pdf`}
                                                className="inline-flex items-center justify-center w-7 h-7 rounded text-primary hover:bg-accent/10 transition-colors"
                                                title={
                                                    f.generatedPdfUrl
                                                        ? "Télécharger le PDF généré"
                                                        : "Télécharger le PDF (génération à la volée)"
                                                }
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    picture_as_pdf
                                                </span>
                                            </a>
                                        ) : f.attachmentUrl ? (
                                            // Facture reçue avec scan : télécharge le scan
                                            <a
                                                href={`/api/storage/file?path=${encodeURIComponent(f.attachmentUrl)}&name=${encodeURIComponent(f.numero + ".pdf")}&download=1`}
                                                download={`${f.numero}.pdf`}
                                                className="inline-flex items-center justify-center w-7 h-7 rounded text-primary-container hover:bg-surface-container-low transition-colors"
                                                title="Télécharger le scan de la facture"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    attach_file
                                                </span>
                                            </a>
                                        ) : (
                                            <span
                                                className="text-outline-variant text-[10px]"
                                                title="Aucun scan attaché"
                                            >
                                                —
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td onClick={(e) => e.stopPropagation()} className="py-2 px-3 text-center">
                                        <FactureActionsMenu
                                            onView={() => onSelect(f)}
                                            onEdit={() => onEdit(f)}
                                            onPaiement={() => onPaiement(f)}
                                            onDuplicate={() => onDuplicate(f)}
                                            onCancel={() => onCancel(f.id)}
                                            onDelete={onDelete ? () => onDelete(f.id) : undefined}
                                            canEdit={f.statut === "BROUILLON" || f.statut === "EMISE" || f.statut === "EN_RETARD"}
                                            canPaiement={
                                                f.direction === "EMISE" &&
                                                (f.statut === "EMISE" || f.statut === "EN_RETARD" || f.statut === "PARTIELLE")
                                            }
                                            canCancel={f.statut !== "ANNULEE" && f.statut !== "PAYEE"}
                                            canDelete={!!onDelete}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function Th({
    children,
    width,
    align = "left",
}: {
    children: React.ReactNode
    width?: string
    align?: "left" | "center" | "right"
}) {
    return (
        <th
            className={cn(
                "py-3 px-4 font-label-caps text-label-caps text-[#9C8B73] border-b border-outline-variant font-semibold uppercase whitespace-nowrap",
                align === "right" && "text-right",
                align === "center" && "text-center"
            )}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
