import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    getScope,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
    getQuery,
} from "@/lib/server/api-helpers"
import { TacheCreateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shape(t: Prisma.TacheGetPayload<{
    include: { equipe: true; client: true; dossier: true; audience: true }
}>) {
    const { equipe, ...rest } = t
    return {
        ...rest,
        equipeIds: equipe.map((e) => e.membreId),
        /* Legacy field assigneA jamais null pour compat front mock */
        assigneA: t.assigneA ?? "",
    }
}

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("taches.view")
        const q = getQuery(req.url)

        const where: Prisma.TacheWhereInput = {}
        if (q.search) where.titre = { contains: q.search, mode: "insensitive" }
        if (q.statut) where.statut = q.statut as Prisma.TacheWhereInput["statut"]
        if (q.priorite) where.priorite = q.priorite as Prisma.TacheWhereInput["priorite"]
        if (q.dossierId) where.dossierId = q.dossierId
        if (q.audienceId) where.audienceId = q.audienceId
        if (q.clientId) where.clientId = q.clientId

        if (getScope(membre, "taches.view") === "OWN") {
            where.OR = [
                { responsableId: membre.id },
                { equipe: { some: { membreId: membre.id } } },
            ]
        }

        const taches = await prisma.tache.findMany({
            where,
            orderBy: [{ statut: "asc" }, { priorite: "desc" }, { echeance: "asc" }],
            include: { equipe: true, client: true, dossier: true, audience: true },
        })
        return Response.json(taches.map(shape))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        const membre = await requirePermission("taches.write")
        const data = await parseJson(req, TacheCreateSchema)
        const { equipeIds, ...rest } = data

        // Héritage automatique via audience > dossier > client
        let inheritedClientId = rest.clientId
        let inheritedDossierId = rest.dossierId
        let inheritedTeam: string[] = []
        let inheritedResponsable: string | null = null

        if (rest.audienceId) {
            const audience = await prisma.audience.findUnique({
                where: { id: rest.audienceId },
                include: {
                    equipe: true,
                    dossier: { include: { equipe: true } },
                },
            })
            if (audience) {
                inheritedDossierId = inheritedDossierId ?? audience.dossierId
                inheritedClientId = inheritedClientId ?? audience.clientId ?? audience.dossier?.clientId ?? null
                inheritedTeam = audience.equipe.map((e) => e.membreId)
                inheritedResponsable = audience.responsableId
            }
        } else if (rest.dossierId) {
            const dossier = await prisma.dossier.findUnique({
                where: { id: rest.dossierId },
                include: { equipe: true },
            })
            if (dossier) {
                inheritedClientId = inheritedClientId ?? dossier.clientId
                inheritedTeam = dossier.equipe.map((e) => e.membreId)
                inheritedResponsable = dossier.responsableId
            }
        }

        const responsableId = rest.responsableId ?? inheritedResponsable ?? membre.id
        const equipeSet = new Set<string>([...equipeIds, ...inheritedTeam, membre.id])
        equipeSet.delete(responsableId)

        const created = await prisma.tache.create({
            data: {
                titre: rest.titre,
                description: rest.description,
                statut: rest.statut,
                priorite: rest.priorite,
                echeance: rest.echeance ? new Date(rest.echeance) : null,
                responsableId,
                clientId: inheritedClientId ?? null,
                dossierId: inheritedDossierId ?? null,
                audienceId: rest.audienceId ?? null,
                equipe: {
                    create: Array.from(equipeSet).map((mId) => ({ membreId: mId })),
                },
            },
            include: { equipe: true, client: true, dossier: true, audience: true },
        })
        return Response.json(shape(created), { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
