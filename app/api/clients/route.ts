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
import { nextClientNumber } from "@/lib/server/numbering"
import { ClientCreateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

/* ============================================================
   Shape de réponse (ajoute equipeIds calculé depuis la relation equipe)
   ============================================================ */
function shapeClient(c: Prisma.ClientGetPayload<{
    include: {
        equipe: true
        contacts: true
        factures: true
        _count: { select: { dossiers: true } }
    }
}>) {
    const { equipe, _count, factures, ...rest } = c
    const aRetard = factures.some(
        (f) => f.direction === "EMISE" && f.statut === "EN_RETARD"
    )
    return {
        ...rest,
        equipeIds: equipe.map((e) => e.membreId),
        activeDossiers: _count.dossiers,
        etatFacturation: aRetard ? "IMPAYE" : "A_JOUR",
        activity: [],
        partiesAdverses: [],
        dossiers: [],
    }
}

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("clients.view")
        const q = getQuery(req.url)

        const where: Prisma.ClientWhereInput = {}
        if (q.search) {
            where.OR = [
                { raisonSociale: { contains: q.search, mode: "insensitive" } },
                { nom: { contains: q.search, mode: "insensitive" } },
                { prenom: { contains: q.search, mode: "insensitive" } },
                { email: { contains: q.search, mode: "insensitive" } },
                { numeroClient: { contains: q.search, mode: "insensitive" } },
            ]
        }
        if (q.type === "PERSONNE_MORALE" || q.type === "PERSONNE_PHYSIQUE") {
            where.type = q.type
        }
        if (q.ville) where.ville = q.ville
        // Par défaut on retourne tous les clients (actifs + désactivés).
        // Le filtre se fait côté UI via l'onglet "Actif / Inactif".
        if (q.actif === "true") where.actif = true
        if (q.actif === "false") where.actif = false

        // Scope OWN : seulement clients dont membre est responsable ou dans équipe
        if (getScope(membre, "clients.view") === "OWN") {
            where.OR = [
                ...((where.OR as Prisma.ClientWhereInput[]) ?? []),
                { responsableId: membre.id },
                { equipe: { some: { membreId: membre.id } } },
            ]
        }

        const clients = await prisma.client.findMany({
            where,
            // Registre : les clients les plus anciens apparaissent d'abord,
            // puis sont classés par raison sociale / nom à date égale.
            orderBy: [
                { createdAt: "asc" },
                { raisonSociale: "asc" },
                { nom: "asc" },
                { prenom: "asc" },
            ],
            include: {
                equipe: true,
                contacts: true,
                factures: true,
                _count: { select: { dossiers: true } },
            },
        })

        return Response.json(clients.map(shapeClient))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        const membre = await requirePermission("clients.write")
        const data = await parseJson(req, ClientCreateSchema)
        const { equipeIds, createdAt, ...rest } = data

        const created = await prisma.$transaction(async (tx) => {
            const numero = await nextClientNumber(tx)
            // Héritage : si pas de responsableId fourni, on prend le membre courant
            const responsableId = rest.responsableId ?? membre.id
            // Équipe : injecter le membre courant + les ids fournis (dédupliqués)
            const equipeSet = new Set<string>(equipeIds)
            equipeSet.add(membre.id)
            equipeSet.delete(responsableId) // pas besoin de doubler responsable + équipe

            return tx.client.create({
                data: {
                    numeroClient: numero,
                    ...rest,
                    // Conversion explicite ou omission si null
                    ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
                    dateNaissance: rest.dateNaissance ? new Date(rest.dateNaissance) : null,
                    responsableId,
                    iconHint: rest.iconHint ?? (rest.type === "PERSONNE_MORALE" ? "domain" : "person"),
                    equipe: {
                        create: Array.from(equipeSet).map((mId) => ({ membreId: mId })),
                    },
                },
                include: {
                    equipe: true,
                    contacts: true,
                    factures: true,
                    _count: { select: { dossiers: true } },
                },
            })
        })

        return Response.json(shapeClient(created), { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
