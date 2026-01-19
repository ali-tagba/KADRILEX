import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    // Helper to safely execute a promise and return a default value on error
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

        // Execute queries independently so one failure doesn't crash everything
        const totalClients = await safeQuery(prisma.client.count(), 0, 'totalClients')

        const activeDossiers = await safeQuery(
            prisma.dossier.count({ where: { statut: 'EN_COURS' } }),
            0,
            'activeDossiers'
        )

        const weekAudiences = await safeQuery(
            prisma.audience.count({
                where: {
                    date: {
                        gte: startOfWeek,
                        lt: endOfWeek
                    }
                }
            }),
            0,
            'weekAudiences'
        )

        const invoiceStats = await safeQuery(
            prisma.invoice.aggregate({ _sum: { montantPaye: true } }),
            { _sum: { montantPaye: 0 } },
            'invoiceStats'
        )

        const upcomingAudiences = await safeQuery(
            prisma.audience.findMany({
                where: {
                    date: { gte: now },
                    statut: 'A_VENIR'
                },
                include: {
                    client: true,
                    dossier: true
                },
                orderBy: { date: 'asc' },
                take: 3
            }),
            [],
            'upcomingAudiences'
        )

        // Format revenue in millions
        const totalRevenue = (invoiceStats._sum.montantPaye || 0) / 1000000
        const revenueFormatted = totalRevenue.toFixed(1) + 'M'

        // Format upcoming audiences for display
        const formattedAudiences = upcomingAudiences.map(audience => {
            try {
                const audienceDate = new Date(audience.date)
                const clientName = audience.client?.type === 'PERSONNE_MORALE'
                    ? audience.client.raisonSociale
                    : `${audience.client?.prenom} ${audience.client?.nom}`

                // Check if urgent (within 3 days)
                const daysUntil = Math.ceil((audienceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const isUrgent = daysUntil <= 3

                return {
                    date: audienceDate.getDate().toString(),
                    month: audienceDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
                    title: audience.titre || 'Audience',
                    case: `${clientName} - ${audience.dossier?.numero}`,
                    court: audience.juridiction || 'Non spécifié',
                    urgent: isUrgent
                }
            } catch (err) {
                console.error('Error formating audience:', err)
                return null
            }
        }).filter(Boolean)

        return NextResponse.json({
            totalClients,
            activeDossiers,
            weekAudiences,
            totalRevenue: revenueFormatted,
            upcomingAudiences: formattedAudiences
        })

    } catch (error) {
        console.error('CRITICAL SERVER ERROR in /api/dashboard/stats:', error)
        // Return a valid empty structure instead of 500
        return NextResponse.json({
            totalClients: 0,
            activeDossiers: 0,
            weekAudiences: 0,
            totalRevenue: "0.0M",
            upcomingAudiences: []
        })
    }
}
