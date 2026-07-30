/**
 * Données mockées pour le module Audiences + module Tâches.
 *
 * Architecture :
 *  - mockAudiences[] : liste des audiences (avec sub-collection taches[] pour la fiche audience)
 *  - mockTaches[] : liste plate de TOUTES les tâches (audience + dossier + libres) — réutilisable
 *    par le module Tâches autonome qui viendra après ce module Audiences.
 *
 * Une tâche peut être liée à : un audienceId, un dossierId, ou les deux (cas typique :
 * "Préparer plaidoirie" liée à l'audience X qui appartient au dossier Y).
 */

import type {
    AudienceNatureKey,
    AudienceStatutKey,
    AvocatCabinet,
    ResultatAudienceKey,
    TachePrioriteKey,
    TacheStatutKey,
} from "@/lib/constants/legal"
import { mockClients, type MockClient, clientDisplayName } from "@/lib/mock/clients"
import { mockDossiers, type MockDossier } from "@/lib/mock/dossiers"

/* ============================================================
   Types
   ============================================================ */

export interface MockTache {
    id: string
    titre: string
    description?: string
    statut: TacheStatutKey
    priorite: TachePrioriteKey
    /** @deprecated Texte libre — sera retiré sprint D au profit de responsableId. */
    assigneA: string
    /** Membre assigné (owner). Hérité de assigneA via le bridge en attendant la migration complète. */
    responsableId: string | null
    /** Membres observateurs / co-assignés (notifications, accès lecture). */
    equipeIds: string[]
    echeance: string | null // ISO date
    /** Liaison principale : l'utilisateur choisit UN type — client OU dossier OU audience (ou aucune = libre).
     *  Les 3 champs peuvent être renseignés simultanément (ex: tâche audience implique aussi son dossier
     *  et son client), mais l'UI permet de définir une liaison "principale" via le formulaire. */
    clientId: string | null
    dossierId: string | null
    audienceId: string | null
    createdAt: string
    completedAt: string | null
}

export interface MockAudience {
    id: string
    numero: string // AUD-26-NNN
    titre: string
    nature: AudienceNatureKey
    statut: AudienceStatutKey
    /** ISO datetime — date + heure de début */
    dateDebut: string
    /** Durée estimée en minutes */
    dureeMinutes: number
    juridiction: string | null
    salleAudience: string | null
    /** Optionnel : audience « sèche » sans dossier */
    dossierId: string | null
    /** Optionnel : client rattaché directement (sans dossier) */
    clientId: string | null
    /** @deprecated Avocat plaidant — string libre. À retirer sprint D au profit de responsableId. */
    avocatPlaidant: AvocatCabinet | null
    /** Membre plaidant (owner). Hérité de avocatPlaidant. */
    responsableId: string | null
    /** Équipe partagée — autres membres autorisés sur l'audience. */
    equipeIds: string[]
    notes: string | null
    compteRendu: string | null
    /** Résultat de l'audience une fois tenue (renseigné dans le compte-rendu) */
    resultatAudience: ResultatAudienceKey | null
}

/* ============================================================
   Helpers
   ============================================================ */

function todayAt(hour: number, minute: number): string {
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
}

function daysFromNowAt(days: number, hour: number, minute: number): string {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
}

function todayAtMidnight(): string {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
}

function daysFromNowMidnight(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
}

function daysAgoIso(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(10, 0, 0, 0)
    return d.toISOString()
}

/* ============================================================
   Mock Audiences (~12 entrées : aujourd'hui + cette semaine + ce mois)
   ============================================================ */

export const mockAudiences: MockAudience[] = []

/* ============================================================
   Mock Tâches (~25 entrées — mix audience + dossier)
   ============================================================ */

export const mockTaches: MockTache[] = []

/* ============================================================
   Helpers de jointure / agrégation
   ============================================================ */

export function getAudienceClient(audience: MockAudience): MockClient | null {
    const dossier = mockDossiers.find((d) => d.id === audience.dossierId)
    if (!dossier?.clientId) return null
    return mockClients.find((c) => c.id === dossier.clientId) ?? null
}

export function getAudienceDossier(audience: MockAudience): MockDossier | null {
    return mockDossiers.find((d) => d.id === audience.dossierId) ?? null
}

export function getAudienceTaches(audienceId: string): MockTache[] {
    return mockTaches.filter((t) => t.audienceId === audienceId)
}

export function getAudienceById(id: string): MockAudience | null {
    return mockAudiences.find((a) => a.id === id) ?? null
}

/** Format affichage : "SONITEL (CLI-26-001)" — utilisé sur les cards/listes */
export function audienceClientLabel(audience: MockAudience): string {
    const c = getAudienceClient(audience)
    return c ? clientDisplayName(c) : "Sans client"
}
