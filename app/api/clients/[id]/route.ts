import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                contacts: true,
                dossiers: {
                    orderBy: { dateOuverture: 'desc' },
                },
                invoices: {
                    orderBy: { date: 'desc' },
                },
                _count: {
                    select: {
                        dossiers: true,
                        audiences: true,
                        invoices: true,
                    },
                },
            },
        })

        if (!client) {
            return NextResponse.json(
                { error: 'Client not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(client)
    } catch (error) {
        console.error('Error fetching client:', error)
        return NextResponse.json(
            { error: 'Failed to fetch client' },
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

        const client = await prisma.client.update({
            where: { id },
            data: {
                type: body.type,
                raisonSociale: body.raisonSociale,
                nom: body.nom,
                prenom: body.prenom,
                email: body.email,
                telephone: body.telephone,
                adresse: body.adresse,
                ville: body.ville,
                pays: body.pays,
            },
            include: {
                contacts: true,
            },
        })

        return NextResponse.json(client)
    } catch (error) {
        console.error('Error updating client:', error)
        return NextResponse.json(
            { error: 'Failed to update client' },
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
        await prisma.client.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting client:', error)
        return NextResponse.json(
            { error: 'Failed to delete client' },
            { status: 500 }
        )
    }
}
