import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    getScope,
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
    getQuery,
} from "@/lib/server/api-helpers"
import { ApportCreateSchema } from "@/lib/server/schemas"
import { recomputeApport, recomputeApportBeneficiaires } from "@/lib/server/finance"
import type { PermissionScope } from "@/lib/constants/team"
import type { Prisma } from "@prisma/client"

type ApportWithRelations = Prisma.ApportGetPayload<{
    include: { dossier: true; client: true; beneficiaires: { include: { membre: true } } }
}>

/** Un membre en scope OWN ne voit que sa propre part du split — jamais celle des collègues. */
function shapeApport(a: ApportWithRelations, viewerId: string, scope: PermissionScope) {
    const equipeIds = a.beneficiaires.map((b) => b.membreId)
    const beneficiaires =
        scope === "ALL" ? a.beneficiaires : a.beneficiaires.filter((b) => b.membreId === viewerId)
    return { ...a, beneficiaires, equipeIds }
}

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("apports.view")
        const q = getQuery(req.url)

        const where: Prisma.ApportWhereInput = {}
        if (q.annee) where.annee = Number(q.annee)
        if (q.mois) where.mois = Number(q.mois)
        if (q.dossierId) where.dossierId = q.dossierId
        if (q.clientId) where.clientId = q.clientId

        const scope = getScope(membre, "apports.view")
        if (scope === "OWN") {
            // Un viewer en scope OWN ne peut filtrer que sur lui-même — sinon `?membreId=<autre>`
            // laisserait fuiter les montants HT/ISB/Société d'un dossier auquel il n'est pas
            // rattaché (shapeApport masque bien les `beneficiaires` d'autrui, mais pas la ligne).
            where.beneficiaires = { some: { membreId: membre.id } }
        } else if (q.membreId) {
            where.beneficiaires = { some: { membreId: q.membreId } }
        }

        const apports = await prisma.apport.findMany({
            where,
            orderBy: [{ annee: "desc" }, { mois: "desc" }, { createdAt: "desc" }],
            include: { dossier: true, client: true, beneficiaires: { include: { membre: true } } },
        })
        return Response.json(apports.map((a) => shapeApport(a, membre.id, scope)))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("apports.write")
        const data = await parseJson(req, ApportCreateSchema)

        const membreIds = data.beneficiaires.map((b) => b.membreId)
        const membres = await prisma.membre.findMany({ where: { id: { in: membreIds } } })
        if (membres.length !== new Set(membreIds).size) {
            throw new HttpError(404, "Un ou plusieurs bénéficiaires sont introuvables")
        }

        const computed = recomputeApport({
            montantHT: data.montantHT,
            tauxISB: data.tauxISB,
            tauxSociete: data.tauxSociete,
        })
        const beneficiaires = recomputeApportBeneficiaires(
            computed.montantRetrocessionTotal,
            data.beneficiaires
        )

        const created = await prisma.apport.create({
            data: {
                annee: data.annee,
                mois: data.mois,
                dateReglement: data.dateReglement ? new Date(data.dateReglement) : null,
                dossierId: data.dossierId ?? null,
                clientId: data.clientId ?? null,
                referenceLibre: data.referenceLibre ?? null,
                clientLibre: data.clientLibre ?? null,
                montantHT: data.montantHT,
                fraisDossier: data.fraisDossier,
                tauxISB: data.tauxISB,
                tauxSociete: data.tauxSociete,
                ...computed,
                notes: data.notes ?? null,
                beneficiaires: { create: beneficiaires },
            },
            include: { dossier: true, client: true, beneficiaires: { include: { membre: true } } },
        })
        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
