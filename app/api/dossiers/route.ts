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
import { nextDossierNumber } from "@/lib/server/numbering"
import { DossierCreateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shapeDossier(d: Prisma.DossierGetPayload<{
    include: { equipe: true; client: true }
}>) {
    const { equipe, ...rest } = d
    return { ...rest, equipeIds: equipe.map((e) => e.membreId) }
}

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("dossiers.view")
        const q = getQuery(req.url)

        const where: Prisma.DossierWhereInput = {}
        if (q.search) {
            where.OR = [
                { titre: { contains: q.search, mode: "insensitive" } },
                { numero: { contains: q.search, mode: "insensitive" } },
                { nature: { contains: q.search, mode: "insensitive" } },
            ]
        }
        if (q.statut) where.statut = q.statut as Prisma.DossierWhereInput["statut"]
        if (q.type) where.type = q.type as Prisma.DossierWhereInput["type"]
        if (q.kind) where.kind = q.kind as Prisma.DossierWhereInput["kind"]
        if (q.clientId) where.clientId = q.clientId
        if (q.juridiction) where.juridiction = { contains: q.juridiction, mode: "insensitive" }

        if (getScope(membre, "dossiers.view") === "OWN") {
            where.OR = [
                ...((where.OR as Prisma.DossierWhereInput[]) ?? []),
                { responsableId: membre.id },
                { equipe: { some: { membreId: membre.id } } },
            ]
        }

        const dossiers = await prisma.dossier.findMany({
            where,
            // Registre chronologique, puis alphabétique à date égale.
            orderBy: [
                { dateOuverture: "asc" },
                { titre: "asc" },
                { numero: "asc" },
            ],
            include: { equipe: true, client: true },
        })
        return Response.json(dossiers.map(shapeDossier))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        const membre = await requirePermission("dossiers.write")
        const data = await parseJson(req, DossierCreateSchema)
        const { equipeIds, ...rest } = data

        // Héritage équipe depuis le client parent (si CLIENT)
        let inheritedTeam: string[] = []
        let inheritedResponsable: string | null = null
        if (rest.kind === "CLIENT" && rest.clientId) {
            const client = await prisma.client.findUnique({
                where: { id: rest.clientId },
                include: { equipe: true },
            })
            if (!client) throw new HttpError(404, "Client lié introuvable")
            inheritedTeam = client.equipe.map((e) => e.membreId)
            inheritedResponsable = client.responsableId
        }

        const responsableId = rest.responsableId ?? inheritedResponsable ?? membre.id
        const equipeSet = new Set<string>([...equipeIds, ...inheritedTeam, membre.id])
        equipeSet.delete(responsableId)

        const created = await prisma.$transaction(async (tx) => {
            const numero = await nextDossierNumber(tx, rest.kind)
            return tx.dossier.create({
                data: {
                    numero,
                    kind: rest.kind,
                    type: rest.type,
                    nature: rest.nature,
                    titre: rest.titre,
                    statut: rest.statut,
                    etatProcedure: rest.etatProcedure,
                    juridiction: rest.juridiction,
                    clientId: rest.kind === "ADMIN" ? null : rest.clientId,
                    partiesAdverses: rest.partiesAdverses,
                    dateOuverture: rest.dateOuverture ? new Date(rest.dateOuverture) : new Date(),
                    description: rest.description,
                    honoraires: rest.honoraires ? (rest.honoraires as any) : undefined,
                    provisionsVersees: rest.provisionsVersees ? (rest.provisionsVersees as any) : undefined,
                    retrocession: rest.retrocession ? (rest.retrocession as any) : undefined,
                    responsableId,
                    equipe: {
                        create: Array.from(equipeSet).map((mId) => ({ membreId: mId })),
                    },
                },
                include: { equipe: true, client: true },
            })
        })
        return Response.json(shapeDossier(created), { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
