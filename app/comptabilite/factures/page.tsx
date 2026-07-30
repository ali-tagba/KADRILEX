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

  return (
    <PageGate perm="finance.view" moduleName="Factures Clients">
      <FacturesClient initialFactures={factures} />
    </PageGate>
  );
}
