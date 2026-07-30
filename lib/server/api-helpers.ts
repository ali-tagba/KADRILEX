/**
 * Helpers communs aux Route Handlers Next.js.
 *
 * Pattern d'usage :
 *
 *   export async function POST(req: Request) {
 *     try {
 *       const membre = await requirePermission("clients.write")
 *       const body = await parseJson(req, ClientCreateSchema)
 *       ...
 *       return Response.json(result)
 *     } catch (e) {
 *       return handleApiError(e)
 *     }
 *   }
 */

import { HttpError } from "@/lib/auth/server-permissions"
import { ZodError, type ZodTypeAny, type z } from "zod"

export { HttpError }

/** Parse + valide le body JSON contre un schéma Zod. Throw HttpError(400) si invalide. */
export async function parseJson<T extends ZodTypeAny>(
    req: Request,
    schema: T
): Promise<z.infer<T>> {
    let raw: unknown
    try {
        raw = await req.json()
    } catch {
        throw new HttpError(400, "Body JSON invalide")
    }
    const result = schema.safeParse(raw)
    if (!result.success) {
        throw new HttpError(
            400,
            "Payload invalide : " + result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
        )
    }
    return result.data
}

export function handleApiError(error: unknown): Response {
    if (error instanceof HttpError) {
        return Response.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof ZodError) {
        return Response.json(
            { error: "Validation Zod : " + error.issues.map((i) => i.message).join(", ") },
            { status: 400 }
        )
    }
    console.error("Unhandled API error:", error)
    return Response.json({ error: "Erreur interne" }, { status: 500 })
}

/** Read query params from a URL en safe (objet plat strings). */
export function getQuery(url: string): Record<string, string> {
    const u = new URL(url)
    const out: Record<string, string> = {}
    u.searchParams.forEach((v, k) => {
        out[k] = v
    })
    return out
}
