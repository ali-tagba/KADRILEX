"use client"

import { useEffect, useState } from "react"
import { useCurrentUser } from "@/lib/auth/current-user-context"

/**
 * Hook pour persister un état de filtres en localStorage, **scopé par utilisateur**.
 *
 * Chaque utilisateur retrouve ses vues et filtres tels qu'il les avait laissés,
 * indépendamment d'un reload ou d'une navigation entre pages — même si plusieurs
 * utilisateurs partagent la même machine (ex: ordinateur de l'accueil cabinet).
 *
 * Usage :
 *   const [filters, setFilters] = usePersistedFilters("clients", INITIAL_FILTERS)
 *
 * Clé : `kadrilex:filters:<userId>:<moduleKey>` — change avec l'utilisateur connecté.
 * L'écriture en localStorage est debounced (100 ms) pour éviter le thrashing.
 */
export function usePersistedFilters<T extends object>(
    moduleKey: string,
    initial: T,
    /** Optionnel : transformer pour normaliser le format après lecture du JSON */
    sanitize?: (raw: unknown) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const { membre } = useCurrentUser()
    const userId = membre?.id ?? "anonymous"
    const storageKey = `kadrilex:filters:${userId}:${moduleKey}`

    /* Lecture lazy au premier mount — initial est utilisé en SSR pour éviter
       les divergences hydration. Le state est mis à jour dans le useEffect. */
    const [state, setState] = useState<T>(initial)

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(storageKey)
            if (!raw) return
            const parsed = JSON.parse(raw)
            const sanitized = sanitize ? sanitize(parsed) : (parsed as T)
            // Merge sur initial pour gérer les nouveaux champs ajoutés depuis la sauvegarde
            setState((prev) => ({ ...prev, ...sanitized }))
        } catch {
            /* Sérialisation cassée → on garde initial */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey])

    /* Sauvegarde debounced à chaque changement */
    useEffect(() => {
        const tid = window.setTimeout(() => {
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(state))
            } catch {
                /* localStorage plein ou désactivé */
            }
        }, 100)
        return () => window.clearTimeout(tid)
    }, [state, storageKey])

    return [state, setState]
}
