"use client"

/**
 * Hydrate les arrays `mockX` au boot avec les données réelles de l'API.
 *
 * Pourquoi ce hack : la majorité des composants frontend importent
 * `mockClients`, `mockDossiers`, etc. directement. Plutôt que de les refactor
 * un par un pour utiliser SWR (~50+ composants), on mute les arrays
 * en place — JavaScript propage la référence à tous les imports.
 *
 * Quand l'app sera passée à SWR (Sprint 7), ce provider disparaîtra.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { mockClients } from "@/lib/mock/clients"
import { mockDossiers } from "@/lib/mock/dossiers"
import { mockEmployes as mockMembres } from "@/lib/mock/employes"
import { mockAudiences, mockTaches } from "@/lib/mock/audiences"
import { mockDocuments } from "@/lib/mock/documents"
import { mockFactures } from "@/lib/mock/invoices"
import { mockDepenses } from "@/lib/mock/depenses"
import { mockBulletins } from "@/lib/mock/bulletins"
import { mockClients as demoClients } from "@/lib/mock/clients"
import { mockDossiers as demoDossiers } from "@/lib/mock/dossiers"
import { mockEmployes as demoMembres } from "@/lib/mock/employes"
import { mockAudiences as demoAudiences, mockTaches as demoTaches } from "@/lib/mock/audiences"
import { mockDocuments as demoDocuments } from "@/lib/mock/documents"
import { mockFactures as demoFactures } from "@/lib/mock/invoices"
import { mockDepenses as demoDepenses } from "@/lib/mock/depenses"
import { mockBulletins as demoBulletins } from "@/lib/mock/bulletins"

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "0"

const DataSyncContext = createContext<{ synced: boolean; refresh: () => void }>({
    synced: false,
    refresh: () => undefined,
})

export function useDataSynced() {
    return useContext(DataSyncContext).synced
}

export function useDataRefresh() {
    return useContext(DataSyncContext).refresh
}

async function fetchSafe<T>(url: string): Promise<T[]> {
    try {
        const r = await fetch(url, { credentials: "include" })
        if (!r.ok) return []
        const data = await r.json()
        return Array.isArray(data) ? data : []
    } catch {
        return []
    }
}

function hydrate<T>(target: T[], source: T[]) {
    target.splice(0, target.length, ...source)
}

export function DataSyncProvider({ children }: { children: ReactNode }) {
    const [synced, setSynced] = useState(false)
    const [tick, setTick] = useState(0)

    useEffect(() => {
        let alive = true
        const run = async () => {
            if (DEMO_MODE) {
                hydrate(mockClients as unknown[], demoClients)
                hydrate(mockDossiers as unknown[], demoDossiers)
                hydrate(mockAudiences as unknown[], demoAudiences)
                hydrate(mockTaches as unknown[], demoTaches)
                hydrate(mockDocuments as unknown[], demoDocuments)
                hydrate(mockMembres as unknown[], demoMembres)
                hydrate(mockFactures as unknown[], demoFactures)
                hydrate(mockDepenses as unknown[], demoDepenses)
                hydrate(mockBulletins as unknown[], demoBulletins)
                if (alive) setSynced(true)
                return
            }
            const [clients, dossiers, audiences, taches, documents, membres, factures, depenses, bulletins] =
                await Promise.all([
                    fetchSafe<unknown>("/api/clients"),
                    fetchSafe<unknown>("/api/dossiers"),
                    fetchSafe<unknown>("/api/audiences"),
                    fetchSafe<unknown>("/api/taches"),
                    fetchSafe<unknown>("/api/documents"),
                    fetchSafe<unknown>("/api/membres"),
                    fetchSafe<unknown>("/api/invoices"),
                    fetchSafe<unknown>("/api/depenses"),
                    fetchSafe<unknown>("/api/bulletins"),
                ])
            if (!alive) return
            // Cast nécessaire car les shapes API matchent largement les mocks
            hydrate(mockClients as unknown[], clients)
            hydrate(mockDossiers as unknown[], dossiers)
            hydrate(mockAudiences as unknown[], audiences)
            hydrate(mockTaches as unknown[], taches)
            hydrate(mockDocuments as unknown[], documents)
            hydrate(mockMembres as unknown[], membres)
            hydrate(mockFactures as unknown[], factures)
            hydrate(mockDepenses as unknown[], depenses)
            hydrate(mockBulletins as unknown[], bulletins)
            setSynced(true)
        }
        run()
        return () => {
            alive = false
        }
    }, [tick])

    const refresh = () => setTick((t) => t + 1)

    return (
        <DataSyncContext.Provider value={{ synced, refresh }}>
            {children}
        </DataSyncContext.Provider>
    )
}
