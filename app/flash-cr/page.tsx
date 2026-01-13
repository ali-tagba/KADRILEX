"use client"

import { useState, useEffect } from "react"
import { FlashCrFormDialog } from "@/components/flash-cr/flash-cr-form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, AlertCircle, CheckCircle2, Gavel, User, Briefcase, Plus } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function FlashCRPage() {
    const [flashCrs, setFlashCrs] = useState<any[]>([])
    const [audiences, setAudiences] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterMode, setFilterMode] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedAudienceId, setSelectedAudienceId] = useState<string>()

    const fetchData = async () => {
        try {
            setLoading(true)
            const [flashCrsRes, audiencesRes] = await Promise.all([
                fetch('/api/flash-cr'),
                fetch('/api/audiences')
            ])
            if (!flashCrsRes.ok || !audiencesRes.ok) throw new Error('Failed to fetch data')
            const flashCrsData = await flashCrsRes.json()
            const audiencesData = await audiencesRes.json()
            setFlashCrs(flashCrsData)
            setAudiences(audiencesData)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Logic:
    // AVAILABLE = Show existing FlashCRs
    // UNAVAILABLE = Show audiences that don't have a FlashCR yet

    const displayedItems = (() => {
        if (filterMode === "AVAILABLE") {
            return flashCrs.map(cr => {
                const audience = audiences.find(a => a.id === cr.audienceId)
                return { type: 'CR', data: cr, audience }
            })
        } else {
            // Unavailable: Audiences without CR
            const flashCrAudienceIds = new Set(flashCrs.map(cr => cr.audienceId))
            const audiencesWithoutCR = audiences.filter(a => !flashCrAudienceIds.has(a.id))
            return audiencesWithoutCR.map(aud => ({ type: 'AUDIENCE', data: aud, audience: aud }))
        }
    })()

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
                            Flash Compte-Rendu
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            {flashCrs.length} comptes-rendus disponibles
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filter Toggle */}
                        <div className="bg-white border border-slate-200 rounded-lg p-1 flex shadow-sm">
                            <button
                                onClick={() => setFilterMode('AVAILABLE')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${filterMode === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Disponibles</span>
                            </button>
                            <button
                                onClick={() => setFilterMode('UNAVAILABLE')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${filterMode === 'UNAVAILABLE' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <AlertCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">À rédiger</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-white rounded-xl border border-slate-200 shadow-sm">
                {displayedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Aucun élément dans cette vue</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedItems.map((item: any) => {
                            if (filterMode === "AVAILABLE") {
                                // RENDER FLASH CR CARD
                                const cr = item.data
                                const aud = item.audience
                                return (
                                    <Card key={cr.id} className="group hover:shadow-lg transition-all border-slate-200 hover:border-emerald-300 cursor-pointer hover:-translate-y-1">
                                        <CardContent className="p-6 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 shadow-none">
                                                    Disponible
                                                </Badge>
                                                <span className="text-xs font-mono text-slate-400">
                                                    {format(new Date(cr.dateCreation), "dd MMM yyyy", { locale: fr })}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
                                                Audience: {aud?.title || "Audience inconnue"}
                                            </h3>

                                            <p className="text-sm text-slate-600 line-clamp-3 mb-6 flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                "{cr.contenu}"
                                            </p>

                                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    <span className="truncate">{aud?.dossierId}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span className="truncate">{aud?.clientId}</span>
                                                </div>
                                            </div>

                                            <Button className="w-full mt-4 bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200">
                                                Lire le complet
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )
                            } else {
                                // RENDER UNAVAILABLE AUDIENCE CARD
                                const aud = item.data
                                const isLate = new Date(aud.date) < new Date() && aud.status !== 'CANCELLED'

                                return (
                                    <Card key={aud.id} className={`group hover:shadow-md transition-all border-slate-200 ${isLate ? 'border-l-4 border-l-red-400 bg-red-50/10' : 'bg-slate-50/30'}`}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-3">
                                                {isLate ? (
                                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                        Retard CR
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-500 border-slate-200 bg-white">
                                                        À venir
                                                    </Badge>
                                                )}
                                                <span className="text-xs font-medium text-slate-500">
                                                    {format(new Date(aud.date), "dd MMM", { locale: fr })}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-slate-900 mb-1">
                                                {aud.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
                                                <Gavel className="w-3.5 h-3.5" />
                                                {aud.juridiction}
                                            </p>

                                            <Button
                                                size="sm"
                                                className="w-full bg-slate-900 text-white hover:bg-blue-600 shadow-sm"
                                                onClick={() => {
                                                    setSelectedAudienceId(aud.id)
                                                    setDialogOpen(true)
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-2" />
                                                Rédiger Flash CR
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )
                            }
                        })}
                    </div>
                )}
            </div>

            {/* Flash CR Form Dialog */}
            <FlashCrFormDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) setSelectedAudienceId(undefined)
                }}
                onSuccess={fetchData}
                prefilledAudienceId={selectedAudienceId}
            />
        </div>
    )
}
