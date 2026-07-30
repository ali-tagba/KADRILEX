import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requireAuth,
} from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"

/** PATCH /api/shares/[id] — marque comme lu (seul le destinataire peut). */
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const me = await requireAuth()
        const { id } = await params
        const share = await prisma.partage.findUnique({ where: { id } })
        if (!share) throw new HttpError(404, "Partage introuvable")
        if (share.toMembreId !== me.id) {
            throw new HttpError(403, "Pas le destinataire")
        }
        const updated = await prisma.partage.update({
            where: { id },
            data: { readAt: new Date() },
        })
        return Response.json(updated)
    } catch (e) {
        return handleApiError(e)
    }
}

/** DELETE /api/shares/[id] — auteur ou destinataire peut supprimer. */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const me = await requireAuth()
        const { id } = await params
        const share = await prisma.partage.findUnique({ where: { id } })
        if (!share) throw new HttpError(404, "Partage introuvable")
        if (share.toMembreId !== me.id && share.fromMembreId !== me.id) {
            throw new HttpError(403, "Pas autorisé")
        }
        await prisma.partage.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
