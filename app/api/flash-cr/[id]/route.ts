import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const flashCr = await prisma.flashCR.findUnique({
            where: { id },
            include: {
                audience: {
                    include: {
                        client: true,
                        dossier: true,
                    },
                },
                client: true,
                dossier: true,
            },
        })

        if (!flashCr) {
            return NextResponse.json(
                { error: 'FlashCR not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(flashCr)
    } catch (error) {
        console.error('Error fetching FlashCR:', error)
        return NextResponse.json(
            { error: 'Failed to fetch FlashCR' },
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

        const flashCr = await prisma.flashCR.update({
            where: { id },
            data: {
                contenu: body.contenu,
                destinataires: body.destinataires ? JSON.stringify(body.destinataires) : undefined,
                statut: body.statutEnvoi,
            },
            include: {
                audience: true,
                client: true,
                dossier: true,
            },
        })

        return NextResponse.json(flashCr)
    } catch (error) {
        console.error('Error updating FlashCR:', error)
        return NextResponse.json(
            { error: 'Failed to update FlashCR' },
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
        await prisma.flashCR.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting FlashCR:', error)
        return NextResponse.json(
            { error: 'Failed to delete FlashCR' },
            { status: 500 }
        )
    }
}
