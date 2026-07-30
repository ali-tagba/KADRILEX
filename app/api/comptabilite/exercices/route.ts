import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/server-permissions';
import { handleApiError } from '@/lib/server/api-helpers';

export async function GET() {
  try {
    await requirePermission("finance.view");
    
    const exercices = await prisma.exerciceComptable.findMany({
      orderBy: { dateDebut: 'desc' },
    });
    
    return NextResponse.json(exercices);
  } catch (error) {
    return handleApiError(error);
  }
}
