import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    can,
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"
import { computeDossierFinance } from "@/lib/server/finance"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("dossiers.view")
        const { id } = await params

        const dossier = await prisma.dossier.findUnique({
            where: { id },
            include: { equipe: true, factures: true },
        })
        if (!dossier) throw new HttpError(404, "Dossier introuvable")
        const resource = {
            responsableId: dossier.responsableId,
            equipeIds: dossier.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "dossiers.view", resource)) {
            throw new HttpError(403, "Accès refusé")
        }

        const finance = computeDossierFinance(dossier.factures)
        return Response.json({
            dossierId: dossier.id,
            numero: dossier.numero,
            honoraires: dossier.honoraires,
            retrocession: dossier.retrocession,
            ...finance,
        })
    } catch (e) {
        return handleApiError(e)
    }
}
