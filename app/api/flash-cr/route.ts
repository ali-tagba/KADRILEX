import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const flashCrs = await prisma.flashCR.findMany({
            include: {
                audience: true,
                client: true,
                dossier: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json(flashCrs)
    } catch (error) {
        console.error('Error fetching flash CRs:', error)
        return NextResponse.json(
            { error: 'Failed to fetch flash CRs' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Creating FlashCR with data:', body)

        const flashCR = await prisma.flashCR.create({
            data: {
                audienceId: body.audienceId,
                clientId: body.clientId,
                dossierId: body.dossierId,
                contenu: body.contenu || '',
                destinataires: body.destinataires || '',
                statut: body.statut || 'BROUILLON',
            },
            include: {
                audience: true,
                client: true,
                dossier: true,
            },
        })

        console.log('FlashCR created successfully:', flashCR.id)
        return NextResponse.json(flashCR, { status: 201 })
    } catch (error) {
        console.error('Error creating FlashCR:', error)
        return NextResponse.json(
            { error: 'Failed to create FlashCR', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
