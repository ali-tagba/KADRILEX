import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const files = await prisma.dossierFile.findMany({
            where: { dossierId: params.id },
            orderBy: [
                { type: 'desc' }, // Folders first
                { name: 'asc' },
            ],
        })

        return NextResponse.json(files)
    } catch (error) {
        console.error('Error fetching dossier files:', error)
        return NextResponse.json(
            { error: 'Failed to fetch files' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const file = await prisma.dossierFile.create({
            data: {
                dossierId: params.id,
                parentId: body.parentId || null,
                name: body.name,
                type: body.type, // "FOLDER" or "FILE"
                url: body.url,
                mimeType: body.mimeType,
                size: body.size,
            },
        })

        return NextResponse.json(file, { status: 201 })
    } catch (error) {
        console.error('Error creating dossier file:', error)
        return NextResponse.json(
            { error: 'Failed to create file' },
            { status: 500 }
        )
    }
}
