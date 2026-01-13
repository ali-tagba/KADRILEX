"use client"

import { useState, useEffect } from "react"
import { InvoiceFormDialog } from "@/components/facturation/invoice-form-dialog"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Plus, Download, MoreVertical, Search,
    Paperclip, ListFilter
} from "lucide-react"

export default function FacturationPage() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [dialogOpen, setDialogOpen] = useState(false)

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/invoices')
            if (!response.ok) throw new Error('Failed to fetch invoices')
            const data = await response.json()
            setInvoices(data)
        } catch (error) {
            console.error('Error fetching invoices:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    // Summary Metrics
    const totalTTC = invoices.reduce((acc, inv) => acc + (inv.montantTTC || 0), 0)
    const totalPaid = invoices.reduce((acc, inv) => acc + (inv.montantPaye || 0), 0)
    const totalPending = totalTTC - totalPaid

    const filteredInvoices = invoices.filter(inv => {
        const matchesStatus = statusFilter === "ALL" || inv.statut === statusFilter
        const matchesSearch =
            inv.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.client?.raisonSociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.client?.nom?.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesStatus && matchesSearch
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-200 border-t-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] gap-4 pb-0">
            {/* Header / Actions Bar */}
            <div className="flex-none bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher facture, client, dossier..."
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Filter Status */}
                    <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm font-medium text-slate-700 bg-transparent py-2 pl-3 pr-8 focus:outline-none cursor-pointer hover:bg-slate-50 border-r border-slate-200 last:border-0"
                        >
                            <option value="ALL">Tout statut</option>
                            <option value="PAYEE">Payées</option>
                            <option value="IMPAYEE">Impayées</option>
                            <option value="PARTIELLE">Partielles</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="hidden md:block text-right mr-4">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Reste à percevoir</p>
                        <p className="text-sm font-bold text-red-600">{formatCurrency(totalPending)}</p>
                    </div>
                    <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={() => setDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Saisir Facture
                    </Button>
                </div>
            </div>

            {/* ERP Table */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-32">N° Facture</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 min-w-[200px]">Client / Dossier / Aud.</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Montant HT</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Montant TTC</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Encaissé</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Reste</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Statut</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Pièce</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredInvoices.map((inv) => {
                                const remaining = inv.amountTTC - inv.amountPaid
                                const isLate = new Date(inv.dueDate) < new Date() && inv.status !== "PAID"

                                return (
                                    <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors group text-sm">
                                        <td className="px-4 py-3 font-medium text-slate-700 border-r border-transparent group-hover:border-slate-100 whitespace-nowrap">
                                            {inv.number}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 border-r border-transparent group-hover:border-slate-100 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span>{format(new Date(inv.date), "dd/MM/yyyy")}</span>
                                                {isLate && <span className="text-[10px] text-red-600 font-bold">Retard</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-transparent group-hover:border-slate-100">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-slate-800 truncate">{inv.clientId}</span>
                                                <div className="flex gap-2 text-xs text-slate-500">
                                                    {inv.dossierId && (
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                                            {inv.dossierId}
                                                        </span>
                                                    )}
                                                    {inv.audienceId && (
                                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                                            Audit. {inv.audienceId}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-500 border-r border-transparent group-hover:border-slate-100 whitespace-nowrap">
                                            {formatCurrency(inv.amountHT)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 border-r border-transparent group-hover:border-slate-100 whitespace-nowrap">
                                            {formatCurrency(inv.amountTTC)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-600 border-r border-transparent group-hover:border-slate-100 whitespace-nowrap">
                                            {formatCurrency(inv.amountPaid)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold border-r border-transparent group-hover:border-slate-100 whitespace-nowrap">
                                            <span className={remaining > 0 ? "text-red-600" : "text-slate-300"}>
                                                {formatCurrency(remaining)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center border-r border-transparent group-hover:border-slate-100">
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td className="px-4 py-3 text-center border-r border-transparent group-hover:border-slate-100">
                                            {inv.attachmentUrl ? (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                    <Paperclip className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-600">
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <ListFilter className="w-12 h-12 mb-3 opacity-20" />
                                            <p>Aucune facture ne correspond aux critères.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Form Dialog */}
            <InvoiceFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchInvoices}
            />
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PAYEE":
            return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Payée</span>
        case "IMPAYEE":
            return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10">Impayée</span>
        case "PARTIELLE":
            return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">Partielle</span>
        default:
            return null
    }
}
