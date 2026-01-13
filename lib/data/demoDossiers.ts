import { Dossier } from "@/lib/types/dossier"

export const demoDossiers: Dossier[] = [
    {
        id: "dossier-1",
        numeroDossier: "DOS-2024-001",
        intitule: "SOTRA c/ KOUASSI Jean",
        typeAffaire: "COMMERCIAL",
        statut: "EN_COURS",
        priorite: "HAUTE",
        parties: [
            {
                id: "partie-1",
                clientId: "client-1", // SOTRA
                type: "DEMANDEUR"
            },
            {
                id: "partie-2",
                clientId: "client-3", // KOUASSI Jean
                type: "DEFENDEUR"
            }
        ],
        juridiction: {
            nom: "Tribunal de Commerce d'Abidjan",
            ville: "Abidjan",
            numeroRG: "RG-2024/0045"
        },
        dateOuverture: "2024-01-15T10:00:00Z",
        dateModification: "2024-01-20T14:30:00Z",
        folders: [
            { id: "f1", name: "Procédure", type: "FOLDER", parentId: null, createdAt: "2024-01-15T10:00:00Z" },
            { id: "f2", name: "Pièces Administratives", type: "FOLDER", parentId: null, createdAt: "2024-01-15T10:00:00Z" }
        ],
        documents: [
            {
                id: "doc-1",
                nom: "Assignation en paiement",
                type: "Assignation",
                folderId: "f1",
                dateAjout: "2024-01-15T10:00:00Z",
                taille: 245000
            },
            {
                id: "doc-2",
                nom: "Contrat de prestation",
                type: "Pièce",
                folderId: "f2",
                dateAjout: "2024-01-16T09:00:00Z",
                taille: 180000
            }
        ],
        audiences: [
            {
                id: "aud-1",
                date: "2024-01-25",
                heure: "09:00",
                juridiction: "Tribunal de Commerce d'Abidjan",
                type: "Mise en état",
                statut: "PLANIFIEE",
                notes: "Première audience de mise en état"
            }
        ],
        montantHonoraires: 2500000,
        montantProvision: 1000000,
        description: "Litige commercial concernant un impayé de prestations de transport"
    },
    {
        id: "dossier-2",
        numeroDossier: "DOS-2024-002",
        intitule: "Succession TOURE",
        typeAffaire: "CIVIL",
        statut: "EN_COURS",
        priorite: "MOYENNE",
        parties: [
            {
                id: "partie-3",
                clientId: "client-2", // TOURE Fatou
                type: "DEMANDEUR"
            }
        ],
        juridiction: {
            nom: "Tribunal de Première Instance d'Abidjan",
            ville: "Abidjan",
            numeroRG: "RG-2024/0123"
        },
        dateOuverture: "2024-02-01T08:00:00Z",
        dateModification: "2024-02-10T16:00:00Z",
        folders: [
            { id: "f3", name: "Actes Notariés", type: "FOLDER", parentId: null, createdAt: "2024-02-01T08:00:00Z" }
        ],
        documents: [
            {
                id: "doc-3",
                nom: "Acte de décès",
                type: "Pièce",
                folderId: "f3",
                dateAjout: "2024-02-01T08:00:00Z",
                taille: 95000
            },
            {
                id: "doc-4",
                nom: "Testament olographe",
                type: "Pièce",
                folderId: "f3",
                dateAjout: "2024-02-02T10:00:00Z",
                taille: 120000
            }
        ],
        audiences: [],
        montantHonoraires: 1500000,
        montantProvision: 500000,
        description: "Règlement de succession avec partage de biens immobiliers"
    },
    {
        id: "dossier-3",
        numeroDossier: "DOS-2024-003",
        intitule: "Licenciement abusif - KONE vs Entreprise ABC",
        typeAffaire: "SOCIAL",
        statut: "EN_ATTENTE",
        priorite: "BASSE",
        parties: [
            {
                id: "partie-4",
                clientId: "client-4", // KONE Aminata
                type: "DEMANDEUR"
            }
        ],
        juridiction: {
            nom: "Tribunal du Travail d'Abidjan",
            ville: "Abidjan"
        },
        dateOuverture: "2024-03-10T09:00:00Z",
        dateModification: "2024-03-12T11:00:00Z",
        folders: [],
        documents: [
            {
                id: "doc-5",
                nom: "Lettre de licenciement",
                type: "Pièce",
                folderId: null,
                dateAjout: "2024-03-10T09:00:00Z",
                taille: 85000
            }
        ],
        audiences: [],
        montantHonoraires: 800000,
        description: "Contestation d'un licenciement pour motif économique"
    },
    {
        id: "dossier-4",
        numeroDossier: "DOS-2023-089",
        intitule: "Fraude fiscale - YAO Entreprises",
        typeAffaire: "PENAL",
        statut: "CLOTURE",
        priorite: "HAUTE",
        parties: [
            {
                id: "partie-5",
                clientId: "client-5", // YAO Kouadio
                type: "DEFENDEUR"
            }
        ],
        juridiction: {
            nom: "Tribunal Correctionnel d'Abidjan",
            ville: "Abidjan",
            numeroRG: "RG-2023/0567"
        },
        dateOuverture: "2023-11-05T08:00:00Z",
        dateCloture: "2024-01-10T15:00:00Z",
        dateModification: "2024-01-10T15:00:00Z",
        folders: [
            { id: "f4", name: "Jugements & Décisions", type: "FOLDER", parentId: null, createdAt: "2024-01-10T15:00:00Z" }
        ],
        documents: [
            {
                id: "doc-6",
                nom: "Jugement",
                type: "Jugement",
                folderId: "f4",
                dateAjout: "2024-01-10T15:00:00Z",
                taille: 320000
            }
        ],
        audiences: [
            {
                id: "aud-2",
                date: "2024-01-08",
                heure: "10:00",
                juridiction: "Tribunal Correctionnel d'Abidjan",
                type: "Plaidoirie",
                statut: "TERMINEE",
                notes: "Plaidoirie finale - Relaxe prononcée"
            }
        ],
        montantHonoraires: 5000000,
        montantProvision: 2000000,
        description: "Défense dans une affaire de fraude fiscale - Issue favorable"
    }
]
