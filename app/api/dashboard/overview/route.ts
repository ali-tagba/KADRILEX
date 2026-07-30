import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, getScope } from "@/lib/auth/server-permissions"
import type { Prisma } from "@prisma/client"

/**
 * Dashboard overview (pulse bar) — données réelles depuis la DB,
 * **scopées au rôle** :
 *  - ASSOCIE_GERANT (scope ALL) → vue globale du cabinet
 *  - Autres rôles (scope OWN) → seules les entités où ils sont responsables
 *    ou membres de l'équipe sont comptées
 */
export async function GET() {
    try {
        const me = await requireAuth()

        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay)
        endOfDay.setDate(startOfDay.getDate() + 1)

        // Compute les scopes une fois — réutilisés pour chaque count
        const dossierScope = getScope(me, "dossiers.view")
        const audienceScope = getScope(me, "audiences.view")
        const tacheScope = getScope(me, "taches.view")
        const clientScope = getScope(me, "clients.view")

        // Helpers de filtrage par équipe (scope OWN)
        const dossierWhereOwn: Prisma.DossierWhereInput = {
            OR: [
                { responsableId: me.id },
                { equipe: { some: { membreId: me.id } } },
            ],
        }
        const audienceWhereOwn: Prisma.AudienceWhereInput = {
            OR: [
                { dossier: { responsableId: me.id } },
                { dossier: { equipe: { some: { membreId: me.id } } } },
                { equipe: { some: { membreId: me.id } } },
            ],
        }
        const tacheWhereOwn: Prisma.TacheWhereInput = {
            OR: [
                { responsableId: me.id },
                { equipe: { some: { membreId: me.id } } },
            ],
        }
        const clientWhereOwn: Prisma.ClientWhereInput = {
            OR: [
                { responsableId: me.id },
                { equipe: { some: { membreId: me.id } } },
            ],
        }

        const [
            audiencesToday,
            nextAudienceRaw,
            activeDossiers,
            activeTasksCount,
            overdueTasksCount,
            activeClientsCount,
            activeTeamCount,
        ] = await Promise.all([
            prisma.audience.count({
                where: {
                    dateDebut: { gte: startOfDay, lt: endOfDay },
                    statut: { in: ["A_VENIR"] },
                    ...(audienceScope === "OWN" ? audienceWhereOwn : {}),
                },
            }),
            prisma.audience.findFirst({
                where: {
                    dateDebut: { gte: now },
                    statut: "A_VENIR",
                    ...(audienceScope === "OWN" ? audienceWhereOwn : {}),
                },
                orderBy: { dateDebut: "asc" },
                include: { dossier: { include: { client: true } } },
            }),
            prisma.dossier.count({
                where: {
                    statut: "EN_COURS",
                    ...(dossierScope === "OWN" ? dossierWhereOwn : {}),
                },
            }),
            prisma.tache.count({
                where: {
                    statut: { in: ["A_FAIRE", "EN_COURS"] },
                    ...(tacheScope === "OWN" ? tacheWhereOwn : {}),
                },
            }),
            prisma.tache.count({
                where: {
                    statut: { in: ["A_FAIRE", "EN_COURS"] },
                    echeance: { lt: now },
                    ...(tacheScope === "OWN" ? tacheWhereOwn : {}),
                },
            }),
            prisma.client.count({
                where: {
                    actif: true,
                    ...(clientScope === "OWN" ? clientWhereOwn : {}),
                },
            }),
            // Équipe : visible pour tous (info publique du cabinet)
            prisma.membre.count({ where: { actif: true } }),
        ])

        const nextAudience = nextAudienceRaw
            ? {
                  id: nextAudienceRaw.id,
                  label: nextAudienceRaw.titre ?? "Audience",
                  date: nextAudienceRaw.dateDebut.toISOString(),
                  heure: nextAudienceRaw.dateDebut.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                  }),
              }
            : null

        return NextResponse.json({
            audiencesToday,
            nextAudience,
            activeDossiers,
            activeDossiersDelta: 0, // calcul de delta à implémenter ultérieurement
            activeTasksCount,
            overdueTasksCount,
            activeClientsCount,
            activeTeamCount,
        })
    } catch (e) {
        const status = (e as { status?: number }).status ?? 500
        if (status === 401) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
        }
        console.error("[dashboard/overview] error", e)
        return NextResponse.json(
            {
                audiencesToday: 0,
                nextAudience: null,
                activeDossiers: 0,
                activeDossiersDelta: 0,
                activeTasksCount: 0,
                overdueTasksCount: 0,
                activeClientsCount: 0,
                activeTeamCount: 0,
            },
            { status: 200 }
        )
    }
}
