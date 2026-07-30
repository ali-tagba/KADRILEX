import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/server-permissions"

/**
 * Compteurs par catégorie de la bibliothèque (documents actifs uniquement).
 */
export async function GET() {
    try {
        await requireAuth()

        const rows = await prisma.document.groupBy({
            by: ["categorie"],
            where: { statut: "ACTIF" },
            _count: { _all: true },
        })

        const counts = {
            JURISPRUDENCE: 0,
            DECISION_JUSTICE: 0,
            DOCTRINE: 0,
            MODELE: 0,
            INTERNE: 0,
        }
        for (const r of rows) {
            if (r.categorie === "JURISPRUDENCE") counts.JURISPRUDENCE = r._count._all
            else if (r.categorie === "DECISION_JUSTICE") counts.DECISION_JUSTICE = r._count._all
            else if (r.categorie === "DOCTRINE") counts.DOCTRINE = r._count._all
            else if (r.categorie === "MODELE") counts.MODELE = r._count._all
            else if (r.categorie === "INTERNE" || r.categorie === "AUTRE")
                counts.INTERNE += r._count._all
        }

        return NextResponse.json(counts)
    } catch (e) {
        const status = (e as { status?: number }).status ?? 500
        if (status === 401) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
        console.error("[documents/stats] error", e)
        return NextResponse.json({
            JURISPRUDENCE: 0,
            DECISION_JUSTICE: 0,
            DOCTRINE: 0,
            MODELE: 0,
            INTERNE: 0,
        })
    }
}
