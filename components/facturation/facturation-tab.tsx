"use client"

import { useEffect, useMemo, useState } from "react"
import { postEntity, showApiError } from "@/lib/api/patch"
import { recomputeFacture, type MockFacture, type MockPaiement } from "@/lib/mock/invoices"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"
import { mockDossiers } from "@/lib/mock/dossiers"
import { TVA_NIGER, calcTTC, calcTVA, type StatutFactureKey } from "@/lib/constants/finance"
import { FacturationToolbar } from "./facturation-toolbar"
import { FacturationFilterDrawer } from "./facturation-filter-drawer"
import { FactureTableView } from "./facture-table-view"
import { FactureGroupedView } from "./facture-grouped-view"
import { FactureDetailPanel } from "./facture-detail-panel"
import { FactureFormDialog, type FactureFormDraft } from "./facture-form-dialog"
import { PaiementDialog, type PaiementDraft } from "./paiement-dialog"
import {
    INITIAL_FACTURE_FILTERS,
    applyFactureFilters,
    type FactureFiltersState,
} from "./filters-state"

interface FacturationTabProps {
    factures: MockFacture[]
    onChangeFactures: (next: MockFacture[]) => void
    /** Pré-filtres depuis URL */
    presetClientId: string | null
    presetDossierId: string | null
    clients?: any[]
    dossiers?: any[]
}

export function FacturationTab({
    factures,
    onChangeFactures,
    presetClientId,
    presetDossierId,
    clients,
    dossiers,
}: FacturationTabProps) {
    const [filters, setFilters] = useState<FactureFiltersState>(() => {
        const init = { ...INITIAL_FACTURE_FILTERS }
        if (presetClientId) init.clientIds = [presetClientId]
        if (presetDossierId) init.dossierIds = [presetDossierId]
        return init
    })
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    /* Form + paiement dialogs */
    const [formOpen, setFormOpen] = useState(false)
    const [editingFacture, setEditingFacture] = useState<MockFacture | null>(null)
    const [paiementFacture, setPaiementFacture] = useState<MockFacture | null>(null)

    const filtered = useMemo(() => applyFactureFilters(factures, filters, true), [factures, filters])

    /* Listes pour drawer */
    const availableClients = useMemo(() => {
        const ids = new Set<string>()
        for (const f of factures) if (f.clientId) ids.add(f.clientId)
        const source = clients ?? mockClients
        return Array.from(ids)
            .map((id) => {
                const c = source.find((x: any) => x.id === id)
                return c ? { id: c.id, name: clientDisplayName(c) } : null
            })
            .filter(Boolean) as { id: string; name: string }[]
    }, [factures, clients])

    const availableDossiers = useMemo(() => {
        const ids = new Set<string>()
        for (const f of factures) if (f.dossierId) ids.add(f.dossierId)
        const source = dossiers ?? mockDossiers
        return Array.from(ids)
            .map((id) => {
                const d = source.find((x: any) => x.id === id)
                return d ? { id: d.id, numero: d.numero } : null
            })
            .filter(Boolean) as { id: string; numero: string }[]
    }, [factures, dossiers])

    // Fournisseur est toujours saisi en texte libre (fournisseurNomLibre) — pas d'entités
    // Fournisseur en base à ce jour, donc pas de facette de filtre par fournisseur pour l'instant.
    const availableFournisseurs = useMemo(() => [] as { id: string; nom: string }[], [])

    const selectedFacture = useMemo(
        () => (selectedId ? factures.find((f) => f.id === selectedId) ?? null : null),
        [factures, selectedId]
    )

    /* ============================================================
       Mutations locales
       ============================================================ */

    const openCreate = () => {
        setEditingFacture(null)
        setFormOpen(true)
    }

    const handleEdit = (f: MockFacture) => {
        setEditingFacture(f)
        setFormOpen(true)
    }

    const handleSaveFacture = (draft: FactureFormDraft) => {
        const totalHT = draft.lignes.reduce((s, l) => s + l.total, 0)
        const totalTVA = calcTVA(totalHT, draft.tvaRate)
        const totalTTC = calcTTC(totalHT, draft.tvaRate)
        if (editingFacture) {
            // Édition : on patch la facture existante
            const updated: MockFacture = {
                ...editingFacture,
                direction: draft.direction,
                type: draft.type,
                date: draft.date,
                dateEcheance: draft.dateEcheance,
                clientId: draft.clientId,
                dossierId: draft.dossierId,
                audienceId: draft.audienceId,
                fournisseurId: draft.fournisseurId,
                fournisseurNomLibre: draft.fournisseurNomLibre,
                montantHT: totalHT,
                tvaRate: draft.tvaRate,
                montantTVA: totalTVA,
                montantTTC: totalTTC,
                lignes: draft.lignes,
                description: draft.description,
                notes: draft.notes,
                refacturable: draft.refacturable,
                statut: draft.saveAs,
                updatedAt: new Date().toISOString(),
            }
            onChangeFactures(
                factures.map((f) => (f.id === editingFacture.id ? recomputeFacture(updated) : f))
            )
        } else {
            // Création : on génère un nouvel id + numéro
            const annee = new Date().getFullYear()
            const prefix = draft.direction === "EMISE" ? "FAC" : "REC"
            const numCount =
                factures.filter((f) => f.numero.startsWith(`${prefix}-${annee}`)).length + 1
            const numero = `${prefix}-${annee}-${String(numCount).padStart(3, "0")}`
            const now = new Date().toISOString()
            const newFacture: MockFacture = {
                id: `fac-local-${Date.now()}`,
                numero,
                direction: draft.direction,
                type: draft.type,
                date: draft.date,
                dateEcheance: draft.dateEcheance,
                clientId: draft.clientId,
                dossierId: draft.dossierId,
                audienceId: draft.audienceId,
                fournisseurId: draft.fournisseurId,
                fournisseurNomLibre: draft.fournisseurNomLibre,
                montantHT: totalHT,
                tvaRate: draft.tvaRate,
                montantTVA: totalTVA,
                montantTTC: totalTTC,
                montantPaye: 0,
                statut: draft.saveAs,
                lignes: draft.lignes,
                paiements: [],
                description: draft.description,
                notes: draft.notes,
                attachmentUrl: draft.attachment?.url ?? null,
                refacturable: draft.refacturable,
                refactureeViaFactureId: null,
                createdAt: now,
                updatedAt: now,
            }
            onChangeFactures([recomputeFacture(newFacture), ...factures])
            setSelectedId(newFacture.id)
        }
        setFormOpen(false)
        setEditingFacture(null)
    }

    const handleDuplicate = (f: MockFacture) => {
        const annee = new Date().getFullYear()
        const prefix = f.direction === "EMISE" ? "FAC" : "REC"
        const numCount = factures.filter((x) => x.numero.startsWith(`${prefix}-${annee}`)).length + 1
        const numero = `${prefix}-${annee}-${String(numCount).padStart(3, "0")}`
        const now = new Date().toISOString()
        const copy: MockFacture = {
            ...f,
            id: `fac-local-${Date.now()}`,
            numero,
            statut: "BROUILLON",
            montantPaye: 0,
            paiements: [],
            createdAt: now,
            updatedAt: now,
        }
        onChangeFactures([copy, ...factures])
    }

    const handleCancel = (id: string) => {
        onChangeFactures(
            factures.map((f) => (f.id === id ? recomputeFacture({ ...f, statut: "ANNULEE" }) : f))
        )
        if (selectedId === id) setSelectedId(null)
    }

    /**
     * Suppression DÉFINITIVE (hard delete DB).
     * Différent de handleCancel (soft delete via statut=ANNULEE).
     * Le backend refuse si statut=PAYEE ou paiements présents → toast d'erreur.
     *
     * Le sync API est déclenché automatiquement par syncCollection dans le parent :
     * il détecte qu'une facture présente dans prev a disparu de next → DELETE.
     */
    const handleDelete = (id: string) => {
        onChangeFactures(factures.filter((f) => f.id !== id))
        if (selectedId === id) setSelectedId(null)
    }

    /**
     * Supprime un paiement individuel via DELETE /api/invoices/[id]/payments/[paymentId].
     * Le backend recompute montantPaye + statut de la facture et retourne la version à jour.
     */
    const handleDeletePaiement = async (factureId: string, paiementId: string) => {
        const target = factures.find((f) => f.id === factureId)
        if (!target) return
        // Optimistic UI : retire le paiement localement
        const optimisticPaiements = target.paiements.filter((p) => p.id !== paiementId)
        const newMontantPaye = optimisticPaiements.reduce((s, p) => s + p.montant, 0)
        const optimistic = recomputeFacture({
            ...target,
            paiements: optimisticPaiements,
            montantPaye: newMontantPaye,
        })
        onChangeFactures(factures.map((f) => (f.id === factureId ? optimistic : f)))

        try {
            const r = await fetch(`/api/invoices/${factureId}/payments/${paiementId}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!r.ok) {
                const err = await r.json().catch(() => ({}))
                throw new Error(err.error ?? `HTTP ${r.status}`)
            }
            const { facture: updated } = (await r.json()) as { facture: MockFacture }
            // Remplace par la version DB (montants/statut serveur-side font foi)
            onChangeFactures(factures.map((f) => (f.id === factureId ? { ...optimistic, ...updated } : f)))
            const { toast } = await import("@/components/ui/toaster")
            toast.success("Paiement supprimé")
        } catch (e) {
            // Rollback : on remet le paiement
            onChangeFactures(factures.map((f) => (f.id === factureId ? target : f)))
            showApiError("Suppression paiement")(e)
        }
    }

    /* Inline edits rapides */
    const handleChangeDate = (id: string, iso: string) => {
        onChangeFactures(
            factures.map((f) =>
                f.id === id ? recomputeFacture({ ...f, date: iso, updatedAt: new Date().toISOString() }) : f
            )
        )
    }
    const handleChangeEcheance = (id: string, iso: string | null) => {
        onChangeFactures(
            factures.map((f) =>
                f.id === id ? recomputeFacture({ ...f, dateEcheance: iso, updatedAt: new Date().toISOString() }) : f
            )
        )
    }
    const handleChangeStatut = async (id: string, statut: StatutFactureKey) => {
        const target = factures.find((f) => f.id === id)
        if (!target) return

        // Cas spécial : passer à PAYEE alors qu'il reste un solde dû
        // → on crée automatiquement un paiement de solde (mode AUTRE / manuel)
        const restant = target.montantTTC - target.montantPaye
        if (statut === "PAYEE" && restant > 0 && target.direction === "EMISE") {
            try {
                const result = await postEntity<{ paiement: MockPaiement; facture: MockFacture }>(
                    `/api/invoices/${id}/payments`,
                    {
                        date: new Date().toISOString(),
                        montant: restant,
                        mode: "AUTRE",
                        reference: null,
                        notes: "Solde manuel via changement de statut",
                        preuveUrl: null,
                    }
                )
                // Remplace la facture par la version API (montantPaye + statut PAYEE recomputés)
                onChangeFactures(
                    factures.map((f) =>
                        f.id === id
                            ? { ...target, ...result.facture, paiements: [...target.paiements, result.paiement] }
                            : f
                    )
                )
                return
            } catch (e) {
                showApiError("Marquage payée")(e)
                return
            }
        }

        // Autres changements de statut : sync classique
        onChangeFactures(
            factures.map((f) =>
                f.id === id ? recomputeFacture({ ...f, statut, updatedAt: new Date().toISOString() }) : f
            )
        )
    }

    const handleSavePaiement = async (draft: PaiementDraft) => {
        const target = factures.find((f) => f.id === draft.factureId)
        if (!target) return
        // Optimistic UI : on ajoute immédiatement, on rollback en cas d'erreur
        const tempId = `pai-local-${Date.now()}`
        const tempPaiement: MockPaiement = {
            id: tempId,
            factureId: draft.factureId,
            date: draft.date,
            montant: draft.montant,
            mode: draft.mode,
            reference: draft.reference,
            notes: draft.notes,
            preuveUrl: draft.preuveUrl ?? null,
        }
        const optimistic = recomputeFacture({
            ...target,
            paiements: [...target.paiements, tempPaiement],
        })
        onChangeFactures(factures.map((f) => (f.id === target.id ? optimistic : f)))
        setPaiementFacture(null)

        // Persistance API
        try {
            const result = await postEntity<{
                paiement: MockPaiement
                facture: MockFacture
            }>(`/api/invoices/${draft.factureId}/payments`, {
                date: draft.date,
                montant: draft.montant,
                mode: draft.mode,
                reference: draft.reference ?? null,
                notes: draft.notes ?? null,
                preuveUrl: draft.preuveUrl ?? null,
            })
            // Remplace le paiement temp + facture par les vraies versions DB
            onChangeFactures(
                factures.map((f) =>
                    f.id === draft.factureId
                        ? {
                              ...optimistic,
                              ...result.facture,
                              paiements: [
                                  ...optimistic.paiements.filter((p) => p.id !== tempId),
                                  result.paiement,
                              ],
                          }
                        : f
                )
            )
        } catch (e) {
            // Rollback : on retire le paiement optimistic
            onChangeFactures(factures.map((f) => (f.id === target.id ? target : f)))
            showApiError("Enregistrement paiement")(e)
        }
    }

    return (
        <>
            <div className="flex flex-col gap-density-medium h-full">
                {/* Toolbar + bouton ajout */}
                <div className="flex items-center gap-density-medium">
                    <div className="flex-1 min-w-0">
                        <FacturationToolbar
                            filters={filters}
                            onSearchChange={(q) => setFilters((f) => ({ ...f, search: q }))}
                            onClearSearch={() => setFilters((f) => ({ ...f, search: "" }))}
                            onOpenFilters={() => setDrawerOpen(true)}
                            onViewModeChange={(m) => setFilters((f) => ({ ...f, viewMode: m }))}
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex-shrink-0 bg-accent text-white px-4 py-2 rounded font-body-sm text-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Saisir une facture
                    </button>
                </div>

                {/* Layout 3-col split : table + detail panel */}
                <div className="flex-1 min-h-0 overflow-hidden flex gap-density-medium">
                    <div className="flex-[2] min-h-0 min-w-0">
                        {filters.viewMode === "grouped" ? (
                            <FactureGroupedView
                                factures={filtered}
                                selectedId={selectedId}
                                onSelect={(f) =>
                                    setSelectedId((cur) => (cur === f.id ? null : f.id))
                                }
                                onEdit={handleEdit}
                                onPaiement={(f) => setPaiementFacture(f)}
                                onDuplicate={handleDuplicate}
                                onCancel={handleCancel}
                                onDelete={handleDelete}
                                onChangeDate={handleChangeDate}
                                onChangeEcheance={handleChangeEcheance}
                                onChangeStatut={handleChangeStatut}
                            />
                        ) : (
                            <FactureTableView
                                factures={filtered}
                                selectedId={selectedId}
                                onSelect={(f) =>
                                    setSelectedId((cur) => (cur === f.id ? null : f.id))
                                }
                                onEdit={handleEdit}
                                onPaiement={(f) => setPaiementFacture(f)}
                                onDuplicate={handleDuplicate}
                                onCancel={handleCancel}
                                onDelete={handleDelete}
                                onChangeDate={handleChangeDate}
                                onChangeEcheance={handleChangeEcheance}
                                onChangeStatut={handleChangeStatut}
                            />
                        )}
                    </div>
                    {selectedFacture && (
                        <FactureDetailPanel
                            facture={selectedFacture}
                            onClose={() => setSelectedId(null)}
                            onEdit={handleEdit}
                            onPaiement={(f) => setPaiementFacture(f)}
                            onCancel={handleCancel}
                            onDeletePaiement={handleDeletePaiement}
                            onGenerated={(factureId, data) => {
                                // Mise à jour locale du state sans déclencher de PATCH inutile
                                // (toPatchBody n'inclut pas generatedPdfUrl/At)
                                onChangeFactures(
                                    factures.map((f) =>
                                        f.id === factureId
                                            ? {
                                                  ...f,
                                                  generatedPdfUrl: data.generatedPdfUrl,
                                                  generatedPdfAt: data.generatedPdfAt,
                                              }
                                            : f
                                    )
                                )
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Drawer filtres */}
            <FacturationFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                availableClients={availableClients}
                availableDossiers={availableDossiers}
                availableFournisseurs={availableFournisseurs}
            />

            {/* Form facture (création / édition) */}
            {formOpen && (
                <FactureFormDialog
                    initial={editingFacture}
                    presetClientId={presetClientId}
                    presetDossierId={presetDossierId}
                    clients={clients}
                    dossiers={dossiers}
                    onSave={handleSaveFacture}
                    onGenerated={(data) => {
                        // Met à jour la facture en cours d'édition + propage au parent
                        if (!editingFacture) return
                        const updated: MockFacture = {
                            ...editingFacture,
                            generatedPdfUrl: data.generatedPdfUrl,
                            generatedPdfAt: data.generatedPdfAt,
                        }
                        setEditingFacture(updated)
                        onChangeFactures(factures.map((f) => (f.id === updated.id ? updated : f)))
                    }}
                    onClose={() => {
                        setFormOpen(false)
                        setEditingFacture(null)
                    }}
                />
            )}

            {/* Paiement dialog */}
            {paiementFacture && (
                <PaiementDialog
                    facture={paiementFacture}
                    onSave={handleSavePaiement}
                    onClose={() => setPaiementFacture(null)}
                />
            )}
        </>
    )
}
