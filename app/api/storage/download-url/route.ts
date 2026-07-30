import { NextRequest } from "next/server"
import {
    HttpError,
    requireAuth,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
} from "@/lib/server/api-helpers"
import { getSignedUrl, KADRILEX_BUCKET } from "@/lib/storage/supabase"
import { assertCanAccessPath } from "@/lib/server/storage-access"

/**
 * Retourne une signed URL temporaire de download.
 *
 * Query params :
 *   - path  : chemin dans le bucket (ex: "dossiers/MEMBRE/12345-fichier.pdf")
 *   - ttl   : optionnel, durée en secondes (défaut 3600 = 1h)
 */
export async function GET(req: NextRequest) {
    try {
        const membre = await requireAuth()
        const url = new URL(req.url)
        const path = url.searchParams.get("path")
        if (!path) throw new HttpError(400, "Param 'path' requis")

        // CRITIQUE : vérification ownership avant de générer une signed URL
        await assertCanAccessPath(path, membre)

        // Clamp TTL : max 1 heure (évite la création de signed URL valable 1 an)
        const rawTtl = Number(url.searchParams.get("ttl") ?? "3600")
        const ttl = Math.min(Math.max(60, rawTtl || 3600), 3600)
        const signedUrl = await getSignedUrl(KADRILEX_BUCKET, path, ttl)
        return Response.json({ signedUrl, path, ttl })
    } catch (e) {
        return handleApiError(e)
    }
}
