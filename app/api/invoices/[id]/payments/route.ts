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
import { PaiementCreateSchema } from "@/lib/server/schemas"
import { recomputeFactureStatut, sumPaiements } from "@/lib/server/finance"

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.write")
        const { id } = await params
        const data = await parseJson(req, PaiementCreateSchema)

        const facture = await prisma.facture.findUnique({
            where: { id },
            include: { paiements: true },
        })
        if (!facture) throw new HttpError(404, "Facture introuvable")
        if (facture.statut === "ANNULEE") {
            throw new HttpError(400, "Facture annulée, aucun paiement possible")
        }

        const result = await prisma.$transaction(async (tx) => {
            const newPaiement = await tx.paiement.create({
                data: {
                    factureId: id,
                    date: new Date(data.date),
                    montant: data.montant,
                    mode: data.mode,
                    reference: data.reference ?? null,
                    notes: data.notes ?? null,
                    preuveUrl: data.preuveUrl ?? null,
                },
            })
            const allPaiements = [...facture.paiements, newPaiement]
            const montantPaye = sumPaiements(allPaiements)
            const statut = recomputeFactureStatut({
                statutActuel: facture.statut,
                montantTTC: facture.montantTTC,
                montantPaye,
                dateEcheance: facture.dateEcheance,
            })
            const updated = await tx.facture.update({
                where: { id },
                data: { montantPaye, statut },
                include: { paiements: true, client: true, dossier: true, lignes: true },
            })
            return { paiement: newPaiement, facture: updated }
        })

        return Response.json(result, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
