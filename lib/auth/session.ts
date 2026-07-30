/**
 * Session serveur — JWT signé + cookie HttpOnly Secure SameSite=Lax.
 *
 * Utilise `jose` (pas jsonwebtoken) pour compat Edge Runtime éventuel + zero deps natives.
 * Le JWT contient juste `{ membreId }` — pas de données mutable (les permissions
 * sont resolved côté serveur à chaque requête depuis la DB pour rester à jour).
 */

import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"

const COOKIE_NAME = "kdx_session"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 // 24h glissantes
const ALG = "HS256"

function getSecret(): Uint8Array {
    const raw = process.env.AUTH_JWT_SECRET
    if (!raw || raw.length < 32) {
        throw new Error(
            "AUTH_JWT_SECRET manquant ou trop court (>= 32 chars). " +
                "Définir dans .env.local"
        )
    }
    return new TextEncoder().encode(raw)
}

export interface SessionPayload {
    membreId: string
    iat: number
    exp: number
}

export async function createSession(membreId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({ membreId })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt(now)
        .setExpirationTime(now + COOKIE_MAX_AGE_SECONDS)
        .sign(getSecret())

    const store = await cookies()
    store.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE_SECONDS,
    })
}

export async function getSession(): Promise<SessionPayload | null> {
    const store = await cookies()
    const token = store.get(COOKIE_NAME)?.value
    if (!token) return null
    try {
        const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] })
        if (typeof payload.membreId !== "string") return null
        return {
            membreId: payload.membreId,
            iat: payload.iat as number,
            exp: payload.exp as number,
        }
    } catch {
        return null
    }
}

export async function clearSession(): Promise<void> {
    const store = await cookies()
    store.delete(COOKIE_NAME)
}
