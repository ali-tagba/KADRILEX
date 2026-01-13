"use client"

import Link from "next/link"
import { Client } from "@/lib/types/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Building2, User, ArrowRight } from "lucide-react"

interface ClientTableProps {
    clients: Client[]
    getDossiersCount: (clientId: string) => number
}

export function ClientTable({ clients, getDossiersCount }: ClientTableProps) {
    return (
        <div className="h-full w-full overflow-auto relative custom-scrollbar">
            {/* Force table to have a minimum width to ensure horizontal scroll works on small screens */}
            <Table className="min-w-[1400px]">
                <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                    <TableRow className="hover:bg-slate-50 border-b border-slate-200">
                        <TableHead className="w-[80px] pl-6">Type</TableHead>
                        <TableHead className="min-w-[220px]">Nom / Raison Sociale</TableHead>
                        <TableHead className="w-[200px]">Entreprise</TableHead>
                        <TableHead className="w-[220px]">Email</TableHead>
                        <TableHead className="w-[160px]">Téléphone</TableHead>
                        <TableHead className="w-[160px]">Ville / Pays</TableHead>
                        <TableHead className="w-[120px] text-center">Dossiers</TableHead>
                        <TableHead className="w-[140px]">Facturation</TableHead>
                        {/* Sticky Action Column */}
                        <TableHead className="w-[120px] text-right sticky right-0 top-0 bg-slate-50 z-30 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] pr-6">
                            Action
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((client) => {
                        const activeCaseCount = getDossiersCount(client.id)
                        // Mock unpaid invoice check (To be replaced with real logic later)
                        const hasUnpaidInvoices = Math.random() > 0.8

                        return (
                            <TableRow
                                key={client.id}
                                className="group hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
                            >
                                <TableCell className="pl-6">
                                    <div className={`
                                        w-10 h-10 rounded-lg flex items-center justify-center
                                        ${client.type === 'PERSONNE_MORALE' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}
                                    `}>
                                        {client.type === 'PERSONNE_MORALE' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                    </div>
                                </TableCell>
                                <TableCell className="font-semibold text-slate-900">
                                    <div className="flex flex-col">
                                        <span className="truncate max-w-[200px]" title={client.type === "PERSONNE_PHYSIQUE" ? `${client.nom} ${client.prenom}` : client.raisonSociale}>
                                            {client.type === "PERSONNE_PHYSIQUE" ? `${client.nom} ${client.prenom}` : client.raisonSociale}
                                        </span>
                                        {client.type === "PERSONNE_PHYSIQUE" && client.profession && (
                                            <span className="text-xs text-slate-500 truncate font-normal">{client.profession}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {client.type === "PERSONNE_MORALE" ? (
                                        <span className="truncate max-w-[180px] block font-medium" title={client.raisonSociale}>
                                            {client.raisonSociale}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    <span className="truncate max-w-[200px] block text-sm" title={client.email}>{client.email}</span>
                                </TableCell>
                                <TableCell className="text-slate-600 font-mono text-sm">
                                    {client.telephone}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    <span className="truncate max-w-[150px] block" title={client.ville}>{client.ville || "-"}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    {activeCaseCount > 0 ? (
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100">
                                            {activeCaseCount}
                                        </Badge>
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {hasUnpaidInvoices ? (
                                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 shadow-sm">
                                            Impayé
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                                            À jour
                                        </Badge>
                                    )}
                                </TableCell>
                                {/* Sticky Action Cell */}
                                <TableCell className="text-right sticky right-0 bg-white group-hover:bg-blue-50/30 transition-colors shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] pr-6">
                                    <Link href={`/clients/${client.id}`}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="
                                                border-blue-200 text-blue-700 bg-blue-50/50 
                                                hover:bg-blue-600 hover:text-white hover:border-blue-600
                                                transition-all font-semibold shadow-sm
                                            "
                                        >
                                            Ouvrir
                                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
