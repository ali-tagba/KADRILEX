import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/auth';

const sequestreOperationSchema = z.object({
  dossierId: z.string(),
  type: z.enum(['RECEPTION', 'DECAISSEMENT']),
  montant: z.number().positive(),
  libelle: z.string().min(1),
  dateOperation: z.string().datetime(),
  compteTiersId: z.string().optional(), // ex: Client ou Tiers
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dossierId = searchParams.get('dossierId');
    
    if (!dossierId) {
      return new NextResponse('dossierId manquant', { status: 400 });
    }

    const sequestre = await prisma.compteSequestre.findUnique({
      where: { dossierId },
    });

    return NextResponse.json(sequestre || { montantRecu: 0, montantReverse: 0 });
  } catch (error) {
    console.error('Erreur GET /api/comptabilite/sequestre:', error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Vérification de sécurité : Seul un ASSOCIE ou ASSOCIE_GERANT peut manipuler les fonds séquestres
    const auth = await verifyAuth(request);
    if (!auth || (auth.role !== 'ASSOCIE' && auth.role !== 'ASSOCIE_GERANT')) {
      return new NextResponse('Action non autorisée. Réservé aux associés.', { status: 403 });
    }

    const body = await request.json();
    const parsed = sequestreOperationSchema.parse(body);

    // Vérification si c'est un décaissement
    if (parsed.type === 'DECAISSEMENT') {
      const sequestre = await prisma.compteSequestre.findUnique({
        where: { dossierId: parsed.dossierId },
      });

      const soldeDisponible = sequestre 
        ? (sequestre.montantRecu || 0) - (sequestre.montantReverse || 0) 
        : 0;

      if (parsed.montant > soldeDisponible) {
        return new NextResponse(
          `Fonds insuffisants. Solde disponible : ${soldeDisponible}`,
          { status: 400 }
        );
      }
    }

    // Mise à jour ou création du compte séquestre pour le dossier
    const sequestre = await prisma.$transaction(async (tx) => {
      let sequestreDoc = await tx.compteSequestre.findUnique({
        where: { dossierId: parsed.dossierId }
      });

      if (!sequestreDoc) {
        sequestreDoc = await tx.compteSequestre.create({
          data: {
            dossierId: parsed.dossierId,
            montantRecu: 0,
            montantReverse: 0,
          }
        });
      }

      const updateData = parsed.type === 'RECEPTION'
        ? { montantRecu: { increment: parsed.montant } }
        : { montantReverse: { increment: parsed.montant } };

      return await tx.compteSequestre.update({
        where: { dossierId: parsed.dossierId },
        data: updateData
      });
    });

    return NextResponse.json(sequestre, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/comptabilite/sequestre:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('Données invalides', { status: 400 });
    }
    return new NextResponse('Erreur interne', { status: 500 });
  }
}
