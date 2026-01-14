import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const audience = await prisma.audience.findUnique({
            where: { id },
            include: {
                client: true,
                dossier: true,
                flashCR: true,
                invoices: true,
            },
        })

        if (!audience) {
            return NextResponse.json(
                { error: 'Audience not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(audience)
    } catch (error) {
        console.error('Error fetching audience:', error)
        return NextResponse.json(
            { error: 'Failed to fetch audience' },
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

        const audience = await prisma.audience.update({
            where: { id },
            data: {
                titre: body.titre,
                date: body.date ? new Date(body.date) : undefined,
                heure: body.heure,
                juridiction: body.juridiction,
                avocat: body.avocat,
                statut: body.statut,
                notes: body.notes,
            },
            include: {
                client: true,
                dossier: true,
                flashCR: true,
                invoices: true,
            },
        })

        return NextResponse.json(audience)
    } catch (error) {
        console.error('Error updating audience:', error)
        return NextResponse.json(
            { error: 'Failed to update audience' },
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
        await prisma.audience.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting audience:', error)
        return NextResponse.json(
            { error: 'Failed to delete audience' },
            { status: 500 }
        )
    }
}
