"use client"
import { useState } from "react"
import { FactureTableView } from "@/components/facturation/facture-table-view"
import { FactureDetailPanel } from "@/components/facturation/facture-detail-panel"
import { FactureFormDialog } from "@/components/facturation/facture-form-dialog"
import { PaiementDialog } from "@/components/facturation/paiement-dialog"
import { type MockFacture } from "@/lib/mock/invoices"

export function FacturesClient({ initialFactures }: { initialFactures: any[] }) {
    // Transform Prisma Facture to MockFacture to satisfy components
    const formatFacture = (f: any): MockFacture => ({
        id: f.id,
        numero: f.numero,
        direction: f.direction,
        type: f.type,
        date: f.date.toISOString(),
        dateEcheance: f.dateEcheance ? f.dateEcheance.toISOString() : null,
        clientId: f.clientId,
        client: f.client,
        dossierId: f.dossierId,
        dossier: f.dossier,
        audienceId: f.audienceId,
        fournisseurId: f.fournisseurId,
        fournisseurNomLibre: f.fournisseurNomLibre,
        montantHT: f.montantHT,
        tvaRate: f.tvaRate,
        montantTVA: f.montantTVA,
        montantTTC: f.montantTTC,
        montantPaye: f.montantPaye,
        statut: f.statut,
        lignes: f.lignes || [],
        paiements: f.paiements || [],
        description: f.description,
        notes: f.notes,
        attachmentUrl: f.attachmentUrl,
        generatedPdfUrl: f.generatedPdfUrl,
        generatedPdfAt: f.generatedPdfAt ? f.generatedPdfAt.toISOString() : null,
        refacturable: f.refacturable,
        refactureeViaFactureId: f.refactureeViaFactureId,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
    })

    const [factures, setFactures] = useState<MockFacture[]>(
        initialFactures.map(formatFacture)
    )
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editingFacture, setEditingFacture] = useState<MockFacture | null>(null)
    const [paiementFacture, setPaiementFacture] = useState<MockFacture | null>(null)

    const selectedFacture = selectedId ? factures.find(f => f.id === selectedId) || null : null

    // Handlers (Simplified for accounting view)
    const handleSelect = (f: MockFacture) => {
        setSelectedId(prev => prev === f.id ? null : f.id)
    }

    const handleEdit = (f: MockFacture) => {
        setEditingFacture(f)
        setFormOpen(true)
    }

    const handleDuplicate = (f: MockFacture) => {
        // Not implemented in accounting simple view
    }

    const handleCancel = (id: string) => {
        // API call to cancel could go here
    }

    const handlePaiement = (f: MockFacture) => {
        setPaiementFacture(f)
    }

    return (
        <div className="flex flex-col gap-density-medium h-full p-container-margin">
            {/* Header / Actions */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="font-h2 text-h2 text-on-surface">Liste des Factures Clients</h2>
                <button
                    onClick={() => { setEditingFacture(null); setFormOpen(true) }}
                    className="bg-accent text-white px-4 py-2 rounded font-body-sm font-medium flex items-center gap-2 hover:bg-opacity-90 shadow-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Créer une facture
                </button>
            </div>

            {/* Split View */}
            <div className="flex-1 min-h-0 overflow-hidden flex gap-density-medium border border-outline-variant rounded-lg bg-surface-container-lowest">
                <div className="flex-[2] min-h-0 min-w-0">
                    <FactureTableView
                        factures={factures}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        onEdit={handleEdit}
                        onPaiement={handlePaiement}
                        onDuplicate={handleDuplicate}
                        onCancel={handleCancel}
                    />
                </div>
                {selectedFacture && (
                    <FactureDetailPanel
                        facture={selectedFacture}
                        onClose={() => setSelectedId(null)}
                        onEdit={handleEdit}
                        onPaiement={handlePaiement}
                        onCancel={handleCancel}
                        onDeletePaiement={async () => {}}
                        onGenerated={(id, data) => {
                            setFactures(factures.map(f => f.id === id ? { ...f, generatedPdfUrl: data.generatedPdfUrl, generatedPdfAt: data.generatedPdfAt } : f))
                        }}
                    />
                )}
            </div>

            {/* Modals */}
            {formOpen && (
                <FactureFormDialog
                    initial={editingFacture}
                    presetClientId={null}
                    presetDossierId={null}
                    onSave={() => { setFormOpen(false); window.location.reload() }}
                    onGenerated={() => {}}
                    onClose={() => { setFormOpen(false); setEditingFacture(null) }}
                />
            )}
            
            {paiementFacture && (
                <PaiementDialog
                    facture={paiementFacture}
                    onSave={async () => { setPaiementFacture(null); window.location.reload() }}
                    onClose={() => setPaiementFacture(null)}
                />
            )}
        </div>
    )
}
