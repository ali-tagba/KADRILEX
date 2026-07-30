import { NextRequest } from "next/server"
import { z } from "zod"
import {
    requireAuth,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { createSignedUploadUrl, KADRILEX_BUCKET } from "@/lib/storage/supabase"

const Schema = z.object({
    /** Catégorie pour organiser le bucket (dossiers/, documents/, paie/). */
    category: z.enum(["dossiers", "documents", "paie", "factures", "depenses"]),
    /** Nom de fichier original (utilisé pour l'extension). */
    fileName: z.string().min(1).max(300),
})

/**
 * Retourne une signed URL d'upload PUT direct sur Supabase Storage.
 *
 * Workflow client :
 *   1. POST /api/storage/upload-url { category, fileName } → { signedUrl, path }
 *   2. PUT signedUrl avec body=file → 200
 *   3. PATCH /api/dossier-files/[id] { url: path } pour persister la référence
 */
export async function POST(req: NextRequest) {
    try {
        const membre = await requireAuth()
        const { category, fileName } = await parseJson(req, Schema)

        // Path : <category>/<membreId>/<timestamp>-<sanitized>
        const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200)
        const ts = Date.now()
        const path = `${category}/${membre.id}/${ts}-${safe}`

        const result = await createSignedUploadUrl(KADRILEX_BUCKET, path)
        return Response.json({
            ...result,
            bucket: KADRILEX_BUCKET,
        })
    } catch (e) {
        return handleApiError(e)
    }
}
