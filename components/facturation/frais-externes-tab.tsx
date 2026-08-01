"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { postEntity, showApiError } from "@/lib/api/patch"
import {
    STATUTS_FACTURE,
    formatDateCourte,
    formatFCFA,
} from "@/lib/constants/finance"
import type { MockFacture } from "@/lib/mock/invoices"
import { recomputeFacture, mockFournisseurs } from "@/lib/mock/invoices"
import { mockDossiers, type MockDossier } from "@/lib/mock/dossiers"
import type { MockClient } from "@/lib/mock/clients"
import { FactureActionsMenu } from "./facture-actions-menu"
import {
    AjouterFraisExterneDialog,
    type AjouterFraisDraft,
} from "./ajouter-frais-externe-dialog"
import { calcTVA, calcTTC } from "@/lib/constants/finance"
// Helper formatDateCourte importé depuis constants


interface FraisExternesTabProps {
    factures: MockFacture[]
    onChangeFactures: (next: MockFacture[]) => void
    onSelect: (f: MockFacture) => void
    clients?: MockClient[]
    dossiers?: MockDossier[]
}

type RefacFilter = "ALL" | "EN_ATTENTE" | "REFACTUREES"

export function FraisExternesTab({ factures, onChangeFactures, onSelect, clients = [], dossiers = [] }: FraisExternesTabProps) {
    const [filter, setFilter] = useState<RefacFilter>("EN_ATTENTE")
    const [search, setSearch] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [ajoutOpen, setAjoutOpen] = useState(false)

    const recues = useMemo(
        () => factures.filter((f) => f.direction === "RECUE" && f.statut !== "BROUILLON" && f.statut !== "ANNULEE"),
        [factures]
    )

    const visible = useMemo(() => {
        let list = recues
        if (filter === "EN_ATTENTE") list = list.filter((f) => f.refacturable && !f.refactureeViaFactureId)
        else if (filter === "REFACTUREES") list = list.filter((f) => f.refacturable && f.refactureeViaFactureId)
        const q = search.trim().toLowerCase()
        if (q) {
            list = list.filter((f) => {
                const fr = f.fournisseur ?? (f.fournisseurId ? mockFournisseurs.find((x) => x.id === f.fournisseurId) : null)
                const dos = f.dossier ?? (f.dossierId ? dossiers.find((d) => d.id === f.dossierId) ?? mockDossiers.find((d) => d.id === f.dossierId) : null)
                const hay = [
                    f.numero,
                    fr?.nom ?? "",
                    f.fournisseurNomLibre ?? "",
                    dos?.numero ?? "",
                    dos?.titre ?? "",
                    f.lignes.map((l) => l.libelle).join(" "),
                ].join(" ").toLowerCase()
                return hay.includes(q)
            })
        }
        return list
    }, [recues, filter, search])

    const totaux = useMemo(() => {
        const enAttente = recues
            .filter((f) => f.refacturable && !f.refactureeViaFactureId)
            .reduce((s, f) => s + f.montantTTC, 0)
        const refacturees = recues
            .filter((f) => f.refacturable && f.refactureeViaFactureId)
            .reduce((s, f) => s + f.montantTTC, 0)
        return { enAttente, refacturees, total: enAttente + refacturees }
    }, [recues])

    /* Sélection */
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    const toggleSelectAll = () => {
        const enAttente = visible.filter((f) => f.refacturable && !f.refactureeViaFactureId)
        if (selectedIds.size === enAttente.length && enAttente.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(enAttente.map((f) => f.id)))
        }
    }

    const selectionTotal = useMemo(
        () =>
            visible
                .filter((f) => selectedIds.has(f.id) && f.refacturable && !f.refactureeViaFactureId)
                .reduce((s, f) => s + f.montantTTC, 0),
        [visible, selectedIds]
    )

    /* Création d'un frais externe (= facture reçue) */
    const handleAjouterFrais = (draft: AjouterFraisDraft) => {
        const annee = new Date(draft.date).getFullYear()
        const numCount = factures.filter((x) => x.numero.startsWith(`REC-${annee}`)).length + 1
        const numero = `REC-${annee}-${String(numCount).padStart(3, "0")}`
        const now = new Date().toISOString()
        const dossier = draft.dossierId
            ? dossiers.find((d) => d.id === draft.dossierId) ?? mockDossiers.find((d) => d.id === draft.dossierId) ?? null
            : null
        const clientId = dossier?.clientId ?? null
        const tvaMontant = calcTVA(draft.montantHT, draft.tvaRate)
        const ttc = calcTTC(draft.montantHT, draft.tvaRate)
        const newFacture: MockFacture = {
            id: `fac-local-${Date.now()}`,
            numero,
            direction: "RECUE",
            type: "FRAIS",
            date: new Date(draft.date).toISOString(),
            dateEcheance: null,
            clientId,
            dossierId: draft.dossierId,
            audienceId: null,
            fournisseurId: draft.fournisseurId,
            fournisseurNomLibre: draft.fournisseurNomLibre,
            montantHT: draft.montantHT,
            tvaRate: draft.tvaRate,
            montantTVA: tvaMontant,
            montantTTC: ttc,
            montantPaye: draft.dejaPaye ? ttc : 0,
            statut: draft.dejaPaye ? "PAYEE" : "EMISE",
            lignes: [
                {
                    id: `lig-${Date.now()}`,
                    libelle: draft.libelle,
                    quantite: 1,
                    prixUnitaire: draft.montantHT,
                    total: draft.montantHT,
                    audienceId: null,
                },
            ],
            paiements: draft.dejaPaye
                ? [
                      {
                          id: `pai-${Date.now()}`,
                          factureId: `fac-local-${Date.now()}`,
                          date: now,
                          montant: ttc,
                          mode: draft.modeRegle ?? "VIREMENT",
                          reference: null,
                          notes: null,
                      },
                  ]
                : [],
            description: draft.libelle,
            notes: draft.notes,
            attachmentUrl: draft.attachment?.url ?? null,
            refacturable: draft.refacturable,
            refactureeViaFactureId: null,
            createdAt: now,
            updatedAt: now,
        }
        onChangeFactures([recomputeFacture(newFacture), ...factures])
        setAjoutOpen(false)
    }

    /* Actions */
    const handleRefacturerSelection = async () => {
        if (selectedIds.size === 0) {
            alert("Sélectionnez au moins une facture refacturable")
            return
        }
        const selected = factures.filter((f) => selectedIds.has(f.id))
        // Vérifier qu'elles partagent le même client (logique métier : refacturation à 1 client)
        const clientIds = new Set(
            selected
                .map((f) => f.dossierId)
                .filter((d): d is string => d !== null)
        )
        // Le batch refacture vers le 1er client trouvé via les dossiers
        const firstWithDossier = selected.find((f) => f.dossierId !== null)
        if (!firstWithDossier?.dossierId) {
            alert("Aucune facture sélectionnée n'est rattachée à un dossier — impossible de refacturer.")
            return
        }
        // On a besoin du clientId — fetchons le dossier
        try {
            const dosRes = await fetch(`/api/dossiers/${firstWithDossier.dossierId}`, { credentials: "include" })
            if (!dosRes.ok) throw new Error("Dossier introuvable")
            const dossier = await dosRes.json()
            if (!dossier.clientId) {
                alert("Le dossier lié n'a pas de client — refacturation impossible.")
                return
            }
            const result = await postEntity<{ id: string; numero: string }>(
                "/api/invoices/refacture-batch",
                {
                    factureIds: Array.from(selectedIds),
                    clientId: dossier.clientId,
                    dossierId: dossier.id,
                }
            )
            // Marquer localement
            onChangeFactures(
                factures.map((f) =>
                    selectedIds.has(f.id)
                        ? recomputeFacture({ ...f, refactureeViaFactureId: result.id })
                        : f
                )
            )
            setSelectedIds(new Set())
            alert(`✅ ${selectedIds.size} facture(s) refacturée(s) — facture émise ${result.numero} créée.`)
        } catch (e) {
            showApiError("Échec refacturation")(e)
        }
    }

    const handleEdit = (f: MockFacture) => {
        onSelect(f)
    }
    const handlePaiement = (f: MockFacture) => {
        alert(`Enregistrer paiement de ${f.numero} — basculer vers Tab Facturation pour gestion complète`)
    }
    const handleDuplicate = (f: MockFacture) => {
        const annee = new Date().getFullYear()
        const numCount = factures.filter((x) => x.numero.startsWith(`REC-${annee}`)).length + 1
        const numero = `REC-${annee}-${String(numCount).padStart(3, "0")}`
        const nowDate = new Date()
        const now = nowDate.toISOString()
        const copy: MockFacture = {
            ...f,
            id: `fac-local-${nowDate.getTime()}`,
            numero,
            type: f.type ?? "FRAIS",
            statut: "BROUILLON",
            montantPaye: 0,
            paiements: [],
            refactureeViaFactureId: null,
            createdAt: now,
            updatedAt: now,
        }
        onChangeFactures([copy, ...factures])
    }
    const handleCancel = (id: string) => {
        onChangeFactures(
            factures.map((f) => (f.id === id ? recomputeFacture({ ...f, statut: "ANNULEE" }) : f))
        )
    }
    const handleDelete = (id: string) => {
        onChangeFactures(factures.filter((f) => f.id !== id))
    }
    const handleToggleRefacturable = (f: MockFacture) => {
        onChangeFactures(
            factures.map((x) => (x.id === f.id ? { ...x, refacturable: !x.refacturable } : x))
        )
    }

    const enAttenteCount = recues.filter((f) => f.refacturable && !f.refactureeViaFactureId).length
    const refacturablesEnAttenteVisible = visible.filter(
        (f) => f.refacturable && !f.refactureeViaFactureId
    )

    return (
        <div className="flex flex-col gap-density-tight h-full">
            {/* Header compact : titre + chips stats inline + bouton */}
            <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">inbox</span>
                    Frais externes
                </h2>
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                    <InlineStat label="Refacturable" value={formatFCFA(totaux.total)} />
                    <InlineStat
                        label="En attente"
                        value={formatFCFA(totaux.enAttente)}
                        tone={totaux.enAttente > 0 ? "warning" : "neutral"}
                    />
                    <InlineStat
                        label="Refacturé"
                        value={formatFCFA(totaux.refacturees)}
                        tone="success"
                    />
                </div>
                <button
                    onClick={handleRefacturerSelection}
                    disabled={selectedIds.size === 0}
                    className={cn(
                        "px-3 py-1.5 rounded border font-body-sm text-body-sm font-medium flex items-center gap-1.5 transition-colors",
                        selectedIds.size === 0
                            ? "border-outline-variant bg-surface-container text-outline cursor-not-allowed"
                            : "border-accent/40 bg-accent/10 text-primary hover:bg-accent/15"
                    )}
                >
                    <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                    Refacturer{" "}
                    {selectedIds.size > 0
                        ? `(${selectedIds.size}) — ${formatFCFA(selectionTotal)}`
                        : ""}
                </button>
                <button
                    onClick={() => setAjoutOpen(true)}
                    className="px-3 py-1.5 rounded bg-accent text-white font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98]"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ajouter un frais
                </button>
            </header>

            {/* Toolbar simple : search + filtres rapides */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex items-center gap-2 p-density-tight flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                        search
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher (n°, fournisseur, dossier, libellé…)"
                        className="w-full pl-10 pr-3 py-2 bg-transparent border-0 font-body-sm text-body-sm focus:outline-none placeholder:text-outline"
                    />
                </div>
                <div className="h-6 w-px bg-outline-variant" />
                <div className="flex bg-surface-container-low border border-outline-variant rounded p-0.5">
                    {(
                        [
                            { v: "EN_ATTENTE" as RefacFilter, label: "En attente", count: recues.filter((f) => f.refacturable && !f.refactureeViaFactureId).length },
                            { v: "REFACTUREES" as RefacFilter, label: "Refacturées", count: recues.filter((f) => f.refacturable && f.refactureeViaFactureId).length },
                            { v: "ALL" as RefacFilter, label: "Toutes", count: recues.length },
                        ]
                    ).map((opt) => {
                        const isActive = filter === opt.v
                        return (
                            <button
                                key={opt.v}
                                onClick={() => setFilter(opt.v)}
                                className={cn(
                                    "px-3 py-1.5 rounded font-body-sm text-body-sm transition-all flex items-center gap-1.5",
                                    isActive
                                        ? "bg-white shadow-sm text-primary-container font-medium"
                                        : "text-on-surface-variant hover:text-primary-container hover:bg-white/50"
                                )}
                            >
                                {opt.label}
                                <span className="font-mono-num text-[10px] opacity-70">({opt.count})</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                {visible.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">inbox</span>
                        <p className="font-body-md text-body-md text-on-surface font-medium">
                            {filter === "EN_ATTENTE" ? "Tout est refacturé" : "Aucun frais externe"}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto scrollbar-thin">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                            <thead className="sticky top-0 z-10 bg-surface-container">
                                <tr className="border-b border-outline-variant">
                                    {filter === "EN_ATTENTE" && (
                                        <th className="py-2 px-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    refacturablesEnAttenteVisible.length > 0 &&
                                                    selectedIds.size === refacturablesEnAttenteVisible.length
                                                }
                                                onChange={toggleSelectAll}
                                                className="accent-accent cursor-pointer"
                                                aria-label="Tout sélectionner"
                                            />
                                        </th>
                                    )}
                                    <Th>N°</Th>
                                    <Th width="100px">Date</Th>
                                    <Th>Fournisseur</Th>
                                    <Th>Dossier</Th>
                                    <Th width="140px" align="right">Montant TTC</Th>
                                    <Th width="120px" align="center">Statut</Th>
                                    <Th width="160px" align="center">Refacturation</Th>
                                    <Th width="40px" align="center">⋮</Th>
                                </tr>
                            </thead>
                            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                                {visible.map((f) => {
                                    const stat = STATUTS_FACTURE[f.statut]
                                    const dossier = f.dossier ?? (f.dossierId ? dossiers.find((d) => d.id === f.dossierId) ?? mockDossiers.find((d) => d.id === f.dossierId) : null)
                                    const fournisseur = f.fournisseur ?? (f.fournisseurId
                                        ? mockFournisseurs.find((x) => x.id === f.fournisseurId)
                                        : null)
                                    const isRefacturee = f.refacturable && f.refactureeViaFactureId
                                    const isSelectable = f.refacturable && !f.refactureeViaFactureId
                                    return (
                                        <tr
                                            key={f.id}
                                            onClick={() => onSelect(f)}
                                            className="hover:bg-surface-container-low/40 transition-colors cursor-pointer h-12"
                                        >
                                            {filter === "EN_ATTENTE" && (
                                                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                                    {isSelectable && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(f.id)}
                                                            onChange={() => toggleSelect(f.id)}
                                                            className="accent-accent cursor-pointer"
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-on-surface">{f.numero}</td>
                                            <td className="py-2 px-3 font-mono-num text-[12px] text-on-surface-variant">
                                                {formatDateCourte(f.date)}
                                            </td>
                                            <td className="py-2 px-3 text-on-surface truncate">
                                                {fournisseur?.nom ?? f.fournisseurNomLibre ?? "—"}
                                            </td>
                                            <td className="py-2 px-3">
                                                {dossier ? (
                                                    <Link
                                                        href={`/dossiers/${dossier.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="hover:text-primary-container transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px] text-outline">folder</span>
                                                        <span className="font-mono-num text-[11px]">{dossier.numero}</span>
                                                    </Link>
                                                ) : (
                                                    <span className="text-outline-variant">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums">
                                                {formatFCFA(f.montantTTC)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded font-label-caps text-[10px] uppercase", stat.chip)}>
                                                    {stat.label}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                {isRefacturee ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-body-sm text-[11px] bg-[#e8f5e9] text-[#166534]">
                                                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                                        Refacturée
                                                    </span>
                                                ) : f.refacturable ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-body-sm text-[11px] bg-tertiary-fixed-dim/60 text-on-tertiary-fixed-variant">
                                                        <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                                                        À refacturer
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-body-sm text-[11px] bg-surface-container text-outline">
                                                        Non refacturable
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <FactureActionsMenu
                                                    onView={() => onSelect(f)}
                                                    onEdit={() => handleEdit(f)}
                                                    onPaiement={() => handlePaiement(f)}
                                                    onDuplicate={() => handleDuplicate(f)}
                                                    onCancel={() => handleCancel(f.id)}
                                                    onDelete={() => handleDelete(f.id)}
                                                    canEdit={f.statut === "BROUILLON" || f.statut === "EMISE"}
                                                    canPaiement={false}
                                                    canCancel={f.statut !== "ANNULEE" && f.statut !== "PAYEE"}
                                                    canDelete={true}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {ajoutOpen && (
                <AjouterFraisExterneDialog
                    fournisseurs={mockFournisseurs}
                    dossiers={dossiers}
                    clients={clients}
                    onSave={handleAjouterFrais}
                    onClose={() => setAjoutOpen(false)}
                />
            )}
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
    tone?: "neutral" | "warning" | "success"
}) {
    const valueClass =
        tone === "warning" ? "text-secondary" : tone === "success" ? "text-[#166534]" : "text-on-surface"
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {label}
            </span>
            <span className={cn("font-mono-num text-mono-num text-body-sm font-semibold tabular-nums", valueClass)}>
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
    children: React.ReactNode
    width?: string
    align?: "left" | "center" | "right"
}) {
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
