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
import { FactureUpdateSchema } from "@/lib/server/schemas"
import { calcTVA, calcTTC, recomputeFactureStatut, sumPaiements } from "@/lib/server/finance"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.view")
        const { id } = await params
        const f = await prisma.facture.findUnique({
            where: { id },
            include: { client: true, dossier: true, fournisseur: true, paiements: true, lignes: true },
        })
        if (!f) throw new HttpError(404, "Facture introuvable")
        return Response.json(f)
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.write")
        const { id } = await params
        const data = await parseJson(req, FactureUpdateSchema)

        const existing = await prisma.facture.findUnique({
            where: { id },
            include: { paiements: true },
        })
        if (!existing) throw new HttpError(404, "Facture introuvable")

        const montantHT = data.montantHT ?? existing.montantHT
        const tvaRate = data.tvaRate ?? existing.tvaRate
        const montantTVA = calcTVA(montantHT, tvaRate)
        const montantTTC = calcTTC(montantHT, tvaRate)
        const montantPaye = sumPaiements(existing.paiements)
        const dateEcheance =
            data.dateEcheance === undefined
                ? existing.dateEcheance
                : data.dateEcheance
                    ? new Date(data.dateEcheance)
                    : null
        const statut = recomputeFactureStatut({
            statutActuel: data.statut ?? existing.statut,
            montantTTC,
            montantPaye,
            dateEcheance,
        })

        // Si des lignes sont fournies, on les remplace intégralement (deleteMany + create)
        // Sinon on garde celles existantes (PATCH partiel).
        const updated = await prisma.$transaction(async (tx) => {
            if (data.lignes !== undefined) {
                await tx.factureLigne.deleteMany({ where: { factureId: id } })
                if (data.lignes.length > 0) {
                    await tx.factureLigne.createMany({
                        data: data.lignes.map((l) => ({
                            factureId: id,
                            libelle: l.libelle,
                            quantite: l.quantite,
                            prixUnitaire: l.prixUnitaire,
                            total: l.total ?? Math.round(l.quantite * l.prixUnitaire),
                            audienceId: l.audienceId ?? null,
                        })),
                    })
                }
            }
            const { lignes: _lignes, ...rest } = data
            return tx.facture.update({
                where: { id },
                data: {
                    ...rest,
                    date: data.date ? new Date(data.date) : undefined,
                    dateEcheance:
                        data.dateEcheance === undefined ? undefined : dateEcheance,
                    montantHT,
                    tvaRate,
                    montantTVA,
                    montantTTC,
                    statut,
                },
                include: { client: true, dossier: true, fournisseur: true, paiements: true, lignes: true },
            })
        })

        return Response.json(updated)
    } catch (e) {
        return handleApiError(e)
    }
}

/**
 * Suppression DÉFINITIVE de la facture (hard delete).
 *
 * Garde-fou : refusée si la facture a déjà un paiement enregistré (montantPaye > 0)
 * ou si son statut est PAYEE — supprimer effacerait l'historique d'encaissement réel.
 * Cascade Prisma : FactureLigne ET Paiement sont supprimés automatiquement
 * (onDelete: Cascade dans le schéma) pour les factures sans paiement.
 * Pour retirer une facture déjà payée du suivi actif sans perdre l'historique,
 * utiliser PATCH { statut: "ANNULEE" }.
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.write")
        const { id } = await params

        const facture = await prisma.facture.findUnique({ where: { id } })
        if (!facture) throw new HttpError(404, "Facture introuvable")
        if (facture.montantPaye > 0 || facture.statut === "PAYEE") {
            throw new HttpError(
                400,
                "Cette facture a déjà un paiement enregistré — utilisez « Annuler » (statut Annulée) pour la retirer du suivi sans perdre l'historique."
            )
        }

        await prisma.facture.delete({ where: { id } })
        return Response.json({ ok: true, deleted: id })
    } catch (e) {
        return handleApiError(e)
    }
}
