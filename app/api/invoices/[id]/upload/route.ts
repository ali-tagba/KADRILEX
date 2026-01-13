import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'invoices')

        // Generate unique filename
        const timestamp = Date.now()
        const filename = `${timestamp}-${file.name}`
        const filepath = join(uploadsDir, filename)

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure directory exists
        const fs = require('fs')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }

        await writeFile(filepath, buffer)

        // Update invoice with file URL
        const fileUrl = `/uploads/invoices/${filename}`
        const invoice = await prisma.invoice.update({
            where: { id: params.id },
            data: {
                fichierUrl: fileUrl,
            },
            include: {
                client: true,
                dossier: true,
                audience: true,
            },
        })

        return NextResponse.json({
            success: true,
            fileUrl,
            invoice,
        })
    } catch (error) {
        console.error('Error uploading invoice file:', error)
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}
