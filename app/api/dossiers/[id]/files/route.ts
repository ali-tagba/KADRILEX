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
import { DossierFileCreateSchema } from "@/lib/server/schemas"

async function loadDossierForFileAccess(dossierId: string) {
    const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId },
        include: { equipe: true },
    })
    if (!dossier) throw new HttpError(404, "Dossier introuvable")
    return dossier
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("dossiers.view")
        const { id } = await params
        const dossier = await loadDossierForFileAccess(id)
        const resource = {
            responsableId: dossier.responsableId,
            equipeIds: dossier.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "dossiers.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }
        const files = await prisma.dossierFile.findMany({
            where: { dossierId: id },
            orderBy: [{ type: "desc" }, { name: "asc" }],
        })
        return Response.json(files)
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
        const dossier = await loadDossierForFileAccess(id)
        const resource = {
            responsableId: dossier.responsableId,
            equipeIds: dossier.equipe.map((e) => e.membreId),
        }
        await requirePermission("dossiers.write", resource)
        const data = await parseJson(req, DossierFileCreateSchema)
        const file = await prisma.dossierFile.create({
            data: { dossierId: id, ...data },
        })
        return Response.json(file, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
