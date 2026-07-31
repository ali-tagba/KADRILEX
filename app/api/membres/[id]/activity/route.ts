import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { HttpError, requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("equipe.view")
        const { id } = await params

        const membre = await prisma.membre.findUnique({
            where: { id },
            select: { id: true }
        })
        if (!membre) throw new HttpError(404, "Membre introuvable")

        // We fetch the basic activity for this membre.
        // For clients:
        const clients = await prisma.client.findMany({
            where: {
                OR: [
                    { responsableId: id },
                    { equipe: { some: { membreId: id } } }
                ]
            }
        })

        // For dossiers:
        const dossiers = await prisma.dossier.findMany({
            where: {
                OR: [
                    { responsableId: id },
                    { equipe: { some: { membreId: id } } }
                ]
            }
        })

        // For audiences:
        const audiences = await prisma.audience.findMany({
            where: {
                OR: [
                    { responsableId: id },
                    { equipe: { some: { membreId: id } } }
                ]
            },
            orderBy: { dateDebut: "desc" }
        })

        // For taches:
        const taches = await prisma.tache.findMany({
            where: {
                OR: [
                    { responsableId: id },
                    { equipe: { some: { membreId: id } } }
                ]
            },
            orderBy: { echeance: "asc" }
        })

        // Compute basic stats based on the fetched data
        const now = new Date()
        const dossiersActifs = dossiers.filter(d => d.statut === "EN_COURS")
        const audiencesAVenir = audiences.filter(a => {
            const d = new Date(a.dateDebut)
            return d.getTime() >= now.getTime() && a.statut !== "ANNULEE" && a.statut !== "REPORTEE"
        })
        const tachesEnCours = taches.filter(t => t.statut !== "FAIT" && t.statut !== "ANNULE")
        const tachesEnRetard = tachesEnCours.filter(t => {
            if (!t.echeance) return false
            return new Date(t.echeance).getTime() < now.getTime()
        })

        const score = dossiersActifs.length * 4 + audiencesAVenir.length * 8 + tachesEnCours.length * 2 + tachesEnRetard.length * 6
        const chargePct = Math.min(100, Math.round(score))

        const stats = {
            clients: clients.length,
            dossiers: dossiers.length,
            dossiersActifs: dossiersActifs.length,
            audiencesAVenir: audiencesAVenir.length,
            audiencesTotal: audiences.length,
            tachesEnCours: tachesEnCours.length,
            tachesTotal: taches.length,
            tachesEnRetard: tachesEnRetard.length,
            chargePct,
        }

        return Response.json({
            stats,
            activity: {
                clients,
                dossiers,
                audiences,
                taches,
                ref: now.toISOString()
            }
        })
    } catch (e) {
        return handleApiError(e)
    }
}
