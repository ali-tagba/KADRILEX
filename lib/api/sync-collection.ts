/**
 * Synchronisation collection locale ↔ API (diff → POST / PATCH / DELETE).
 *
 * Extrait de la page Finance pour être réutilisé (ex: section Finance d'un dossier).
 * Détecte les ajouts (id local ou absent de prev → POST), les modifications
 * (champs patchables changés → PATCH) et les suppressions (présent dans prev,
 * absent de next → DELETE). Après un POST réussi, remplace l'item local par
 * l'item DB (avec son vrai id) via `setter`.
 */

import { postEntity, patchEntity, deleteEntity, showApiError } from "@/lib/api/patch"

export async function syncCollection<T extends { id: string }>(
    prev: T[],
    next: T[],
    endpoint: string,
    toPostBody: (item: T) => Record<string, unknown>,
    toPatchBody: (item: T) => Record<string, unknown>,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    isLocalId: (id: string) => boolean
): Promise<void> {
    const prevById = new Map(prev.map((x) => [x.id, x]))
    const nextById = new Map(next.map((x) => [x.id, x]))

    // 1) POST : items dont l'id est local OU absents du prev
    for (const item of next) {
        if (isLocalId(item.id) || !prevById.has(item.id)) {
            try {
                const created = await postEntity<T>(endpoint, toPostBody(item))
                setter((cur) => cur.map((x) => (x.id === item.id ? created : x)))
            } catch (e) {
                showApiError("Création")(e)
            }
        }
    }

    // 2) PATCH : items existants en DB dont les champs patchables ont changé
    for (const item of next) {
        if (isLocalId(item.id)) continue
        const prevItem = prevById.get(item.id)
        if (!prevItem) continue
        const prevBody = JSON.stringify(toPatchBody(prevItem))
        const nextBody = JSON.stringify(toPatchBody(item))
        if (prevBody !== nextBody) {
            patchEntity(`${endpoint}/${item.id}`, toPatchBody(item)).catch(showApiError("Modification"))
        }
    }

    // 3) DELETE : items présents dans prev mais plus dans next
    for (const item of prev) {
        if (!nextById.has(item.id)) {
            deleteEntity(`${endpoint}/${item.id}`).catch(showApiError("Suppression"))
        }
    }
}

/** Corps POST/PATCH d'une facture — partagé entre la page Finance et la section dossier. */
export function facturePostBody(f: {
    direction: string
    date: string
    dateEcheance: string | null
    clientId: string | null
    dossierId: string | null
    fournisseurId: string | null
    fournisseurNomLibre: string | null
    montantHT: number
    tvaRate: number
    statut: string
    description: string | null
    notes: string | null
    attachmentUrl: string | null
    lignes?: { libelle: string; quantite: number; prixUnitaire: number; total: number; audienceId?: string | null }[]
}): Record<string, unknown> {
    return {
        direction: f.direction,
        date: f.date,
        dateEcheance: f.dateEcheance,
        clientId: f.clientId,
        dossierId: f.dossierId,
        fournisseurId: f.fournisseurId,
        fournisseurNomLibre: f.fournisseurNomLibre,
        montantHT: f.montantHT,
        tvaRate: f.tvaRate,
        statut: f.statut,
        description: f.description,
        notes: f.notes,
        attachmentUrl: f.attachmentUrl,
        lignes: (f.lignes ?? []).map((l) => ({
            libelle: l.libelle,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            total: l.total,
            audienceId: l.audienceId ?? null,
        })),
    }
}

export function facturePatchBody(f: {
    date: string
    dateEcheance: string | null
    montantHT: number
    tvaRate: number
    statut: string
    description: string | null
    notes: string | null
    attachmentUrl: string | null
    lignes?: { libelle: string; quantite: number; prixUnitaire: number; total: number; audienceId?: string | null }[]
}): Record<string, unknown> {
    return {
        date: f.date,
        dateEcheance: f.dateEcheance,
        montantHT: f.montantHT,
        tvaRate: f.tvaRate,
        statut: f.statut,
        description: f.description,
        notes: f.notes,
        attachmentUrl: f.attachmentUrl,
        lignes: (f.lignes ?? []).map((l) => ({
            libelle: l.libelle,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            total: l.total,
            audienceId: l.audienceId ?? null,
        })),
    }
}
