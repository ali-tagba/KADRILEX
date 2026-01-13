"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Client, ClientFormData, Contact } from "@/lib/types/client"

interface ClientStore {
    clients: Client[]
    searchQuery: string
    setSearchQuery: (query: string) => void
    addClient: (data: ClientFormData) => Client
    updateClient: (id: string, data: Partial<ClientFormData>) => void
    deleteClient: (id: string) => void
    getClientById: (id: string) => Client | undefined
    getFilteredClients: () => Client[]
}

export const useClientStore = create<ClientStore>()(
    persist(
        (set, get) => ({
            clients: [],
            searchQuery: "",

            setSearchQuery: (query) => set({ searchQuery: query }),

            addClient: (data) => {
                const newClient: Client = {
                    id: `client-${Date.now()}`,
                    type: data.type,
                    ...(data.type === "PERSONNE_PHYSIQUE"
                        ? {
                            nom: data.nom!,
                            prenom: data.prenom!,
                            profession: data.profession,
                        }
                        : {
                            raisonSociale: data.raisonSociale!,
                            formeJuridique: data.formeJuridique!,
                            numeroRCCM: data.numeroRCCM,
                            representantLegal: data.representantLegal!,
                        }),
                    email: data.email,
                    telephone: data.telephone,
                    adresse: data.adresse,
                    ville: data.ville,
                    contacts: data.contacts,
                    notes: data.notes,
                    dateCreation: new Date().toISOString(),
                    dateModification: new Date().toISOString(),
                } as Client

                set((state) => ({
                    clients: [...state.clients, newClient],
                }))

                return newClient
            },

            updateClient: (id, data) => {
                set((state) => ({
                    clients: state.clients.map((client) =>
                        client.id === id
                            ? {
                                ...client,
                                ...data,
                                dateModification: new Date().toISOString(),
                            }
                            : client
                    ),
                }))
            },

            deleteClient: (id) => {
                set((state) => ({
                    clients: state.clients.filter((client) => client.id !== id),
                }))
            },

            getClientById: (id) => {
                return get().clients.find((client) => client.id === id)
            },

            getFilteredClients: () => {
                const { clients, searchQuery } = get()
                if (!searchQuery) return clients

                const query = searchQuery.toLowerCase()
                return clients.filter((client) => {
                    const searchFields = [
                        client.email,
                        client.telephone,
                        client.type === "PERSONNE_PHYSIQUE"
                            ? `${client.nom} ${client.prenom}`
                            : client.raisonSociale,
                    ]

                    return searchFields.some((field) =>
                        field.toLowerCase().includes(query)
                    )
                })
            },
        }),
        {
            name: "dedalys-clients",
        }
    )
)
