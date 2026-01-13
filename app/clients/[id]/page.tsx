"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { ContactFormDialog } from "@/components/clients/contact-form-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Pencil,
    Trash2,
    Briefcase,
    TrendingUp,
    Plus,
    CheckCircle2,
    User
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const [client, setClient] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [contactDialogOpen, setContactDialogOpen] = useState(false)
    const [selectedContact, setSelectedContact] = useState<any>(null)

    const fetchClient = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/clients/${resolvedParams.id}`)
            if (!response.ok) {
                if (response.status === 404) return notFound()
                throw new Error('Failed to fetch client')
            }
            const data = await response.json()
            setClient(data)
        } catch (error) {
            console.error('Error fetching client:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return
        try {
            const response = await fetch(`/api/clients/${resolvedParams.id}`, {
                method: 'DELETE',
            })
            if (!response.ok) throw new Error('Failed to delete client')
            window.location.href = '/clients'
        } catch (error) {
            console.error('Error deleting client:', error)
            alert('Erreur lors de la suppression')
        }
    }

    useEffect(() => {
        fetchClient()
    }, [resolvedParams.id])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-200 border-t-blue-600"></div>
            </div>
        )
    }

    if (!client) return notFound()

    const activeDossiers = client._count?.dossiers || 0
    const totalBilled = client.invoices?.reduce((sum: number, inv: any) => sum + (inv.montantTTC || 0), 0) || 0
    const unpaidAmount = client.invoices?.reduce((sum: number, inv: any) => sum + (inv.montantTTC - inv.montantPaye || 0), 0) || 0

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col overflow-hidden">
            {/* 1. Header Sticky - Clean & Actionable */}
            <div className="flex-none bg-white border-b border-slate-200 px-8 py-6 flex items-start justify-between z-10">
                <div className="flex items-center gap-6">
                    <Link href="/clients">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>

                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Badge variant={client.type === "PERSONNE_MORALE" ? "default" : "secondary"} className="rounded-md px-2 py-0.5">
                                {client.type === "PERSONNE_MORALE" ? "Entreprise" : "Particulier"}
                            </Badge>
                            <span className="text-slate-400 text-sm">ID: {client.id.slice(0, 8)}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {client.type === "PERSONNE_PHYSIQUE" ? `${client.nom} ${client.prenom}` : client.raisonSociale}
                        </h1>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={handleDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                        onClick={() => setEditDialogOpen(true)}
                    >
                        <Pencil className="h-4 w-4 mr-2" /> Modifier
                    </Button>
                </div>
            </div>

            {/* 2. Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                <div className="max-w-7xl mx-auto space-y-8 pb-20">

                    {/* SECTION 1: OVERVIEW (Stats Cards) */}
                    <section>
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" /> Vue d'ensemble
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-slate-200 shadow-sm">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Facturé</p>
                                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalBilled)}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-red-100 bg-red-50/30 shadow-sm">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Reste à payer</p>
                                    <div className="text-2xl font-bold text-red-600">{formatCurrency(unpaidAmount)}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 shadow-sm">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dossiers</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-slate-900">{activeDossiers}</span>
                                        <span className="text-sm text-slate-500">actifs</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-emerald-100 bg-emerald-50/30 shadow-sm">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Performance</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-emerald-700">100%</span>
                                        <span className="text-sm text-emerald-600">gagnés</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN (2/3) */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* SECTION 2: INFORMATIONS (Clean Grid) */}
                            <section>
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="border-b border-slate-100 bg-white">
                                        <CardTitle className="text-base font-semibold text-slate-900">Information du Client</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                            {/* Col 1 */}
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Nom Légal / Raison Sociale</label>
                                                    <p className="text-base font-medium text-slate-900">
                                                        {client.type === "PERSONNE_PHYSIQUE" ? `${client.nom} ${client.prenom}` : client.raisonSociale}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Adresse Complète</label>
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                                                        <p className="text-base text-slate-700">{client.adresse || "Non renseignée"}<br />{client.ville}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Col 2 */}
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Coordonnées Principales</label>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-slate-700">
                                                            <Mail className="h-4 w-4 text-slate-400" />
                                                            {client.email}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-700">
                                                            <Phone className="h-4 w-4 text-slate-400" />
                                                            {client.telephone}
                                                        </div>
                                                    </div>
                                                </div>
                                                {client.type === "PERSONNE_MORALE" && (
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Juridique</label>
                                                        <p className="text-sm text-slate-700">Forme: {client.formeJuridique}</p>
                                                        <p className="text-sm text-slate-700">RCCM: {client.numeroRCCM}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>

                            {/* SECTION 4: DOSSIERS (Simple Actionable List) */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-blue-600" /> Dossiers ({activeDossiers})
                                    </h2>
                                    <Link href={`/dossiers?clientId=${client.id}`}>
                                        <Button size="sm" variant="outline" className="border-dashed border-slate-300 text-slate-600">
                                            <Plus className="h-4 w-4 mr-2" /> Nouveau Dossier
                                        </Button>
                                    </Link>
                                </div>
                                <Card className="border-slate-200 shadow-sm overflow-hidden">
                                    {client.dossiers && client.dossiers.length > 0 ? (
                                        <div className="divide-y divide-slate-100">
                                            {client.dossiers.map((dossier: any) => (
                                                <div key={dossier.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                            <Briefcase className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900">{dossier.numero}</h4>
                                                            <p className="text-xs text-slate-500">{dossier.type} • {dossier.juridiction}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100">
                                                            {dossier.statut}
                                                        </Badge>
                                                        <Link href={`/dossiers/${dossier.id}`}>
                                                            <Button size="sm" className="bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-transparent transition-all shadow-sm">
                                                                Ouvrir
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50/50">
                                            <p className="text-slate-500">Aucun dossier pour le moment.</p>
                                        </div>
                                    )}
                                </Card>
                            </section>
                        </div>

                        {/* RIGHT COLUMN (1/3) */}
                        <div className="space-y-8">
                            {/* SECTION 3: CONTACTS */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <User className="h-5 w-5 text-blue-600" /> Contacts
                                    </h2>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600"
                                        onClick={() => {
                                            setSelectedContact(null)
                                            setContactDialogOpen(true)
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Card className="border-slate-200 shadow-sm">
                                    <div className="divide-y divide-slate-100">
                                        {client.contacts && client.contacts.length > 0 ? (
                                            client.contacts.map((contact: any) => (
                                                <div
                                                    key={contact.id}
                                                    className="p-4 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedContact(contact)
                                                        setContactDialogOpen(true)
                                                    }}
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {contact.prenom?.[0]}{contact.nom?.[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-sm font-medium text-slate-900 truncate">{contact.prenom} {contact.nom}</p>
                                                            {contact.estPrincipal && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-1">{contact.fonction}</p>
                                                        <div className="flex flex-col gap-0.5 mt-2">
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <Mail className="h-3 w-3" /> {contact.email}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <Phone className="h-3 w-3" /> {contact.telephone}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center">
                                                <p className="text-sm text-slate-500">Aucun contact additionnel.</p>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="text-blue-600 mt-1"
                                                    onClick={() => setContactDialogOpen(true)}
                                                >
                                                    Ajouter un contact
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </section>

                            <Card className="bg-slate-900 text-white border-none shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase tracking-wider text-slate-400">Notes Internes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                        "{client.notes || "Aucune note particulière pour ce client."}"
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <ClientFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                client={client}
                onSuccess={fetchClient}
            />
            <ContactFormDialog
                open={contactDialogOpen}
                onOpenChange={setContactDialogOpen}
                clientId={client.id}
                contact={selectedContact}
                onSuccess={fetchClient}
            />
        </div>
    )
}
