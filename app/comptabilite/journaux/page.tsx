import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { PageGate } from '@/components/auth/require-permission';
import { JournauxClient } from './journaux-client';
import { ExerciceFilter } from '../components/exercice-filter';

export const metadata: Metadata = {
  title: 'Journaux Comptables | Kadrilex',
};

export default async function JournauxPage({
  searchParams
}: {
  searchParams: { exerciceId?: string }
}) {
  const { exerciceId } = searchParams;

  const exercices = await prisma.exerciceComptable.findMany({
    orderBy: { dateDebut: 'desc' }
  });

  const journaux = await prisma.journalComptable.findMany({
    orderBy: { code: 'asc' },
  });

  const ecritures = await prisma.ecriture.findMany({
    where: exerciceId ? { exerciceId } : undefined,
    include: {
      journal: true,
      lignes: {
        include: { compte: true }
      }
    },
    orderBy: { dateEcriture: 'desc' },
    take: 100
  });

  return (
    <PageGate perm="finance.view" moduleName="Comptabilité">
      <div className="flex flex-col h-full overflow-hidden bg-background">
        
        {/* Header KadriLex */}
        <div className="flex-none px-container-margin pt-container-margin flex items-center justify-between pb-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-on-surface-variant hover:text-primary">
              <Link href="/comptabilite"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <h1 className="font-h2 text-h2 text-primary-container leading-none">Grand Livre & Rapprochement</h1>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Visualisez vos écritures comptables et effectuez le rapprochement bancaire.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-8 px-3 text-[13px] font-medium border-outline-variant text-on-surface hover:bg-surface-variant shadow-sm">
              <a href={`/api/comptabilite/export/ecritures${exerciceId ? `?exerciceId=${exerciceId}` : ''}`} download>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exporter
              </a>
            </Button>
            <Button asChild className="h-8 px-3 text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-container shadow-sm">
              <Link href="/comptabilite/ecritures/nouvelle">Nouvelle écriture</Link>
            </Button>
          </div>
        </div>

        <div className="px-container-margin mb-3 w-[240px]">
          <ExerciceFilter exercices={exercices} />
        </div>

        <JournauxClient journaux={journaux} ecritures={ecritures} />
      </div>
    </PageGate>
  );
}
