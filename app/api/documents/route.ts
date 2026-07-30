import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
    getQuery,
} from "@/lib/server/api-helpers"
import { DocumentCreateSchema } from "@/lib/server/schemas"
import type { Prisma, Document } from "@prisma/client"

/** Adapte la réponse au shape MockDocument attendu par le frontend.
 *  Convertit tags: String[] (Prisma) → string CSV (Mock). */
function shapeDocument(d: Document, dossierIdsLies: string[] = []) {
    return {
        ...d,
        tags: (d.tags ?? []).join(", "),
        dossierIdsLies,
    }
}

export async function GET(req: NextRequest) {
    try {
        await requirePermission("bibliotheque.view")
        const q = getQuery(req.url)

        const where: Prisma.DocumentWhereInput = { statut: "ACTIF" }
        if (q.search) {
            where.OR = [
                { titre: { contains: q.search, mode: "insensitive" } },
                { reference: { contains: q.search, mode: "insensitive" } },
                { description: { contains: q.search, mode: "insensitive" } },
            ]
        }
        if (q.categorie) where.categorie = q.categorie as Prisma.DocumentWhereInput["categorie"]
        if (q.domaine) where.domaineJuridique = q.domaine as Prisma.DocumentWhereInput["domaineJuridique"]
        if (q.type) where.type = q.type as Prisma.DocumentWhereInput["type"]
        if (q.favori === "true") where.estFavori = true
        if (q.statut === "ARCHIVE") {
            delete where.statut
            where.statut = "ARCHIVE"
        }

        const documents = await prisma.document.findMany({
            where,
            orderBy: [{ estFavori: "desc" }, { dateDocument: "desc" }, { createdAt: "desc" }],
            include: { dossiers: { select: { dossierId: true } } },
        })
        return Response.json(
            documents.map((d) => {
                const { dossiers, ...rest } = d
                return shapeDocument(rest, dossiers.map((l) => l.dossierId))
            })
        )
    } catch (e) {
        return handleApiError(e)
    }
}

export async function POST(req: NextRequest) {
    try {
        await requirePermission("bibliotheque.write")
        const data = await parseJson(req, DocumentCreateSchema)
        // Le frontend envoie tags soit en string CSV soit en array — on normalise
        const tagsArray = Array.isArray(data.tags)
            ? data.tags
            : data.tags
                ? String(data.tags).split(",").map((s) => s.trim()).filter(Boolean)
                : []
        const { tags: _t, ...restData } = data
        const created = await prisma.document.create({
            data: {
                ...restData,
                tags: tagsArray,
                dateDocument: data.dateDocument ? new Date(data.dateDocument) : null,
            },
        })
        return Response.json(shapeDocument(created), { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
