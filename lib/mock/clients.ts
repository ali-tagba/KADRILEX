/**
 * Données mockées pour le module Clients — utilisées tant que la DB n'est pas branchée.
 * Reprend les conventions du template Excel KADRI : auto-numérotation CLI-YY-NNN,
 * distinction PM/PP stricte, données Niger réalistes.
 */

import type { AvocatCabinet, HonorairesType } from "@/lib/constants/legal"

export interface PartieAdverse {
    /** Nom de la partie adverse (telle qu'apparue dans le dossier) */
    nom: string
    /** Numéro du dossier dans lequel cette partie est adverse */
    dossierNumero: string
    /** Nature de la partie : pour aider à matcher avec un client existant */
    type: "PERSONNE_MORALE" | "PERSONNE_PHYSIQUE" | "INCONNU"
}

export interface ClientContact {
    id: string
    nom: string
    prenom: string | null
    /**
     * Poste / fonction — texte libre (combobox côté UI avec ~100 suggestions standards
     * + option "Autre"). Voir POSTES_SUGGESTIONS dans lib/constants/postes.ts.
     */
    fonction: string
    email: string | null
    telephone: string | null
}

export interface ClientLinkedDossier {
    id: string
    numero: string
    titre: string
    type: "CONTENTIEUX" | "CONSEIL" | "PRE_CONTENTIEUX" | "TRANSACTIONNEL"
}

export interface ClientActivityItem {
    id: string
    label: string
    sublabel: string | null
    at: string
    important: boolean
}

export type ClientType = "PERSONNE_MORALE" | "PERSONNE_PHYSIQUE"

export interface MockClient {
    id: string
    numeroClient: string
    type: ClientType
    // Personne morale
    raisonSociale: string | null
    formeJuridique: string | null
    numeroRCCM: string | null
    /** Numéro d'Identification Fiscale — obligatoire pour facturer légalement (PM) */
    nif: string | null
    /** Client conventionné = a une convention cadre signée avec le cabinet (tarification préférentielle) */
    conventionnee: boolean | null
    siegeSocial: string | null
    representantLegal: string | null
    iconHint: string
    // Personne physique
    nom: string | null
    prenom: string | null
    profession: string | null
    pieceIdentite: string | null
    /** Nationalité (PP) — texte libre, ex: "Nigérienne", "Française" */
    nationalite: string | null
    /** Date de naissance ISO (PP) */
    dateNaissance: string | null
    /** Lieu de naissance (PP) — ex: "Niamey, Niger" */
    lieuNaissance: string | null
    /** WhatsApp — souvent différent du téléphone principal au Niger */
    whatsapp: string | null
    // Communs
    email: string | null
    telephone: string | null
    adresse: string | null
    ville: string
    pays: string
    notes: string | null
    // Métadonnées
    createdAt: string
    activeDossiers: number
    /**
     * Le client est-il toujours actif (relation en cours) ?
     * - true : présent dans des dossiers en cours, conflit d'intérêt à signaler
     * - false : ancien client, conflits historiques silencieux
     */
    actif: boolean
    etatFacturation: "A_JOUR" | "IMPAYE"
    /** @deprecated Avocat principal en charge — string libre. À retirer sprint D au profit de responsableId. */
    avocatEnCharge: AvocatCabinet | null
    /**
     * Membre référent — owner du client. Apparaît sur la ligne table.
     * Quand null, hérité de avocatEnCharge via le bridge legacy.
     */
    responsableId: string | null
    /**
     * Équipe partagée — membres autorisés en plus du responsable.
     * Le responsable est implicitement inclus dans l'équipe lue (filterByVisibility).
     */
    equipeIds: string[]
    /** Type d'honoraires convenu (issu de la liste contrôlée HONORAIRES_TYPES) */
    honorairesConvenus: HonorairesType | null
    // Sub-collections
    contacts: ClientContact[]
    dossiers: ClientLinkedDossier[]
    /** Parties adverses dans les dossiers de ce client — sert à détecter les conflits d'intérêts */
    partiesAdverses: PartieAdverse[]
    activity: ClientActivityItem[]
}

/**
 * Détecte les conflits d'intérêts pour un client donné.
 *
 * Règle métier (clarifiée 2026-05-05) :
 *  - Conflit ACTIF : signalé uniquement si les DEUX parties sont `actif: true`.
 *    Un client inactif (relation terminée) ne génère pas d'alerte de conflit.
 *  - Conflit HISTORIQUE : conservé en mémoire mais marqué `historique: true`.
 *    Affiché dans une section discrète, sans alerte rouge.
 */
export interface ConflitInteret {
    partieAdverse: string
    clientEnConflit: { id: string; numeroClient: string; displayName: string; actif: boolean }
    dossierNumero: string
    /** true = au moins un des deux clients est inactif → pas d'alerte */
    historique: boolean
}

export function detectConflits(
    targetClient: MockClient,
    allClients: MockClient[]
): ConflitInteret[] {
    const conflits: ConflitInteret[] = []

    // Cas 1 : une partie adverse du target est aussi cliente
    for (const partie of targetClient.partiesAdverses) {
        const matchedClient = allClients.find(
            (c) => c.id !== targetClient.id && clientDisplayName(c) === partie.nom
        )
        if (matchedClient) {
            conflits.push({
                partieAdverse: partie.nom,
                clientEnConflit: {
                    id: matchedClient.id,
                    numeroClient: matchedClient.numeroClient,
                    displayName: clientDisplayName(matchedClient),
                    actif: matchedClient.actif,
                },
                dossierNumero: partie.dossierNumero,
                historique: !targetClient.actif || !matchedClient.actif,
            })
        }
    }

    // Cas 2 : le target est partie adverse dans le dossier d'un autre client
    const targetName = clientDisplayName(targetClient)
    for (const otherClient of allClients) {
        if (otherClient.id === targetClient.id) continue
        for (const partie of otherClient.partiesAdverses) {
            if (partie.nom === targetName) {
                const alreadyListed = conflits.some(
                    (c) =>
                        c.clientEnConflit.id === otherClient.id &&
                        c.dossierNumero === partie.dossierNumero
                )
                if (!alreadyListed) {
                    conflits.push({
                        partieAdverse: targetName,
                        clientEnConflit: {
                            id: otherClient.id,
                            numeroClient: otherClient.numeroClient,
                            displayName: clientDisplayName(otherClient),
                            actif: otherClient.actif,
                        },
                        dossierNumero: partie.dossierNumero,
                        historique: !targetClient.actif || !otherClient.actif,
                    })
                }
            }
        }
    }

    return conflits
}

/** Conflits actifs uniquement (les deux parties actives) — pour l'alerte rouge. */
export function getConflitsActifs(
    targetClient: MockClient,
    allClients: MockClient[]
): ConflitInteret[] {
    return detectConflits(targetClient, allClients).filter((c) => !c.historique)
}

/** Conflits historiques (au moins un inactif) — pour la section discrète. */
export function getConflitsHistoriques(
    targetClient: MockClient,
    allClients: MockClient[]
): ConflitInteret[] {
    return detectConflits(targetClient, allClients).filter((c) => c.historique)
}

function daysAgo(d: number): string {
    const dt = new Date()
    dt.setDate(dt.getDate() - d)
    return dt.toISOString()
}

function dateAt(year: number, month: number, day: number, hour = 10, minute = 0): string {
    return new Date(year, month - 1, day, hour, minute).toISOString()
}

function displayName(c: MockClient): string {
    return c.type === "PERSONNE_MORALE"
        ? c.raisonSociale ?? "Sans nom"
        : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "Sans nom"
}

export function clientDisplayName(c: MockClient): string {
    return displayName(c)
}

export const mockClients: MockClient[] = []
