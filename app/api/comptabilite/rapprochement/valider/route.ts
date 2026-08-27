import { NextResponse } from "next/server";
import { PrismaClient, ModePaiement } from "@prisma/client";
import { requirePermission } from "@/lib/auth/server-permissions";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    await requirePermission("finance.write");
    const { factureId, transaction } = await req.json();

    if (!factureId || !transaction) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const facture = await prisma.facture.findUnique({
      where: { id: factureId }
    });

    if (!facture) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Créer le paiement
    const paiement = await prisma.paiement.create({
      data: {
        factureId: facture.id,
        date: new Date(transaction.date),
        montant: transaction.montant,
        mode: ModePaiement.VIREMENT, // Par défaut pour un import bancaire
        reference: transaction.libelle,
        notes: "Rapproché automatiquement via import bancaire"
      }
    });

    // Mettre à jour le statut de la facture
    const nouveauMontantPaye = facture.montantPaye + paiement.montant;
    const nouveauStatut = nouveauMontantPaye >= facture.montantTTC ? "PAYEE" : "PARTIELLE";

    await prisma.facture.update({
      where: { id: facture.id },
      data: {
        montantPaye: nouveauMontantPaye,
        statut: nouveauStatut
      }
    });

    return NextResponse.json({ success: true, paiement });
  } catch (error) {
    console.error("Erreur validation rapprochement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
