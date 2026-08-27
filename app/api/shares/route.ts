import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    can,
    HttpError,
    requireAuth,
} from "@/lib/auth/server-permissions"
import {
    handleApiError,
    parseJson,
} from "@/lib/server/api-helpers"
import { PartageCreateSchema } from "@/lib/server/schemas"
import type { Membre } from "@prisma/client"

/**
 * Vérifie que `me` a le droit d'accéder à l'entité qu'il veut partager.
 * Lance HttpError(403) sinon.
 */
async function assertCanShareEntity(
    me: Membre & { permissionsOverrides: unknown },
    entityType: string,
    entityId: string
): Promise<void> {
    switch (entityType) {
        case "CLIENT": {
            const c = await prisma.client.findUnique({
                where: { id: entityId },
                include: { equipe: true },
            })
            if (!c) throw new HttpError(404, "Client introuvable")
            const ok = can(me, "clients.view", {
                responsableId: c.responsableId,
                equipeIds: c.equipe.map((e) => e.membreId),
            })
            if (!ok) throw new HttpError(403, "Tu n'as pas accès à ce client")
            return
        }
        case "DOSSIER": {
            const d = await prisma.dossier.findUnique({
                where: { id: entityId },
                include: { equipe: true },
            })
            if (!d) throw new HttpError(404, "Dossier introuvable")
            const ok = can(me, "dossiers.view", {
                responsableId: d.responsableId,
                equipeIds: d.equipe.map((e) => e.membreId),
            })
            if (!ok) throw new HttpError(403, "Tu n'as pas accès à ce dossier")
            return
        }
        case "AUDIENCE": {
            const a = await prisma.audience.findUnique({
                where: { id: entityId },
                include: {
                    equipe: true,
                    dossier: { include: { equipe: true } },
                },
            })
            if (!a) throw new HttpError(404, "Audience introuvable")
            // L'audience peut être « sèche » (sans dossier) : on s'appuie sur son
            // propre responsable/équipe, complété par celui du dossier s'il existe.
            const ok = can(me, "audiences.view", {
                responsableId: a.responsableId,
                equipeIds: [
                    ...(a.dossier?.equipe.map((e) => e.membreId) ?? []),
                    ...a.equipe.map((e) => e.membreId),
                ],
            })
            if (!ok) throw new HttpError(403, "Tu n'as pas accès à cette audience")
            return
        }
        case "TACHE": {
            const t = await prisma.tache.findUnique({
                where: { id: entityId },
                include: { equipe: true },
            })
            if (!t) throw new HttpError(404, "Tâche introuvable")
            const ok = can(me, "taches.view", {
                responsableId: t.responsableId,
                equipeIds: t.equipe.map((e) => e.membreId),
            })
            if (!ok) throw new HttpError(403, "Tu n'as pas accès à cette tâche")
            return
        }
        case "DOCUMENT":
        case "FACTURE":
        case "DEPENSE": {
            // Modules sans tableau équipe : permission RBAC simple
            const permMap: Record<string, Parameters<typeof can>[1]> = {
                DOCUMENT: "bibliotheque.view",
                FACTURE: "finance.view",
                DEPENSE: "finance.view",
            }
            const perm = permMap[entityType]
            if (!perm || !can(me, perm)) {
                throw new HttpError(403, `Tu n'as pas accès à cette ${entityType.toLowerCase()}`)
            }
            return
        }
        default:
            throw new HttpError(400, `Type d'entité inconnu : ${entityType}`)
    }
}

/** GET /api/shares — liste mes partages REÇUS, du plus récent au plus ancien. */
export async function GET() {
    try {
        const membre = await requireAuth()
        const list = await prisma.partage.findMany({
            where: { toMembreId: membre.id },
            orderBy: { createdAt: "desc" },
            include: {
                fromMembre: {
                    select: { id: true, prenom: true, nom: true, email: true, role: true },
                },
            },
        })
        return Response.json(list)
    } catch (e) {
        return handleApiError(e)
    }
}

/** POST /api/shares — crée un partage + ajoute le destinataire à l'équipe de l'entité
 *  (Client / Dossier / Audience / Tâche) pour qu'il y ait accès même en scope OWN.
 *  SECURITY : exige que `me` ait accès à l'entité avant de la partager. */
export async function POST(req: NextRequest) {
    try {
        const me = await requireAuth()
        const data = await parseJson(req, PartageCreateSchema)

        if (data.toMembreId === me.id) {
            throw new HttpError(400, "Tu ne peux pas te partager à toi-même.")
        }

        // Vérifie le destinataire existe et est actif
        const dest = await prisma.membre.findUnique({ where: { id: data.toMembreId } })
        if (!dest || !dest.actif) {
            throw new HttpError(400, "Destinataire introuvable ou désactivé.")
        }

        // CRITIQUE : vérifie que `me` a accès à l'entité qu'il veut partager.
        // Sans ce check, un membre OWN pouvait partager le client d'un autre.
        await assertCanShareEntity(me, data.entityType, data.entityId)

        const created = await prisma.$transaction(async (tx) => {
            // Auto-add destinataire à l'équipe de l'entité (si applicable)
            switch (data.entityType) {
                case "CLIENT":
                    await tx.clientEquipe
                        .upsert({
                            where: {
                                clientId_membreId: {
                                    clientId: data.entityId,
                                    membreId: data.toMembreId,
                                },
                            },
                            create: { clientId: data.entityId, membreId: data.toMembreId },
                            update: {},
                        })
                        .catch(() => undefined)
                    break
                case "DOSSIER":
                    await tx.dossierEquipe
                        .upsert({
                            where: {
                                dossierId_membreId: {
                                    dossierId: data.entityId,
                                    membreId: data.toMembreId,
                                },
                            },
                            create: { dossierId: data.entityId, membreId: data.toMembreId },
                            update: {},
                        })
                        .catch(() => undefined)
                    break
                case "AUDIENCE":
                    await tx.audienceEquipe
                        .upsert({
                            where: {
                                audienceId_membreId: {
                                    audienceId: data.entityId,
                                    membreId: data.toMembreId,
                                },
                            },
                            create: { audienceId: data.entityId, membreId: data.toMembreId },
                            update: {},
                        })
                        .catch(() => undefined)
                    break
                case "TACHE":
                    await tx.tacheEquipe
                        .upsert({
                            where: {
                                tacheId_membreId: {
                                    tacheId: data.entityId,
                                    membreId: data.toMembreId,
                                },
                            },
                            create: { tacheId: data.entityId, membreId: data.toMembreId },
                            update: {},
                        })
                        .catch(() => undefined)
                    break
                // DOCUMENT / FACTURE / DEPENSE : pas de table équipe — RBAC global suffisant
            }

            return tx.partage.create({
                data: {
                    fromMembreId: me.id,
                    toMembreId: data.toMembreId,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    entityNumero: data.entityNumero ?? null,
                    entityLabel: data.entityLabel ?? null,
                    message: data.message ?? null,
                },
                include: {
                    fromMembre: {
                        select: { id: true, prenom: true, nom: true, email: true, role: true },
                    },
                },
            })
        })

        return Response.json(created, { status: 201 })
    } catch (e) {
        return handleApiError(e)
    }
}
