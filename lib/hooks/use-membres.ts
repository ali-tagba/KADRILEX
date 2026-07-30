"use client"

import { useEffect, useState } from "react"
import { mockMembres, type MockMembre } from "@/lib/mock/employes"

/**
 * Hook simple pour récupérer la liste des membres.
 *
 * Pourquoi : `mockMembres` est hydraté de manière asynchrone par `DataSyncProvider`.
 * Si un composant (ex: TeamPicker) le lit AVANT que l'hydratation soit finie, il
 * affiche une liste vide. Ce hook fetch directement `/api/membres` au mount,
 * indépendamment du provider, avec un cache module-level pour éviter le N+1.
 *
 * Retourne aussi un état d'erreur pour distinguer "vraiment 0 membre" de
 * "fetch a échoué" (ex: session expirée).
 */

let cache: MockMembre[] | null = null
let inflight: Promise<{ data: MockMembre[]; error: string | null }> | null = null

async function fetchMembres(): Promise<{ data: MockMembre[]; error: string | null }> {
    if (cache) return { data: cache, error: null }
    if (inflight) return inflight
    inflight = (async () => {
        try {
            const r = await fetch("/api/membres", { credentials: "include" })
            if (!r.ok) {
                inflight = null
                return {
                    data: [] as MockMembre[],
                    error:
                        r.status === 401
                            ? "Session expirée — reconnecte-toi"
                            : `Erreur ${r.status}`,
                }
            }
            const data = (await r.json()) as MockMembre[]
            const arr = Array.isArray(data) ? data : []
            cache = arr
            inflight = null
            return { data: arr, error: null }
        } catch (e) {
            inflight = null
            return {
                data: [] as MockMembre[],
                error: e instanceof Error ? e.message : "Erreur réseau",
            }
        }
    })()
    return inflight
}

export interface UseMembresResult {
    membres: MockMembre[]
    loading: boolean
    error: string | null
}

export function useMembres(): MockMembre[] {
    /* Compat API existante — usage prosaïque : `const membres = useMembres()` */
    return useMembresWithState().membres
}

export function useMembresWithState(): UseMembresResult {
    const [membres, setMembres] = useState<MockMembre[]>(() => {
        if (cache && cache.length > 0) return cache
        if (mockMembres.length > 0) return mockMembres
        return []
    })
    const [loading, setLoading] = useState(membres.length === 0)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        fetchMembres().then((res) => {
            if (!alive) return
            if (res.data.length > 0) setMembres(res.data)
            setError(res.error)
            setLoading(false)
        })
        return () => {
            alive = false
        }
    }, [])

    return { membres, loading, error }
}

/** Permet de forcer un rafraîchissement (après création/modification de membre) */
export function invalidateMembresCache() {
    cache = null
    inflight = null
}
