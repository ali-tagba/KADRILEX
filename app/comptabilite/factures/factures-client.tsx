"use client"
import { useMemo, useState } from "react"
import { FactureTableView } from "@/components/facturation/facture-table-view"
import { FactureDetailPanel } from "@/components/facturation/facture-detail-panel"
import { FactureFormDialog } from "@/components/facturation/facture-form-dialog"
import { PaiementDialog } from "@/components/facturation/paiement-dialog"
import { type MockFacture } from "@/lib/mock/invoices"
import type { MockClient } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toaster"
import { formatFCFA } from "@/lib/constants/finance"
import {
    FactureFilterDrawer,
    INITIAL_FACTURE_FILTERS,
    countActiveFactureFilters,
    type FactureFiltersState,
} from "@/components/facturation/facture-filter-drawer"

export function FacturesClient({
    initialFactures,
    initialClients,
    initialDossiers
}: {
    initialFactures: any[]
    initialClients?: any[]
    initialDossiers?: any[]
}) {
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
    const [filters, setFilters] = useState<FactureFiltersState>(INITIAL_FACTURE_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const router = useRouter()

    const selectedFacture = selectedId ? factures.find(f => f.id === selectedId) || null : null

    const filtered = useMemo(() => {
        const q = filters.search.trim().toLowerCase()
        const now = new Date()
        return factures.filter((f) => {
            if (filters.statuts.length > 0 && !filters.statuts.includes(f.statut)) return false
            if (filters.clientIds.length > 0 && (!f.clientId || !filters.clientIds.includes(f.clientId))) return false
            if (filters.dossierIds.length > 0 && (!f.dossierId || !filters.dossierIds.includes(f.dossierId))) return false
            if (filters.montantMin !== null && f.montantTTC < filters.montantMin) return false
            if (filters.montantMax !== null && f.montantTTC > filters.montantMax) return false
            if (filters.datePreset !== "ALL") {
                const date = new Date(f.date)
                if (filters.datePreset === "CURRENT_MONTH") {
                    if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false
                } else if (filters.datePreset === "CURRENT_QUARTER") {
                    const q1 = Math.floor(date.getMonth() / 3)
                    const q2 = Math.floor(now.getMonth() / 3)
                    if (q1 !== q2 || date.getFullYear() !== now.getFullYear()) return false
                } else if (filters.datePreset === "CURRENT_YEAR") {
                    if (date.getFullYear() !== now.getFullYear()) return false
                } else if (filters.datePreset === "CUSTOM") {
                    if (filters.dateStart && date < new Date(filters.dateStart)) return false
                    if (filters.dateEnd) {
                        const end = new Date(filters.dateEnd)
                        end.setDate(end.getDate() + 1)
                        if (date >= end) return false
                    }
                }
            }
            if (q) {
                const clientName = f.client
                    ? (f.client.raisonSociale ?? `${f.client.prenom ?? ""} ${f.client.nom ?? ""}`)
                    : ""
                const hay = [f.numero, clientName, f.dossier?.numero ?? "", f.dossier?.titre ?? "", f.description ?? ""]
                    .join(" ")
                    .toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [factures, filters])

    const totaux = useMemo(() => {
        const actives = filtered.filter((f) => f.statut !== "ANNULEE" && f.statut !== "BROUILLON")
        const total = actives.reduce((s, f) => s + f.montantTTC, 0)
        const encaisse = actives.reduce((s, f) => s + f.montantPaye, 0)
        return { total, encaisse, impaye: total - encaisse }
    }, [filtered])

    const activeCount = countActiveFactureFilters(filters)

    const handleSaveFacture = async (draft: any) => {
        try {
            const isEdit = !!editingFacture
            const payload = {
                ...draft,
                statut: draft.saveAs === "BROUILLON" ? "BROUILLON" : "EMISE",
            }
            const res = await fetch(isEdit ? `/api/invoices/${editingFacture.id}` : "/api/invoices", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || "Erreur lors de la sauvegarde")
            }
            setFormOpen(false)
            setEditingFacture(null)
            router.refresh()
            toast.success("Facture enregistrée.")
        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Erreur réseau")
        }
    }

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
        <div className="flex flex-col gap-density-tight h-full p-container-margin">
            {/* Header compact : titre + stats inline + bouton */}
            <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                    Factures Clients
                </h2>
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                    <InlineStat label="Total" value={formatFCFA(totaux.total)} />
                    <InlineStat label="Encaissé" value={formatFCFA(totaux.encaisse)} />
                    <InlineStat label="Impayé" value={formatFCFA(totaux.impaye)} />
                </div>
                <button
                    onClick={() => { setEditingFacture(null); setFormOpen(true) }}
                    className="bg-accent text-white px-3 py-1.5 rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-opacity shadow-sm active:scale-[0.98]"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Créer une facture
                </button>
            </header>

            {/* Toolbar (search + Filtres) */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex items-center gap-2 p-density-tight">
                <div className="relative flex-1 min-w-0">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                        search
                    </span>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        placeholder="Rechercher (n° facture, client, dossier…)"
                        className="w-full pl-10 pr-9 py-2 bg-transparent border-0 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                    />
                    {filters.search && (
                        <button
                            onClick={() => setFilters({ ...filters, search: "" })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    )}
                </div>
                <div className="h-6 w-px bg-outline-variant" />
                <button
                    onClick={() => setDrawerOpen(true)}
                    className={
                        activeCount > 0
                            ? "flex items-center gap-1.5 px-3 py-1.5 rounded font-body-sm text-body-sm font-medium transition-colors bg-accent/10 text-primary border border-accent/30 hover:bg-accent/15"
                            : "flex items-center gap-1.5 px-3 py-1.5 rounded font-body-sm text-body-sm font-medium transition-colors text-on-surface-variant hover:bg-surface-container-low border border-transparent"
                    }
                >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    Filtres
                    {activeCount > 0 && (
                        <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                            {activeCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Split View */}
            <div className="flex-1 min-h-0 overflow-hidden flex gap-density-medium border border-outline-variant rounded-lg bg-surface-container-lowest">
                <div className="flex-[2] min-h-0 min-w-0">
                    <FactureTableView
                        factures={filtered}
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

            <FactureFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                clients={(initialClients ?? []) as MockClient[]}
                dossiers={(initialDossiers ?? []) as MockDossier[]}
            />

            {/* Modals */}
            {formOpen && (
                <FactureFormDialog
                    initial={editingFacture}
                    presetClientId={null}
                    presetDossierId={null}
                    clients={initialClients}
                    dossiers={initialDossiers}
                    onSave={handleSaveFacture}
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

function InlineStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {label}
            </span>
            <span className="font-mono-num text-mono-num text-body-sm font-semibold text-on-surface tabular-nums">
                {value}
            </span>
        </div>
    )
}
