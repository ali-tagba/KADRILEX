"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { MockDossier } from "@/lib/mock/dossiers"
import type { MockClient } from "@/lib/mock/clients"

export interface DossierConflit {
    partie: string
    client: MockClient
}

export interface DossierContextValue {
    dossier: MockDossier
    client: MockClient | null
    conflits: DossierConflit[]
}

const DossierContext = createContext<DossierContextValue | null>(null)

interface DossierProviderProps {
    value: DossierContextValue
    children: ReactNode
}

export function DossierProvider({ value, children }: DossierProviderProps) {
    return <DossierContext.Provider value={value}>{children}</DossierContext.Provider>
}

export function useDossier(): DossierContextValue {
    const ctx = useContext(DossierContext)
    if (!ctx) {
        throw new Error("useDossier doit être utilisé à l'intérieur d'un DossierProvider")
    }
    return ctx
}
