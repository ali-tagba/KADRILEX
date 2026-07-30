import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const montantStr = searchParams.get("montant");
  const montant = montantStr ? parseInt(montantStr, 10) : null;
  const isCredit = searchParams.get("type") === "credit"; // Mouvement créditeur sur la banque = Client qui paie

  try {
    // On cherche les factures non payées ou partiellement payées
    const factures = await prisma.facture.findMany({
      where: {
        statut: { in: ["EMISE", "PARTIELLE", "EN_RETARD"] },
        direction: isCredit ? "EMISE" : "RECUE"
      },
      include: {
        client: true,
        fournisseur: true
      }
    });

    const suggestions = factures.map(f => {
      const resteAPayer = f.montantTTC - f.montantPaye;
      let score = 0;
      
      if (montant && resteAPayer === montant) score += 50;
      
      return {
        id: f.id,
        numero: f.numero,
        partenaire: f.client?.nom || f.client?.raisonSociale || f.fournisseur?.nom || "Inconnu",
        montantTotal: f.montantTTC,
        resteAPayer,
        score
      };
    }).sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error("Erreur de suggestions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
