import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const file = await prisma.dossierFile.update({
            where: { id: params.id },
            data: {
                name: body.name,
            },
        })

        return NextResponse.json(file)
    } catch (error) {
        console.error('Error updating dossier file:', error)
        return NextResponse.json(
            { error: 'Failed to update file' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Prisma will cascade delete children due to onDelete: Cascade
        await prisma.dossierFile.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting dossier file:', error)
        return NextResponse.json(
            { error: 'Failed to delete file' },
            { status: 500 }
        )
    }
}
