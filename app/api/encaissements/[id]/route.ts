import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { HttpError, requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError, parseJson } from "@/lib/server/api-helpers"
import { EncaissementUpdateSchema } from "@/lib/server/schemas"
import { recomputeEncaissement } from "@/lib/server/finance"
import type { Prisma } from "@prisma/client"

const includeRelations = { client: true } satisfies Prisma.EncaissementMensuelInclude

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.view")
        const { id } = await params
        const e = await prisma.encaissementMensuel.findUnique({ where: { id }, include: includeRelations })
        if (!e) throw new HttpError(404, "Encaissement introuvable")
        return Response.json(e)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.write")
        const { id } = await params
        const data = await parseJson(req, EncaissementUpdateSchema)

        const existing = await prisma.encaissementMensuel.findUnique({ where: { id } })
        if (!existing) throw new HttpError(404, "Encaissement introuvable")

        if (data.clientId) {
            const client = await prisma.client.findUnique({ where: { id: data.clientId } })
            if (!client) throw new HttpError(404, "Client introuvable")
        }

        const computed = recomputeEncaissement({
            montantHT: data.montantHT ?? existing.montantHT,
            tauxTVA: data.tauxTVA ?? existing.tauxTVA,
            tauxBIC: data.tauxBIC ?? existing.tauxBIC,
            montantRetenueBIC: data.montantRetenueBIC ?? existing.montantRetenueBIC,
            montantTVARetenueSource: data.montantTVARetenueSource ?? existing.montantTVARetenueSource,
        })

        const updated = await prisma.encaissementMensuel.update({
            where: { id },
            data: {
                annee: data.annee,
                mois: data.mois,
                clientId: data.clientId,
                montantHT: data.montantHT,
                tauxTVA: data.tauxTVA,
                tauxBIC: data.tauxBIC,
                montantRetenueBIC: data.montantRetenueBIC,
                montantTVARetenueSource: data.montantTVARetenueSource,
                ...computed,
                notes: data.notes,
            },
            include: includeRelations,
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
        await requirePermission("finance.write")
        const { id } = await params
        await prisma.encaissementMensuel.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
