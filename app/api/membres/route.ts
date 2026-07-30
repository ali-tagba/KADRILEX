import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import {
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
    getQuery,
} from "@/lib/server/api-helpers"
import { MembreCreateSchema } from "@/lib/server/schemas"
import { Prisma, type Membre } from "@prisma/client"

/* Génère un code d'accès XXX-XXX-XXXX (sans 0/O/1/I). */
function generateAccessCode(): string {
    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const segs = [3, 3, 4]
    return segs
        .map((n) =>
            Array.from({ length: n }, () =>
                ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
            ).join("")
        )
        .join("-")
}

function safeMembre(m: Membre) {
    const { codeAccesHash: _h, ...rest } = m
    /* Le mock attend `codeAcces: string`. On retourne une chaîne masquée pour éviter
       les crashes ; le vrai code en clair n'est dispo qu'au POST initial et au regenerate. */
    return { ...rest, codeAcces: "•••-•••-••••" }
}

export async function GET(req: NextRequest) {
    try {
        await requirePermission("equipe.view")
        const q = getQuery(req.url)

        const where: Prisma.MembreWhereInput = {}
        if (q.role) where.role = q.role as Prisma.MembreWhereInput["role"]
        if (q.actif === "true") where.actif = true
        if (q.actif === "false") where.actif = false
        if (q.search) {
            where.OR = [
                { nom: { contains: q.search, mode: "insensitive" } },
                { prenom: { contains: q.search, mode: "insensitive" } },
                { email: { contains: q.search, mode: "insensitive" } },
            ]
        }

        const membres = await prisma.membre.findMany({
            where,
            orderBy: [{ actif: "desc" }, { nom: "asc" }],
        })
        return Response.json(membres.map(safeMembre))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("equipe.write")
        const data = await parseJson(req, MembreCreateSchema)

        // Génère un code en clair, hashe pour DB, renvoie le code en clair une seule fois
        const codeClair = generateAccessCode()
        const codeAccesHash = await bcrypt.hash(codeClair, 10)

        const { permissionsOverrides, ...rest } = data
        const created = await prisma.membre.create({
            data: {
                ...rest,
                dateEmbauche: new Date(rest.dateEmbauche),
                codeAccesHash,
                invitationStatut: "INVITE",
                permissionsOverrides:
                    permissionsOverrides == null ? Prisma.JsonNull : permissionsOverrides,
            },
        })

        return Response.json(
            {
                membre: safeMembre(created),
                /* Affiché 1 seule fois — l'admin doit le transmettre au membre. */
                codeAccesClair: codeClair,
            },
            { status: 201 }
        )
    } catch (e) {
        return handleApiError(e)
    }
}
