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
import { nextDiligenceNumber } from "@/lib/server/numbering"
import { DiligenceCreateSchema } from "@/lib/server/schemas"
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

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("diligences.view")
        const q = getQuery(req.url)

        const where: Prisma.DiligenceWhereInput = {}
        if (q.search) where.titre = { contains: q.search, mode: "insensitive" }
        if (q.statut) where.statut = q.statut as Prisma.DiligenceWhereInput["statut"]
        if (q.type) where.type = q.type as Prisma.DiligenceWhereInput["type"]
        if (q.priorite) where.priorite = q.priorite as Prisma.DiligenceWhereInput["priorite"]
        if (q.dossierId) where.dossierId = q.dossierId
        if (q.audienceId) where.audienceId = q.audienceId
        if (q.clientId) where.clientId = q.clientId

        if (getScope(membre, "diligences.view") === "OWN") {
            where.OR = [
                { responsableId: membre.id },
                { equipe: { some: { membreId: membre.id } } },
            ]
        }

        const diligences = await prisma.diligence.findMany({
            where,
            // Tri agenda : à faire d'abord, puis par échéance la plus proche, priorité décroissante
            orderBy: [{ statut: "asc" }, { dateEcheance: "asc" }, { priorite: "desc" }],
            include: { equipe: true, client: true, dossier: true, audience: true },
        })
        return Response.json(diligences.map(shape))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        const membre = await requirePermission("diligences.write")
        const data = await parseJson(req, DiligenceCreateSchema)
        const { equipeIds, ...rest } = data

        // Héritage automatique via audience > dossier > client (même logique que Tâche)
        let inheritedClientId = rest.clientId ?? null
        let inheritedDossierId = rest.dossierId ?? null
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

        const created = await prisma.$transaction(async (tx) => {
            const numero = await nextDiligenceNumber(tx)
            return tx.diligence.create({
                data: {
                    numero,
                    titre: rest.titre,
                    description: rest.description,
                    type: rest.type,
                    statut: rest.statut,
                    priorite: rest.priorite,
                    dateEcheance: rest.dateEcheance ? new Date(rest.dateEcheance) : null,
                    dateAccomplie: rest.statut === "ACCOMPLIE" ? new Date() : null,
                    notes: rest.notes,
                    responsableId,
                    clientId: inheritedClientId,
                    dossierId: inheritedDossierId,
                    audienceId: rest.audienceId ?? null,
                    equipe: {
                        create: Array.from(equipeSet).map((mId) => ({ membreId: mId })),
                    },
                },
                include: { equipe: true, client: true, dossier: true, audience: true },
            })
        })
        return Response.json(shape(created), { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
