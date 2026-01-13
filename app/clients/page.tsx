"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClientFilters } from "@/components/clients/client-filters"
import { ClientTable } from "@/components/clients/client-table"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Building2, User } from "lucide-react"

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"list" | "gallery">("list")
    const [typeFilter, setTypeFilter] = useState<"ALL" | "PERSONNE_MORALE" | "PERSONNE_PHYSIQUE">("ALL")
    const [dialogOpen, setDialogOpen] = useState(false)

    // Fetch clients from API
    const fetchClients = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/clients')
            if (!response.ok) throw new Error('Failed to fetch clients')
            const data = await response.json()
            setClients(data)
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchClients()
    }, [])

    // Filter logic
    const filteredClients = clients.filter(client => {
        // Type filter
        if (typeFilter !== "ALL" && client.type !== typeFilter) return false

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const searchFields = [
                client.email || '',
                client.telephone || '',
                client.type === "PERSONNE_PHYSIQUE"
                    ? `${client.nom} ${client.prenom}`
                    : client.raisonSociale || '',
            ]
            return searchFields.some(field => field.toLowerCase().includes(query))
        }

        return true
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-200 border-t-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] gap-4 pb-4">
            {/* Header */}
            <div className="flex-none flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Portefeuille Clients
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            {filteredClients.length} clients actifs
                        </p>
                    </div>
                    <Button
                        size="default"
                        className="shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        onClick={() => setDialogOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau Client
                    </Button>
                </div>

                {/* Filters Component */}
                <ClientFilters
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            </div>

            {/* Content Area - Main Scrollable Container */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm relative flex flex-col">
                {filteredClients.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                            <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Aucun client trouvé</h3>
                        <p className="text-slate-500 mt-1">Essayez de modifier vos filtres</p>
                        <Button
                            variant="link"
                            onClick={() => { setSearchQuery(""); setTypeFilter("ALL"); }}
                            className="mt-2 text-blue-600 font-medium"
                        >
                            Réinitialiser les filtres
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* LIST VIEW (TABLE) */}
                        {viewMode === "list" && (
                            <ClientTable
                                clients={filteredClients}
                                getDossiersCount={(id) => {
                                    const client = clients.find(c => c.id === id)
                                    return client?._count?.dossiers || 0
                                }}
                            />
                        )}

                        {/* GALLERY VIEW (CARDS) */}
                        {viewMode === "gallery" && (
                            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredClients.map((client) => (
                                        <Card key={client.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:border-blue-800/30">
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${client.type === 'PERSONNE_MORALE' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {client.type === 'PERSONNE_MORALE' ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                                    </div>
                                                    <Badge variant="outline" className="bg-slate-50">{client.type === 'PERSONNE_MORALE' ? 'Société' : 'Particulier'}</Badge>
                                                </div>

                                                <h3 className="font-bold text-lg text-slate-900 mb-1 truncate" title={client.type === "PERSONNE_PHYSIQUE" ? `${client.nom} ${client.prenom}` : client.raisonSociale}>
                                                    {client.type === "PERSONNE_PHYSIQUE" ? `${client.nom} ${client.prenom}` : client.raisonSociale}
                                                </h3>
                                                <p className="text-sm text-slate-500 mb-6 truncate">{client.email}</p>

                                                <Link href={`/clients/${client.id}`} className="block w-full">
                                                    <Button className="w-full bg-slate-900 hover:bg-blue-600 text-white transition-colors font-medium">
                                                        Voir le dossier
                                                    </Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Client Form Dialog */}
            <ClientFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchClients}
            />
        </div>
    )
}
