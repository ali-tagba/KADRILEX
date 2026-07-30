import { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"
import {
    handleApiError,
    HttpError,
} from "@/lib/server/api-helpers"
import { recomputeBulletin } from "@/lib/server/finance"

/**
 * Endpoint cron : génère les bulletins BROUILLON pour le mois courant.
 *
 * Sécurité v2 : JWT signé HS256 dans l'header `Authorization: Bearer <jwt>`.
 *
 * Le JWT contient : `iss: "kadrilex-cron"`, `iat`, `exp` (5 min de validité).
 * Avantages vs static header :
 *  - Signé : impossible de forger sans la clé
 *  - Expiration : un JWT intercepté est invalide après 5 min (vs static = valable à vie)
 *  - Auditabilité : payload `iat` traçable
 *
 * Le secret est dans `CRON_JWT_SECRET` env var.
 * Le script cron VPS génère le JWT au moment du call avec la même clé.
 *
 * Backward compat : si l'header `X-Cron-Secret` matche `CRON_SECRET` env, on
 * accepte aussi (pour ne pas casser un déploiement systemd en cours).
 *
 * Trigger depuis le VPS : systemd timer + curl le 1er de chaque mois 03h00.
 *
 * Idempotent : upsert sur unique constraint (employeId, annee, mois).
 */

async function verifyCronAuth(req: NextRequest): Promise<void> {
    const auth = req.headers.get("authorization")
    const bearerMatch = auth?.match(/^Bearer\s+(.+)$/i)
    if (bearerMatch) {
        const jwtSecret = process.env.CRON_JWT_SECRET
        if (!jwtSecret) throw new HttpError(500, "CRON_JWT_SECRET non configuré")
        try {
            const { payload } = await jwtVerify(
                bearerMatch[1],
                new TextEncoder().encode(jwtSecret),
                { issuer: "kadrilex-cron", algorithms: ["HS256"] }
            )
            // payload.exp est validé automatiquement par jose
            if (!payload.iat) throw new Error("iat manquant")
            return
        } catch (e) {
            throw new HttpError(401, `JWT cron invalide : ${(e as Error).message}`)
        }
    }

    // Fallback legacy : X-Cron-Secret header (à retirer une fois systemd migré)
    const expected = process.env.CRON_SECRET
    const provided = req.headers.get("x-cron-secret")
    if (!expected || provided !== expected) {
        throw new HttpError(401, "Authentification cron requise")
    }
}

export async function POST(req: NextRequest) {
    try {
        await verifyCronAuth(req)

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
                update: {}, // n'écrase pas un bulletin existant
            })
            results.push({ id: b.id, employe: m.email, statut: b.statut })
        }

        return Response.json({
            ok: true,
            annee,
            mois,
            generated: results.length,
            results,
        })
    } catch (e) {
        return handleApiError(e)
    }
}
