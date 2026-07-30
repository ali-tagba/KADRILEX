import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { DocumentLinkDossierSchema } from "@/lib/server/schemas"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("bibliotheque.view")
        const { id } = await params
        const links = await prisma.documentDossier.findMany({
            where: { documentId: id },
            include: { dossier: true },
        })
        return Response.json(links.map((l) => l.dossier))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("bibliotheque.write")
        const { id } = await params
        const data = await parseJson(req, DocumentLinkDossierSchema)

        // Vérifier que les 2 existent
        const [doc, dos] = await Promise.all([
            prisma.document.findUnique({ where: { id } }),
            prisma.dossier.findUnique({ where: { id: data.dossierId } }),
        ])
        if (!doc) throw new HttpError(404, "Document introuvable")
        if (!dos) throw new HttpError(404, "Dossier introuvable")

        const link = await prisma.documentDossier.upsert({
            where: {
                documentId_dossierId: { documentId: id, dossierId: data.dossierId },
            },
            create: { documentId: id, dossierId: data.dossierId },
            update: {},
        })
        return Response.json(link, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("bibliotheque.write")
        const { id } = await params
        const url = new URL(req.url)
        const dossierId = url.searchParams.get("dossierId")
        if (!dossierId) throw new HttpError(400, "Param dossierId requis")
        await prisma.documentDossier
            .delete({
                where: { documentId_dossierId: { documentId: id, dossierId } },
            })
            .catch(() => undefined)
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
