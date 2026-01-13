import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const audiences = await prisma.audience.findMany({
            include: {
                client: true,
                dossier: true,
                avocatEnCharge: true,
                avocatSignataire: true,
                flashCr: true,
            },
            orderBy: {
                date: 'asc',
            },
        })

        return NextResponse.json(audiences)
    } catch (error) {
        console.error('Error fetching audiences:', error)
        return NextResponse.json(
            { error: 'Failed to fetch audiences' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Creating audience with data:', body)

        const audience = await prisma.audience.create({
            data: {
                clientId: body.clientId,
                dossierId: body.dossierId,
                date: new Date(body.date),
                heure: body.heure || null,
                juridiction: body.juridiction || null,
                titre: body.titre || null,
                avocat: body.avocat || null,
                statut: body.statut || 'A_VENIR',
                notes: body.notes || null,
            },
            include: {
                client: true,
                dossier: true,
                flashCR: true,
            },
        })

        console.log('Audience created successfully:', audience.id)
        return NextResponse.json(audience, { status: 201 })
    } catch (error) {
        console.error('Error creating audience:', error)
        return NextResponse.json(
            { error: 'Failed to create audience', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
