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
    const compteId = searchParams.get('compteId');

    const comptes = await prisma.compteComptable.findMany({
      where: compteId ? { id: compteId } : undefined,
      include: {
        lignes: {
          where: exerciceId ? { ecriture: { exerciceId } } : undefined,
          include: {
            ecriture: {
              include: { journal: true }
            }
          },
          orderBy: { ecriture: { dateEcriture: 'asc' } }
        }
      },
      orderBy: { numero: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Grand Livre');

    sheet.columns = [
      { header: 'Compte', key: 'compte', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Journal', key: 'journal', width: 10 },
      { header: 'Pièce', key: 'piece', width: 20 },
      { header: 'Libellé', key: 'libelle', width: 45 },
      { header: 'Débit', key: 'debit', width: 15 },
      { header: 'Crédit', key: 'credit', width: 15 },
      { header: 'Solde', key: 'solde', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const compte of comptes) {
      if (compte.lignes.length === 0) continue;

      let solde = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const row = sheet.addRow({
        compte: `${compte.numero} - ${compte.libelle}`,
      });
      row.font = { bold: true };

      for (const ligne of compte.lignes) {
        totalDebit += ligne.debit;
        totalCredit += ligne.credit;
        solde = totalDebit - totalCredit;

        sheet.addRow({
          compte: compte.numero,
          date: new Date(ligne.ecriture.dateEcriture).toLocaleDateString('fr-FR'),
          journal: ligne.ecriture.journal.code,
          piece: ligne.ecriture.numeroPiece,
          libelle: ligne.libelle || ligne.ecriture.libelle,
          debit: ligne.debit,
          credit: ligne.credit,
          solde: solde
        });
      }

      const totalRow = sheet.addRow({
        libelle: `Total ${compte.numero}`,
        debit: totalDebit,
        credit: totalCredit,
        solde: solde
      });
      totalRow.font = { bold: true };
      sheet.addRow({}); // ligne vide
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="grand-livre.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
