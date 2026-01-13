"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { FlashCR } from "@/lib/types/audience"

interface FlashCRStore {
    flashCrs: FlashCR[]
    addFlashCr: (flashCr: Omit<FlashCR, "id">) => void
    updateFlashCr: (id: string, updates: Partial<FlashCR>) => void
    deleteFlashCr: (id: string) => void
    getFlashCrById: (id: string) => FlashCR | undefined
    getFlashCrByAudience: (audienceId: string) => FlashCR | undefined
}

const DEMO_FLASH_CRS: FlashCR[] = [
    {
        id: "flash-1",
        audienceId: "aud-3", // Corresponds to the COMPLETED mock audience
        clientId: "client-3",
        dossierId: "dossier-3",
        contenu: "L'audience de référé s'est tenue ce matin. Le juge a renvoyé l'affaire pour communication de pièces au 15 mars. Nous devons préparer les conclusions en réponse.",
        dateCreation: "2024-03-10T11:00:00Z",
        destinataires: ["juridique@atlantique.ci"],
        statutEnvoi: "SENT"
    }
]

export const useFlashCRStore = create<FlashCRStore>()(
    persist(
        (set, get) => ({
            flashCrs: DEMO_FLASH_CRS,

            addFlashCr: (data) => set((state) => ({
                flashCrs: [...state.flashCrs, { ...data, id: `flash-${Date.now()}` }]
            })),

            updateFlashCr: (id, updates) => set((state) => ({
                flashCrs: state.flashCrs.map((item) =>
                    item.id === id ? { ...item, ...updates } : item
                )
            })),

            deleteFlashCr: (id) => set((state) => ({
                flashCrs: state.flashCrs.filter((item) => item.id !== id)
            })),

            getFlashCrById: (id) => get().flashCrs.find((item) => item.id === id),

            getFlashCrByAudience: (audienceId) =>
                get().flashCrs.find((item) => item.audienceId === audienceId),
        }),
        {
            name: "dedalys-flash-crs",
        }
    )
)
