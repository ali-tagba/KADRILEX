/**
 * Helper unique pour les inline edits / PATCH endpoints.
 *
 * Usage :
 *   await patchEntity("/api/clients/" + id, { ville: "Maradi" })
 *
 * Catch automatique côté caller : `.catch(showApiError)` pour afficher une alerte.
 */

export async function patchEntity<T = unknown>(
    endpoint: string,
    patch: Record<string, unknown>
): Promise<T> {
    const r = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
    })
    if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${r.status}`)
    }
    return (await r.json()) as T
}

export async function deleteEntity(endpoint: string): Promise<void> {
    const r = await fetch(endpoint, { method: "DELETE", credentials: "include" })
    if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${r.status}`)
    }
}

export async function postEntity<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>
): Promise<T> {
    const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    })
    if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(e.error ?? `HTTP ${r.status}`)
    }
    return (await r.json()) as T
}

/** Affiche une alerte avec le message d'erreur. */
export function showApiError(prefix: string) {
    return (e: unknown) => {
        const msg = e instanceof Error ? e.message : "Erreur inconnue"
        // Import dynamique pour éviter une dépendance circulaire et garder
        // ce helper compatible serveur (où le toast n'est pas utilisable).
        if (typeof window !== "undefined") {
            void import("@/components/ui/toaster").then(({ toast }) => {
                toast.error(`${prefix} : ${msg}`)
            }).catch(() => {
                // Fallback alert si l'import échoue
                alert(`${prefix} : ${msg}`)
            })
        }
    }
}
