import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/server-permissions"

/**
 * Factures émises en retard de paiement (statut EN_RETARD avec reste > 0).
 * Triées par jours de retard décroissants.
 */
export async function GET() {
    try {
        await requireAuth()
        const now = new Date()

        const factures = await prisma.facture.findMany({
            where: {
                direction: "EMISE",
                OR: [
                    { statut: "EN_RETARD" },
                    // Filet de sécurité : factures avec dateEcheance passée et non soldées
                    {
                        dateEcheance: { lt: now },
                        statut: { in: ["EMISE", "PARTIELLE"] },
                    },
                ],
            },
            include: { client: true },
            orderBy: { dateEcheance: "asc" },
            take: 20,
        })

        const list = factures
            .filter((f) => f.montantTTC - f.montantPaye > 0)
            .map((f) => {
                const c = f.client
                const clientName = c
                    ? c.type === "PERSONNE_MORALE"
                        ? c.raisonSociale ?? "—"
                        : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "—"
                    : "—"
                const daysLate = f.dateEcheance
                    ? Math.floor((now.getTime() - new Date(f.dateEcheance).getTime()) / 86_400_000)
                    : 0
                return {
                    id: f.id,
                    numero: f.numero,
                    date: f.date.toISOString(),
                    dateEcheance: f.dateEcheance?.toISOString() ?? null,
                    daysLate,
                    clientName,
                    dossierId: f.dossierId,
                    montantTTC: f.montantTTC,
                    montantPaye: f.montantPaye,
                    montantRestant: f.montantTTC - f.montantPaye,
                    statut: f.statut,
                }
            })
            .sort((a, b) => b.daysLate - a.daysLate)

        return NextResponse.json(list)
    } catch (e) {
        const status = (e as { status?: number }).status ?? 500
        if (status === 401) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
        console.error("[dashboard/invoices-overdue] error", e)
        return NextResponse.json([])
    }
}
