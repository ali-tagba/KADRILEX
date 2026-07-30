import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const compteSchema = z.object({
  numero: z.string().min(1),
  libelle: z.string().min(1),
  classe: z.number().min(1).max(8),
  nature: z.enum(['BILAN', 'GESTION']),
  sensNormal: z.enum(['DEBIT', 'CREDIT']),
  lettrable: z.boolean().default(false),
});

export async function GET() {
  try {
    const comptes = await prisma.compteComptable.findMany({
      orderBy: { numero: 'asc' },
    });
    return NextResponse.json(comptes);
  } catch (error) {
    console.error('Erreur GET /api/comptabilite/comptes:', error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = compteSchema.parse(body);

    // Vérifier si le compte existe déjà
    const exists = await prisma.compteComptable.findUnique({
      where: { numero: parsed.numero },
    });

    if (exists) {
      return new NextResponse('Ce numéro de compte existe déjà.', { status: 400 });
    }

    const compte = await prisma.compteComptable.create({
      data: parsed,
    });

    return NextResponse.json(compte, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/comptabilite/comptes:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('Données invalides', { status: 400 });
    }
    return new NextResponse('Erreur interne', { status: 500 });
  }
}
