import { Metadata } from 'next';
import { NouvelleEcritureForm } from './nouvelle-ecriture-form';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Nouvelle Écriture | Kadrilex',
};

export default async function NouvelleEcriturePage() {
  // Préchauffage des données
  const journaux = await prisma.journalComptable.findMany({ orderBy: { code: 'asc' } });
  const comptes = await prisma.compteComptable.findMany({ orderBy: { numero: 'asc' } });
  const exercices = await prisma.exerciceComptable.findMany({ where: { cloture: false } });

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saisie d'une écriture</h1>
        <p className="text-muted-foreground mt-1">
          Saisissez une nouvelle écriture comptable en partie double.
        </p>
      </div>
      
      <Suspense fallback={<div>Chargement du formulaire...</div>}>
        <NouvelleEcritureForm 
          journaux={journaux} 
          comptes={comptes} 
          exercices={exercices} 
        />
      </Suspense>
    </div>
  );
}
