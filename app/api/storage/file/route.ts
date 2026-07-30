import { NextRequest } from "next/server"
import {
    HttpError,
    requireAuth,
} from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"
import { getSupabaseAdmin, KADRILEX_BUCKET } from "@/lib/storage/supabase"
import { assertCanAccessPath } from "@/lib/server/storage-access"

/**
 * Proxy serveur pour servir les fichiers du Storage Supabase **en same-origin**.
 *
 * Pourquoi : Supabase est sur un sous-domaine différent (cross-origin).
 *  - L'attribut `<a download>` est ignoré cross-origin → fichier s'ouvre au lieu de télécharger.
 *  - `fetch(signedUrl)` requiert CORS sur le bucket Supabase.
 * Ce proxy évite les deux problèmes : tout passe par l'origine de l'app.
 *
 * Query params :
 *   - path     : chemin dans le bucket (ex: "dossiers/MEMBRE/12345-fichier.pdf")
 *   - download : "1" pour forcer Content-Disposition: attachment
 *   - name     : nom de fichier suggéré (optionnel — défaut: basename de path)
 */
export async function GET(req: NextRequest) {
    try {
        const membre = await requireAuth()
        const url = new URL(req.url)
        const path = url.searchParams.get("path")
        if (!path) throw new HttpError(400, "Param 'path' requis")

        // CRITIQUE : vérifie que l'utilisateur a le droit d'accéder à CE fichier
        // précis (pas seulement qu'il est authentifié). Sans ce check, IDOR.
        await assertCanAccessPath(path, membre)

        const download = url.searchParams.get("download") === "1"
        const suggestedName =
            url.searchParams.get("name") ?? path.split("/").pop() ?? "fichier"

        const sb = getSupabaseAdmin()
        const { data, error } = await sb.storage
            .from(KADRILEX_BUCKET)
            .download(path)
        if (error || !data) {
            throw new HttpError(404, error?.message ?? "Fichier introuvable")
        }

        const contentType = data.type || "application/octet-stream"
        const dispositionType = download ? "attachment" : "inline"
        // RFC 5987 — supporte les caractères non-ASCII (accents, espaces, etc.)
        const asciiName = suggestedName.replace(/[^\x20-\x7E]/g, "_")
        const utf8Name = encodeURIComponent(suggestedName)
        const disposition = `${dispositionType}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`

        return new Response(data, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": disposition,
                "Cache-Control": "private, max-age=300",
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
