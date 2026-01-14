import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const dossier = await prisma.dossier.findUnique({
            where: { id },
            include: {
                client: true,
                files: {
                    orderBy: { createdAt: 'desc' },
                },
                audiences: {
                    orderBy: { date: 'desc' },
                },
                invoices: {
                    orderBy: { date: 'desc' },
                },
                _count: {
                    select: {
                        files: true,
                        audiences: true,
                        invoices: true,
                        flashCrs: true,
                    },
                },
            },
        })

        if (!dossier) {
            return NextResponse.json(
                { error: 'Dossier not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(dossier)
    } catch (error) {
        console.error('Error fetching dossier:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dossier' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json()
        const { id } = await params

        const dossier = await prisma.dossier.update({
            where: { id },
            data: {
                type: body.type,
                statut: body.statut,
                juridiction: body.juridiction,
                description: body.description,
                dateOuverture: body.dateOuverture ? new Date(body.dateOuverture) : undefined,
                dateCloture: body.dateCloture ? new Date(body.dateCloture) : undefined,
            },
            include: {
                client: true,
            },
        })

        return NextResponse.json(dossier)
    } catch (error) {
        console.error('Error updating dossier:', error)
        return NextResponse.json(
            { error: 'Failed to update dossier' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.dossier.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting dossier:', error)
        return NextResponse.json(
            { error: 'Failed to delete dossier' },
            { status: 500 }
        )
    }
}
