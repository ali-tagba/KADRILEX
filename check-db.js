const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const totalComptes = await p.compteComptable.count();
  console.log('TOTAL COMPTES:', totalComptes);
  
  const journaux = await p.journalComptable.findMany({ select: { code: true, libelle: true } });
  console.log('JOURNAUX:', JSON.stringify(journaux));
  
  const exercices = await p.exerciceComptable.findMany({ select: { id: true, cloture: true } });
  console.log('EXERCICES:', JSON.stringify(exercices));
  
  const comptes = await p.compteComptable.findMany({ take: 50, orderBy: { numero: 'asc' }, select: { numero: true, libelle: true } });
  console.log('COMPTES EXISTANTS:', JSON.stringify(comptes, null, 2));
  
  const depenses = await p.depense.count();
  console.log('TOTAL DEPENSES:', depenses);
  
  const ecritures = await p.ecriture.count();
  console.log('TOTAL ECRITURES:', ecritures);
}

check().catch(console.error).finally(() => p.$disconnect());
