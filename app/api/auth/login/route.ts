import { NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createSession } from "@/lib/auth/session"
import { resolvePermissions } from "@/lib/auth/server-permissions"

const LoginSchema = z.object({
    email: z.string().email(),
    codeAcces: z.string().min(8).max(32),
})

const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX = 5

async function checkRateLimit(ip: string): Promise<{ ok: boolean; retryAfterSec?: number }> {
    const now = new Date()
    const entry = await prisma.loginAttempt.findUnique({ where: { ip } })

    if (!entry || entry.resetAt < now) {
        await prisma.loginAttempt.upsert({
            where: { ip },
            update: { count: 1, resetAt: new Date(now.getTime() + RATE_WINDOW_MS) },
            create: { ip, count: 1, resetAt: new Date(now.getTime() + RATE_WINDOW_MS) },
        })
        return { ok: true }
    }

    const updated = await prisma.loginAttempt.update({
        where: { ip },
        data: { count: { increment: 1 } },
    })

    if (updated.count > RATE_MAX) {
        return { ok: false, retryAfterSec: Math.ceil((updated.resetAt.getTime() - now.getTime()) / 1000) }
    }
    return { ok: true }
}

async function recordSuccess(ip: string) {
    await prisma.loginAttempt.deleteMany({ where: { ip } })
}

export async function POST(req: NextRequest) {
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        req.headers.get("x-real-ip") ??
        "unknown"
    const rate = await checkRateLimit(ip)
    if (!rate.ok) {
        return Response.json(
            {
                error: `Trop de tentatives — réessaie dans ${Math.ceil((rate.retryAfterSec ?? 0) / 60)} min`,
            },
            { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } }
        )
    }
    const body = await req.json().catch(() => null)
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
        return Response.json(
            { error: "Email ou code d'accès invalide" },
            { status: 400 }
        )
    }
    const { email, codeAcces } = parsed.data

    const membre = await prisma.membre.findUnique({
        where: { email: email.toLowerCase().trim() },
    })

    // Réponse uniforme pour éviter user enumeration
    const genericFail = Response.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
    )

    if (!membre) return genericFail
    if (!membre.actif) {
        return Response.json(
            { error: "Compte désactivé" },
            { status: 403 }
        )
    }
    if (membre.invitationStatut === "DESACTIVE") {
        return Response.json(
            { error: "Compte désactivé" },
            { status: 403 }
        )
    }

    const ok = await bcrypt.compare(codeAcces.trim(), membre.codeAccesHash)
    if (!ok) return genericFail

    // Connexion réussie → reset le compteur rate-limit pour cette IP
    await recordSuccess(ip)

    await createSession(membre.id)

    // Update invitationStatut + derniereConnexion
    await prisma.membre.update({
        where: { id: membre.id },
        data: {
            derniereConnexion: new Date(),
            invitationStatut:
                membre.invitationStatut === "ACTIF" ? "ACTIF" : "ACTIF",
        },
    })

    const { codeAccesHash: _unused, ...safeMembre } = membre
    return Response.json({
        membre: { ...safeMembre, codeAcces: "•••-•••-••••" },
        permissions: resolvePermissions(membre),
    })
}
