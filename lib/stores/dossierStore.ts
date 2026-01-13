"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Dossier, DossierFormData, DossierStatus, Document, Audience, DossierFolder } from "@/lib/types/dossier"

interface DossierStore {
    dossiers: Dossier[]
    searchQuery: string
    statusFilter: DossierStatus | "ALL"

    // Actions
    setSearchQuery: (query: string) => void
    setStatusFilter: (status: DossierStatus | "ALL") => void

    addDossier: (data: DossierFormData) => Dossier
    updateDossier: (id: string, data: Partial<Dossier>) => void
    deleteDossier: (id: string) => void
    closeDossier: (id: string) => void

    // Folders
    createFolder: (dossierId: string, name: string, parentId?: string | null) => void
    deleteFolder: (dossierId: string, folderId: string) => void

    // Documents
    addDocument: (dossierId: string, document: Omit<Document, "id">) => void
    removeDocument: (dossierId: string, documentId: string) => void

    // Audiences
    addAudience: (dossierId: string, audience: Omit<Audience, "id">) => void
    updateAudience: (dossierId: string, audienceId: string, data: Partial<Audience>) => void
    removeAudience: (dossierId: string, audienceId: string) => void

    // Queries
    getDossierById: (id: string) => Dossier | undefined
    getDossiersByClient: (clientId: string) => Dossier[]
    getFilteredDossiers: () => Dossier[]
    getStats: () => {
        total: number
        enCours: number
        enAttente: number
        clotures: number
    }
}

export const useDossierStore = create<DossierStore>()(
    persist(
        (set, get) => ({
            dossiers: [],
            searchQuery: "",
            statusFilter: "ALL",

            setSearchQuery: (query) => set({ searchQuery: query }),
            setStatusFilter: (status) => set({ statusFilter: status }),

            addDossier: (data) => {
                const now = new Date().toISOString()
                const year = new Date().getFullYear()
                const count = get().dossiers.length + 1
                const dossierId = `dossier-${Date.now()}`

                // Initialize default folders
                const defaultFolders: DossierFolder[] = [
                    { id: `folder-${Date.now()}-1`, name: "Pièces de Procédure", type: "FOLDER", parentId: null, createdAt: now },
                    { id: `folder-${Date.now()}-2`, name: "Preuves & Éléments", type: "FOLDER", parentId: null, createdAt: now },
                    { id: `folder-${Date.now()}-3`, name: "Administratif", type: "FOLDER", parentId: null, createdAt: now },
                ]

                const newDossier: Dossier = {
                    id: dossierId,
                    numeroDossier: `DOS-${year}-${String(count).padStart(3, '0')}`,
                    intitule: data.intitule,
                    typeAffaire: data.typeAffaire,
                    statut: "EN_COURS",
                    priorite: data.priorite,
                    parties: data.clientIds.map((clientId, idx) => ({
                        id: `partie-${Date.now()}-${idx}`,
                        clientId,
                        type: idx === 0 ? "DEMANDEUR" : "DEFENDEUR"
                    })),
                    juridiction: {
                        nom: data.juridictionNom,
                        ville: data.juridictionVille,
                        numeroRG: data.numeroRG
                    },
                    dateOuverture: now,
                    dateModification: now,
                    folders: defaultFolders,
                    documents: [],
                    audiences: [],
                    montantHonoraires: data.montantHonoraires,
                    montantProvision: data.montantProvision,
                    description: data.description
                }

                set((state) => ({
                    dossiers: [...state.dossiers, newDossier]
                }))

                return newDossier
            },

            updateDossier: (id, data) => {
                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === id
                            ? {
                                ...dossier,
                                ...data,
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            deleteDossier: (id) => {
                set((state) => ({
                    dossiers: state.dossiers.filter((d) => d.id !== id)
                }))
            },

            closeDossier: (id) => {
                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === id
                            ? {
                                ...dossier,
                                statut: "CLOTURE" as DossierStatus,
                                dateCloture: new Date().toISOString(),
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            createFolder: (dossierId, name, parentId = null) => {
                const newFolder: DossierFolder = {
                    id: `folder-${Date.now()}`,
                    name,
                    type: "FOLDER",
                    parentId,
                    createdAt: new Date().toISOString()
                }

                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                folders: [...dossier.folders, newFolder],
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            deleteFolder: (dossierId, folderId) => {
                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                // Remove folder AND unlink any documents in it (move to root or delete? Let's move to root for safety)
                                folders: dossier.folders.filter(f => f.id !== folderId),
                                documents: dossier.documents.map(d => d.folderId === folderId ? { ...d, folderId: null } : d),
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            addDocument: (dossierId, document) => {
                const newDoc: Document = {
                    ...document,
                    id: `doc-${Date.now()}`
                }

                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                documents: [...dossier.documents, newDoc],
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            removeDocument: (dossierId, documentId) => {
                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                documents: dossier.documents.filter((d) => d.id !== documentId),
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            addAudience: (dossierId, audience) => {
                const newAudience: Audience = {
                    ...audience,
                    id: `audience-${Date.now()}`
                }

                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                audiences: [...dossier.audiences, newAudience],
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            updateAudience: (dossierId, audienceId, data) => {
                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                audiences: dossier.audiences.map((a) =>
                                    a.id === audienceId ? { ...a, ...data } : a
                                ),
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            removeAudience: (dossierId, audienceId) => {
                set((state) => ({
                    dossiers: state.dossiers.map((dossier) =>
                        dossier.id === dossierId
                            ? {
                                ...dossier,
                                audiences: dossier.audiences.filter((a) => a.id !== audienceId),
                                dateModification: new Date().toISOString()
                            }
                            : dossier
                    )
                }))
            },

            getDossierById: (id) => {
                return get().dossiers.find((d) => d.id === id)
            },

            getDossiersByClient: (clientId) => {
                return get().dossiers.filter((dossier) =>
                    dossier.parties.some((p) => p.clientId === clientId)
                )
            },

            getFilteredDossiers: () => {
                const { dossiers, searchQuery, statusFilter } = get()

                let filtered = dossiers

                // Filter by status
                if (statusFilter !== "ALL") {
                    filtered = filtered.filter((d) => d.statut === statusFilter)
                }

                // Filter by search query
                if (searchQuery) {
                    const query = searchQuery.toLowerCase()
                    filtered = filtered.filter((dossier) =>
                        dossier.intitule.toLowerCase().includes(query) ||
                        dossier.numeroDossier.toLowerCase().includes(query) ||
                        dossier.juridiction.nom.toLowerCase().includes(query)
                    )
                }

                return filtered
            },

            getStats: () => {
                const dossiers = get().dossiers
                return {
                    total: dossiers.length,
                    enCours: dossiers.filter((d) => d.statut === "EN_COURS").length,
                    enAttente: dossiers.filter((d) => d.statut === "EN_ATTENTE").length,
                    clotures: dossiers.filter((d) => d.statut === "CLOTURE").length
                }
            }
        }),
        {
            name: "dedalys-dossiers"
        }
    )
)
