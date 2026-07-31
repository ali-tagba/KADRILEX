/**
 * RBAC server-side — port de lib/auth/permissions.ts mais typé sur le modèle Prisma Membre.
 *
 * Le frontend conserve `lib/auth/permissions.ts` (typé sur Membre) pour les checks UI.
 * Côté serveur on rejoue la même logique sur le vrai membre chargé depuis la DB.
 */

import "server-only"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth/session"
import {
    ROLE_PERMISSIONS,
    type PermissionKey,
    type PermissionScope,
} from "@/lib/constants/team"
import type { Membre } from "@prisma/client"

export interface OwnableResource {
    responsableId?: string | null
    equipeIds?: string[]
    /** ID du membre lui-même (ex: bulletin de paie) */
    membreId?: string | null
}

/**
 * Charge le membre courant depuis le cookie de session.
 * Retourne null si pas de session, session expirée, ou membre désactivé.
 */
export async function getCurrentMembre(): Promise<Membre | null> {
    const session = await getSession()
    if (!session) return null
    const membre = await prisma.membre.findUnique({
        where: { id: session.membreId },
    })
    if (!membre || !membre.actif) return null
    return membre
}

/** Erreur HTTP custom pour les endpoints */
export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

export function resolvePermissions(
    membre: Membre
): Record<PermissionKey, PermissionScope> {
    const base = ROLE_PERMISSIONS[membre.role]
    const overrides = (membre.permissionsOverrides as
        | Partial<Record<PermissionKey, PermissionScope>>
        | null) ?? null
    if (!overrides) return base
    return { ...base, ...overrides }
}

export function hasAccess(membre: Membre | null, perm: PermissionKey): boolean {
    if (!membre || !membre.actif) return false
    return resolvePermissions(membre)[perm] !== "NONE"
}

export function getScope(
    membre: Membre | null,
    perm: PermissionKey
): PermissionScope {
    if (!membre || !membre.actif) return "NONE"
    return resolvePermissions(membre)[perm]
}

export function belongsToMembre(resource: OwnableResource, membreId: string): boolean {
    if (resource.membreId && resource.membreId === membreId) return true
    if (resource.responsableId && resource.responsableId === membreId) return true
    if (resource.equipeIds && resource.equipeIds.includes(membreId)) return true
    return false
}

export function can(
    membre: Membre | null,
    perm: PermissionKey,
    resource?: OwnableResource
): boolean {
    if (!membre || !membre.actif) return false
    const scope = resolvePermissions(membre)[perm]
    if (scope === "NONE") return false
    if (scope === "ALL") return true
    if (!resource) return true // OWN sans resource = accès UI ok, filtrage par filterByVisibility
    return belongsToMembre(resource, membre.id)
}

export function filterByVisibility<T extends OwnableResource>(
    membre: Membre | null,
    items: T[],
    perm: PermissionKey
): T[] {
    if (!membre || !membre.actif) return []
    const scope = resolvePermissions(membre)[perm]
    if (scope === "NONE") return []
    if (scope === "ALL") return items
    return items.filter((item) => belongsToMembre(item, membre.id))
}

/**
 * Garde-fou pour endpoints API.
 * Lance HttpError(401) si pas connecté, HttpError(403) si permission refusée.
 *
 * Usage :
 *   export async function GET() {
 *     const membre = await requirePermission("clients.view")
 *     // ... query Prisma ...
 *   }
 */
export async function requirePermission(
    perm: PermissionKey,
    resource?: OwnableResource
): Promise<Membre> {
    const membre = await getCurrentMembre()
    if (!membre) throw new HttpError(401, "Non authentifié")
    if (!can(membre, perm, resource)) {
        throw new HttpError(403, `Permission refusée : ${perm}`)
    }
    return membre
}

/** Variante qui retourne juste le membre sans check permission */
export async function requireAuth(): Promise<Membre> {
    const membre = await getCurrentMembre()
    if (!membre) throw new HttpError(401, "Non authentifié")
    return membre
}

/** Helper pour les routes API : convertit HttpError en Response */
export function handleApiError(error: unknown): Response {
    if (error instanceof HttpError) {
        return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("Unhandled API error:", error)
    return Response.json({ error: "Erreur interne" }, { status: 500 })
}
