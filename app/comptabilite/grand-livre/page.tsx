import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { PageGate } from '@/components/auth/require-permission';
import { ExerciceFilter } from '../components/exercice-filter';
import { CompteFilter } from '../components/compte-filter';
import { PrintButton } from '../components/print-button';

export const metadata: Metadata = {
  title: 'Grand Livre | Kadrilex',
};

// Helper function to format numbers with '—' for zeroes and parens/red for negatives
function formatCurrency(amount: number | null | undefined) {
  if (!amount || amount === 0) return '—';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  if (isNegative) {
    return <span className="text-error font-medium">({absAmount})</span>;
  }
  return absAmount;
}

export default async function GrandLivrePage({
  searchParams
}: {
  searchParams: Promise<{ compte?: string, exerciceId?: string }>
}) {
  const { compte, exerciceId } = await searchParams;

  const exercices = await prisma.exerciceComptable.findMany({
    orderBy: { dateDebut: 'desc' }
  });
  
  const comptes = await prisma.compteComptable.findMany({
    orderBy: { numero: 'asc' },
  });

  const lignes = await prisma.ligneEcriture.findMany({
    where: {
      ...(compte ? { compteId: compte } : {}),
      ...(exerciceId ? { ecriture: { exerciceId } } : {}),
    },
    include: {
      ecriture: {
        include: { journal: true }
      },
      compte: true,
    },
    orderBy: { ecriture: { dateEcriture: 'desc' } },
    take: 500,
  });

  const totalDebit = lignes.reduce((acc, l) => acc + (l.debit || 0), 0);
  const totalCredit = lignes.reduce((acc, l) => acc + (l.credit || 0), 0);
  const solde = totalDebit - totalCredit;

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
              <h1 className="font-h2 text-h2 text-primary-container leading-none">Grand Livre</h1>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Historique détaillé des écritures par compte comptable.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 print:hidden">
            <PrintButton />
            <Button asChild className="h-8 px-3 text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-container shadow-sm">
              <a href={`/api/comptabilite/export/grand-livre?${new URLSearchParams({
                ...(exerciceId && { exerciceId }),
                ...(compte && { compteId: compte })
              })}`} download>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exporter
              </a>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-container-margin py-density-medium">
          <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar des totaux et filtres */}
            <div className="lg:col-span-1 space-y-4 sticky top-0">
              <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/50 shadow-sm space-y-4">
                <ExerciceFilter exercices={exercices} />
                <CompteFilter comptes={comptes} />

                <div className="pt-4 border-t border-outline-variant/50 space-y-3">
                  <div>
                    <div className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-1">Total Débit</div>
                    <div className="font-display-md text-2xl font-bold text-on-surface font-mono-num">
                      {formatCurrency(totalDebit)}
                    </div>
                  </div>
                  <div>
                    <div className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-1">Total Crédit</div>
                    <div className="font-display-md text-2xl font-bold text-on-surface font-mono-num">
                      {formatCurrency(totalCredit)}
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-1">Solde de la période</div>
                    <div className={`font-display-md text-2xl font-bold font-mono-num ${solde > 0 ? 'text-success' : solde < 0 ? 'text-error' : 'text-on-surface'}`}>
                      {formatCurrency(Math.abs(solde))} 
                      <span className="font-label-caps text-label-caps uppercase tracking-wider ml-1 opacity-70">
                        {solde > 0 ? '(Débiteur)' : solde < 0 ? '(Créditeur)' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table des mouvements (Odoo-style) */}
            <div className="lg:col-span-3">
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/50 shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1 max-h-[600px] scrollbar-thin print:max-h-none print:overflow-visible">
                  <table className="w-full text-left text-body-sm whitespace-nowrap">
                    <thead className="sticky top-0 bg-surface-container-lowest shadow-[0_1px_0_0_var(--color-outline-variant)] z-10 font-label-caps text-label-caps text-outline uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold w-24">Date</th>
                        <th className="py-2.5 px-3 font-semibold w-16">Jnl</th>
                        <th className="py-2.5 px-3 font-semibold w-28">Pièce</th>
                        <th className="py-2.5 px-3 font-semibold w-24">Compte</th>
                        <th className="py-2.5 px-3 font-semibold">Libellé</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Débit</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Crédit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {lignes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-on-surface-variant font-medium">
                            Aucun mouvement comptable trouvé.
                          </td>
                        </tr>
                      ) : (
                        lignes.map(l => (
                          <tr key={l.id} className="group hover:bg-surface-variant/30 transition-colors cursor-pointer">
                            <td className="py-1.5 px-4 text-on-surface font-mono-num">
                              {new Date(l.ecriture.dateEcriture).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-1.5 px-3">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                                {l.ecriture.journal.code}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-primary font-mono-num font-semibold">{l.ecriture.numeroPiece}</td>
                            <td className="py-1.5 px-3 text-on-surface font-mono-num font-medium">{l.compte.numero}</td>
                            <td className="py-1.5 px-3 text-on-surface-variant font-medium truncate max-w-[200px]" title={l.libelle || l.ecriture.libelle}>
                              {l.libelle || l.ecriture.libelle}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono-num text-on-surface font-semibold">
                              {formatCurrency(l.debit)}
                            </td>
                            <td className="py-1.5 px-4 text-right font-mono-num text-on-surface font-semibold">
                              {formatCurrency(l.credit)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Ligne de totaux figée en bas */}
                {lignes.length > 0 && (
                  <div className="bg-surface-container shadow-[0_-1px_0_0_var(--color-outline-variant)] px-4 py-3 flex items-center justify-end shrink-0 z-10">
                    <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mr-6">
                      Totaux
                    </div>
                    <div className="flex items-center gap-0">
                      <div className="w-[100px] text-right px-3 font-bold text-on-surface font-mono-num text-body-md">
                        {formatCurrency(totalDebit)}
                      </div>
                      <div className="w-[100px] text-right px-4 font-bold text-on-surface font-mono-num text-body-md">
                        {formatCurrency(totalCredit)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </PageGate>
  );
}
