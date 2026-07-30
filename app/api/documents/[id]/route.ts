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
import { DocumentUpdateSchema } from "@/lib/server/schemas"
import type { Document } from "@prisma/client"

function shapeDocument(d: Document, dossierIdsLies: string[] = []) {
    return {
        ...d,
        tags: (d.tags ?? []).join(", "),
        dossierIdsLies,
    }
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("bibliotheque.view")
        const { id } = await params
        const doc = await prisma.document.findUnique({
            where: { id },
            include: { dossiers: { include: { dossier: true } } },
        })
        if (!doc) throw new HttpError(404, "Document introuvable")

        // Incrémenter le compteur de consultations (silencieux)
        prisma.document
            .update({
                where: { id },
                data: { nbConsultations: { increment: 1 }, derniereConsultation: new Date() },
            })
            .catch(() => undefined)

        const { dossiers, ...rest } = doc
        return Response.json({
            ...shapeDocument(rest, dossiers.map((l) => l.dossierId)),
            /* Aussi exposer les dossiers complets pour le détail */
            dossiers: dossiers.map((l) => l.dossier),
        })
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("bibliotheque.write")
        const { id } = await params
        const data = await parseJson(req, DocumentUpdateSchema)
        // Normaliser tags : accepter string CSV ou array
        let tags: string[] | undefined = undefined
        if (data.tags !== undefined) {
            tags = Array.isArray(data.tags)
                ? data.tags
                : String(data.tags).split(",").map((s) => s.trim()).filter(Boolean)
        }
        const { tags: _t, ...restData } = data
        const updated = await prisma.document.update({
            where: { id },
            data: {
                ...restData,
                tags,
                dateDocument:
                    data.dateDocument === undefined
                        ? undefined
                        : data.dateDocument
                            ? new Date(data.dateDocument)
                            : null,
            },
        })
        return Response.json(shapeDocument(updated))
    } catch (e) {
        return handleApiError(e)
    }
}

/**
 * Suppression DÉFINITIVE du document.
 * Les liaisons DocumentDossier sont supprimées en cascade (onDelete: Cascade dans le schéma).
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("bibliotheque.write")
        const { id } = await params
        const doc = await prisma.document.findUnique({ where: { id } })
        if (!doc) throw new HttpError(404, "Document introuvable")
        await prisma.document.delete({ where: { id } })
        return Response.json({ ok: true, deleted: id })
    } catch (e) {
        return handleApiError(e)
    }
}
