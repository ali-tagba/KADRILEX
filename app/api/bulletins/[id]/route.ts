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
import { BulletinUpdateSchema } from "@/lib/server/schemas"
import { recomputeBulletin } from "@/lib/server/finance"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("paie.view")
        const { id } = await params
        const b = await prisma.bulletin.findUnique({
            where: { id },
            include: { employe: true, lignes: true },
        })
        if (!b) throw new HttpError(404, "Bulletin introuvable")
        if (!can(membre, "paie.view", { membreId: b.employeId })) {
            throw new HttpError(403, "Accès refusé à ce bulletin")
        }
        return Response.json(b)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("paie.write")
        const { id } = await params
        const data = await parseJson(req, BulletinUpdateSchema)

        const existing = await prisma.bulletin.findUnique({ where: { id } })
        if (!existing) throw new HttpError(404, "Bulletin introuvable")

        // Recalcul si montants modifiés
        let computed:
            | ReturnType<typeof recomputeBulletin>
            | undefined
        if (
            data.salaireBrut !== undefined ||
            data.primes !== undefined ||
            data.retenues !== undefined
        ) {
            computed = recomputeBulletin({
                salaireBrut: data.salaireBrut ?? existing.salaireBrut,
                primes: data.primes ?? existing.primes,
                retenues: data.retenues ?? existing.retenues,
            })
        }

        const updated = await prisma.bulletin.update({
            where: { id },
            data: {
                ...data,
                ...(computed ?? {}),
                dateVersement:
                    data.dateVersement === undefined
                        ? undefined
                        : data.dateVersement
                            ? new Date(data.dateVersement)
                            : null,
            },
            include: { employe: true, lignes: true },
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
        await requirePermission("paie.write")
        const { id } = await params
        await prisma.bulletin.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
