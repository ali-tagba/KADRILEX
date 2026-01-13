import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: {
                client: true,
                dossier: true,
                audience: true,
            },
        })

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(invoice)
    } catch (error) {
        console.error('Error fetching invoice:', error)
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const invoice = await prisma.invoice.update({
            where: { id: params.id },
            data: {
                numero: body.numero,
                date: body.date ? new Date(body.date) : undefined,
                dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : undefined,
                montantHT: body.montantHT,
                montantTTC: body.montantTTC,
                montantPaye: body.montantPaye,
                statut: body.statut,
                moyenPaiement: body.moyenPaiement,
                datePaiement: body.datePaiement ? new Date(body.datePaiement) : undefined,
            },
            include: {
                client: true,
                dossier: true,
                audience: true,
            },
        })

        return NextResponse.json(invoice)
    } catch (error) {
        console.error('Error updating invoice:', error)
        return NextResponse.json(
            { error: 'Failed to update invoice' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.invoice.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting invoice:', error)
        return NextResponse.json(
            { error: 'Failed to delete invoice' },
            { status: 500 }
        )
    }
}
