import { NextRequest } from "next/server"
import { z } from "zod"
import {
    requireAuth,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { deleteFile, KADRILEX_BUCKET } from "@/lib/storage/supabase"
import { assertCanAccessPath } from "@/lib/server/storage-access"

const Schema = z.object({
    paths: z.array(z.string().min(1).max(500)).min(1).max(50),
})

export async function POST(req: NextRequest) {
    try {
        const membre = await requireAuth()
        const { paths } = await parseJson(req, Schema)
        // CRITIQUE : vérifie ownership pour CHAQUE path avant suppression
        // (sinon un membre peut supprimer les fichiers de toute l'app)
        await Promise.all(paths.map((p) => assertCanAccessPath(p, membre)))
        await deleteFile(KADRILEX_BUCKET, paths)
        return Response.json({ ok: true, deleted: paths.length })
    } catch (e) {
        return handleApiError(e)
    }
}
