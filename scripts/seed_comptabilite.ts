import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Comptabilité SYSCOHADA...');

  // 1. Création de l'Exercice
  const currentYear = new Date().getFullYear();
  const exercice = await prisma.exerciceComptable.upsert({
    where: {
      dateDebut_dateFin: {
        dateDebut: new Date(`${currentYear}-01-01`),
        dateFin: new Date(`${currentYear}-12-31`),
      },
    },
    update: {},
    create: {
      libelle: `Exercice ${currentYear}`,
      dateDebut: new Date(`${currentYear}-01-01`),
      dateFin: new Date(`${currentYear}-12-31`),
      cloture: false,
    },
  });
  console.log(`✅ Exercice comptable créé : ${exercice.libelle}`);

  // 2. Création des Journaux par défaut
  const journaux = [
    { code: 'VE', libelle: 'Ventes / Facturation', type: 'VENTE' },
    { code: 'AC', libelle: 'Achats / Dépenses', type: 'ACHAT' },
    { code: 'BQ', libelle: 'Banque Principale', type: 'BANQUE' },
    { code: 'CA', libelle: 'Caisse Principale', type: 'CAISSE' },
    { code: 'OD', libelle: 'Opérations Diverses', type: 'OD' },
  ];

  for (const j of journaux) {
    await prisma.journalComptable.upsert({
      where: { code: j.code },
      update: {},
      create: j,
    });
  }
  console.log(`✅ Journaux créés (VE, AC, BQ, CA, OD)`);

  // 3. Création du Plan de Compte Minimum (SYSCOHADA)
  const comptes = [
    { numero: '101000', libelle: 'Capital social', classe: 1, nature: 'BILAN', sensNormal: 'CREDIT' },
    { numero: '401000', libelle: 'Fournisseurs', classe: 4, nature: 'BILAN', sensNormal: 'CREDIT' },
    { numero: '411000', libelle: 'Clients', classe: 4, nature: 'BILAN', sensNormal: 'DEBIT', lettrable: true },
    { numero: '445200', libelle: 'TVA récupérable sur achats', classe: 4, nature: 'BILAN', sensNormal: 'DEBIT' },
    { numero: '445660', libelle: 'TVA collectée', classe: 4, nature: 'BILAN', sensNormal: 'CREDIT' },
    { numero: '471000', libelle: 'Fonds de Tiers (CARPA / Séquestre)', classe: 4, nature: 'BILAN', sensNormal: 'CREDIT', lettrable: true },
    { numero: '521000', libelle: 'Banque', classe: 5, nature: 'BILAN', sensNormal: 'DEBIT' },
    { numero: '571000', libelle: 'Caisse', classe: 5, nature: 'BILAN', sensNormal: 'DEBIT' },
    { numero: '622000', libelle: "Rémunérations d'intermédiaires et honoraires", classe: 6, nature: 'GESTION', sensNormal: 'DEBIT' },
    { numero: '661000', libelle: 'Fournitures de bureau', classe: 6, nature: 'GESTION', sensNormal: 'DEBIT' },
    { numero: '706100', libelle: 'Honoraires facturés', classe: 7, nature: 'GESTION', sensNormal: 'CREDIT' },
    { numero: '706200', libelle: 'Frais refacturés', classe: 7, nature: 'GESTION', sensNormal: 'CREDIT' },
  ];

  for (const c of comptes) {
    await prisma.compteComptable.upsert({
      where: { numero: c.numero },
      update: {},
      create: c,
    });
  }
  console.log(`✅ Plan de compte initial SYSCOHADA chargé`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
