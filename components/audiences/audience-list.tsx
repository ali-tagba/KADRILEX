"use client"

import { Audience, AudienceStatus } from "@/lib/types/audience"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Briefcase, User, FileText, ArrowRight, Gavel, AlertCircle, Clock, CheckCircle2, Plus } from "lucide-react"

interface AudienceListProps {
    audiences: Audience[]
}

const getStatusBadge = (status: AudienceStatus, date: string) => {
    const isLate = new Date(date) < new Date() && status === 'UPCOMING'

    if (isLate) {
        return <Badge variant="red" className="bg-red-50 text-red-600 border-red-200 shadow-none">En retard</Badge>
    }

    switch (status) {
        case "UPCOMING":
            return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 shadow-none">À venir</Badge>
        case "COMPLETED":
            return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 shadow-none">Terminée</Badge>
        case "POSTPONED":
            return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Reportée</Badge>
        case "CANCELLED":
            return <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Annulée</Badge>
        default:
            return null
    }
}

export function AudienceList({ audiences }: AudienceListProps) {
    // Sort by date nearest to now
    const sortedAudiences = [...audiences].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (sortedAudiences.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Gavel className="w-12 h-12 mb-4 opacity-20" />
                <p>Aucune audience trouvée pour ce filtre.</p>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-4">
            {sortedAudiences.map((audience) => {
                const isLate = new Date(audience.date) < new Date() && audience.status === 'UPCOMING'
                const dateObj = new Date(audience.date)

                return (
                    <Card key={audience.id} className={`group hover:shadow-md transition-all border-slate-200 duration-300 ${isLate ? 'border-l-4 border-l-red-500' : 'hover:border-blue-300 border-l-4 border-l-transparent hover:border-l-blue-500'}`}>
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row">
                                {/* Date Column */}
                                <div className="p-4 md:p-6 flex flex-row md:flex-col items-center justify-center md:items-start md:border-r border-slate-100 bg-slate-50/50 min-w-[140px] gap-3 md:gap-1">
                                    <span className="text-3xl font-bold text-slate-800">
                                        {format(dateObj, "dd")}
                                    </span>
                                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                                        {format(dateObj, "MMM yyyy", { locale: fr })}
                                    </span>
                                    <div className="flex items-center text-xs font-medium text-slate-500 mt-2 bg-white px-2 py-1 rounded border border-slate-200/60 shadow-sm">
                                        <Clock className="w-3 h-3 mr-1.5" />
                                        {format(dateObj, "HH:mm")}
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="p-4 md:p-5 flex-1 flex flex-col justify-center">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                                                {audience.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Gavel className="w-3.5 h-3.5" />
                                                    {audience.juridiction || "Non spécifiée"}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            {getStatusBadge(audience.status, audience.date)}
                                        </div>
                                    </div>

                                    {/* Rich Data Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                                        {/* Dossier */}
                                        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50/50 border border-slate-100 hover:bg-blue-50/30 transition-colors">
                                            <div className="mt-0.5 p-1.5 bg-white rounded shadow-sm border border-slate-100">
                                                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight mb-0.5">Dossier</p>
                                                <p className="text-sm font-semibold text-slate-700 truncate block">
                                                    {audience.dossierId}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Client */}
                                        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50/50 border border-slate-100 hover:bg-blue-50/30 transition-colors">
                                            <div className="mt-0.5 p-1.5 bg-white rounded shadow-sm border border-slate-100">
                                                <User className="w-3.5 h-3.5 text-purple-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight mb-0.5">Client</p>
                                                <p className="text-sm font-semibold text-slate-700 truncate block">
                                                    {audience.clientId}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Avocats */}
                                        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50/50 border border-slate-100 hover:bg-blue-50/30 transition-colors">
                                            <div className="mt-0.5 p-1.5 bg-white rounded shadow-sm border border-slate-100">
                                                <User className="w-3.5 h-3.5 text-slate-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight mb-0.5">Avocats</p>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-xs font-medium text-slate-700 truncate">
                                                        <span className="text-slate-400 font-normal mr-1">Ch:</span>{audience.avocatId}
                                                    </p>
                                                    {audience.avocatSignataireId && (
                                                        <p className="text-xs font-medium text-slate-700 truncate">
                                                            <span className="text-slate-400 font-normal mr-1">Sig:</span>{audience.avocatSignataireId}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Flash CR Status */}
                                        <div className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${audience.flashCrId ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                            <div className={`mt-0.5 p-1.5 rounded shadow-sm border ${audience.flashCrId ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                                                {audience.flashCrId ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight mb-0.5">Compte Rendu</p>
                                                <p className={`text-sm font-medium truncate ${audience.flashCrId ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
                                                    {audience.flashCrId ? "Disponible" : "Non rédigé"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Column */}
                                <div className="p-4 flex flex-row md:flex-col justify-center items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/30 min-w-[140px]">
                                    <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                                        Voir Dossier
                                    </Button>
                                    {audience.flashCrId ? (
                                        <Button variant="outline" size="sm" className="w-full justify-start text-emerald-600 border-emerald-200 bg-white hover:bg-emerald-50 shadow-sm">
                                            <FileText className="w-3.5 h-3.5 mr-2" />
                                            Lire le CR
                                        </Button>
                                    ) : (
                                        <Button size="sm" className="w-full bg-slate-900 text-white hover:bg-blue-600 border border-transparent shadow transition-all">
                                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                                            Créer CR
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
