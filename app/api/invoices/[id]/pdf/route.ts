import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"
import { generateFacturePdf } from "@/lib/server/facture-pdf"

/**
 * Génère un PDF de la facture conforme au format Niger (OHADA + mentions CGI).
 * Téléchargeable directement par le navigateur.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.view")
        const { id } = await params

        const facture = await prisma.facture.findUnique({
            where: { id },
            include: {
                client: true,
                dossier: true,
                fournisseur: true,
                lignes: { orderBy: { id: "asc" } },
            },
        })
        if (!facture) throw new HttpError(404, "Facture introuvable")

        const pdfBytes = await generateFacturePdf({
            numero: facture.numero,
            direction: facture.direction,
            date: facture.date,
            dateEcheance: facture.dateEcheance,
            description: facture.description,
            notes: facture.notes,
            montantHT: facture.montantHT,
            montantTVA: facture.montantTVA,
            montantTTC: facture.montantTTC,
            montantPaye: facture.montantPaye,
            tvaRate: facture.tvaRate,
            statut: facture.statut,
            lignes: facture.lignes.map((l) => ({
                libelle: l.libelle,
                // quantite est un Decimal Prisma — on convertit en number pour l'affichage
                quantite: Number(l.quantite),
                prixUnitaire: l.prixUnitaire,
                total: l.total,
            })),
            client: facture.client
                ? {
                      nom:
                          facture.client.raisonSociale ??
                          [facture.client.prenom, facture.client.nom].filter(Boolean).join(" "),
                      adresse: facture.client.adresse,
                      ville: facture.client.ville,
                      codePostal: null,
                      rccm: facture.client.numeroRCCM,
                      nif: facture.client.nif,
                      email: facture.client.email,
                      telephone: facture.client.telephone,
                  }
                : null,
            fournisseur: facture.fournisseur
                ? {
                      nom: facture.fournisseur.nom,
                      adresse: facture.fournisseur.adresse,
                      rccm: null,
                      nif: facture.fournisseur.nif,
                  }
                : null,
            fournisseurNomLibre: facture.fournisseurNomLibre,
            dossier: facture.dossier
                ? { numero: facture.dossier.numero, titre: facture.dossier.titre }
                : null,
        })

        const filename = `${facture.numero}.pdf`
        // Buffer compatible avec BodyInit
        return new Response(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "private, max-age=60",
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
