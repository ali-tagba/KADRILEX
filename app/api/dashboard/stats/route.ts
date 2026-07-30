import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const safeQuery = async <T>(promise: Promise<T>, fallback: T, name: string): Promise<T> => {
        try {
            return await promise
        } catch (error) {
            console.error(`Error fetching ${name}:`, error)
            return fallback
        }
    }

    try {
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)

        const totalClients = await safeQuery(prisma.client.count(), 0, 'totalClients')

        const activeDossiers = await safeQuery(
            prisma.dossier.count({ where: { statut: 'EN_COURS' } }),
            0,
            'activeDossiers'
        )

        const weekAudiences = await safeQuery(
            prisma.audience.count({
                where: { dateDebut: { gte: startOfWeek, lt: endOfWeek } },
            }),
            0,
            'weekAudiences'
        )

        const factureStats = await safeQuery(
            prisma.facture.aggregate({
                where: { direction: 'EMISE' },
                _sum: { montantPaye: true },
            }),
            { _sum: { montantPaye: 0 } },
            'factureStats'
        )

        const upcomingAudiences = await safeQuery(
            prisma.audience.findMany({
                where: { dateDebut: { gte: now }, statut: 'A_VENIR' },
                include: { dossier: { include: { client: true } } },
                orderBy: { dateDebut: 'asc' },
                take: 3,
            }),
            [],
            'upcomingAudiences'
        )

        const totalRevenue = (factureStats._sum.montantPaye ?? 0) / 1_000_000
        const revenueFormatted = totalRevenue.toFixed(1) + 'M'

        const formattedAudiences = upcomingAudiences
            .map((audience) => {
                try {
                    const audienceDate = new Date(audience.dateDebut)
                    const client = audience.dossier?.client
                    const clientName = client
                        ? client.type === 'PERSONNE_MORALE'
                            ? client.raisonSociale
                            : `${client.prenom ?? ''} ${client.nom ?? ''}`.trim()
                        : '—'
                    const daysUntil = Math.ceil(
                        (audienceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    )
                    const isUrgent = daysUntil <= 3
                    return {
                        date: audienceDate.getDate().toString(),
                        month: audienceDate
                            .toLocaleDateString('fr-FR', { month: 'short' })
                            .toUpperCase(),
                        title: audience.titre || 'Audience',
                        case: `${clientName} - ${audience.dossier?.numero}`,
                        court: audience.juridiction || 'Non spécifié',
                        urgent: isUrgent,
                    }
                } catch (err) {
                    console.error('Error formating audience:', err)
                    return null
                }
            })
            .filter(Boolean)

        return NextResponse.json({
            totalClients,
            activeDossiers,
            weekAudiences,
            totalRevenue: revenueFormatted,
            upcomingAudiences: formattedAudiences,
        })
    } catch (error) {
        console.error('CRITICAL SERVER ERROR in /api/dashboard/stats:', error)
        return NextResponse.json({
            totalClients: 0,
            activeDossiers: 0,
            weekAudiences: 0,
            totalRevenue: '0.0M',
            upcomingAudiences: [],
        })
    }
}
