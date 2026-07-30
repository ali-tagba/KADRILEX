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
import { ContactCreateSchema } from "@/lib/server/schemas"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("clients.view")
        const { id } = await params
        const client = await prisma.client.findUnique({
            where: { id },
            include: { equipe: true },
        })
        if (!client) throw new HttpError(404, "Client introuvable")
        const resource = {
            responsableId: client.responsableId,
            equipeIds: client.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "clients.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }
        const contacts = await prisma.contact.findMany({
            where: { clientId: id },
            orderBy: { createdAt: "asc" },
        })
        return Response.json(contacts)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const client = await prisma.client.findUnique({
            where: { id },
            include: { equipe: true },
        })
        if (!client) throw new HttpError(404, "Client introuvable")
        const resource = {
            responsableId: client.responsableId,
            equipeIds: client.equipe.map((e) => e.membreId),
        }
        await requirePermission("clients.write", resource)
        const data = await parseJson(req, ContactCreateSchema)
        const created = await prisma.contact.create({
            data: { clientId: id, ...data },
        })
        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
