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
  const facturesEnRetard = await prisma.facture.findMany({
    where: { direction: 'EMISE', statut: 'EN_RETARD' },
    select: { montantTTC: true, montantPaye: true }
  });
  const totalRetardMontant = facturesEnRetard.reduce((acc, f) => acc + (f.montantTTC - f.montantPaye), 0);
  
  const depensesAPayerCount = await prisma.depense.count({
    where: { statut: 'A_PAYER' }
  });

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
    
    // Only add to bar chart if it's not empty, or keep last 5 for UI consistency
    if (i < 5) { // Show 5 columns in the mini chart
      barChartData.push({ month: mName, in: `${inPct}%`, out: `${outPct}%` });
    }
  }

  return (
    <PageGate perm="finance.view" moduleName="Comptabilité">
      <div className="flex flex-col h-full overflow-hidden bg-background">
        
        <div className="flex-1 overflow-y-auto px-container-margin py-density-loose scrollbar-thin">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-density-loose">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Trésorerie Actuelle</p>
              <p className="font-display-md text-display-md text-on-surface font-mono-num">{formatFCFA(tresorerieActuelle)}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Encaissements (Mois)</p>
              <p className="font-display-md text-display-md text-[#166534] font-mono-num">+ {formatFCFA(encaissementsMois)}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Décaissements (Mois)</p>
              <p className="font-display-md text-display-md text-error font-mono-num">- {formatFCFA(decaissementsMois)}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Créances Clients</p>
              <p className="font-display-md text-display-md text-[#e65100] font-mono-num">{formatFCFA(totalCreances)}</p>
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

              {/* Income/Expense Bar Chart */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col">
                <div className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center rounded-t-lg">
                  <h3 className="font-h2 text-[16px] text-on-surface">Recettes vs Dépenses (%)</h3>
                </div>
                <div className="p-density-medium h-56 flex items-end justify-around gap-2 pt-8">
                  {barChartData.map((item, idx) => (
                    <div key={idx} className="flex flex-col justify-end h-full w-12 gap-1 items-center">
                      <div className="w-8 bg-secondary-container rounded-t-sm transition-all duration-500" style={{ height: item.in }}></div>
                      <div className="w-8 bg-surface-variant rounded-t-sm transition-all duration-500" style={{ height: item.out }}></div>
                      <span className="font-label-caps text-[10px] text-outline mt-2">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Widgets (Span 4) */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">

              {/* Alerts Widget */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col">
                <div className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="font-h2 text-[16px] text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                    Actions Requises
                  </h3>
                </div>
                <div className="p-0">
                  {/* Invoices */}
                  <div className="px-density-medium py-3 border-b border-outline-variant flex items-start gap-3 hover:bg-surface-container-low transition-colors cursor-pointer">
                    <div className="bg-error/10 p-1.5 rounded text-error mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-body-sm font-semibold text-on-surface">{facturesEnRetard.length} Factures en retard</span>
                        <span className="font-mono-num text-[12px] text-error font-medium">{formatFCFA(totalRetardMontant)}</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant">Client à relancer</span>
                    </div>
                  </div>
                  
                  {/* Expenses */}
                  <div className="px-density-medium py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors cursor-pointer">
                    <div className="bg-secondary-container/20 p-1.5 rounded text-secondary mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-body-sm font-semibold text-on-surface">{depensesAPayerCount} Notes de frais</span>
                        <span className="font-body-sm text-[12px] text-primary font-medium">À payer</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant">En attente de décaissement</span>
                    </div>
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
