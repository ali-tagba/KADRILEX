import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const dossiers = await prisma.dossier.findMany({
            include: {
                client: true,
                _count: {
                    select: {
                        audiences: true,
                        invoices: true,
                        files: true,
                    },
                },
            },
            orderBy: {
                dateOuverture: 'desc',
            },
        })

        return NextResponse.json(dossiers)
    } catch (error) {
        console.error('Error fetching dossiers:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dossiers' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Creating dossier with data:', body)

        const dossier = await prisma.dossier.create({
            data: {
                numero: body.numero || `DOS-${Date.now()}`,
                clientId: body.clientId,
                type: body.type,
                statut: body.statut || 'EN_COURS',
                juridiction: body.juridiction || null,
                description: body.description || null,
            },
            include: {
                client: true,
                audiences: true,
                _count: {
                    select: {
                        audiences: true,
                        files: true,
                    },
                },
            },
        })

        console.log('Dossier created successfully:', dossier.id)
        return NextResponse.json(dossier, { status: 201 })
    } catch (error) {
        console.error('Error creating dossier:', error)
        return NextResponse.json(
            { error: 'Failed to create dossier', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
