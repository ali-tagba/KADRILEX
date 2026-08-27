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
import { MembreDeactivateSchema } from "@/lib/server/schemas"

/**
 * Désactive un membre en transférant atomiquement toutes ses entités
 * (Client, Dossier, Audience, Tâche) vers un autre membre.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("equipe.write")
        const { id } = await params
        const data = await parseJson(req, MembreDeactivateSchema)

        if (data.transfertVers === id) {
            throw new HttpError(400, "transfertVers doit être un autre membre que celui désactivé")
        }

        const [membre, cible] = await Promise.all([
            prisma.membre.findUnique({ where: { id } }),
            prisma.membre.findUnique({ where: { id: data.transfertVers } }),
        ])
        if (!membre) throw new HttpError(404, "Membre introuvable")
        if (!cible || !cible.actif) {
            throw new HttpError(400, "Le membre cible doit exister et être actif")
        }

        const result = await prisma.$transaction(async (tx) => {
            // Transferts de responsabilité
            const updates = await Promise.all([
                tx.client.updateMany({
                    where: { responsableId: id },
                    data: { responsableId: data.transfertVers },
                }),
                tx.dossier.updateMany({
                    where: { responsableId: id },
                    data: { responsableId: data.transfertVers },
                }),
                tx.audience.updateMany({
                    where: { responsableId: id },
                    data: { responsableId: data.transfertVers },
                }),
                tx.tache.updateMany({
                    where: { responsableId: id },
                    data: { responsableId: data.transfertVers },
                }),
                // Retirer le membre de toutes les équipes
                tx.clientEquipe.deleteMany({ where: { membreId: id } }),
                tx.dossierEquipe.deleteMany({ where: { membreId: id } }),
                tx.audienceEquipe.deleteMany({ where: { membreId: id } }),
                tx.tacheEquipe.deleteMany({ where: { membreId: id } }),
            ])

            // Désactiver le membre
            const desactive = await tx.membre.update({
                where: { id },
                data: {
                    actif: false,
                    dateSortie: new Date(),
                    motifSortie: data.motifSortie ?? null,
                    invitationStatut: "DESACTIVE",
                },
            })

            return {
                membre: { ...desactive, codeAccesHash: undefined },
                transferts: {
                    clients: updates[0].count,
                    dossiers: updates[1].count,
                    audiences: updates[2].count,
                    taches: updates[3].count,
                },
            }
        })

        return Response.json(result)
    } catch (e) {
        return handleApiError(e)
    }
}
