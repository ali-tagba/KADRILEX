import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
} from "@/lib/server/api-helpers"
import { recomputeBulletin } from "@/lib/server/finance"

/**
 * Génère les bulletins BROUILLON pour tous les membres actifs salariés
 * qui n'ont pas encore de bulletin pour le mois courant.
 *
 * Idempotent : peut être rappelé en safe (upsert sur unique constraint).
 * Sera déclenché par un cron mensuel (Sprint 5+).
 */
export async function POST(req: NextRequest) {
    try {
        await requirePermission("paie.write")
        const url = new URL(req.url)
        const annee = Number(url.searchParams.get("annee") ?? new Date().getFullYear())
        const mois = Number(url.searchParams.get("mois") ?? new Date().getMonth() + 1)

        const salaries = await prisma.membre.findMany({
            where: {
                actif: true,
                salaireBaseBrut: { gt: 0 },
                statutContrat: { not: "ASSOCIE" },
            },
        })

        const results = []
        for (const m of salaries) {
            const computed = recomputeBulletin({
                salaireBrut: m.salaireBaseBrut,
                primes: 0,
                retenues: 0,
            })
            const b = await prisma.bulletin.upsert({
                where: {
                    employeId_annee_mois: { employeId: m.id, annee, mois },
                },
                create: {
                    employeId: m.id,
                    annee,
                    mois,
                    ...computed,
                    statut: "BROUILLON",
                    modeVersement: m.modeVersementParDefaut,
                    lignes: {
                        create: [
                            { libelle: "Salaire de base", type: "GAIN", montant: computed.salaireBrut },
                            { libelle: "CNSS salariale", type: "CHARGE_SALARIALE", montant: computed.chargesSalariales },
                            { libelle: "CNSS patronale", type: "CHARGE_PATRONALE", montant: computed.chargesPatronales },
                        ],
                    },
                },
                update: {}, // n'écrase pas un bulletin existant (déjà édité)
            })
            results.push(b)
        }

        return Response.json({
            annee,
            mois,
            generated: results.length,
            bulletins: results,
        })
    } catch (e) {
        return handleApiError(e)
    }
}
