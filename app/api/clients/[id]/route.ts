import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    can,
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { ClientUpdateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shapeClient(c: Prisma.ClientGetPayload<{
    include: {
        equipe: true
        contacts: true
        dossiers: { include: { equipe: true } }
        factures: true
        _count: { select: { dossiers: true } }
    }
}>) {
    const { equipe, _count, dossiers, factures, ...rest } = c
    // etatFacturation : "IMPAYE" si au moins 1 facture EN_RETARD, sinon "A_JOUR"
    const aRetard = factures.some(
        (f) => f.direction === "EMISE" && f.statut === "EN_RETARD"
    )
    // partiesAdverses : aggregation déduplicée depuis tous les dossiers liés
    const partiesSet = new Set<string>()
    for (const d of dossiers) {
        for (const p of d.partiesAdverses ?? []) partiesSet.add(p)
    }
    return {
        ...rest,
        equipeIds: equipe.map((e) => e.membreId),
        activeDossiers: _count.dossiers,
        etatFacturation: aRetard ? "IMPAYE" : "A_JOUR",
        activity: [],
        partiesAdverses: Array.from(partiesSet).map((nom, i) => ({
            nom,
            dossierNumero: dossiers.find((d) => (d.partiesAdverses ?? []).includes(nom))?.numero ?? null,
            type: "INCONNU" as const,
        })),
        dossiers: dossiers.map((d) => ({
            ...d,
            equipeIds: d.equipe.map((e) => e.membreId),
            equipe: undefined,
        })),
    }
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("clients.view")
        const { id } = await params
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                equipe: true,
                contacts: true,
                dossiers: { include: { equipe: true } },
                factures: true,
                _count: { select: { dossiers: true } },
            },
        })
        if (!client) throw new HttpError(404, "Client introuvable")

        // RBAC OWN : vérifier que le membre a accès à CE client
        const resource = {
            responsableId: client.responsableId,
            equipeIds: client.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "clients.view", resource)) {
            throw new HttpError(403, "Accès refusé à ce client")
        }

        return Response.json(shapeClient(client))
    } catch (e) {
        return handleApiError(e)
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const existing = await prisma.client.findUnique({
            where: { id },
            include: { equipe: true },
        })
        if (!existing) {
            return Response.json({ error: "Client introuvable" }, { status: 404 })
        }
        const resource = {
            responsableId: existing.responsableId,
            equipeIds: existing.equipe.map((e) => e.membreId),
        }
        await requirePermission("clients.write", resource)

        const data = await parseJson(req, ClientUpdateSchema)
        const { equipeIds, createdAt, ...rest } = data

        const updated = await prisma.$transaction(async (tx) => {
            // Mise à jour de l'équipe si fournie : delete + recreate (idempotent)
            if (equipeIds !== undefined) {
                await tx.clientEquipe.deleteMany({ where: { clientId: id } })
                if (equipeIds.length > 0) {
                    await tx.clientEquipe.createMany({
                        data: equipeIds.map((mId) => ({ clientId: id, membreId: mId })),
                        skipDuplicates: true,
                    })
                }
            }

            return tx.client.update({
                where: { id },
                data: {
                    ...rest,
                    dateNaissance:
                        rest.dateNaissance === undefined
                            ? undefined
                            : rest.dateNaissance
                                ? new Date(rest.dateNaissance)
                                : null,
                    // Correction de date d'entrée (import historique)
                    ...(createdAt !== undefined && createdAt !== null
                        ? { createdAt: new Date(createdAt) }
                        : {}),
                },
                include: {
                    equipe: true,
                    contacts: true,
                    dossiers: { include: { equipe: true } },
                    factures: true,
                    _count: { select: { dossiers: true } },
                },
            })
        })
        return Response.json(shapeClient(updated))
    } catch (e) {
        return handleApiError(e)
    }
}

/**
 * Suppression DÉFINITIVE d'un client.
 *
 * Cascade explicite et exhaustive en transaction :
 *  - Pour chaque dossier du client : audiences, tâches, factures+paiements+lignes,
 *    dépenses, notes, fichiers GED, liaisons biblio
 *  - Factures directement attachées au client (sans dossier) → DELETE
 *  - Contacts → Cascade par schema
 *  - ClientEquipe → Cascade par schema
 *
 * Le client est entièrement effacé. Aucune option soft-delete : si l'utilisateur
 * veut conserver l'historique, il a le bouton "Désactiver" (actif=false) plutôt
 * que le bouton "Supprimer".
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const existing = await prisma.client.findUnique({
            where: { id },
            include: {
                equipe: true,
                _count: {
                    select: {
                        dossiers: true,
                        factures: true,
                        contacts: true,
                    },
                },
                dossiers: { select: { id: true } },
            },
        })
        if (!existing) {
            return Response.json({ error: "Client introuvable" }, { status: 404 })
        }
        const resource = {
            responsableId: existing.responsableId,
            equipeIds: existing.equipe.map((e) => e.membreId),
        }
        await requirePermission("clients.write", resource)

        const dossierIds = existing.dossiers.map((d) => d.id)
        const counts = existing._count

        await prisma.$transaction(async (tx) => {
            if (dossierIds.length > 0) {
                // Pour chaque dossier : on supprime sa cascade complète d'abord
                await tx.audience.deleteMany({ where: { dossierId: { in: dossierIds } } })
                await tx.tache.deleteMany({ where: { dossierId: { in: dossierIds } } })
                await tx.depense.deleteMany({ where: { dossierId: { in: dossierIds } } })
                await tx.facture.deleteMany({ where: { dossierId: { in: dossierIds } } })
                await tx.documentDossier.deleteMany({
                    where: { dossierId: { in: dossierIds } },
                })
                await tx.dossierNote.deleteMany({
                    where: { dossierId: { in: dossierIds } },
                })
                await tx.dossierFile.deleteMany({
                    where: { dossierId: { in: dossierIds } },
                })
                await tx.dossier.deleteMany({ where: { id: { in: dossierIds } } })
            }
            // Factures attachées DIRECTEMENT au client (sans dossier)
            await tx.facture.deleteMany({ where: { clientId: id } })
            // Le client (cascade contacts + equipe via schema)
            await tx.client.delete({ where: { id } })
        })

        return Response.json({
            ok: true,
            deleted: id,
            cascade: {
                dossiers: counts.dossiers,
                contacts: counts.contacts,
                factures: counts.factures,
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
