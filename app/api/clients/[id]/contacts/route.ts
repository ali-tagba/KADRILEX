import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const contacts = await prisma.contact.findMany({
            where: { clientId: id },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(contacts)
    } catch (error) {
        console.error('Error fetching contacts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch contacts' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json()
        const { id } = await params

        const contact = await prisma.contact.create({
            data: {
                clientId: id,
                nom: body.nom,
                prenom: body.prenom,
                fonction: body.fonction,
                email: body.email,
                telephone: body.telephone,
            },
        })

        return NextResponse.json(contact, { status: 201 })
    } catch (error) {
        console.error('Error creating contact:', error)
        return NextResponse.json(
            { error: 'Failed to create contact' },
            { status: 500 }
        )
    }
}
