import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json()
        const { id } = await params

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                nom: body.nom,
                prenom: body.prenom,
                fonction: body.fonction,
                email: body.email,
                telephone: body.telephone,
            },
        })

        return NextResponse.json(contact)
    } catch (error) {
        console.error('Error updating contact:', error)
        return NextResponse.json(
            { error: 'Failed to update contact' },
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
        await prisma.contact.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting contact:', error)
        return NextResponse.json(
            { error: 'Failed to delete contact' },
            { status: 500 }
        )
    }
}
