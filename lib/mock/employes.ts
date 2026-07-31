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

import type { Membre } from "@prisma/client"
export type MockMembre = Membre

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
