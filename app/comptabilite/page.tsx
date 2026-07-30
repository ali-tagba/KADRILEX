import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
// Removed unused lucide-react imports
import Link from 'next/link';
import { DashboardCharts } from './dashboard-charts';
import { PageGate } from '@/components/auth/require-permission';

export const metadata: Metadata = {
  title: 'Tableau de Bord Financier | Kadrilex',
  description: 'Analyse consolidée de la trésorerie et facturation',
};

const chartData = [
  { month: 'Jan', encaissement: 120, decaissement: 80 },
  { month: 'Fév', encaissement: 150, decaissement: 90 },
  { month: 'Mar', encaissement: 180, decaissement: 110 },
  { month: 'Avr', encaissement: 140, decaissement: 130 },
  { month: 'Mai', encaissement: 210, decaissement: 80 },
  { month: 'Juin', encaissement: 250, decaissement: 120 },
];

export default function ComptabilitePage() {
  return (
    <PageGate perm="finance.view" moduleName="Comptabilité">
      <div className="flex flex-col h-full overflow-hidden bg-background">
        
        <div className="flex-1 overflow-y-auto px-container-margin py-density-loose scrollbar-thin">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-density-loose">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Trésorerie Actuelle</p>
              <p className="font-display-md text-display-md text-on-surface font-mono-num">142 500 FCFA</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Encaissements (Mois)</p>
              <p className="font-display-md text-display-md text-[#166534] font-mono-num">+ 45 200 FCFA</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Décaissements (Mois)</p>
              <p className="font-display-md text-display-md text-error font-mono-num">- 28 900 FCFA</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-density-medium flex flex-col justify-center">
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-1">Créances Clients</p>
              <p className="font-display-md text-display-md text-[#e65100] font-mono-num">8 200 FCFA</p>
            </div>
          </div>

          {/* Main Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter pb-8">
            
            {/* Left Column: Charts (Span 8) */}
            <div className="lg:col-span-8 flex flex-col gap-gutter">
              
              {/* Cash Flow Chart */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col">
                <div className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center rounded-t-lg">
                  <h3 className="font-h2 text-[16px] text-on-surface">Évolution de la Trésorerie</h3>
                  <select className="bg-transparent border-none text-body-sm text-on-surface-variant font-medium py-0 focus:ring-0 cursor-pointer outline-none">
                    <option>Derniers 6 mois</option>
                    <option>Année en cours</option>
                  </select>
                </div>
                <div className="p-density-medium h-72">
                  <DashboardCharts data={chartData} />
                </div>
              </div>

              {/* Income/Expense Bar Chart Stub from mockup */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col">
                <div className="bg-surface-container-low px-density-medium py-3 border-b border-outline-variant flex justify-between items-center rounded-t-lg">
                  <h3 className="font-h2 text-[16px] text-on-surface">Recettes vs Dépenses</h3>
                </div>
                <div className="p-density-medium h-56 flex items-end justify-around gap-2 pt-8">
                  {/* Bar chart abstraction */}
                  {[
                    { month: 'Mai', in: '70%', out: '30%' },
                    { month: 'Juin', in: '60%', out: '40%' },
                    { month: 'Jui', in: '80%', out: '25%' },
                    { month: 'Aoû', in: '50%', out: '35%' },
                    { month: 'Sep', in: '90%', out: '20%' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col justify-end h-full w-12 gap-1 items-center">
                      <div className="w-8 bg-secondary-container rounded-t-sm" style={{ height: item.in }}></div>
                      <div className="w-8 bg-surface-variant rounded-t-sm" style={{ height: item.out }}></div>
                      <span className="font-label-caps text-[10px] text-outline mt-2">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Widgets (Span 4) */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">
              
              {/* CARPA Widget */}
              <div className="bg-[#6B4423] text-white rounded-lg flex flex-col overflow-hidden shadow-sm">
                <div className="px-density-medium py-4">
                  <h3 className="font-label-caps text-[11px] uppercase tracking-wider text-white/80 mb-4">Fonds Séquestres (CARPA)</h3>
                  <div className="font-display-md text-[32px] font-bold text-white mb-1">214 000 FCFA</div>
                  <div className="font-body-sm text-white/80 mb-6">Total des fonds de tiers consignés</div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="font-body-sm text-white/90">Dossier #402 - L'Oréal</span>
                    <span className="font-mono-num text-body-sm font-bold">150 000 FCFA</span>
                  </div>
                  <div className="flex justify-between items-center py-2 mb-4">
                    <span className="font-body-sm text-white/90">Dossier #389 - Sanofi</span>
                    <span className="font-mono-num text-body-sm font-bold">64 000 FCFA</span>
                  </div>
                  
                  <button className="w-full py-2 bg-white text-[#6B4423] rounded font-medium text-sm hover:bg-white/90 transition-colors">
                    Gérer les consignations
                  </button>
                </div>
              </div>

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
                        <span className="font-body-sm font-semibold text-on-surface">5 Factures en retard</span>
                        <span className="font-mono-num text-[12px] text-error font-medium">8 200 FCFA</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant">Relances automatiques désactivées</span>
                    </div>
                  </div>
                  
                  {/* Expenses */}
                  <div className="px-density-medium py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors cursor-pointer">
                    <div className="bg-secondary-container/20 p-1.5 rounded text-secondary mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-body-sm font-semibold text-on-surface">3 Notes de frais</span>
                        <span className="font-body-sm text-[12px] text-primary font-medium">À valider</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant">Soumises par Me. Dubois</span>
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
