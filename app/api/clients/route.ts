import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const clients = await prisma.client.findMany({
            include: {
                contacts: true,
                _count: {
                    select: {
                        dossiers: true,
                        invoices: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json(clients)
    } catch (error) {
        console.error('Error fetching clients:', error)
        return NextResponse.json(
            { error: 'Failed to fetch clients' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log('Creating client with data:', body)

        // Build data object based on client type
        const clientData: any = {
            type: body.type,
            email: body.email,
            telephone: body.telephone,
            adresse: body.adresse || null,
            ville: body.ville || null,
            pays: body.pays || 'Côte d\'Ivoire',
        }

        // Add type-specific fields
        if (body.type === 'PERSONNE_PHYSIQUE') {
            clientData.nom = body.nom
            clientData.prenom = body.prenom
            clientData.profession = body.profession || null
        } else if (body.type === 'PERSONNE_MORALE') {
            clientData.raisonSociale = body.raisonSociale
            clientData.formeJuridique = body.formeJuridique || null
            clientData.numeroRCCM = body.numeroRCCM || null
            clientData.representantLegal = body.representantLegal || null
        }

        const client = await prisma.client.create({
            data: clientData,
            include: {
                contacts: true,
                _count: {
                    select: {
                        dossiers: true,
                        invoices: true,
                    },
                },
            },
        })

        console.log('Client created successfully:', client.id)
        return NextResponse.json(client, { status: 201 })
    } catch (error) {
        console.error('Error creating client:', error)
        return NextResponse.json(
            { error: 'Failed to create client', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
