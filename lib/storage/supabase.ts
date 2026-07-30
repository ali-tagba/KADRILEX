/**
 * Client Supabase pour le Storage (signed URLs upload/download).
 *
 * Sprint 0 : stub fonctionnel — le client est créé mais aucun bucket n'est
 * encore configuré. Sera utilisé pleinement au Sprint 3-4 pour DossierFile
 * et Document.fileUrl.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

/**
 * Client Supabase admin (service_role key) — server-only.
 * Bypass RLS, à utiliser uniquement côté serveur (jamais en NEXT_PUBLIC_).
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (cached) return cached
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
        throw new Error(
            "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY"
        )
    }
    cached = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    return cached
}

/** Nom du bucket par défaut pour les fichiers KadriLex. */
export const KADRILEX_BUCKET = "kadrilex-files"

/**
 * S'assure que le bucket existe (idempotent).
 * À appeler une fois au boot du serveur, ou via le script init-storage.
 */
export async function ensureBucket(bucket: string = KADRILEX_BUCKET): Promise<void> {
    const sb = getSupabaseAdmin()
    const { data: existing } = await sb.storage.getBucket(bucket)
    if (existing) return
    const { error } = await sb.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: "100MB",
    })
    if (error && !error.message.toLowerCase().includes("already exists")) {
        throw error
    }
}

/**
 * Upload un fichier dans un bucket Supabase Storage (côté serveur).
 * Pour les uploads client → serveur direct, préférer createSignedUploadUrl().
 */
export async function uploadFile(
    bucket: string,
    path: string,
    file: Buffer | Blob,
    contentType?: string
): Promise<{ path: string }> {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.storage.from(bucket).upload(path, file, {
        contentType,
        upsert: false,
    })
    if (error) throw error
    return { path: data.path }
}

/**
 * Génère une signed URL d'UPLOAD : le client PUT directement le fichier
 * sur cette URL sans passer par le serveur Next.js.
 * Expiration 1h par défaut.
 */
export async function createSignedUploadUrl(
    bucket: string,
    path: string
): Promise<{ signedUrl: string; token: string; path: string }> {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.storage
        .from(bucket)
        .createSignedUploadUrl(path)
    if (error) throw error
    return { signedUrl: data.signedUrl, token: data.token, path: data.path }
}

/**
 * Génère une signed URL pour lecture (expiration en secondes).
 */
export async function getSignedUrl(
    bucket: string,
    path: string,
    expiresInSec = 3600
): Promise<string> {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSec)
    if (error) throw error
    return data.signedUrl
}

/**
 * Supprime un fichier du bucket.
 */
export async function deleteFile(bucket: string, paths: string[]): Promise<void> {
    const sb = getSupabaseAdmin()
    const { error } = await sb.storage.from(bucket).remove(paths)
    if (error) throw error
}
