import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
    getQuery,
} from "@/lib/server/api-helpers"
import { DepenseCreateSchema } from "@/lib/server/schemas"
import { calcTVA, calcTTC } from "@/lib/server/finance"
import { AccountingService } from "@/lib/server/accounting"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)

        const where: Prisma.DepenseWhereInput = {}
        if (q.categorie) where.categorie = q.categorie as Prisma.DepenseWhereInput["categorie"]
        if (q.recurrent === "true") where.recurrent = true
        if (q.recurrent === "false") where.recurrent = false
        if (q.from || q.to) {
            where.date = {}
            if (q.from) (where.date as Prisma.DateTimeFilter).gte = new Date(q.from)
            if (q.to) (where.date as Prisma.DateTimeFilter).lte = new Date(q.to)
        }

        const depenses = await prisma.depense.findMany({
            where,
            orderBy: { date: "desc" },
            include: { fournisseur: true, dossier: true },
        })
        return Response.json(depenses)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("finance.write")
        const data = await parseJson(req, DepenseCreateSchema)

        const montantTVA = calcTVA(data.montantHT, data.tvaRate)
        const montantTTC = calcTTC(data.montantHT, data.tvaRate)

        const created = await prisma.depense.create({
            data: {
                ...data,
                dossierId: data.dossierId ?? null,
                fournisseurId: data.fournisseurId ?? null,
                fournisseurNomLibre: data.fournisseurNomLibre ?? null,
                employeId: data.employeId ?? null,
                notes: data.notes ?? null,
                attachmentUrl: data.attachmentUrl ?? null,
                reference: data.reference ?? null,
                date: new Date(data.date),
                montantTVA,
                montantTTC,
            },
        })

        // Synchronisation avec le module Comptabilité
        try {
            await AccountingService.generateExpenseEntries(created.id)
        } catch (accError) {
            console.error("Erreur génération écriture comptable pour dépense:", accError)
            // On ne bloque pas la réponse si la synchro compta échoue
        }

        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
