import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getScope, requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError, getQuery } from "@/lib/server/api-helpers"
import { generateAudiencesPdf, type AudiencePdfRow } from "@/lib/server/audiences-pdf"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("audiences.view")
        const q = getQuery(req.url)

        const where: Prisma.AudienceWhereInput = {}
        if (q.search) where.titre = { contains: q.search, mode: "insensitive" }
        if (q.statut) where.statut = q.statut as Prisma.AudienceWhereInput["statut"]
        if (q.nature) where.nature = q.nature as Prisma.AudienceWhereInput["nature"]
        if (q.dossierId) where.dossierId = q.dossierId
        if (q.from || q.to) {
            where.dateDebut = {}
            if (q.from) (where.dateDebut as Prisma.DateTimeFilter).gte = new Date(q.from)
            if (q.to) (where.dateDebut as Prisma.DateTimeFilter).lte = new Date(q.to)
        }
        if (q.juridiction) where.juridiction = { contains: q.juridiction, mode: "insensitive" }

        if (getScope(membre, "audiences.view") === "OWN") {
            where.OR = [
                { responsableId: membre.id },
                { equipe: { some: { membreId: membre.id } } },
            ]
        }

        const audiences = await prisma.audience.findMany({
            where,
            orderBy: { dateDebut: "asc" },
            include: {
                client: true,
                dossier: { include: { client: true } },
                responsable: true,
            },
        })

        const rows: AudiencePdfRow[] = audiences.map((a) => {
            const client = a.client ?? a.dossier?.client ?? null
            const clientNom = client
                ? client.type === "PERSONNE_MORALE"
                    ? client.raisonSociale ?? "—"
                    : `${client.prenom ?? ""} ${client.nom ?? ""}`.trim() || "—"
                : null
            return {
                numero: a.numero,
                titre: a.titre,
                nature: a.nature,
                statut: a.statut,
                dateDebut: a.dateDebut,
                dureeMinutes: a.dureeMinutes,
                juridiction: a.juridiction,
                salleAudience: a.salleAudience,
                dossierNumero: a.dossier?.numero ?? null,
                clientNom,
                responsableNom: a.responsable ? `${a.responsable.prenom} ${a.responsable.nom}` : null,
            }
        })

        const pdfBytes = await generateAudiencesPdf(rows, `${membre.prenom} ${membre.nom}`)

        return new Response(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="registre-audiences-${new Date().toISOString().slice(0, 10)}.pdf"`,
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
