"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Audience } from "@/lib/types/audience"

interface AudienceStore {
    audiences: Audience[]
    addAudience: (audience: Omit<Audience, "id">) => void
    updateAudience: (id: string, updates: Partial<Audience>) => void
    deleteAudience: (id: string) => void
    getAudienceById: (id: string) => Audience | undefined
    getAudiencesByDossier: (dossierId: string) => Audience[]
}

const DEMO_AUDIENCES: Audience[] = [
    {
        id: "aud-1",
        title: "Plaidoirie sur le fond",
        date: new Date(Date.now() + 86400000).toISOString(), // Demain
        juridiction: "Tribunal de Commerce d'Abidjan",
        avocatId: "MK",
        avocatSignataireId: "MK",
        clientId: "client-sotra",
        dossierId: "dossier-1", // Assumed existing dossier
        status: "UPCOMING",
        notes: "Préparer le dossier de plaidoirie complet."
    },
    {
        id: "aud-2",
        title: "Mise en état",
        date: new Date(Date.now() + 86400000 * 3).toISOString(), // Dans 3 jours
        juridiction: "Cour d'Appel",
        avocatId: "MK",
        avocatSignataireId: "MK",
        clientId: "client-2",
        dossierId: "dossier-2",
        status: "UPCOMING"
    },
    {
        id: "aud-3",
        title: "Audience de référé",
        date: new Date(Date.now() - 86400000).toISOString(), // Hier
        juridiction: "TPI Plateau",
        avocatId: "MK",
        avocatSignataireId: "MK",
        clientId: "client-3",
        dossierId: "dossier-3",
        status: "COMPLETED",
        flashCrId: "flash-1" // Mock linked FlashCR
    }
]

export const useAudienceStore = create<AudienceStore>()(
    persist(
        (set, get) => ({
            audiences: DEMO_AUDIENCES, // Initial mock data directly in store for dev

            addAudience: (data) => set((state) => ({
                audiences: [...state.audiences, { ...data, id: `aud-${Date.now()}` }]
            })),

            updateAudience: (id, updates) => set((state) => ({
                audiences: state.audiences.map((aud) =>
                    aud.id === id ? { ...aud, ...updates } : aud
                )
            })),

            deleteAudience: (id) => set((state) => ({
                audiences: state.audiences.filter((aud) => aud.id !== id)
            })),

            getAudienceById: (id) => get().audiences.find((a) => a.id === id),

            getAudiencesByDossier: (dossierId) =>
                get().audiences.filter((a) => a.dossierId === dossierId),
        }),
        {
            name: "dedalys-audiences",
        }
    )
)
