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
import { DossierFileUpdateSchema } from "@/lib/server/schemas"

async function loadFileWithDossier(id: string) {
    const file = await prisma.dossierFile.findUnique({
        where: { id },
        include: { dossier: { include: { equipe: true } } },
    })
    if (!file) throw new HttpError(404, "Fichier introuvable")
    return file
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const file = await loadFileWithDossier(id)
        const resource = {
            responsableId: file.dossier.responsableId,
            equipeIds: file.dossier.equipe.map((e) => e.membreId),
        }
        await requirePermission("dossiers.write", resource)
        const data = await parseJson(req, DossierFileUpdateSchema)

        // Si on bouge dans un autre dossier (parentId d'un autre rép), refus —
        // pour Sprint 1 on supporte uniquement le rename + reparenting au sein du même dossier.
        if (data.parentId) {
            const newParent = await prisma.dossierFile.findUnique({
                where: { id: data.parentId },
            })
            if (!newParent || newParent.dossierId !== file.dossierId) {
                throw new HttpError(
                    400,
                    "Le nouveau parent doit appartenir au même dossier"
                )
            }
            if (newParent.type !== "FOLDER") {
                throw new HttpError(400, "Le parent doit être un dossier")
            }
        }

        const updated = await prisma.dossierFile.update({
            where: { id },
            data,
        })
        return Response.json(updated)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const file = await loadFileWithDossier(id)
        const resource = {
            responsableId: file.dossier.responsableId,
            equipeIds: file.dossier.equipe.map((e) => e.membreId),
        }
        await requirePermission("dossiers.write", resource)
        // Cascade sur les enfants via relation onDelete: Cascade
        await prisma.dossierFile.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
