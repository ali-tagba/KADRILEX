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
import { DossierUpdateSchema } from "@/lib/server/schemas"
import type { Prisma } from "@prisma/client"

function shapeDossier(d: Prisma.DossierGetPayload<{
    include: {
        equipe: true
        client: { include: { equipe: true } }
        audiences: { include: { equipe: true } }
        taches: { include: { equipe: true } }
        files: true
        notes: { include: { auteur: true } }
        factures: { include: { paiements: true; fournisseur: true } }
        _count: { select: { audiences: true; taches: true; factures: true; files: true } }
    }
}>) {
    const { equipe, client, audiences, taches, factures, files, notes, ...rest } = d

    /**
     * Compute l'activité récente — agrège les événements horodatés depuis :
     * création du dossier, audiences, tâches, factures, paiements, notes, fichiers.
     * Trié décroissant, limité aux 10 plus récents.
     */
    type ActivityItem = {
        id: string
        label: string
        sublabel: string | null
        at: string
        important: boolean
    }
    const items: ActivityItem[] = []

    // Création du dossier
    items.push({
        id: `dossier-created-${d.id}`,
        label: `Ouverture du dossier ${d.numero}`,
        sublabel: d.titre,
        at: d.dateOuverture.toISOString(),
        important: true,
    })
    if (d.dateCloture) {
        items.push({
            id: `dossier-closed-${d.id}`,
            label: `Clôture du dossier`,
            sublabel: null,
            at: d.dateCloture.toISOString(),
            important: true,
        })
    }

    for (const a of audiences) {
        items.push({
            id: `audience-${a.id}`,
            label: `Audience programmée — ${a.titre}`,
            sublabel: a.juridiction ?? null,
            at: a.createdAt.toISOString(),
            important: a.statut === "A_VENIR",
        })
    }
    for (const t of taches) {
        items.push({
            id: `tache-${t.id}`,
            label: `Tâche : ${t.titre}`,
            sublabel: t.statut === "FAIT" ? "Terminée" : t.statut === "EN_COURS" ? "En cours" : null,
            at: t.createdAt.toISOString(),
            important: false,
        })
    }
    for (const f of factures) {
        const ttcK = Math.round(f.montantTTC / 1000)
        items.push({
            id: `facture-${f.id}`,
            label: `Facture ${f.direction === "EMISE" ? "émise" : "reçue"} ${f.numero}`,
            sublabel: `${ttcK.toLocaleString("fr-FR")} 000 FCFA TTC`,
            at: f.createdAt.toISOString(),
            important: true,
        })
        for (const p of f.paiements ?? []) {
            const k = Math.round(p.montant / 1000)
            items.push({
                id: `paiement-${p.id}`,
                label: `Paiement reçu — ${k.toLocaleString("fr-FR")} 000 FCFA`,
                sublabel: `Acompte sur ${f.numero}`,
                at: p.createdAt.toISOString(),
                important: false,
            })
        }
    }
    for (const n of notes) {
        // Note : DossierNote a juste `contenu` (texte libre), pas de titre
        const preview = n.contenu.slice(0, 60) + (n.contenu.length > 60 ? "…" : "")
        items.push({
            id: `note-${n.id}`,
            label: `Note : ${preview}`,
            sublabel: n.auteur ? `${n.auteur.prenom} ${n.auteur.nom}` : null,
            at: n.createdAt.toISOString(),
            important: false,
        })
    }
    for (const fi of files) {
        if (fi.type !== "FILE") continue
        items.push({
            id: `file-${fi.id}`,
            label: `Fichier ajouté : ${fi.name}`,
            sublabel: null,
            at: fi.createdAt.toISOString(),
            important: false,
        })
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const activity = items.slice(0, 15)

    // Factures normalisées vers le shape DossierFacture attendu par le frontend.
    // montantPaye calculé depuis les paiements réels (source de vérité).
    const facturesNorm = factures.map((f) => ({
        id: f.id,
        numero: f.numero,
        direction: f.direction,
        date: f.date.toISOString(),
        dateEcheance: f.dateEcheance?.toISOString() ?? null,
        montantHT: f.montantHT,
        montantTVA: f.montantTVA,
        montantTTC: f.montantTTC,
        montantPaye: f.paiements.reduce((s, p) => s + p.montant, 0),
        statut: f.statut,
        description: f.description ?? "",
        fournisseur: f.fournisseur?.nom ?? f.fournisseurNomLibre ?? null,
    }))

    return {
        ...rest,
        // Defaults pour les champs Json (null en DB → valeurs frontend safe)
        honoraires: Array.isArray(rest.honoraires) ? rest.honoraires : [],
        retrocession: (rest.retrocession && typeof rest.retrocession === "object" && !Array.isArray(rest.retrocession))
            ? rest.retrocession
            : null,
        equipeIds: equipe.map((e) => e.membreId),
        client: client ? { ...client, equipeIds: client.equipe.map((e) => e.membreId), equipe: undefined } : null,
        audiences: audiences.map((a) => ({
            ...a,
            date: a.dateDebut.toISOString(),
            heure: a.dateDebut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            equipeIds: a.equipe.map((e) => e.membreId),
            equipe: undefined,
        })),
        taches: taches.map((t) => ({ ...t, equipeIds: t.equipe.map((e) => e.membreId), equipe: undefined })),
        factures: facturesNorm,
        files,
        notes,
        activity,
    }
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const membre = await requirePermission("dossiers.view")
        const { id } = await params
        const dossier = await prisma.dossier.findUnique({
            where: { id },
            include: {
                equipe: true,
                client: { include: { equipe: true } },
                audiences: { include: { equipe: true }, orderBy: { dateDebut: "asc" } },
                taches: { include: { equipe: true }, orderBy: { createdAt: "desc" } },
                files: { orderBy: { createdAt: "asc" } },
                notes: { include: { auteur: true }, orderBy: { createdAt: "desc" } },
                factures: { include: { paiements: true, fournisseur: true }, orderBy: { date: "desc" } },
                _count: {
                    select: { audiences: true, taches: true, factures: true, files: true },
                },
            },
        })
        if (!dossier) throw new HttpError(404, "Dossier introuvable")

        const resource = {
            responsableId: dossier.responsableId,
            equipeIds: dossier.equipe.map((e) => e.membreId),
        }
        if (!can(membre, "dossiers.view", resource)) {
            throw new HttpError(403, "Accès refusé à ce dossier")
        }

        return Response.json(shapeDossier(dossier))
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
        const existing = await prisma.dossier.findUnique({
            where: { id },
            include: { equipe: true },
        })
        if (!existing) throw new HttpError(404, "Dossier introuvable")
        const resource = {
            responsableId: existing.responsableId,
            equipeIds: existing.equipe.map((e) => e.membreId),
        }
        await requirePermission("dossiers.write", resource)

        const data = await parseJson(req, DossierUpdateSchema)
        const { equipeIds, ...rest } = data

        const updated = await prisma.$transaction(async (tx) => {
            if (equipeIds !== undefined) {
                await tx.dossierEquipe.deleteMany({ where: { dossierId: id } })
                if (equipeIds.length > 0) {
                    await tx.dossierEquipe.createMany({
                        data: equipeIds.map((mId) => ({ dossierId: id, membreId: mId })),
                        skipDuplicates: true,
                    })
                }
            }
            return tx.dossier.update({
                where: { id },
                data: {
                    ...rest,
                    honoraires: rest.honoraires !== undefined ? (rest.honoraires as any) : undefined,
                    provisionsVersees: rest.provisionsVersees !== undefined ? (rest.provisionsVersees as any) : undefined,
                    retrocession: rest.retrocession !== undefined ? (rest.retrocession as any) : undefined,
                    dateOuverture:
                        rest.dateOuverture === undefined
                            ? undefined
                            : new Date(rest.dateOuverture),
                    dateCloture:
                        rest.dateCloture === undefined
                            ? undefined
                            : rest.dateCloture
                                ? new Date(rest.dateCloture)
                                : null,
                },
                include: {
                    equipe: true,
                    client: { include: { equipe: true } },
                    audiences: { include: { equipe: true } },
                    taches: { include: { equipe: true } },
                    files: true,
                    notes: { include: { auteur: true } },
                    factures: { include: { paiements: true, fournisseur: true } },
                    _count: {
                        select: { audiences: true, taches: true, factures: true, files: true },
                    },
                },
            })
        })
        return Response.json(shapeDossier(updated))
    } catch (e) {
        return handleApiError(e)
    }
}

/**
 * Suppression DÉFINITIVE d'un dossier.
 *
 * Cascade explicite et exhaustive en transaction :
 *  - Audiences du dossier → DELETE (avec leurs équipes et lignes facture liées via SetNull)
 *  - Tâches du dossier → DELETE
 *  - DossierNotes → DELETE (Cascade via schema, mais on garantit l'ordre)
 *  - DossierFiles (arbre récursif) → DELETE (Cascade self via parentId)
 *  - DocumentDossier (liaisons biblio) → DELETE
 *  - Factures (EMISE et RECUE) liées → DELETE (paiements + lignes en cascade schema)
 *  - Depenses liées → DELETE
 *  - DossierEquipe → Cascade par schema
 *
 * Toutes les opérations dans une transaction Prisma pour garantir l'atomicité.
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const existing = await prisma.dossier.findUnique({
            where: { id },
            include: {
                equipe: true,
                _count: {
                    select: {
                        audiences: true,
                        taches: true,
                        files: true,
                        notes: true,
                        factures: true,
                        depenses: true,
                        documents: true,
                    },
                },
            },
        })
        if (!existing) throw new HttpError(404, "Dossier introuvable")
        const resource = {
            responsableId: existing.responsableId,
            equipeIds: existing.equipe.map((e) => e.membreId),
        }
        await requirePermission("dossiers.write", resource)

        const counts = existing._count

        await prisma.$transaction(async (tx) => {
            // Ordre important pour éviter les contraintes FK :
            // 1) Entités enfants directes
            await tx.audience.deleteMany({ where: { dossierId: id } })
            await tx.tache.deleteMany({ where: { dossierId: id } })
            await tx.depense.deleteMany({ where: { dossierId: id } })
            await tx.facture.deleteMany({ where: { dossierId: id } })
            await tx.documentDossier.deleteMany({ where: { dossierId: id } })
            await tx.dossierNote.deleteMany({ where: { dossierId: id } })

            // 2) Fichiers : on supprime feuilles d'abord, puis racines (boucle simple)
            //    DossierFile a une self-relation parentId avec onDelete: Cascade,
            //    donc supprimer le dossier suffit. Mais on est explicite.
            await tx.dossierFile.deleteMany({ where: { dossierId: id } })

            // 3) Dossier lui-même (DossierEquipe en cascade)
            await tx.dossier.delete({ where: { id } })
        })

        return Response.json({
            ok: true,
            deleted: id,
            cascade: {
                audiences: counts.audiences,
                taches: counts.taches,
                files: counts.files,
                notes: counts.notes,
                factures: counts.factures,
                depenses: counts.depenses,
                documentsLies: counts.documents,
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
