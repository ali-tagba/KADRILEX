import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { HttpError, requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError, parseJson, getQuery } from "@/lib/server/api-helpers"
import { EncaissementCreateSchema } from "@/lib/server/schemas"
import { recomputeEncaissement } from "@/lib/server/finance"
import type { Prisma } from "@prisma/client"

const includeRelations = { client: true } satisfies Prisma.EncaissementMensuelInclude

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)

        const where: Prisma.EncaissementMensuelWhereInput = {}
        if (q.annee) where.annee = Number(q.annee)
        if (q.mois) where.mois = Number(q.mois)
        if (q.clientId) where.clientId = q.clientId

        const encaissements = await prisma.encaissementMensuel.findMany({
            where,
            orderBy: [{ annee: "desc" }, { mois: "asc" }],
            include: includeRelations,
        })
        return Response.json(encaissements)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("finance.write")
        const data = await parseJson(req, EncaissementCreateSchema)

        if (data.clientId) {
            const client = await prisma.client.findUnique({ where: { id: data.clientId } })
            if (!client) throw new HttpError(404, "Client introuvable")
        }

        const computed = recomputeEncaissement(data)

        const created = await prisma.encaissementMensuel.create({
            data: {
                annee: data.annee,
                mois: data.mois,
                clientId: data.clientId ?? null,
                montantHT: data.montantHT,
                tauxTVA: data.tauxTVA,
                tauxBIC: data.tauxBIC,
                montantRetenueBIC: data.montantRetenueBIC,
                montantTVARetenueSource: data.montantTVARetenueSource,
                ...computed,
                notes: data.notes ?? null,
            },
            include: includeRelations,
        })
        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
