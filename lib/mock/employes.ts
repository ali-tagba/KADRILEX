/**
 * Source de vérité unique des membres du cabinet (équipe).
 * Étendu pour le module Équipe : RBAC, contacts, invitation, cycle de vie.
 *
 * Rétrocompatibilité : `MockEmploye` et `mockEmployes` restent exportés en alias
 * pour ne pas casser le module Paie qui les référence.
 */

import type { ModePaiementKey, StatutContratKey } from "@/lib/constants/finance"
import type { AvocatCabinet } from "@/lib/constants/legal"
import type {
    InvitationStatutKey,
    PermissionKey,
    PermissionScope,
    RoleKey,
} from "@/lib/constants/team"

export interface MockMembre {
    id: string
    prenom: string
    nom: string

    /* Rôle applicatif (RBAC) */
    role: RoleKey
    /** Override des permissions par défaut du rôle (sprint B+) — null = utilise le profil de rôle tel quel */
    permissionsOverrides: Partial<Record<PermissionKey, PermissionScope>> | null

    /* Identité & contact */
    email: string
    telephone: string | null
    photoUrl: string | null

    /* Cycle de vie */
    actif: boolean
    dateEmbauche: string
    dateSortie: string | null
    motifSortie: string | null
    invitationStatut: InvitationStatutKey
    derniereConnexion: string | null

    /* Authentification — code d'accès personnel (régénérable, l'ancien devient invalide) */
    codeAcces: string
    codeAccesGeneAt: string

    /* Contrat & paie */
    statutContrat: StatutContratKey
    fonction: string | null
    salaireBaseBrut: number

    /* Coordonnées paiement */
    rib: string | null
    banque: string | null
    mobileMoney: string | null
    modeVersementParDefaut: ModePaiementKey

    /* Lien legacy avec AVOCATS_CABINET (pour bridge tant que les modèles restent en string) */
    avocatCabinetKey: AvocatCabinet | null

    notes: string | null
    createdAt: string
    updatedAt: string
}

/** Alias rétrocompat — utilisé par lib/mock/bulletins, components/facturation/paie-tab */
export type MockEmploye = MockMembre

function dateAt(year: number, month: number, day: number): string {
    return new Date(year, month - 1, day, 10, 0).toISOString()
}

/* ============================================================
   Mock membres (6 — l'équipe complète)
   ============================================================ */

export const mockMembres: MockMembre[] = []

/** Alias rétrocompat (utilisé par lib/mock/bulletins.ts et finance-dashboard.tsx) */
export const mockEmployes: MockEmploye[] = mockMembres
