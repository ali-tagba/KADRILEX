import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { PageGate } from '@/components/auth/require-permission';
import { ComptesActions } from './comptes-actions';

export const metadata: Metadata = {
  title: 'Plan Comptable | Kadrilex',
};

export default async function ComptesPage() {
  const comptes = await prisma.compteComptable.findMany({
    orderBy: { numero: 'asc' },
  });

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
              <h1 className="font-h2 text-h2 text-primary-container leading-none">Plan Comptable</h1>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Gérez les comptes SYSCOHADA de votre cabinet.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-8 px-3 text-[13px] font-medium border-outline-variant text-on-surface hover:bg-surface-variant shadow-sm">
              <a href="/api/comptabilite/export/comptes" download>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Exporter
              </a>
            </Button>
            <ComptesActions />
          </div>
        </div>

        {/* Zone de contenu Odoo-style (Haute densité) */}
        <div className="flex-1 overflow-auto bg-surface-container-lowest">
          <table className="w-full text-left text-body-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-surface-container-lowest shadow-[0_1px_0_0_var(--color-outline-variant)] z-10 font-label-caps text-label-caps text-outline uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-semibold w-12 text-center">
                  <input type="checkbox" className="rounded border-outline-variant text-accent focus:ring-accent accent-accent" />
                </th>
                <th className="py-2.5 px-4 font-semibold">Numéro</th>
                <th className="py-2.5 px-4 font-semibold">Libellé du Compte</th>
                <th className="py-2.5 px-4 font-semibold">Classe</th>
                <th className="py-2.5 px-4 font-semibold">Nature</th>
                <th className="py-2.5 px-4 font-semibold">Sens</th>
                <th className="py-2.5 px-4 font-semibold text-center">Statut</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {comptes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                    Aucun compte comptable trouvé.
                  </td>
                </tr>
              ) : (
                comptes.map(compte => (
                  <tr key={compte.id} className="group hover:bg-surface-variant/30 transition-colors cursor-pointer">
                    <td className="py-1.5 px-4 text-center">
                      <input type="checkbox" className="rounded border-outline-variant text-accent focus:ring-accent accent-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="py-1.5 px-4 font-mono-num font-semibold text-primary">{compte.numero}</td>
                    <td className="py-1.5 px-4 text-on-surface font-medium">{compte.libelle}</td>
                    <td className="py-1.5 px-4 text-on-surface-variant font-mono-num">{compte.classe}</td>
                    <td className="py-1.5 px-4">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                        {compte.nature}
                      </span>
                    </td>
                    <td className="py-1.5 px-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-bold uppercase tracking-wider ${compte.sensNormal === 'DEBIT' ? 'bg-surface-variant text-on-surface' : 'bg-surface-container text-on-surface-variant'}`}>
                        {compte.sensNormal}
                      </span>
                    </td>
                    <td className="py-1.5 px-4 text-center">
                      {compte.actif ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-error"></span>
                      )}
                    </td>
                    <td className="py-1.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-on-surface-variant hover:text-primary">
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {comptes.length > 0 && (
              <tfoot className="sticky bottom-0 bg-surface-container-low shadow-[0_-1px_0_0_var(--color-outline-variant)]">
                <tr>
                  <td colSpan={8} className="py-2 px-4 text-[12px] text-on-surface-variant font-medium">
                    {comptes.length} Comptes
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </PageGate>
  );
}
