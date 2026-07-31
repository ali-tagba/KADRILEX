/**
 * Moteur de permissions RBAC — fonctions pures.
 *
 * 3 niveaux de granularité :
 *  - `hasAccess(membre, perm)`        → l'UI doit-elle être visible/accessible ? (NONE → false)
 *  - `can(membre, perm, resource?)`   → ce membre peut-il agir sur cette entité ? (gère le scope OWN)
 *  - `filterByVisibility(membre, items, perm)` → filtre une liste à ce qui est visible
 *
 * Tous les flux de l'app passent par ces 3 helpers.
 * Exports compatibles avec usage Server Components ET Client Components (pas d'import React).
 */

import {
    ROLE_PERMISSIONS,
    type PermissionKey,
    type PermissionScope,
} from "@/lib/constants/team"
import type { Membre } from "@prisma/client"

/* ============================================================
   Types : la "ressource" sur laquelle on vérifie l'appartenance
   pour le scope OWN. Toute entité partageable doit fournir
   au moins responsableId et/ou equipeIds (sprint C).
   ============================================================ */

export interface OwnableResource {
    responsableId?: string | null
    equipeIds?: string[]
    /** ID du membre lui-même quand la ressource EST un membre (ex: bulletin de paie) */
    membreId?: string | null
}

/* ============================================================
   Resolve : merge des permissions du rôle + overrides
   ============================================================ */

/**
 * Calcule la matrice effective d'un membre :
 * permissions du rôle, surchargées par d'éventuels overrides individuels.
 */
export function resolvePermissions(
    membre: Membre
): Record<PermissionKey, PermissionScope> {
    const base = ROLE_PERMISSIONS[membre.role]
    if (!membre.permissionsOverrides) return base
    return { ...base, ...(membre.permissionsOverrides as Record<PermissionKey, PermissionScope>) }
}

/* ============================================================
   hasAccess : l'UI doit-elle être visible ?
   ============================================================ */

/**
 * Returns true si le membre a au moins un accès limité (OWN ou ALL) à la permission.
 * Utilisé pour montrer/cacher la navigation et les boutons d'action.
 */
export function hasAccess(membre: Membre | null, perm: PermissionKey): boolean {
    if (!membre) return false
    if (!membre.actif) return false
    const scope = resolvePermissions(membre)[perm]
    return scope !== "NONE"
}

export function getScope(
    membre: Membre | null,
    perm: PermissionKey
): PermissionScope {
    if (!membre || !membre.actif) return "NONE"
    return resolvePermissions(membre)[perm]
}

/* ============================================================
   can : ce membre peut-il agir sur cette ressource précise ?
   - Si scope = ALL → toujours autorisé
   - Si scope = OWN → autorisé seulement s'il appartient à la ressource
   - Si scope = NONE → jamais
   - Si pas de ressource fournie → équivalent à hasAccess
   ============================================================ */

export function can(
    membre: Membre | null,
    perm: PermissionKey,
    resource?: OwnableResource
): boolean {
    if (!membre || !membre.actif) return false
    const scope = resolvePermissions(membre)[perm]
    if (scope === "NONE") return false
    if (scope === "ALL") return true
    /* scope = OWN */
    if (!resource) {
        /* Pas de ressource fournie : on accepte (UI globale visible).
           Le filtrage des items se fera via filterByVisibility(). */
        return true
    }
    return belongsToMembre(resource, membre.id)
}

/* ============================================================
   belongsToMembre : la ressource est-elle assignée à ce membre ?
   ============================================================ */

export function belongsToMembre(resource: OwnableResource, membreId: string): boolean {
    if (resource.membreId && resource.membreId === membreId) return true
    if (resource.responsableId && resource.responsableId === membreId) return true
    if (resource.equipeIds && resource.equipeIds.includes(membreId)) return true
    return false
}

/* ============================================================
   filterByVisibility : filtre une liste à ce que le membre peut voir
   ============================================================ */

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

/* ============================================================
   canAny / canAll : helpers de combinaison
   ============================================================ */

export function canAny(membre: Membre | null, perms: PermissionKey[]): boolean {
    return perms.some((p) => hasAccess(membre, p))
}

export function canAll(membre: Membre | null, perms: PermissionKey[]): boolean {
    return perms.every((p) => hasAccess(membre, p))
}
