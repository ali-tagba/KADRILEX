import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/server-permissions"

/**
 * Dossiers récents — 5 derniers ouverts ou modifiés (réservé pour le dashboard).
 */
export async function GET() {
    try {
        await requireAuth()

        const dossiers = await prisma.dossier.findMany({
            orderBy: [{ updatedAt: "desc" }, { dateOuverture: "desc" }],
            take: 5,
            include: { client: true, responsable: true },
        })

        const list = dossiers.map((d) => {
            const c = d.client
            const clientName = c
                ? c.type === "PERSONNE_MORALE"
                    ? c.raisonSociale ?? "—"
                    : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "—"
                : "—"
            return {
                id: d.id,
                numero: d.numero,
                titre: d.titre,
                statut: d.statut,
                clientName,
                responsable: d.responsable
                    ? `${d.responsable.prenom} ${d.responsable.nom}`
                    : "—",
                dateOuverture: d.dateOuverture.toISOString(),
            }
        })

        return NextResponse.json(list)
    } catch (e) {
        const status = (e as { status?: number }).status ?? 500
        if (status === 401) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
        console.error("[dashboard/dossiers-recent] error", e)
        return NextResponse.json([])
    }
}
