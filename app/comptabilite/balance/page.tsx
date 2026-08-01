import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { PageGate } from '@/components/auth/require-permission';
import { ExerciceFilter } from '../components/exercice-filter';
import { PrintButton } from '../components/print-button';

export const metadata: Metadata = {
  title: 'Balance Générale | Kadrilex',
};

// Helper function to format numbers with '—' for zeroes and parens/red for negatives
function formatCurrency(amount: number) {
  if (amount === 0 || !amount) return '—';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  if (isNegative) {
    return <span className="text-error font-medium">({absAmount})</span>;
  }
  return absAmount;
}

export default async function BalancePage({
  searchParams
}: {
  searchParams: { exerciceId?: string }
}) {
  const { exerciceId } = searchParams;

  const exercices = await prisma.exerciceComptable.findMany({
    orderBy: { dateDebut: 'desc' }
  });

  const comptes = await prisma.compteComptable.findMany({
    orderBy: { numero: 'asc' },
    include: {
      lignes: {
        where: exerciceId ? { ecriture: { exerciceId } } : undefined,
      },
    }
  });

  const balances = comptes.map(compte => {
    const totalDebit = compte.lignes.reduce((acc, l) => acc + (l.debit || 0), 0);
    const totalCredit = compte.lignes.reduce((acc, l) => acc + (l.credit || 0), 0);
    
    const solde = totalDebit - totalCredit;
    
    return {
      compte,
      totalDebit,
      totalCredit,
      soldeDebiteur: solde > 0 ? solde : 0,
      soldeCrediteur: solde < 0 ? Math.abs(solde) : 0,
    };
  }).filter(b => b.totalDebit > 0 || b.totalCredit > 0);

  const grandTotalDebit = balances.reduce((acc, b) => acc + b.totalDebit, 0);
  const grandTotalCredit = balances.reduce((acc, b) => acc + b.totalCredit, 0);
  const grandSoldeDebiteur = balances.reduce((acc, b) => acc + b.soldeDebiteur, 0);
  const grandSoldeCrediteur = balances.reduce((acc, b) => acc + b.soldeCrediteur, 0);

  return (
    <PageGate perm="finance.view" moduleName="Comptabilité">
      <div className="flex flex-col h-full overflow-hidden bg-background">
        
        {/* Header KadriLex */}
        <div className="flex-none px-container-margin pt-container-margin flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-on-surface-variant hover:text-primary">
              <Link href="/comptabilite"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <h1 className="font-h2 text-h2 text-primary-container leading-none">Balance Générale</h1>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Synthèse des soldes de tous les comptes mouvementés.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 print:hidden">
            <PrintButton />
            <Button asChild className="h-8 px-3 text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-container shadow-sm">
              <a href={`/api/comptabilite/export/balance${exerciceId ? `?exerciceId=${exerciceId}` : ''}`} download>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exporter (Excel)
              </a>
            </Button>
          </div>
        </div>

        {/* Zone de contenu Odoo-style (Haute densité) */}
        <div className="flex-1 overflow-auto bg-surface-container-lowest px-container-margin py-density-medium">
          <div className="mb-4">
             <div className="w-[300px]">
               <ExerciceFilter exercices={exercices} />
             </div>
          </div>
          <div className="max-w-6xl mx-auto w-full bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm flex flex-col overflow-hidden">
            <div className="overflow-x-auto flex-1 max-h-[700px] scrollbar-thin">
              <table className="w-full text-left text-body-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-surface-container-lowest shadow-[0_1px_0_0_var(--color-outline-variant)] z-10 font-label-caps text-label-caps text-outline uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold w-24">Numéro</th>
                    <th className="py-2.5 px-4 font-semibold">Libellé du Compte</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Débit (Mvts)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Crédit (Mvts)</th>
                    <th className="py-2.5 px-4 font-semibold text-right bg-surface-container/30">Solde Débiteur</th>
                    <th className="py-2.5 px-4 font-semibold text-right bg-surface-container/30">Solde Créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {balances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-on-surface-variant font-medium">
                        Aucun mouvement enregistré pour la période.
                      </td>
                    </tr>
                  ) : (
                    balances.map((b) => (
                      <tr key={b.compte.id} className="hover:bg-surface-variant/30 transition-colors">
                        <td className="py-1.5 px-4 font-semibold text-primary font-mono-num">{b.compte.numero}</td>
                        <td className="py-1.5 px-4 text-on-surface font-medium truncate max-w-[300px]" title={b.compte.libelle}>{b.compte.libelle}</td>
                        
                        <td className="py-1.5 px-4 text-right font-mono-num text-on-surface font-medium">
                          {formatCurrency(b.totalDebit)}
                        </td>
                        <td className="py-1.5 px-4 text-right font-mono-num text-on-surface font-medium">
                          {formatCurrency(b.totalCredit)}
                        </td>
                        
                        <td className="py-1.5 px-4 text-right font-mono-num font-semibold text-on-surface bg-surface-container/10">
                          {formatCurrency(b.soldeDebiteur)}
                        </td>
                        <td className="py-1.5 px-4 text-right font-mono-num font-semibold text-on-surface bg-surface-container/10">
                          {formatCurrency(b.soldeCrediteur)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Ligne de totaux figée en bas */}
            {balances.length > 0 && (
              <div className="bg-surface-container shadow-[0_-1px_0_0_var(--color-outline-variant)] px-4 py-3 flex items-center justify-between shrink-0 z-10">
                <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Totaux de la Balance
                </div>
                <div className="flex items-center gap-0">
                  <div className="w-[120px] text-right px-4 font-bold text-on-surface font-mono-num text-body-md">
                    {formatCurrency(grandTotalDebit)}
                  </div>
                  <div className="w-[120px] text-right px-4 font-bold text-on-surface font-mono-num text-body-md">
                    {formatCurrency(grandTotalCredit)}
                  </div>
                  <div className="w-[120px] text-right px-4 font-bold text-success font-mono-num text-body-md">
                    {formatCurrency(grandSoldeDebiteur)}
                  </div>
                  <div className="w-[120px] text-right px-4 font-bold text-success font-mono-num text-body-md">
                    {formatCurrency(grandSoldeCrediteur)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageGate>
  );
}
