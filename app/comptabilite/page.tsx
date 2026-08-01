import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { DashboardCharts } from './dashboard-charts';
import { PageGate } from '@/components/auth/require-permission';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { formatFCFA } from '@/lib/constants/finance';

export const metadata: Metadata = {
  title: 'Tableau de Bord Financier | Kadrilex',
  description: 'Analyse consolidée de la trésorerie et facturation',
};

// Ensure dynamic rendering
export const dynamic = "force-dynamic";

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs}`;
}

export default async function ComptabilitePage() {
  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = endOfMonth(now);

  // 1. Trésorerie Actuelle (Historique complet)
  const allEncaissements = await prisma.paiement.aggregate({
    _sum: { montant: true },
    where: { facture: { direction: 'EMISE' } }
  });
  
  const allDecaissementsPaiements = await prisma.paiement.aggregate({
    _sum: { montant: true },
    where: { facture: { direction: 'RECUE' } }
  });
  
  const allDecaissementsDepenses = await prisma.depense.aggregate({
    _sum: { montantTTC: true },
    where: { statut: 'PAYEE' }
  });

  const totalEncaissementsAll = allEncaissements._sum.montant || 0;
  const totalDecaissementsAll = (allDecaissementsPaiements._sum.montant || 0) + (allDecaissementsDepenses._sum.montantTTC || 0);
  const tresorerieActuelle = totalEncaissementsAll - totalDecaissementsAll;

  // 2. Encaissements / Décaissements du Mois
  const monthEncaissements = await prisma.paiement.aggregate({
    _sum: { montant: true },
    where: {
      facture: { direction: 'EMISE' },
      date: { gte: startMonth, lte: endMonth }
    }
  });

  const monthDecaissementPaiements = await prisma.paiement.aggregate({
    _sum: { montant: true },
    where: {
      facture: { direction: 'RECUE' },
      date: { gte: startMonth, lte: endMonth }
    }
  });

  const monthDecaissementDepenses = await prisma.depense.aggregate({
    _sum: { montantTTC: true },
    where: {
      statut: 'PAYEE',
      date: { gte: startMonth, lte: endMonth }
    }
  });

  const encaissementsMois = monthEncaissements._sum.montant || 0;
  const decaissementsMois = (monthDecaissementPaiements._sum.montant || 0) + (monthDecaissementDepenses._sum.montantTTC || 0);
  const soldeDuMois = encaissementsMois - decaissementsMois;

  // 3. Créances Clients (Factures Émises Non Payées ou En Retard)
  const creancesClients = await prisma.facture.findMany({
    where: {
      direction: 'EMISE',
      statut: { in: ['EMISE', 'PARTIELLE', 'EN_RETARD'] }
    },
    select: { montantTTC: true, montantPaye: true }
  });
  const totalCreances = creancesClients.reduce((acc, f) => acc + (f.montantTTC - f.montantPaye), 0);

  // 4. Alertes
  // Filet de sécurité : statut EN_RETARD déjà posé, OU échéance dépassée et pas encore
  // recalculée (le statut n'est mis à jour qu'à l'écriture — création/paiement d'une
  // facture précise — donc une facture jamais retouchée après son échéance ne bascule
  // pas automatiquement de son côté).
  const facturesEnRetard = await prisma.facture.findMany({
    where: {
      direction: 'EMISE',
      OR: [
        { statut: 'EN_RETARD' },
        { dateEcheance: { lt: now }, statut: { in: ['EMISE', 'PARTIELLE'] } },
      ],
    },
    select: { montantTTC: true, montantPaye: true }
  });
  const totalRetardMontant = facturesEnRetard.reduce((acc, f) => acc + (f.montantTTC - f.montantPaye), 0);

  // 6. Chart Data (Derniers 6 mois)
  const chartData = [];
  const barChartData = [];
  const monthsStr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  for (let i = 5; i >= 0; i--) {
    const dStart = startOfMonth(subMonths(now, i));
    const dEnd = endOfMonth(subMonths(now, i));
    
    const enc = await prisma.paiement.aggregate({
      _sum: { montant: true },
      where: { facture: { direction: 'EMISE' }, date: { gte: dStart, lte: dEnd } }
    });
    const decP = await prisma.paiement.aggregate({
      _sum: { montant: true },
      where: { facture: { direction: 'RECUE' }, date: { gte: dStart, lte: dEnd } }
    });
    const decD = await prisma.depense.aggregate({
      _sum: { montantTTC: true },
      where: { statut: 'PAYEE', date: { gte: dStart, lte: dEnd } }
    });

    const mEnc = enc._sum.montant || 0;
    const mDec = (decP._sum.montant || 0) + (decD._sum.montantTTC || 0);
    const mName = monthsStr[dStart.getMonth()];

    chartData.push({ month: mName, encaissement: mEnc / 1000, decaissement: mDec / 1000 }); // Scaled for chart readability

    const totalInOut = mEnc + mDec;
    const inPct = totalInOut > 0 ? Math.round((mEnc / totalInOut) * 100) : 0;
    const outPct = totalInOut > 0 ? Math.round((mDec / totalInOut) * 100) : 0;

    // 3 derniers mois pour le comparatif Recettes vs Dépenses
    if (i < 3) {
      barChartData.push({ month: mName, inPct, outPct, mEnc, mDec });
    }
  }
  barChartData.reverse(); // mois le plus récent en premier

  const totalMouvementMois = encaissementsMois + decaissementsMois;
  const pctEncaisseMois = totalMouvementMois > 0 ? Math.round((encaissementsMois / totalMouvementMois) * 100) : 0;
  const circonference = 2 * Math.PI * 45;
  const soldeDashOffset = circonference * (1 - pctEncaisseMois / 100);
  return (
    <PageGate perm="finance.view" moduleName="Comptabilité">
      <div className="flex flex-col h-full overflow-hidden bg-background">
        
        <div className="flex-1 overflow-y-auto px-container-margin py-density-loose scrollbar-thin">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-density-loose">
            <div className="bg-primary-container rounded-lg border border-primary/20 p-density-medium h-[120px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-caps text-label-caps text-on-primary-container">Trésorerie Actuelle</span>
                <span className="material-symbols-outlined text-on-primary-container/80 text-[20px]">account_balance</span>
              </div>
              <div className="font-mono-num truncate">
                <span className="text-[28px] leading-tight font-semibold text-on-primary">{formatFCFA(tresorerieActuelle)}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-density-medium h-[120px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Encaissements (Mois)</span>
                <span className="material-symbols-outlined text-success text-[20px]">arrow_upward</span>
              </div>
              <div className="font-mono-num truncate">
                <span className="text-[24px] leading-tight font-semibold text-success">+ {formatFCFA(encaissementsMois)}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-density-medium h-[120px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Décaissements (Mois)</span>
                <span className="material-symbols-outlined text-error text-[20px]">arrow_downward</span>
              </div>
              <div className="font-mono-num truncate">
                <span className="text-[24px] leading-tight font-semibold text-error">- {formatFCFA(decaissementsMois)}</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-density-medium h-[120px] flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Créances Clients</span>
                <span className="material-symbols-outlined text-accent text-[20px]">receipt_long</span>
              </div>
              <div className="font-mono-num truncate">
                <span className="text-[24px] leading-tight font-semibold text-on-surface">{formatFCFA(totalCreances)}</span>
              </div>
            </div>
          </div>

          {/* Main Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter pb-8">
            
            {/* Left Column: Charts (Span 8) */}
            <div className="lg:col-span-8 flex flex-col gap-gutter">
              
              {/* Cash Flow Chart */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col">
                <div className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center rounded-t-lg">
                  <h3 className="font-h2 text-[16px] text-on-surface">Évolution de la Trésorerie (k FCFA)</h3>
                  <select className="bg-transparent border-none text-body-sm text-on-surface-variant font-medium py-0 focus:ring-0 cursor-pointer outline-none" defaultValue="6months">
                    <option value="6months">Derniers 6 mois</option>
                  </select>
                </div>
                <div className="p-density-medium h-72">
                  <DashboardCharts data={chartData} />
                </div>
              </div>

              {/* Income/Expense Comparison */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col p-density-medium">
                <h3 className="font-h2 text-[16px] text-on-surface mb-4">Recettes vs Dépenses</h3>
                <div className="space-y-4">
                  {barChartData.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-body-md text-body-md text-on-surface-variant">{item.month}</span>
                        <span className="font-mono-num text-[13px] text-on-surface">
                          <span className="text-[#166534]">+{formatCompact(item.mEnc)}</span>
                          {" / "}
                          <span className="text-error">-{formatCompact(item.mDec)}</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#166534]" style={{ width: `${item.inPct}%` }}></div>
                        <div className="h-full bg-error" style={{ width: `${item.outPct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Widgets (Span 4) */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">

              {/* Solde du mois */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col items-center text-center p-density-medium">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-6 w-full text-left">Solde du mois</h3>
                <div className="relative w-32 h-32 mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-container)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke={soldeDuMois >= 0 ? "#166534" : "var(--color-error)"}
                      strokeWidth="8"
                      strokeDasharray={circonference}
                      strokeDashoffset={soldeDashOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-mono-num text-[18px] font-semibold ${soldeDuMois >= 0 ? "text-[#166534]" : "text-error"}`}>
                      {pctEncaisseMois}%
                    </span>
                  </div>
                </div>
                <div className="w-full mb-4 pb-4 border-b border-outline-variant/50">
                  <div className={`font-display-md text-[28px] leading-none font-semibold mb-1 ${soldeDuMois >= 0 ? "text-on-surface" : "text-error"}`}>
                    {soldeDuMois >= 0 ? "+" : "− "}{formatFCFA(Math.abs(soldeDuMois))}
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">FCFA (Net)</div>
                </div>
                <div className="w-full flex justify-between items-center px-2">
                  <div className="text-left">
                    <div className="font-body-sm text-body-sm text-on-surface-variant mb-1">Encaissements</div>
                    <div className="font-mono-num text-[16px] text-[#166534]">{formatFCFA(encaissementsMois)}</div>
                  </div>
                  <div className="h-8 w-px bg-outline-variant/50" />
                  <div className="text-right">
                    <div className="font-body-sm text-body-sm text-on-surface-variant mb-1">Décaissements</div>
                    <div className="font-mono-num text-[16px] text-error">{formatFCFA(decaissementsMois)}</div>
                  </div>
                </div>
              </div>

              {/* Alerts Widget */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col flex-1">
                <div className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="font-h2 text-[16px] text-on-surface">Actions Requises</h3>
                  {facturesEnRetard.length > 0 && (
                    <span className="bg-error text-on-error font-mono-num text-[11px] px-2 py-0.5 rounded-full">{facturesEnRetard.length} Alerte{facturesEnRetard.length > 1 ? "s" : ""}</span>
                  )}
                </div>
                <div className="p-0">
                  {/* Invoices */}
                  <div className="px-density-medium py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <div className="text-error mt-0.5">
                      <span className="material-symbols-outlined text-[20px]">warning</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-sm font-semibold text-on-surface block">{facturesEnRetard.length} Factures en retard</span>
                      <span className="font-body-sm text-[12px] text-on-surface-variant">Total : <span className="font-mono-num">{formatFCFA(totalRetardMontant)}</span></span>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant/50 text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </PageGate>
  );
}
