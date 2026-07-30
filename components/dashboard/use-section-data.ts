"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type FetchState<T> = {
    data: T
    isLoading: boolean
    isRefreshing: boolean
    error: string | null
    refresh: () => void
    lastUpdated: Date | null
}

export function useSectionData<T>(
    url: string,
    fallback: T,
    externalRefreshKey?: number
): FetchState<T> {
    const [data, setData] = useState<T>(fallback)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const fetcher = useCallback(
        async (mode: "initial" | "refresh") => {
            if (mode === "refresh") setIsRefreshing(true)
            setError(null)
            try {
                const res = await fetch(url, { cache: "no-store" })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = (await res.json()) as T
                if (!isMounted.current) return
                setData(json)
                setLastUpdated(new Date())
            } catch (err) {
                if (!isMounted.current) return
                setError(err instanceof Error ? err.message : "Erreur inconnue")
            } finally {
                if (!isMounted.current) return
                setIsLoading(false)
                setIsRefreshing(false)
            }
        },
        [url]
    )

    const initialFetched = useRef(false)
    useEffect(() => {
        if (!initialFetched.current) {
            initialFetched.current = true
            fetcher("initial")
        } else {
            fetcher("refresh")
        }
    }, [fetcher, externalRefreshKey])

    const refresh = useCallback(() => {
        fetcher("refresh")
    }, [fetcher])

    return { data, isLoading, isRefreshing, error, refresh, lastUpdated }
}
