import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/server-permissions';
import { handleApiError } from '@/lib/server/api-helpers';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    await requirePermission("finance.view");
    const { searchParams } = new URL(req.url);
    const exerciceId = searchParams.get('exerciceId');
    const journalId = searchParams.get('journalId');

    const ecritures = await prisma.ecriture.findMany({
      where: {
        ...(exerciceId && { exerciceId }),
        ...(journalId && { journalId }),
      },
      include: {
        journal: true,
        exercice: true,
        lignes: {
          include: { compte: true }
        }
      },
      orderBy: { dateEcriture: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Écritures Comptables');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Journal', key: 'journal', width: 15 },
      { header: 'Pièce', key: 'piece', width: 20 },
      { header: 'Compte', key: 'compte', width: 15 },
      { header: 'Libellé Compte', key: 'libelleCompte', width: 35 },
      { header: 'Libellé Écriture', key: 'libelle', width: 45 },
      { header: 'Débit', key: 'debit', width: 15 },
      { header: 'Crédit', key: 'credit', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    let totalDebit = 0;
    let totalCredit = 0;

    for (const ecriture of ecritures) {
      for (const ligne of ecriture.lignes) {
        sheet.addRow({
          date: new Date(ecriture.dateEcriture).toLocaleDateString('fr-FR'),
          journal: ecriture.journal.code,
          piece: ecriture.numeroPiece,
          compte: ligne.compte.numero,
          libelleCompte: ligne.compte.libelle,
          libelle: ligne.libelle || ecriture.libelle,
          debit: ligne.debit,
          credit: ligne.credit,
        });
        totalDebit += ligne.debit;
        totalCredit += ligne.credit;
      }
    }

    sheet.addRow({});
    const totalRow = sheet.addRow({
      libelle: 'TOTAL',
      debit: totalDebit,
      credit: totalCredit
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ecritures-comptables.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
