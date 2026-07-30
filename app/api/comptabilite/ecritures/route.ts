import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ligneSchema = z.object({
  compteId: z.string(),
  clientId: z.string().optional(),
  fournisseurId: z.string().optional(),
  libelle: z.string().optional(),
  debit: z.number().default(0),
  credit: z.number().default(0),
});

const ecritureSchema = z.object({
  exerciceId: z.string(),
  journalId: z.string(),
  numeroPiece: z.string(),
  dateEcriture: z.string().datetime(),
  libelle: z.string().min(1),
  dossierId: z.string().optional(),
  lignes: z.array(ligneSchema).min(2),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ecritureSchema.parse(body);

    // 1. Récupération de l'exercice et vérification s'il est clôturé
    const exercice = await prisma.exerciceComptable.findUnique({
      where: { id: parsed.exerciceId },
    });

    if (!exercice) {
      return new NextResponse('Exercice introuvable', { status: 404 });
    }

    if (exercice.cloture) {
      return new NextResponse(
        "Impossible d'enregistrer une écriture : l'exercice comptable est clôturé.",
        { status: 403 }
      );
    }

    // 2. Vérification stricte de l'équilibre Débit / Crédit
    const totalDebit = parsed.lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = parsed.lignes.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (totalDebit !== totalCredit) {
      return new NextResponse(
        `L'écriture n'est pas équilibrée (Débit: ${totalDebit}, Crédit: ${totalCredit})`,
        { status: 400 }
      );
    }
    
    if (totalDebit === 0) {
      return new NextResponse(
        "L'écriture doit avoir un montant non nul.",
        { status: 400 }
      );
    }

    // 3. Création de l'écriture en transaction
    const ecriture = await prisma.ecriture.create({
      data: {
        exerciceId: parsed.exerciceId,
        journalId: parsed.journalId,
        numeroPiece: parsed.numeroPiece,
        dateEcriture: new Date(parsed.dateEcriture),
        libelle: parsed.libelle,
        dossierId: parsed.dossierId,
        lignes: {
          create: parsed.lignes.map((l) => ({
            compteId: l.compteId,
            clientId: l.clientId,
            fournisseurId: l.fournisseurId,
            libelle: l.libelle,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: {
        lignes: true,
      },
    });

    return NextResponse.json(ecriture, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/comptabilite/ecritures:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse('Données invalides', { status: 400 });
    }
    return new NextResponse('Erreur interne', { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const journalId = searchParams.get('journalId');
  const exerciceId = searchParams.get('exerciceId');

  try {
    const ecritures = await prisma.ecriture.findMany({
      where: {
        ...(journalId && { journalId }),
        ...(exerciceId && { exerciceId }),
      },
      include: {
        journal: true,
        lignes: {
          include: {
            compte: true,
          }
        },
      },
      orderBy: { dateEcriture: 'desc' },
      take: 100,
    });
    return NextResponse.json(ecritures);
  } catch (error) {
    console.error('Erreur GET /api/comptabilite/ecritures:', error);
    return new NextResponse('Erreur interne', { status: 500 });
  }
}
