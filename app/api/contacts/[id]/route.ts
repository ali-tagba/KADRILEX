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
import { ContactUpdateSchema } from "@/lib/server/schemas"

async function loadContactWithClient(id: string) {
    const contact = await prisma.contact.findUnique({
        where: { id },
        include: { client: { include: { equipe: true } } },
    })
    if (!contact) throw new HttpError(404, "Contact introuvable")
    return contact
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const contact = await loadContactWithClient(id)
        const resource = {
            responsableId: contact.client.responsableId,
            equipeIds: contact.client.equipe.map((e) => e.membreId),
        }
        await requirePermission("clients.write", resource)
        const data = await parseJson(req, ContactUpdateSchema)
        const updated = await prisma.contact.update({ where: { id }, data })
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
        const contact = await loadContactWithClient(id)
        const resource = {
            responsableId: contact.client.responsableId,
            equipeIds: contact.client.equipe.map((e) => e.membreId),
        }
        await requirePermission("clients.write", resource)
        await prisma.contact.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
