import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    HttpError,
    requirePermission,
} from "@/lib/auth/server-permissions"
import { handleApiError } from "@/lib/server/api-helpers"
import { generateFacturePdf } from "@/lib/server/facture-pdf"
import { uploadFile, KADRILEX_BUCKET } from "@/lib/storage/supabase"

/**
 * Génère le PDF officiel de la facture (format Niger), le pousse sur Supabase
 * Storage et stocke l'URL dans Facture.generatedPdfUrl.
 *
 * Idempotent : si la facture est déjà à jour (updatedAt <= generatedPdfAt),
 * retourne l'URL existante sans re-générer.
 * Si `?force=1`, force la régénération.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission("finance.write")
        const { id } = await params
        const url = new URL(req.url)
        const force = url.searchParams.get("force") === "1"

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
        if (facture.direction !== "EMISE") {
            throw new HttpError(400, "La génération PDF n'est disponible que pour les factures émises")
        }

        // Idempotence : ne pas re-générer si à jour
        if (
            !force &&
            facture.generatedPdfUrl &&
            facture.generatedPdfAt &&
            facture.generatedPdfAt.getTime() >= facture.updatedAt.getTime()
        ) {
            return Response.json({
                generatedPdfUrl: facture.generatedPdfUrl,
                generatedPdfAt: facture.generatedPdfAt,
                alreadyUpToDate: true,
            })
        }

        // Génération du PDF
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
            fournisseur: null,
            fournisseurNomLibre: null,
            dossier: facture.dossier
                ? { numero: facture.dossier.numero, titre: facture.dossier.titre }
                : null,
        })

        // Upload sur Supabase Storage — chemin déterministe pour pouvoir réécrire
        const storagePath = `factures/${facture.numero}-${Date.now()}.pdf`
        await uploadFile(KADRILEX_BUCKET, storagePath, Buffer.from(pdfBytes), "application/pdf")

        // Persiste l'URL + timestamp
        const generatedAt = new Date()
        const updated = await prisma.facture.update({
            where: { id },
            data: {
                generatedPdfUrl: storagePath,
                generatedPdfAt: generatedAt,
            },
        })

        return Response.json({
            generatedPdfUrl: updated.generatedPdfUrl,
            generatedPdfAt: updated.generatedPdfAt,
            alreadyUpToDate: false,
        })
    } catch (e) {
        return handleApiError(e)
    }
}
