import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { MembreUpdateSchema } from "@/lib/server/schemas"
import { Prisma, type Membre } from "@prisma/client"

function safeMembre(m: Membre) {
    const { codeAccesHash: _h, ...rest } = m
    return { ...rest, codeAcces: "•••-•••-••••" }
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("equipe.view")
        const { id } = await params
        const m = await prisma.membre.findUnique({ where: { id } })
        if (!m) throw new HttpError(404, "Membre introuvable")
        return Response.json(safeMembre(m))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("equipe.write")
        const { id } = await params
        const data = await parseJson(req, MembreUpdateSchema)
        const { permissionsOverrides, ...rest } = data
        const updated = await prisma.membre.update({
            where: { id },
            data: {
                ...rest,
                dateEmbauche:
                    rest.dateEmbauche === undefined
                        ? undefined
                        : new Date(rest.dateEmbauche),
                permissionsOverrides:
                    permissionsOverrides === undefined
                        ? undefined
                        : permissionsOverrides === null
                            ? Prisma.JsonNull
                            : permissionsOverrides,
            },
        })
        return Response.json(safeMembre(updated))
    } catch (e) {
        return handleApiError(e)
    }
}

/**
 * Suppression définitive d'un membre.
 *
 * Garde-fou : refuse si le membre est encore actif (doit passer par /deactivate
 * qui transfère les entités).
 *
 * Effets en cascade automatiques (via schema Prisma) :
 *  - responsableId sur Client/Dossier/Audience/Tache → SetNull
 *  - Junctions ClientEquipe/DossierEquipe/AudienceEquipe/TacheEquipe → Cascade
 *  - Partage → Cascade
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("equipe.write")
        const { id } = await params

        const membre = await prisma.membre.findUnique({ where: { id } })
        if (!membre) throw new HttpError(404, "Membre introuvable")

        if (membre.actif) {
            throw new HttpError(
                400,
                "Désactive d'abord le membre (transfert des entités) avant de pouvoir le supprimer."
            )
        }

        await prisma.membre.delete({ where: { id } })
        return Response.json({ ok: true, deleted: id })
    } catch (e) {
        return handleApiError(e)
    }
}
