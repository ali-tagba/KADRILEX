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
import { AudienceUpdateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shape(a: Prisma.AudienceGetPayload<{
    include: {
        equipe: true
        client: true
        dossier: { include: { client: true } }
        taches: { include: { equipe: true } }
    }
}>) {
    const { equipe, taches, ...rest } = a
    const effectiveClient = a.client ?? a.dossier?.client ?? null
    return {
        ...rest,
        client: effectiveClient,
        equipeIds: equipe.map((e) => e.membreId),
        resultatAudience: a.resultat,
        avocatPlaidant: null,
        taches: taches.map((t) => ({
            ...t,
            equipeIds: t.equipe.map((e) => e.membreId),
            assigneA: t.assigneA ?? "",
            equipe: undefined,
        })),
    }
}

async function loadWithResource(id: string) {
    const a = await prisma.audience.findUnique({
        where: { id },
        include: { equipe: true },
    })
    if (!a) throw new HttpError(404, "Audience introuvable")
    return a
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("audiences.view")
        const { id } = await params
        const audience = await prisma.audience.findUnique({
            where: { id },
            include: {
                equipe: true,
                client: true,
                dossier: { include: { client: true } },
                taches: { include: { equipe: true } },
            },
        })
        if (!audience) throw new HttpError(404, "Audience introuvable")

        const resource = {
            responsableId: audience.responsableId,
            equipeIds: audience.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "audiences.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }
        return Response.json(shape(audience))
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
        await requirePermission("audiences.write", resource)

        const data = await parseJson(req, AudienceUpdateSchema)
        const { equipeIds, ...rest } = data

        // Transition A_VENIR → TERMINEE : compteRendu + resultat obligatoires
        if (existing.statut !== "TERMINEE" && rest.statut === "TERMINEE") {
            const compteRendu = rest.compteRendu ?? existing.compteRendu
            const resultat = rest.resultat ?? existing.resultat
            if (!compteRendu || !resultat) {
                throw new HttpError(
                    400,
                    "Transition vers TERMINEE : compteRendu + resultat obligatoires"
                )
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (equipeIds !== undefined) {
                await tx.audienceEquipe.deleteMany({ where: { audienceId: id } })
                if (equipeIds.length > 0) {
                    await tx.audienceEquipe.createMany({
                        data: equipeIds.map((mId) => ({ audienceId: id, membreId: mId })),
                        skipDuplicates: true,
                    })
                }
            }
            return tx.audience.update({
                where: { id },
                data: {
                    ...rest,
                    dateDebut:
                        rest.dateDebut === undefined ? undefined : new Date(rest.dateDebut),
                },
                include: {
                    equipe: true,
                    client: true,
                    dossier: { include: { client: true } },
                    taches: { include: { equipe: true } },
                },
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
        await requirePermission("audiences.write", resource)
        await prisma.audience.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
