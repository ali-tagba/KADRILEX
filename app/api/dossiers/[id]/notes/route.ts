import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    can,
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { DossierNoteCreateSchema } from "@/lib/server/schemas"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("dossiers.view")
        const { id } = await params
        const dossier = await prisma.dossier.findUnique({
            where: { id },
            include: { equipe: true },
        })
        if (!dossier) throw new HttpError(404, "Dossier introuvable")
        const resource = {
            responsableId: dossier.responsableId,
            equipeIds: dossier.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "dossiers.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }
        const notes = await prisma.dossierNote.findMany({
            where: { dossierId: id },
            include: { auteur: true },
            orderBy: { createdAt: "desc" },
        })
        return Response.json(notes)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const dossier = await prisma.dossier.findUnique({
            where: { id },
            include: { equipe: true },
        })
        if (!dossier) throw new HttpError(404, "Dossier introuvable")
        const resource = {
            responsableId: dossier.responsableId,
            equipeIds: dossier.equipe.map((e) => e.membreId),
        }
        const membre = await requirePermission("dossiers.write", resource)
        const data = await parseJson(req, DossierNoteCreateSchema)
        const created = await prisma.dossierNote.create({
            data: { dossierId: id, auteurId: membre.id, contenu: data.contenu },
            include: { auteur: true },
        })
        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
