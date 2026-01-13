import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const invoices = await prisma.invoice.findMany({
            include: {
                client: true,
                dossier: true,
                audience: true,
            },
            orderBy: {
                date: 'desc',
            },
        })

        return NextResponse.json(invoices)
    } catch (error) {
        console.error('Error fetching invoices:', error)
        return NextResponse.json(
            { error: 'Failed to fetch invoices' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Creating invoice with data:', body)

        const invoice = await prisma.invoice.create({
            data: {
                numero: body.numero || `INV-${Date.now()}`,
                clientId: body.clientId,
                dossierId: body.dossierId || null,
                audienceId: body.audienceId || null,
                date: new Date(body.date),
                dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : null,
                montantHT: parseFloat(body.montantHT) || 0,
                montantTVA: parseFloat(body.montantTVA) || 0,
                montantTTC: parseFloat(body.montantTTC) || 0,
                montantPaye: parseFloat(body.montantPaye) || 0,
                statut: body.statut || 'IMPAYEE',
                methodePaiement: body.methodePaiement || null,
                notes: body.notes || null,
            },
            include: {
                client: true,
                dossier: true,
                audience: true,
            },
        })

        console.log('Invoice created successfully:', invoice.id)
        return NextResponse.json(invoice, { status: 201 })
    } catch (error) {
        console.error('Error creating invoice:', error)
        return NextResponse.json(
            { error: 'Failed to create invoice', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
