import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"

/**
 * Alias legacy : redirige vers les Membres.
 * Conservé pour compat avec le module Paie qui référence "employes".
 */
export async function GET(_req: NextRequest) {
    try {
        await requirePermission("equipe.view")
        const membres = await prisma.membre.findMany({
            where: { actif: true },
            orderBy: [{ nom: "asc" }],
        })
        // Strip codeAccesHash + ajouter codeAcces masqué pour compat mock
        return Response.json(
            membres.map(({ codeAccesHash: _h, ...m }) => ({ ...m, codeAcces: "•••-•••-••••" }))
        )
    } catch (e) {
        return handleApiError(e)
    }
}
