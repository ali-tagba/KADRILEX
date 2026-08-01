import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/server-permissions';
import { handleApiError } from '@/lib/server/api-helpers';
import ExcelJS from 'exceljs';

export async function GET(_req: NextRequest) {
  try {
    await requirePermission("finance.view");

    const comptes = await prisma.compteComptable.findMany({
      orderBy: { numero: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Plan Comptable');

    sheet.columns = [
      { header: 'Numéro', key: 'numero', width: 12 },
      { header: 'Libellé', key: 'libelle', width: 45 },
      { header: 'Classe', key: 'classe', width: 10 },
      { header: 'Nature', key: 'nature', width: 12 },
      { header: 'Sens normal', key: 'sensNormal', width: 12 },
      { header: 'Lettrable', key: 'lettrable', width: 12 },
      { header: 'Statut', key: 'statut', width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const c of comptes) {
      sheet.addRow({
        numero: c.numero,
        libelle: c.libelle,
        classe: c.classe,
        nature: c.nature,
        sensNormal: c.sensNormal,
        lettrable: c.lettrable ? 'Oui' : 'Non',
        statut: c.actif ? 'Actif' : 'Inactif',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plan-comptable.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
