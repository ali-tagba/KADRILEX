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
import { DiligenceUpdateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shape(d: Prisma.DiligenceGetPayload<{
    include: { equipe: true; client: true; dossier: true; audience: true }
}>) {
    const { equipe, ...rest } = d
    return {
        ...rest,
        equipeIds: equipe.map((e) => e.membreId),
    }
}

async function loadWithResource(id: string) {
    const d = await prisma.diligence.findUnique({
        where: { id },
        include: { equipe: true },
    })
    if (!d) throw new HttpError(404, "Diligence introuvable")
    return d
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("diligences.view")
        const { id } = await params
        const diligence = await prisma.diligence.findUnique({
            where: { id },
            include: { equipe: true, client: true, dossier: true, audience: true },
        })
        if (!diligence) throw new HttpError(404, "Diligence introuvable")

        const resource = {
            responsableId: diligence.responsableId,
            equipeIds: diligence.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "diligences.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }
        return Response.json(shape(diligence))
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
        await requirePermission("diligences.write", resource)

        const data = await parseJson(req, DiligenceUpdateSchema)
        const { equipeIds, ...rest } = data

        // Cohérence dateAccomplie ↔ statut :
        //  - passe à ACCOMPLIE sans date fournie → on horodate maintenant
        //  - quitte ACCOMPLIE → on efface la date d'accomplissement
        let dateAccomplie: Date | null | undefined
        if (rest.statut === "ACCOMPLIE" && existing.statut !== "ACCOMPLIE") {
            dateAccomplie = rest.dateAccomplie ? new Date(rest.dateAccomplie) : new Date()
        } else if (rest.statut !== undefined && rest.statut !== "ACCOMPLIE") {
            dateAccomplie = null
        } else if (rest.dateAccomplie !== undefined) {
            dateAccomplie = rest.dateAccomplie ? new Date(rest.dateAccomplie) : null
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (equipeIds !== undefined) {
                await tx.diligenceEquipe.deleteMany({ where: { diligenceId: id } })
                if (equipeIds.length > 0) {
                    await tx.diligenceEquipe.createMany({
                        data: equipeIds.map((mId) => ({ diligenceId: id, membreId: mId })),
                        skipDuplicates: true,
                    })
                }
            }
            return tx.diligence.update({
                where: { id },
                data: {
                    ...rest,
                    dateEcheance:
                        rest.dateEcheance === undefined
                            ? undefined
                            : rest.dateEcheance
                                ? new Date(rest.dateEcheance)
                                : null,
                    dateAccomplie,
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
        await requirePermission("diligences.write", resource)
        await prisma.diligence.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
