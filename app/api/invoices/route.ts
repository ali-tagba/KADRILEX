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
import { nextFactureNumber } from "@/lib/server/numbering"
import { FactureCreateSchema } from "@/lib/server/schemas"
import { calcTVA, calcTTC, recomputeFactureStatut } from "@/lib/server/finance"
import { AccountingService } from "@/lib/server/accounting"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("finance.view")
        const q = getQuery(req.url)

        const where: Prisma.FactureWhereInput = {}
        if (q.direction) where.direction = q.direction as Prisma.FactureWhereInput["direction"]
        if (q.statut) where.statut = q.statut as Prisma.FactureWhereInput["statut"]
        if (q.clientId) where.clientId = q.clientId
        if (q.dossierId) where.dossierId = q.dossierId
        if (q.from || q.to) {
            where.date = {}
            if (q.from) (where.date as Prisma.DateTimeFilter).gte = new Date(q.from)
            if (q.to) (where.date as Prisma.DateTimeFilter).lte = new Date(q.to)
        }

        // Scope finance OWN : seulement factures liées aux dossiers du membre
        if (getScope(membre, "finance.view") === "OWN") {
            where.OR = [
                { dossier: { responsableId: membre.id } },
                { dossier: { equipe: { some: { membreId: membre.id } } } },
                { client: { responsableId: membre.id } },
            ]
        }

        const factures = await prisma.facture.findMany({
            where,
            orderBy: { date: "desc" },
            include: { client: true, dossier: true, fournisseur: true, paiements: true, lignes: true },
        })
        return Response.json(factures)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("finance.write")
        const data = await parseJson(req, FactureCreateSchema)

        // Calcul TVA + TTC server-side (jamais faire confiance au client)
        const montantTVA = calcTVA(data.montantHT, data.tvaRate)
        const montantTTC = calcTTC(data.montantHT, data.tvaRate)

        const dateEcheance = data.dateEcheance ? new Date(data.dateEcheance) : null
        const statutBrut = data.statut
        const statut = recomputeFactureStatut({
            statutActuel: statutBrut,
            montantTTC,
            montantPaye: 0,
            dateEcheance,
        })

        const created = await prisma.$transaction(async (tx) => {
            const numero = await nextFactureNumber(tx, data.direction)
            const facture = await tx.facture.create({
                data: {
                    numero,
                    direction: data.direction,
                    type: data.type,
                    date: new Date(data.date),
                    dateEcheance,
                    clientId: data.clientId ?? null,
                    dossierId: data.dossierId ?? null,
                    audienceId: data.audienceId ?? null,
                    fournisseurId: data.fournisseurId ?? null,
                    fournisseurNomLibre: data.fournisseurNomLibre ?? null,
                    montantHT: data.montantHT,
                    tvaRate: data.tvaRate,
                    montantTVA,
                    montantTTC,
                    montantPaye: 0,
                    statut,
                    description: data.description ?? null,
                    notes: data.notes ?? null,
                    attachmentUrl: data.attachmentUrl ?? null,
                    lignes: {
                        create: data.lignes.map((l) => ({
                            libelle: l.libelle,
                            quantite: l.quantite,
                            prixUnitaire: l.prixUnitaire,
                            total: l.total ?? Math.round(l.quantite * l.prixUnitaire),
                            audienceId: l.audienceId ?? null,
                        })),
                    },
                }
            })

            return tx.facture.findUnique({
                where: { id: facture.id },
                include: { client: true, dossier: true, fournisseur: true, paiements: true, lignes: true },
            })
        })

        // ⏩ Si la facture est créée directement en statut EMISE (pas brouillon)
        // on génère immédiatement l'écriture comptable
        if (created && statut === "EMISE") {
            try {
                await AccountingService.generateInvoiceEntries(created.id)
            } catch (e) {
                console.error("Erreur écriture facture (création directe EMISE):", e)
            }
        }

        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
