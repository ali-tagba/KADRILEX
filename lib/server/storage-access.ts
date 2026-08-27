/**
 * Garde-fou sécurité : vérifie qu'un utilisateur a le droit d'accéder à un
 * chemin Supabase Storage donné.
 *
 * Sans ce contrôle, un utilisateur authentifié pourrait passer n'importe quel
 * `path` à /api/storage/file ou /api/storage/download-url et accéder à des
 * fichiers de dossiers/factures d'autres membres (IDOR critique).
 *
 * Stratégie : on cherche le chemin dans toutes les colonnes DB qui référencent
 * un fichier Storage, puis on applique la matrice RBAC de l'entité parente.
 */

import { prisma } from "@/lib/prisma"
import { can, HttpError } from "@/lib/auth/server-permissions"
import type { Membre } from "@prisma/client"

/**
 * Cache LRU simple par chemin → résultat de la vérification.
 * Évite 6 queries Prisma à chaque rendu d'avatar / iframe preview.
 * Durée courte (60 s) pour éviter de bloquer les changements d'ACL.
 * Limité à 500 entrées pour ne pas grossir indéfiniment.
 */
type CacheEntry = { ok: true; reason: AccessReason; expiresAt: number; membreId: string }
const accessCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000
const CACHE_MAX = 500

function cacheKey(path: string, membreId: string): string {
    return `${membreId}::${path}`
}

function cacheGet(path: string, membreId: string): CacheEntry | null {
    const k = cacheKey(path, membreId)
    const e = accessCache.get(k)
    if (!e) return null
    if (e.expiresAt < Date.now()) {
        accessCache.delete(k)
        return null
    }
    return e
}

function cacheSet(path: string, membreId: string, reason: AccessReason): void {
    const k = cacheKey(path, membreId)
    if (accessCache.size >= CACHE_MAX) {
        // Eviction simple : on supprime la première entrée (FIFO ~= LRU faible)
        const firstKey = accessCache.keys().next().value
        if (firstKey) accessCache.delete(firstKey)
    }
    accessCache.set(k, { ok: true, reason, expiresAt: Date.now() + CACHE_TTL_MS, membreId })
}

export type AccessReason =
    | "dossier-file"
    | "dossier-note-or-doc"
    | "facture-attachment"
    | "facture-generated"
    | "paiement-preuve"
    | "depense-attachment"
    | "document-biblio"
    | "membre-photo"

/** Lookup parallèle dans toutes les tables référençant un chemin Storage. */
async function findOwner(path: string) {
    const [
        dossierFile,
        facture,
        paiement,
        depense,
        document,
        membre,
    ] = await Promise.all([
        prisma.dossierFile.findFirst({
            where: { url: path },
            include: { dossier: { include: { equipe: true } } },
        }),
        prisma.facture.findFirst({
            where: { OR: [{ attachmentUrl: path }, { generatedPdfUrl: path }] },
            include: { dossier: { include: { equipe: true } } },
        }),
        prisma.paiement.findFirst({
            where: { preuveUrl: path },
            include: {
                facture: { include: { dossier: { include: { equipe: true } } } },
            },
        }),
        prisma.depense.findFirst({
            where: { attachmentUrl: path },
            include: { dossier: { include: { equipe: true } } },
        }),
        prisma.document.findFirst({
            where: { fileUrl: path },
        }),
        prisma.membre.findFirst({
            where: { photoUrl: path },
        }),
    ])
    return { dossierFile, facture, paiement, depense, document, membre }
}

/**
 * Vérifie que `membre` peut accéder au fichier `path`.
 * Lance HttpError(403) ou HttpError(404) si refus / introuvable.
 */
export async function assertCanAccessPath(
    path: string,
    membre: Membre & { permissionsOverrides: unknown }
): Promise<{ reason: AccessReason }> {
    if (!path || path.includes("..") || path.startsWith("/")) {
        // Sanitization basique anti path traversal
        throw new HttpError(400, "Chemin invalide")
    }

    // Cache hit → on évite 6 queries Prisma
    const cached = cacheGet(path, membre.id)
    if (cached) return { reason: cached.reason }

    const owners = await findOwner(path)

    // 1) Fichier d'un dossier (GED) → permission dossiers.view scopée à ce dossier
    if (owners.dossierFile) {
        const d = owners.dossierFile.dossier
        const allowed = can(membre, "dossiers.view", {
            responsableId: d.responsableId,
            equipeIds: d.equipe.map((e) => e.membreId),
        })
        if (!allowed) throw new HttpError(403, "Accès refusé à ce fichier")
        cacheSet(path, membre.id, "dossier-file")
        return { reason: "dossier-file" }
    }

    // 2) Facture (scan reçu ou PDF généré) → finance.view scopée
    if (owners.facture) {
        const d = owners.facture.dossier
        const resource = d
            ? { responsableId: d.responsableId, equipeIds: d.equipe.map((e) => e.membreId) }
            : undefined
        const allowed = can(membre, "finance.view", resource)
        if (!allowed) throw new HttpError(403, "Accès refusé à cette facture")
        const reason: AccessReason =
            owners.facture.attachmentUrl === path ? "facture-attachment" : "facture-generated"
        cacheSet(path, membre.id, reason)
        return { reason }
    }

    // 3) Preuve de paiement → finance.view sur le dossier de la facture
    if (owners.paiement) {
        const d = owners.paiement.facture.dossier
        const resource = d
            ? { responsableId: d.responsableId, equipeIds: d.equipe.map((e) => e.membreId) }
            : undefined
        const allowed = can(membre, "finance.view", resource)
        if (!allowed) throw new HttpError(403, "Accès refusé à ce paiement")
        cacheSet(path, membre.id, "paiement-preuve")
        return { reason: "paiement-preuve" }
    }

    // 4) Justificatif dépense → finance.view
    if (owners.depense) {
        const d = owners.depense.dossier
        const resource = d
            ? { responsableId: d.responsableId, equipeIds: d.equipe.map((e) => e.membreId) }
            : undefined
        const allowed = can(membre, "finance.view", resource)
        if (!allowed) throw new HttpError(403, "Accès refusé à cette dépense")
        cacheSet(path, membre.id, "depense-attachment")
        return { reason: "depense-attachment" }
    }

    // 5) Document bibliothèque → bibliotheque.view (pas de scope OWN spécifique)
    if (owners.document) {
        const allowed = can(membre, "bibliotheque.view")
        if (!allowed) throw new HttpError(403, "Accès refusé à ce document")
        cacheSet(path, membre.id, "document-biblio")
        return { reason: "document-biblio" }
    }

    // 6) Photo de profil membre → visible par tous les utilisateurs authentifiés
    if (owners.membre) {
        cacheSet(path, membre.id, "membre-photo")
        return { reason: "membre-photo" }
    }

    // Aucune entité ne référence ce chemin → introuvable
    throw new HttpError(404, "Fichier introuvable ou accès refusé")
}
