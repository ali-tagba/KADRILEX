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

    const comptes = await prisma.compteComptable.findMany({
      include: {
        lignes: {
          where: exerciceId ? { ecriture: { exerciceId } } : undefined,
        }
      },
      orderBy: { numero: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Balance Générale');

    sheet.columns = [
      { header: 'Numéro', key: 'numero', width: 15 },
      { header: 'Libellé', key: 'libelle', width: 45 },
      { header: 'Total Débit', key: 'debit', width: 15 },
      { header: 'Total Crédit', key: 'credit', width: 15 },
      { header: 'Solde Débiteur', key: 'soldeDebit', width: 15 },
      { header: 'Solde Créditeur', key: 'soldeCredit', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true };

    let globalDebit = 0;
    let globalCredit = 0;
    let globalSoldeDebit = 0;
    let globalSoldeCredit = 0;

    for (const compte of comptes) {
      if (compte.lignes.length === 0) continue;

      let totalDebit = 0;
      let totalCredit = 0;

      for (const ligne of compte.lignes) {
        totalDebit += ligne.debit;
        totalCredit += ligne.credit;
      }
      
      if (totalDebit === 0 && totalCredit === 0) continue;

      const solde = totalDebit - totalCredit;
      const soldeDebit = solde > 0 ? solde : 0;
      const soldeCredit = solde < 0 ? Math.abs(solde) : 0;

      globalDebit += totalDebit;
      globalCredit += totalCredit;
      globalSoldeDebit += soldeDebit;
      globalSoldeCredit += soldeCredit;

      sheet.addRow({
        numero: compte.numero,
        libelle: compte.libelle,
        debit: totalDebit,
        credit: totalCredit,
        soldeDebit: soldeDebit || '',
        soldeCredit: soldeCredit || ''
      });
    }

    sheet.addRow({});
    const totalRow = sheet.addRow({
      libelle: 'TOTAL GENERAL',
      debit: globalDebit,
      credit: globalCredit,
      soldeDebit: globalSoldeDebit,
      soldeCredit: globalSoldeCredit
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="balance-generale.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
