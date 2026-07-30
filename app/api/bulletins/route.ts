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
import { BulletinCreateSchema } from "@/lib/server/schemas"
import { recomputeBulletin } from "@/lib/server/finance"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("paie.view")
        const q = getQuery(req.url)

        const where: Prisma.BulletinWhereInput = {}
        if (q.annee) where.annee = Number(q.annee)
        if (q.mois) where.mois = Number(q.mois)
        if (q.employeId) where.employeId = q.employeId
        if (q.statut) where.statut = q.statut as Prisma.BulletinWhereInput["statut"]

        // Scope OWN : un membre voit uniquement ses propres bulletins
        if (getScope(membre, "paie.view") === "OWN") {
            where.employeId = membre.id
        }

        const bulletins = await prisma.bulletin.findMany({
            where,
            orderBy: [{ annee: "desc" }, { mois: "desc" }],
            include: { employe: true, lignes: true },
        })
        return Response.json(bulletins)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("paie.write")
        const data = await parseJson(req, BulletinCreateSchema)

        const employe = await prisma.membre.findUnique({ where: { id: data.employeId } })
        if (!employe) throw new HttpError(404, "Employé introuvable")

        const computed = recomputeBulletin({
            salaireBrut: data.salaireBrut,
            primes: data.primes,
            retenues: data.retenues,
        })

        // Unique constraint (employeId, annee, mois) — upsert pour idempotence
        const created = await prisma.bulletin.upsert({
            where: {
                employeId_annee_mois: {
                    employeId: data.employeId,
                    annee: data.annee,
                    mois: data.mois,
                },
            },
            create: {
                employeId: data.employeId,
                annee: data.annee,
                mois: data.mois,
                ...computed,
                statut: data.statut,
                notes: data.notes ?? null,
                lignes: {
                    create: [
                        { libelle: "Salaire de base", type: "GAIN", montant: computed.salaireBrut },
                        { libelle: "CNSS salariale", type: "CHARGE_SALARIALE", montant: computed.chargesSalariales },
                        { libelle: "CNSS patronale", type: "CHARGE_PATRONALE", montant: computed.chargesPatronales },
                    ],
                },
            },
            update: {
                ...computed,
                statut: data.statut,
                notes: data.notes ?? null,
            },
            include: { employe: true, lignes: true },
        })
        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
