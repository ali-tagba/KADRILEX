"use client"

import { useEffect, useState } from "react"
import { KpiCard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  FolderOpen,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
  FileText,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalClients: number
  activeDossiers: number
  weekAudiences: number
  totalRevenue: string
  upcomingAudiences: Array<{
    date: string
    month: string
    title: string
    case: string
    court: string
    urgent: boolean
  }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeDossiers: 0,
    weekAudiences: 0,
    totalRevenue: "0M",
    upcomingAudiences: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching dashboard stats:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-8">
      {/* Header with Welcome Message */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Tableau de Bord
          </h1>
          <p className="text-slate-500 mt-1">
            Bienvenue, Maître. Voici votre situation aujourd'hui.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dossiers">
            <Button size="lg" className="rounded-xl shadow-lg shadow-blue-600/20 min-w-[160px] whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" /> Nouveau Dossier
            </Button>
          </Link>
          <Link href="/audiences">
            <Button variant="outline" size="lg" className="rounded-xl min-w-[120px] whitespace-nowrap">
              <Calendar className="mr-2 h-4 w-4" /> Agenda
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards - Using real data */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Clients"
          value={loading ? "..." : stats.totalClients.toString()}
          subtitle="Total actifs"
          icon={Users}
          trend="up"
          colorScheme="blue"
        />
        <KpiCard
          title="Dossiers Actifs"
          value={loading ? "..." : stats.activeDossiers.toString()}
          subtitle="En cours"
          icon={FolderOpen}
          colorScheme="purple"
        />
        <KpiCard
          title="Audiences"
          value={loading ? "..." : stats.weekAudiences.toString()}
          subtitle="Cette semaine"
          icon={Calendar}
          colorScheme="orange"
        />
        <KpiCard
          title="Facturation"
          value={loading ? "..." : stats.totalRevenue}
          subtitle="FCFA encaissés"
          icon={TrendingUp}
          trend="up"
          colorScheme="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Audiences - 2/3 width on desktop */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Audiences à venir</CardTitle>
                  <CardDescription>Vos prochains rendez-vous judiciaires</CardDescription>
                </div>
                <Link href="/audiences">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 min-w-[100px]">
                    Voir tout <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  <div className="animate-pulse">Chargement...</div>
                </div>
              ) : stats.upcomingAudiences.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.upcomingAudiences.map((audience, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group cursor-pointer">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center border border-blue-100">
                        <span className="text-xs font-bold uppercase">{audience.month}</span>
                        <span className="text-lg font-bold">{audience.date}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={audience.title}>
                            {audience.title}
                          </h4>
                          {audience.urgent && (
                            <Badge variant="error" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                              <AlertCircle className="h-3 w-3 mr-1" /> Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate" title={`${audience.case} • ${audience.court}`}>
                          {audience.case} • {audience.court}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>Aucune audience à venir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar - 1/3 width on desktop */}
        <div className="space-y-6">
          {/* Flash CR Widget */}
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-blue-400" />
                Flash CR
              </CardTitle>
              <CardDescription className="text-slate-400">
                Générez vos comptes-rendus en un clic après vos audiences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none shadow-md min-w-[120px]">
                Nouveau Flash CR
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/clients">
                <Button variant="outline" className="w-full justify-start min-w-[120px]">
                  <Users className="h-4 w-4 mr-2" /> Nouveau Client
                </Button>
              </Link>
              <Link href="/audiences">
                <Button variant="outline" className="w-full justify-start min-w-[120px]">
                  <Calendar className="h-4 w-4 mr-2" /> Nouvelle Audience
                </Button>
              </Link>
              <Link href="/facturation">
                <Button variant="outline" className="w-full justify-start min-w-[120px]">
                  <FileText className="h-4 w-4 mr-2" /> Nouvelle Facture
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
