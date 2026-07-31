import { Metadata } from 'next';
import { FacturesClient } from './factures-client';
import { PageGate } from '@/components/auth/require-permission';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Factures Clients | Comptabilité',
};

export default async function FacturesPage() {
  const factures = await prisma.facture.findMany({
    where: { direction: 'EMISE' },
    orderBy: { date: 'desc' },
    include: {
      client: true,
      dossier: true,
      lignes: true,
      paiements: true,
    }
  });

  const clients = await prisma.client.findMany({
    orderBy: { nom: 'asc' },
  });
  
  const dossiers = await prisma.dossier.findMany({
    orderBy: { numero: 'desc' },
  });

  return (
    <PageGate perm="finance.view" moduleName="Factures Clients">
      <FacturesClient initialFactures={factures} initialClients={clients} initialDossiers={dossiers} />
    </PageGate>
  );
}
