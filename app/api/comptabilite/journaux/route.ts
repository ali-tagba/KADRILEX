import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const journalSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  libelle: z.string().min(2),
  type: z.enum(['VENTE', 'ACHAT', 'BANQUE', 'CAISSE', 'OD']),
});

export async function GET() {
  try {
    const journaux = await prisma.journalComptable.findMany({
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(journaux);
  } catch (error) {
    console.error('Erreur GET /api/comptabilite/journaux:', error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = journalSchema.parse(body);

    const exists = await prisma.journalComptable.findUnique({
      where: { code: parsed.code },
    });

    if (exists) {
      return new NextResponse('Ce code de journal existe déjà.', { status: 400 });
    }

    const journal = await prisma.journalComptable.create({
      data: parsed,
    });

    return NextResponse.json(journal, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/comptabilite/journaux:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('Données invalides', { status: 400 });
    }
    return new NextResponse('Erreur interne', { status: 500 });
  }
}
