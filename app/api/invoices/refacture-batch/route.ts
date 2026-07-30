import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { RefactureBatchSchema } from "@/lib/server/schemas"
import { nextFactureNumber } from "@/lib/server/numbering"
import { calcTVA, calcTTC, TAUX_TVA_NIGER } from "@/lib/server/finance"

/**
 * Génère 1 facture EMISE depuis N factures RECUE refacturables.
 * Marque les factures sources avec refactureeViaFactureId.
 *
 * Use case : à la fin du mois, l'avocat sélectionne les frais d'huissier
 * payés sur les dossiers et les refacture en bloc au client.
 */
export async function POST(req: NextRequest) {
    try {
        await requirePermission("finance.write")
        const data = await parseJson(req, RefactureBatchSchema)

        const factures = await prisma.facture.findMany({
            where: { id: { in: data.factureIds } },
        })
        if (factures.length !== data.factureIds.length) {
            throw new HttpError(400, "Une ou plusieurs factures introuvables")
        }

        for (const f of factures) {
            if (f.direction !== "RECUE") {
                throw new HttpError(400, `Facture ${f.numero} n'est pas RECUE`)
            }
            if (!f.refacturable) {
                throw new HttpError(400, `Facture ${f.numero} non marquée refacturable`)
            }
            if (f.refactureeViaFactureId) {
                throw new HttpError(400, `Facture ${f.numero} déjà refacturée`)
            }
        }

        const sumHT = factures.reduce((s, f) => s + f.montantHT, 0)
        const montantTVA = calcTVA(sumHT, TAUX_TVA_NIGER)
        const montantTTC = calcTTC(sumHT, TAUX_TVA_NIGER)

        const result = await prisma.$transaction(async (tx) => {
            const numero = await nextFactureNumber(tx, "EMISE")
            const created = await tx.facture.create({
                data: {
                    numero,
                    direction: "EMISE",
                    date: new Date(),
                    clientId: data.clientId,
                    dossierId: data.dossierId ?? null,
                    montantHT: sumHT,
                    tvaRate: TAUX_TVA_NIGER,
                    montantTVA,
                    montantTTC,
                    montantPaye: 0,
                    statut: "EMISE",
                    description:
                        data.description ??
                        `Refacturation frais externes (${factures.length} ligne(s))`,
                    lignes: {
                        create: factures.map((f) => ({
                            libelle: f.description ?? `Frais ${f.numero}`,
                            quantite: 1,
                            prixUnitaire: f.montantHT,
                            total: f.montantHT,
                        })),
                    },
                },
                include: { lignes: true, client: true, dossier: true },
            })
            await tx.facture.updateMany({
                where: { id: { in: data.factureIds } },
                data: { refactureeViaFactureId: created.id },
            })
            return created
        })
        return Response.json(result, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
