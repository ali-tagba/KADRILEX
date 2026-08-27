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
import { DepenseUpdateSchema } from "@/lib/server/schemas"
import { calcTVA, calcTTC } from "@/lib/server/finance"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.view")
        const { id } = await params
        const d = await prisma.depense.findUnique({
            where: { id },
            include: { fournisseur: true, dossier: true },
        })
        if (!d) throw new HttpError(404, "Dépense introuvable")
        return Response.json(d)
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
        const data = await parseJson(req, DepenseUpdateSchema)

        // Recalculer TVA/TTC si HT ou tvaRate change
        let montantTVA: number | undefined
        let montantTTC: number | undefined
        if (data.montantHT !== undefined || data.tvaRate !== undefined) {
            const existing = await prisma.depense.findUnique({ where: { id } })
            if (!existing) throw new HttpError(404, "Dépense introuvable")
            const HT = data.montantHT ?? existing.montantHT
            const taux = data.tvaRate ?? existing.tvaRate
            montantTVA = calcTVA(HT, taux)
            montantTTC = calcTTC(HT, taux)
        }

        const updateData: any = { ...data }
        if (data.date) updateData.date = new Date(data.date)
        if (montantTVA !== undefined) updateData.montantTVA = montantTVA
        if (montantTTC !== undefined) updateData.montantTTC = montantTTC
        
        // Remove undefined fields so Prisma doesn't complain, and allow nulls
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const updated = await prisma.depense.update({
            where: { id: (await params).id },
            data: updateData,
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
        await prisma.depense.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
