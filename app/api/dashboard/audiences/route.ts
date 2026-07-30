import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/server-permissions"

/**
 * Audiences à venir — 5 prochaines (statut A_VENIR, ordre chronologique).
 */
export async function GET() {
    try {
        await requireAuth()
        const now = new Date()

        const audiences = await prisma.audience.findMany({
            where: { dateDebut: { gte: now }, statut: "A_VENIR" },
            orderBy: { dateDebut: "asc" },
            take: 5,
            include: { dossier: { include: { client: true } } },
        })

        const list = audiences.map((a) => {
            const c = a.dossier?.client
            const clientName = c
                ? c.type === "PERSONNE_MORALE"
                    ? c.raisonSociale ?? "—"
                    : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "—"
                : "—"
            const start = new Date(a.dateDebut)
            const dureeMinutes = a.dureeMinutes ?? 60
            return {
                id: a.id,
                label: a.titre ?? `Audience ${clientName}`,
                date: start.toISOString(),
                heure: start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                duree: dureeMinutes,
                clientName,
                dossierNumero: a.dossier?.numero ?? "—",
                juridiction: a.juridiction ?? "—",
            }
        })

        return NextResponse.json(list)
    } catch (e) {
        const status = (e as { status?: number }).status ?? 500
        if (status === 401) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
        console.error("[dashboard/audiences] error", e)
        return NextResponse.json([])
    }
}
