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
import { TacheUpdateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shape(t: Prisma.TacheGetPayload<{
    include: { equipe: true; client: true; dossier: true; audience: true }
}>) {
    const { equipe, ...rest } = t
    return {
        ...rest,
        equipeIds: equipe.map((e) => e.membreId),
        assigneA: t.assigneA ?? "",
    }
}

async function loadWithResource(id: string) {
    const t = await prisma.tache.findUnique({
        where: { id },
        include: { equipe: true },
    })
    if (!t) throw new HttpError(404, "Tâche introuvable")
    return t
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("taches.view")
        const { id } = await params
        const tache = await prisma.tache.findUnique({
            where: { id },
            include: { equipe: true, client: true, dossier: true, audience: true },
        })
        if (!tache) throw new HttpError(404, "Tâche introuvable")
        const resource = {
            responsableId: tache.responsableId,
            equipeIds: tache.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "taches.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }
        return Response.json(shape(tache))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const existing = await loadWithResource(id)
        const resource = {
            responsableId: existing.responsableId,
            equipeIds: existing.equipe.map((e) => e.membreId),
        }
        await requirePermission("taches.write", resource)

        const data = await parseJson(req, TacheUpdateSchema)
        const { equipeIds, ...rest } = data

        // Transition vers FAIT setter completedAt
        let completedAt: Date | null | undefined = undefined
        if (rest.statut === "FAIT" && existing.statut !== "FAIT") {
            completedAt = new Date()
        } else if (rest.statut && rest.statut !== "FAIT" && existing.completedAt) {
            completedAt = null
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (equipeIds !== undefined) {
                await tx.tacheEquipe.deleteMany({ where: { tacheId: id } })
                if (equipeIds.length > 0) {
                    await tx.tacheEquipe.createMany({
                        data: equipeIds.map((mId) => ({ tacheId: id, membreId: mId })),
                        skipDuplicates: true,
                    })
                }
            }
            return tx.tache.update({
                where: { id },
                data: {
                    ...rest,
                    echeance:
                        rest.echeance === undefined
                            ? undefined
                            : rest.echeance
                                ? new Date(rest.echeance)
                                : null,
                    completedAt,
                },
                include: { equipe: true, client: true, dossier: true, audience: true },
            })
        })
        return Response.json(shape(updated))
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
        const existing = await loadWithResource(id)
        const resource = {
            responsableId: existing.responsableId,
            equipeIds: existing.equipe.map((e) => e.membreId),
        }
        await requirePermission("taches.write", resource)
        await prisma.tache.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
