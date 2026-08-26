/**
 * Bridge entre les anciennes références "string libre" (avocatEnCharge,
 * avocatPlaidant, assigneA) et le nouveau modèle Membre par ID.
 *
 * Utilisé pendant la migration des 4 modules métier vers `responsableId` + `equipeIds[]`.
 * À terme (sprint D), les anciens champs seront retirés et ce bridge supprimé.
 */

import type { AvocatCabinet } from "@/lib/constants/legal"
import { fullName } from "@/lib/constants/team"
import type { Membre } from "@prisma/client"
import { mockMembres } from "@/lib/mock/employes"

/** Résout un AvocatCabinet (clé contrôlée) vers un membre. */
export function membreFromAvocatKey(key: AvocatCabinet | null | undefined): Membre | null {
    if (!key) return null
    return mockMembres.find((m) => m.avocatCabinetKey === key) ?? null
}

/** Idem mais retourne directement l'id (ou null). */
export function membreIdFromAvocatKey(key: AvocatCabinet | null | undefined): string | null {
    return membreFromAvocatKey(key)?.id ?? null
}

/**
 * Match approximatif d'une string libre (legacy `assigneA` des tâches) vers un
 * membre. Accepte les variantes courantes : "Me Prénom NOM", "Prénom NOM", "NOM".
 */
export function membreFromText(text: string | null | undefined): Membre | null {
    if (!text) return null
    const normalized = text.trim().toLowerCase()
    if (!normalized) return null
    /* 1. Match avocatCabinetKey complète ("Me Ali KADRI") */
    const byKey = mockMembres.find(
        (m) => m.avocatCabinetKey && normalized.includes(m.avocatCabinetKey.toLowerCase())
    )
    if (byKey) return byKey
    /* 2. Match nom complet ("Ali KADRI") */
    const byFull = mockMembres.find((m) => normalized.includes(fullName(m).toLowerCase()))
    if (byFull) return byFull
    /* 3. Match nom seul (collision possible — on prend le premier actif) */
    const byNom = mockMembres.find(
        (m) => m.actif && normalized === m.nom.toLowerCase()
    )
    return byNom ?? null
}

export function membreIdFromText(text: string | null | undefined): string | null {
    return membreFromText(text)?.id ?? null
}

/** Lookup direct par ID — petit alias pratique pour les composants. */
export function getMembre(id: string | null | undefined): Membre | null {
    if (!id) return null
    return mockMembres.find((m) => m.id === id) ?? null
}

export function getMembres(ids: string[] | null | undefined): Membre[] {
    if (!ids || ids.length === 0) return []
    const set = new Set(ids)
    return mockMembres.filter((m) => set.has(m.id))
}

/* ============================================================
   Résolution de l'équipe effective (avec héritage parent → enfant)
   ============================================================ */

interface HasTeam {
    responsableId: string | null
    equipeIds: string[]
}

/**
 * Calcule l'équipe effective d'une entité avec héritage : si l'entité elle-même
 * n'a ni responsableId ni equipeIds, on renvoie celle du parent. Sinon on prend
 * la sienne. Permet à filterByVisibility de fonctionner sans dupliquer la logique.
 */
export function resolveTeam<T extends HasTeam>(
    entity: T,
    parent?: HasTeam | null
): { responsableId: string | null; equipeIds: string[] } {
    // Certains objets "parent" embarqués par l'API (ex: le client inclus dans
    // /api/dossiers) n'ont pas de equipeIds calculé — garde défensive obligatoire.
    if (entity.responsableId !== null || (entity.equipeIds ?? []).length > 0) {
        return { responsableId: entity.responsableId, equipeIds: entity.equipeIds ?? [] }
    }
    if (parent) {
        return { responsableId: parent.responsableId, equipeIds: parent.equipeIds ?? [] }
    }
    return { responsableId: null, equipeIds: [] }
}

/** Décore une entité avec son équipe effective — utile avant filterByVisibility. */
export function withResolvedTeam<T extends HasTeam>(
    entity: T,
    parent?: HasTeam | null
): T {
    const team = resolveTeam(entity, parent)
    if (team.responsableId === entity.responsableId && team.equipeIds === entity.equipeIds) {
        return entity
    }
    return { ...entity, ...team }
}
