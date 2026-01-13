"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DossierFormDialog } from "@/components/dossiers/dossier-form-dialog"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Search,
    Plus,
    FolderOpen,
    Calendar,
    Scale,
    LayoutGrid,
    Table as TableIcon,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react"

const statusConfig = {
    EN_COURS: { label: "En cours", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    EN_ATTENTE: { label: "En attente", color: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertCircle },
    CLOTURE: { label: "Clôturé", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
    TERMINE: { label: "Terminé", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
    ARCHIVE: { label: "Archivé", color: "bg-slate-50 text-slate-700 border-slate-200", icon: FolderOpen }
}

const typeConfig = {
    CIVIL: { label: "Civil", color: "bg-blue-100 text-blue-800" },
    PENAL: { label: "Pénal", color: "bg-red-100 text-red-800" },
    COMMERCIAL: { label: "Commercial", color: "bg-purple-100 text-purple-800" },
    ADMINISTRATIF: { label: "Administratif", color: "bg-yellow-100 text-yellow-800" },
    SOCIAL: { label: "Social", color: "bg-green-100 text-green-800" },
    AUTRE: { label: "Autre", color: "bg-slate-100 text-slate-800" }
}

export default function DossiersPage() {
    const [dossiers, setDossiers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [viewMode, setViewMode] = useState<"list" | "gallery">("list")
    const [dialogOpen, setDialogOpen] = useState(false)

    const fetchDossiers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/dossiers')
            if (!response.ok) throw new Error('Failed to fetch dossiers')
            const data = await response.json()
            setDossiers(data)
        } catch (error) {
            console.error('Error fetching dossiers:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDossiers()
    }, [])

    // Filter logic
    const filteredDossiers = dossiers.filter(dossier => {
        // Status filter
        if (statusFilter !== "ALL" && dossier.statut !== statusFilter) return false

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                dossier.numero?.toLowerCase().includes(query) ||
                dossier.juridiction?.toLowerCase().includes(query) ||
                dossier.description?.toLowerCase().includes(query)
            )
        }

        return true
    })

    // Calculate stats
    const stats = {
        total: dossiers.length,
        enCours: dossiers.filter(d => d.statut === "EN_COURS").length,
        enAttente: dossiers.filter(d => d.statut === "EN_ATTENTE").length,
        clotures: dossiers.filter(d => d.statut === "CLOTURE" || d.statut === "TERMINE").length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-200 border-t-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Gestion des Dossiers
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {filteredDossiers.length} dossier(s) trouvé(s)
                        </p>
                    </div>
                    <Button
                        size="lg"
                        className="shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-transform"
                        onClick={() => setDialogOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau Dossier
                    </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total", value: stats.total, color: "bg-slate-50 text-slate-700" },
                        { label: "En cours", value: stats.enCours, color: "bg-blue-50 text-blue-700" },
                        { label: "En attente", value: stats.enAttente, color: "bg-orange-50 text-orange-700" },
                        { label: "Clôturés", value: stats.clotures, color: "bg-green-50 text-green-700" }
                    ].map((stat, idx) => (
                        <Card key={idx} className={`p-4 ${stat.color} border-none`}>
                            <div className="text-sm font-medium opacity-80">{stat.label}</div>
                            <div className="text-2xl font-bold mt-1">{stat.value}</div>
                        </Card>
                    ))}
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher par intitulé, numéro, juridiction..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-white border-slate-200 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        {/* Status Filter */}
                        <div className="flex gap-2 overflow-x-auto">
                            {(["ALL", "EN_COURS", "EN_ATTENTE", "CLOTURE"] as const).map((status) => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setStatusFilter(status)}
                                    className="whitespace-nowrap"
                                >
                                    {status === "ALL" ? "Tous" : statusConfig[status as DossierStatus].label}
                                </Button>
                            ))}
                        </div>

                        {/* View Toggle */}
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "gallery")} className="hidden lg:block">
                            <TabsList>
                                <TabsTrigger value="list" className="gap-2">
                                    <TableIcon className="h-4 w-4" /> Tableau
                                </TabsTrigger>
                                <TabsTrigger value="gallery" className="gap-2">
                                    <LayoutGrid className="h-4 w-4" /> Galerie
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {filteredDossiers.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Aucun dossier trouvé</h3>
                        <p className="text-slate-500 mt-1">Modifiez vos filtres de recherche</p>
                    </div>
                ) : (
                    <>
                        {/* TABLE VIEW (Desktop) */}
                        {viewMode === "list" && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[250px]">Dossier</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Juridiction</TableHead>
                                            <TableHead>Prochaine audience</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDossiers.map((dossier) => {
                                            const StatusIcon = statusConfig[dossier.statut].icon
                                            const nextAudience = dossier.audiences
                                                .filter(a => a.statut === "PLANIFIEE")
                                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

                                            return (
                                                <TableRow key={dossier.id} className="group hover:bg-slate-50/50">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                                <Scale className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900">{dossier.intitule}</div>
                                                                <div className="text-xs text-slate-500">{dossier.numeroDossier}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={typeConfig[dossier.typeAffaire].color}>
                                                            {typeConfig[dossier.typeAffaire].label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`${statusConfig[dossier.statut].color} flex items-center gap-1 w-fit`}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {statusConfig[dossier.statut].label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm text-slate-600">{dossier.juridiction.nom}</div>
                                                        <div className="text-xs text-slate-400">{dossier.juridiction.ville}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {nextAudience ? (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                                <span>{new Date(nextAudience.date).toLocaleDateString('fr-FR')}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Aucune</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/dossiers/${dossier.id}`}>
                                                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                                Ouvrir
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* GALLERY VIEW */}
                        {viewMode === "gallery" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredDossiers.map((dossier) => {
                                    const StatusIcon = statusConfig[dossier.statut].icon
                                    const nextAudience = dossier.audiences
                                        .filter(a => a.statut === "PLANIFIEE")
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

                                    return (
                                        <Card key={dossier.id} className="p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-300 flex flex-col">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <Scale className="h-6 w-6" />
                                                </div>
                                                <Badge variant="outline" className={`${statusConfig[dossier.statut].color} flex items-center gap-1`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig[dossier.statut].label}
                                                </Badge>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg text-slate-900 mb-1">{dossier.intitule}</h3>
                                                <p className="text-xs text-slate-500 mb-3">{dossier.numeroDossier}</p>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className={`${typeConfig[dossier.typeAffaire].color} text-xs`}>
                                                            {typeConfig[dossier.typeAffaire].label}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-slate-600">
                                                        <div className="font-medium">{dossier.juridiction.nom}</div>
                                                        <div className="text-xs text-slate-400">{dossier.juridiction.ville}</div>
                                                    </div>
                                                    {nextAudience && (
                                                        <div className="flex items-center gap-2 text-slate-600 pt-2 border-t border-slate-100">
                                                            <Calendar className="h-4 w-4 text-blue-500" />
                                                            <span className="text-xs">Audience: {new Date(nextAudience.date).toLocaleDateString('fr-FR')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-50">
                                                <Link href={`/dossiers/${dossier.id}`} className="block">
                                                    <Button className="w-full bg-slate-900 text-white hover:bg-blue-600 transition-colors shadow-none hover:shadow-lg">
                                                        Voir dossier
                                                    </Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Dossier Form Dialog */}
            <DossierFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchDossiers}
            />
        </div>
    )
}
