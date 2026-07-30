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
    HttpError,
} from "@/lib/server/api-helpers"
import { nextAudienceNumber } from "@/lib/server/numbering"
import { AudienceCreateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shape(a: Prisma.AudienceGetPayload<{
    include: { equipe: true; client: true; dossier: { include: { client: true } } }
}>) {
    const { equipe, ...rest } = a
    // Client effectif : direct (audience sèche) ou hérité du dossier rattaché.
    const effectiveClient = a.client ?? a.dossier?.client ?? null
    return {
        ...rest,
        client: effectiveClient,
        equipeIds: equipe.map((e) => e.membreId),
        /* Alias legacy pour compat composants frontend mock */
        resultatAudience: a.resultat,
        avocatPlaidant: null,
    }
}

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("audiences.view")
        const q = getQuery(req.url)

        const where: Prisma.AudienceWhereInput = {}
        if (q.search) where.titre = { contains: q.search, mode: "insensitive" }
        if (q.statut) where.statut = q.statut as Prisma.AudienceWhereInput["statut"]
        if (q.nature) where.nature = q.nature as Prisma.AudienceWhereInput["nature"]
        if (q.dossierId) where.dossierId = q.dossierId
        if (q.from || q.to) {
            where.dateDebut = {}
            if (q.from) (where.dateDebut as Prisma.DateTimeFilter).gte = new Date(q.from)
            if (q.to) (where.dateDebut as Prisma.DateTimeFilter).lte = new Date(q.to)
        }
        if (q.juridiction) where.juridiction = { contains: q.juridiction, mode: "insensitive" }

        if (getScope(membre, "audiences.view") === "OWN") {
            where.OR = [
                { responsableId: membre.id },
                { equipe: { some: { membreId: membre.id } } },
            ]
        }

        const audiences = await prisma.audience.findMany({
            where,
            orderBy: { dateDebut: "asc" },
            include: { equipe: true, client: true, dossier: { include: { client: true } } },
        })
        return Response.json(audiences.map(shape))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        const membre = await requirePermission("audiences.write")
        const data = await parseJson(req, AudienceCreateSchema)
        const { equipeIds, ...rest } = data

        // Héritage équipe + juridiction + client DEPUIS le dossier (si rattaché).
        // Une audience peut être « sèche » : ni dossier ni client.
        let inheritedTeam: string[] = []
        let inheritedResponsable: string | null = null
        let inheritedJuridiction: string | null = null
        let inheritedClientId: string | null = rest.clientId ?? null

        if (rest.dossierId) {
            const dossier = await prisma.dossier.findUnique({
                where: { id: rest.dossierId },
                include: { equipe: true },
            })
            if (!dossier) throw new HttpError(404, "Dossier lié introuvable")
            inheritedTeam = dossier.equipe.map((e) => e.membreId)
            inheritedResponsable = dossier.responsableId
            inheritedJuridiction = dossier.juridiction
            inheritedClientId = inheritedClientId ?? dossier.clientId
        }

        const responsableId = rest.responsableId ?? inheritedResponsable ?? membre.id
        const equipeSet = new Set<string>([...equipeIds, ...inheritedTeam, membre.id])
        equipeSet.delete(responsableId)

        const created = await prisma.$transaction(async (tx) => {
            const numero = await nextAudienceNumber(tx)
            return tx.audience.create({
                data: {
                    numero,
                    titre: rest.titre,
                    nature: rest.nature,
                    statut: rest.statut,
                    dateDebut: new Date(rest.dateDebut),
                    dureeMinutes: rest.dureeMinutes,
                    juridiction: rest.juridiction ?? inheritedJuridiction,
                    salleAudience: rest.salleAudience,
                    notes: rest.notes,
                    dossierId: rest.dossierId ?? null,
                    clientId: inheritedClientId,
                    responsableId,
                    equipe: {
                        create: Array.from(equipeSet).map((mId) => ({ membreId: mId })),
                    },
                },
                include: { equipe: true, client: true, dossier: { include: { client: true } } },
            })
        })
        return Response.json(shape(created), { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
