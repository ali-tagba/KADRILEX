"use client"

import type { ReactNode } from "react"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import type { OwnableResource } from "@/lib/auth/permissions"
import type { PermissionKey } from "@/lib/constants/team"
import { NoAccessScreen } from "./no-access-screen"

interface RequirePermissionProps {
    perm: PermissionKey
    /** Ressource à tester pour OWN scope */
    resource?: OwnableResource
    /** Si fourni, rendu à la place de children quand non autorisé. Sinon, rien (silencieux) */
    fallback?: ReactNode
    /** Nom lisible utilisé dans l'écran NoAccess par défaut */
    moduleName?: string
    children: ReactNode
}

/**
 * Garde de rendu : children visible uniquement si le membre courant a la permission.
 *
 * Cas d'usage :
 * - **Item de menu / bouton** : `<RequirePermission perm="finance.view">…</RequirePermission>`
 *   → l'item disparaît silencieusement (pas de fallback).
 * - **Page complète** : passer `fallback={<NoAccessScreen module="Finance" />}`
 *   ou `noAccessScreen` (raccourci ci-dessous).
 */
export function RequirePermission({
    perm,
    resource,
    fallback = null,
    children,
}: RequirePermissionProps) {
    const { can } = useCurrentUser()
    if (can(perm, resource)) return <>{children}</>
    return <>{fallback}</>
}

/**
 * Variante : page complète avec écran NoAccess automatique.
 * Plus expressif que `<RequirePermission fallback={<NoAccessScreen ... />}>`.
 */
export function PageGate({
    perm,
    resource,
    moduleName,
    description,
    children,
}: {
    perm: PermissionKey
    resource?: OwnableResource
    moduleName?: string
    description?: string
    children: ReactNode
}) {
    return (
        <RequirePermission
            perm={perm}
            resource={resource}
            fallback={<NoAccessScreen module={moduleName} description={description} />}
        >
            {children}
        </RequirePermission>
    )
}
