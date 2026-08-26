import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    can,
    getScope,
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { ApportUpdateSchema } from "@/lib/server/schemas"
import { recomputeApport, recomputeApportBeneficiaires } from "@/lib/server/finance"
import type { PermissionScope } from "@/lib/constants/team"
import type { Prisma } from "@prisma/client"

type ApportWithRelations = Prisma.ApportGetPayload<{
    include: { dossier: true; client: true; beneficiaires: { include: { membre: true } } }
}>

function shapeApport(a: ApportWithRelations, viewerId: string, scope: PermissionScope) {
    const equipeIds = a.beneficiaires.map((b) => b.membreId)
    const beneficiaires =
        scope === "ALL" ? a.beneficiaires : a.beneficiaires.filter((b) => b.membreId === viewerId)
    return { ...a, beneficiaires, equipeIds }
}

const includeRelations = {
    dossier: true,
    client: true,
    beneficiaires: { include: { membre: true } },
} satisfies Prisma.ApportInclude

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("apports.view")
        const { id } = await params
        const a = await prisma.apport.findUnique({ where: { id }, include: includeRelations })
        if (!a) throw new HttpError(404, "Apport introuvable")
        const equipeIds = a.beneficiaires.map((b) => b.membreId)
        if (!can(membre, "apports.view", { equipeIds })) {
            throw new HttpError(403, "Accès refusé à cet apport")
        }
        return Response.json(shapeApport(a, membre.id, getScope(membre, "apports.view")))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("apports.write")
        const { id } = await params
        const data = await parseJson(req, ApportUpdateSchema)

        const existing = await prisma.apport.findUnique({ where: { id } })
        if (!existing) throw new HttpError(404, "Apport introuvable")

        const montantHT = data.montantHT ?? existing.montantHT
        const tauxISB = data.tauxISB ?? existing.tauxISB
        const tauxSociete = data.tauxSociete ?? existing.tauxSociete
        const recalc =
            data.montantHT !== undefined || data.tauxISB !== undefined || data.tauxSociete !== undefined
        const computed = recalc ? recomputeApport({ montantHT, tauxISB, tauxSociete }) : null

        if (data.beneficiaires) {
            const membreIds = data.beneficiaires.map((b) => b.membreId)
            const membres = await prisma.membre.findMany({ where: { id: { in: membreIds } } })
            if (membres.length !== new Set(membreIds).size) {
                throw new HttpError(404, "Un ou plusieurs bénéficiaires sont introuvables")
            }
        }

        const totalRetrocession =
            computed?.montantRetrocessionTotal ??
            (data.beneficiaires ? existing.montantRetrocessionTotal : null)
        const beneficiairesData =
            data.beneficiaires && totalRetrocession !== null
                ? recomputeApportBeneficiaires(totalRetrocession, data.beneficiaires)
                : null

        const updated = await prisma.$transaction(async (tx) => {
            if (beneficiairesData) {
                await tx.apportBeneficiaire.deleteMany({ where: { apportId: id } })
            }
            return tx.apport.update({
                where: { id },
                data: {
                    annee: data.annee,
                    mois: data.mois,
                    dateReglement:
                        data.dateReglement === undefined
                            ? undefined
                            : data.dateReglement
                                ? new Date(data.dateReglement)
                                : null,
                    dossierId: data.dossierId,
                    clientId: data.clientId,
                    referenceLibre: data.referenceLibre,
                    clientLibre: data.clientLibre,
                    montantHT: data.montantHT,
                    fraisDossier: data.fraisDossier,
                    tauxISB: data.tauxISB,
                    tauxSociete: data.tauxSociete,
                    ...(computed ?? {}),
                    valide: data.valide,
                    notes: data.notes,
                    ...(beneficiairesData ? { beneficiaires: { create: beneficiairesData } } : {}),
                },
                include: includeRelations,
            })
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
        await requirePermission("apports.write")
        const { id } = await params
        const existing = await prisma.apport.findUnique({ where: { id } })
        if (!existing) throw new HttpError(404, "Apport introuvable")
        if (existing.valide) {
            throw new HttpError(400, "Impossible de supprimer un apport validé — dévalidez-le d'abord")
        }
        await prisma.apport.delete({ where: { id } })
        return Response.json({ ok: true })
    } catch (e) {
        return handleApiError(e)
    }
}
