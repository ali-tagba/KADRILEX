import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import {
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
} from "@/lib/server/api-helpers"

function generateAccessCode(): string {
    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return [3, 3, 4]
        .map((n) =>
            Array.from({ length: n }, () =>
                ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
            ).join("")
        )
        .join("-")
}

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("equipe.write")
        const { id } = await params

        const code = generateAccessCode()
        const hash = await bcrypt.hash(code, 10)

        await prisma.membre.update({
            where: { id },
            data: { codeAccesHash: hash, codeAccesGeneAt: new Date() },
        })

        return Response.json({
            /* À copier dans un gestionnaire de mots de passe et transmettre au membre.
               L'ancien code est invalidé. */
            codeAccesClair: code,
        })
    } catch (e) {
        return handleApiError(e)
    }
}
