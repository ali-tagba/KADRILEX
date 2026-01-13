import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)

        // KPI queries
        const [
            totalClients,
            activeDossiers,
            weekAudiences,
            invoiceStats,
            upcomingAudiences
        ] = await Promise.all([
            prisma.client.count(),
            prisma.dossier.count({ where: { statut: 'EN_COURS' } }),
            prisma.audience.count({
                where: {
                    date: {
                        gte: startOfWeek,
                        lt: endOfWeek
                    }
                }
            }),
            prisma.invoice.aggregate({
                _sum: {
                    montantPaye: true
                }
            }),
            prisma.audience.findMany({
                where: {
                    date: { gte: now },
                    statut: 'A_VENIR'
                },
                include: {
                    client: true,
                    dossier: true
                },
                orderBy: {
                    date: 'asc'
                },
                take: 3
            })
        ])

        // Format revenue in millions
        const totalRevenue = (invoiceStats._sum.montantPaye || 0) / 1000000
        const revenueFormatted = totalRevenue.toFixed(1) + 'M'

        // Format upcoming audiences for display
        const formattedAudiences = upcomingAudiences.map(audience => {
            const audienceDate = new Date(audience.date)
            const clientName = audience.client.type === 'PERSONNE_MORALE'
                ? audience.client.raisonSociale
                : `${audience.client.prenom} ${audience.client.nom}`

            // Check if urgent (within 3 days)
            const daysUntil = Math.ceil((audienceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            const isUrgent = daysUntil <= 3

            return {
                date: audienceDate.getDate().toString(),
                month: audienceDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
                title: audience.titre || 'Audience',
                case: `${clientName} - ${audience.dossier.numero}`,
                court: audience.juridiction || 'Non spécifié',
                urgent: isUrgent
            }
        })

        return NextResponse.json({
            totalClients,
            activeDossiers,
            weekAudiences,
            totalRevenue: revenueFormatted,
            upcomingAudiences: formattedAudiences
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        )
    }
}
