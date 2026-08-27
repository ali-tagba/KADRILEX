import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"
import { recomputeFactureStatut, sumPaiements } from "@/lib/server/finance"

/**
 * Suppression d'un paiement.
 *
 * Effets en cascade :
 *  - Supprime la row Paiement
 *  - Recompute `montantPaye` et `statut` de la facture parente
 *    (ex: PAYEE → PARTIELLE → EMISE selon le reste à payer)
 *  - Si le paiement avait une `preuveUrl`, on NE supprime PAS le fichier Storage
 *    (peut être référencé ailleurs ; à nettoyer manuellement si besoin)
 *
 * Garde-fous :
 *  - Le paymentId doit appartenir à la facture du path (anti IDOR)
 *  - Permission `finance.write` requise
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
    try {
        await requirePermission("finance.write")
        const { id: factureId, paymentId } = await params

        const paiement = await prisma.paiement.findUnique({
            where: { id: paymentId },
            include: { facture: { include: { paiements: true } } },
        })
        if (!paiement) throw new HttpError(404, "Paiement introuvable")
        if (paiement.factureId !== factureId) {
            throw new HttpError(403, "Ce paiement n'appartient pas à cette facture")
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.paiement.delete({ where: { id: paymentId } })

            // Recompute montantPaye + statut de la facture
            const remainingPaiements = paiement.facture.paiements.filter(
                (p) => p.id !== paymentId
            )
            const montantPaye = sumPaiements(remainingPaiements)
            const statut = recomputeFactureStatut({
                statutActuel: paiement.facture.statut,
                montantTTC: paiement.facture.montantTTC,
                montantPaye,
                dateEcheance: paiement.facture.dateEcheance,
            })

            const facture = await tx.facture.update({
                where: { id: factureId },
                data: { montantPaye, statut },
                include: {
                    client: true,
                    dossier: true,
                    fournisseur: true,
                    paiements: true,
                    lignes: true,
                },
            })
            return facture
        })

        return Response.json({ ok: true, facture: result })
    } catch (e) {
        return handleApiError(e)
    }
}
