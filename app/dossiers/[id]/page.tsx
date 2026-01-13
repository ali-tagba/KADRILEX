"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { useDossierStore } from "@/lib/stores/dossierStore"
import { useClientStore } from "@/lib/stores/clientStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    ArrowLeft,
    Calendar,
    Folder,
    FileText,
    MoreHorizontal,
    Plus,
    Scale,
    LayoutGrid,
    List as ListIcon,
    ChevronRight,
    Search,
    Download,
    Trash2,
    Clock,
    CheckCircle2,
    AlertCircle
} from "lucide-react"

// Types helpers
import { Dossier, DossierFolder, Document } from "@/lib/types/dossier"

const statusConfig = {
    EN_COURS: { label: "En cours", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    EN_ATTENTE: { label: "En attente", color: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertCircle },
    CLOTURE: { label: "Clôturé", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
    ARCHIVE: { label: "Archivé", color: "bg-slate-50 text-slate-700 border-slate-200", icon: Folder }
}

export default function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const { getDossierById, createFolder, deleteFolder } = useDossierStore()
    const [dossier, setDossier] = useState<Dossier | undefined>(undefined)
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState("documents")

    // File Manager State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

    useEffect(() => {
        setMounted(true)
        const d = getDossierById(resolvedParams.id)
        if (d) setDossier(d)
    }, [resolvedParams.id, getDossierById])

    if (!mounted) return null
    if (!dossier) return notFound()

    const StatusIcon = statusConfig[dossier.statut].icon

    // File Manager Logic
    const folders = dossier.folders || []
    const documents = dossier.documents || []

    const currentFolders = folders.filter(f => f.parentId === currentFolderId)
    const currentDocs = documents.filter(d => d.folderId === currentFolderId)

    const getCurrentFolder = () => folders.find(f => f.id === currentFolderId)

    const getBreadcrumbs = () => {
        const crumbs = []
        let current = getCurrentFolder()
        while (current) {
            crumbs.unshift(current)
            current = folders.find(f => f.id === current?.parentId)
        }
        return crumbs
    }

    const formatSize = (bytes?: number) => {
        if (!bytes) return "0 B"
        const k = 1024
        const sizes = ["B", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex-none">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/dossiers">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{dossier.intitule}</h1>
                            <Badge variant="outline" className={statusConfig[dossier.statut].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[dossier.statut].label}
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-mono text-sm mt-1">{dossier.numeroDossier} • {dossier.juridiction.nom}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">Modifier</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                            Actions
                        </Button>
                    </div>
                </div>

                {/* Main Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent rounded-none p-0 space-x-6">
                        <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2">
                            GED & Fichiers
                        </TabsTrigger>
                        <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2">
                            Informations
                        </TabsTrigger>
                        <TabsTrigger value="audiences" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2">
                            Audiences
                        </TabsTrigger>
                        <TabsTrigger value="facturation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2">
                            Facturation
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* File Manager View */}
            {activeTab === "documents" && (
                <Card className="flex-1 flex flex-col shadow-sm overflow-hidden border-slate-200">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setCurrentFolderId(null)}
                            >
                                <Folder className="h-4 w-4 mr-2 text-blue-500" />
                                Racine
                            </Button>
                            {getBreadcrumbs().map((folder) => (
                                <div key={folder.id} className="flex items-center">
                                    <ChevronRight className="h-4 w-4 text-slate-400 mx-1" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => setCurrentFolderId(folder.id)}
                                    >
                                        {folder.name}
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-white border rounded-lg flex items-center p-1">
                                <Button
                                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setViewMode("grid")}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "list" ? "secondary" : "ghost"}
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setViewMode("list")}
                                >
                                    <ListIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-2" />
                            <Button size="sm" variant="outline" onClick={() => createFolder(dossier.id, "Nouveau Dossier", currentFolderId)}>
                                <Plus className="h-4 w-4 mr-2" /> Dossier
                            </Button>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" /> Fichier
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {currentFolders.length === 0 && currentDocs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                    <Folder className="h-8 w-8 text-slate-300" />
                                </div>
                                <p>Dossier vide</p>
                                <p className="text-sm">Déposez des fichiers ici</p>
                            </div>
                        ) : (
                            <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-2"}>
                                {/* Folders */}
                                {currentFolders.map(folder => (
                                    <div
                                        key={folder.id}
                                        onClick={() => setCurrentFolderId(folder.id)}
                                        className={`
                                            group cursor-pointer rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50/50 transition-all
                                            ${viewMode === "grid" ? "p-4 flex flex-col items-center text-center pb-6" : "p-3 flex items-center gap-3 border-slate-100 bg-slate-50/30"}
                                        `}
                                    >
                                        <div className={viewMode === "grid" ? "mb-3" : ""}>
                                            <Folder className={`text-blue-500 fill-blue-500/20 ${viewMode === "grid" ? "h-12 w-12" : "h-5 w-5"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="font-medium text-slate-700 truncate text-sm">{folder.name}</p>
                                            {viewMode === "list" && <p className="text-xs text-slate-400">Dossier</p>}
                                        </div>
                                    </div>
                                ))}

                                {/* Files */}
                                {currentDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className={`
                                            group cursor-pointer rounded-xl border border-transparent hover:border-blue-200 hover:bg-slate-50 transition-all
                                            ${viewMode === "grid" ? "p-4 flex flex-col items-center text-center relative" : "p-3 flex items-center gap-3 border-slate-100"}
                                        `}
                                    >
                                        <div className={viewMode === "grid" ? "mb-3" : ""}>
                                            <div className="w-12 h-12 bg-white border border-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                                                <FileText className="text-slate-500 h-6 w-6" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-700 truncate text-sm">{doc.nom}</p>
                                            <p className="text-xs text-slate-400 mt-1">{doc.type} • {formatSize(doc.taille)}</p>
                                        </div>

                                        {viewMode === "list" && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4 text-slate-400" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4 text-slate-400" /></Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {activeTab === "info" && (
                <div className="grid grid-cols-3 gap-6">
                    <Card className="col-span-2 p-6">
                        <h3 className="font-semibold text-lg mb-4">Détails de l'affaire</h3>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Type d'affaire</label>
                                <p className="mt-1 font-medium">{dossier.typeAffaire}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Juridiction</label>
                                <p className="mt-1 font-medium">{dossier.juridiction.nom}</p>
                                <p className="text-sm text-slate-500">{dossier.juridiction.ville}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Priorité</label>
                                <p className="mt-1 font-medium">{dossier.priorite}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Numéro RG</label>
                                <p className="mt-1 font-medium font-mono">{dossier.juridiction.numeroRG || '-'}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <h4 className="font-medium mb-3">Description</h4>
                            <p className="text-slate-600 leading-relaxed text-sm">{dossier.description || "Aucune description."}</p>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-slate-500">Parties</h3>
                            <div className="space-y-4">
                                {dossier.parties.map((partie, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                                            {partie.type === "DEMANDEUR" ? "D" : "A"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Client #{partie.clientId.slice(0, 4)}</p>
                                            <p className="text-xs text-slate-500">{partie.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
