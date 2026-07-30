import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceIds, targetInvoiceId, isDepense } = body; // sourceIds: Array of Depense IDs or FactureFournisseur IDs

    if (!sourceIds || sourceIds.length === 0 || !targetInvoiceId) {
      return NextResponse.json({ error: "IDs manquants" }, { status: 400 });
    }

    const targetInvoice = await prisma.facture.findUnique({
      where: { id: targetInvoiceId }
    });

    if (!targetInvoice || targetInvoice.direction !== "EMISE") {
      return NextResponse.json({ error: "Facture cible invalide" }, { status: 400 });
    }

    const lignes = [];

    if (isDepense) {
      const depenses = await prisma.depense.findMany({
        where: { id: { in: sourceIds } }
      });

      for (const depense of depenses) {
        const ligne = await prisma.factureLigne.create({
          data: {
            factureId: targetInvoiceId,
            libelle: `Refacturation débours : ${depense.libelle}`,
            quantite: 1,
            prixUnitaire: depense.montantTTC, // On refacture généralement le TTC du débours
            total: depense.montantTTC
          }
        });
        lignes.push(ligne);
      }
    } else {
      const facturesRecues = await prisma.facture.findMany({
        where: { id: { in: sourceIds }, direction: "RECUE" }
      });

      for (const factureRecue of facturesRecues) {
        const ligne = await prisma.factureLigne.create({
          data: {
            factureId: targetInvoiceId,
            libelle: `Refacturation frais fournisseur (Facture ${factureRecue.numero})`,
            quantite: 1,
            prixUnitaire: factureRecue.montantTTC,
            total: factureRecue.montantTTC
          }
        });
        lignes.push(ligne);
        
        // Mettre à jour la facture reçue pour la marquer comme refacturée
        await prisma.facture.update({
          where: { id: factureRecue.id },
          data: { refactureeViaFactureId: targetInvoiceId }
        });
      }
    }

    // Mettre à jour le total de la facture cible
    const allLignes = await prisma.factureLigne.findMany({
      where: { factureId: targetInvoiceId }
    });
    
    const newTotal = allLignes.reduce((sum, l) => sum + l.total, 0);
    
    await prisma.facture.update({
      where: { id: targetInvoiceId },
      data: {
        montantHT: newTotal,
        montantTTC: newTotal // Si pas de TVA applicable sur le total, sinon ajuster.
      }
    });

    return NextResponse.json({ success: true, lignesAjoutees: lignes.length });
  } catch (error) {
    console.error("Erreur de refacturation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
