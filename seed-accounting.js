const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding accounting data...')
  
  // 1. Journaux
  const journaux = [
    { code: 'BQ', libelle: 'Banque', type: 'BANQUE' },
    { code: 'CA', libelle: 'Caisse', type: 'CAISSE' },
    { code: 'AC', libelle: 'Achats', type: 'ACHAT' },
    { code: 'VE', libelle: 'Ventes', type: 'VENTE' },
    { code: 'OD', libelle: 'Opérations Diverses', type: 'OD' },
  ]
  
  for (const j of journaux) {
    await prisma.journalComptable.upsert({
      where: { code: j.code },
      update: {},
      create: j,
    })
  }
  
  // 2. Exercice 2026 (actuel)
  const dateDebut = new Date('2026-01-01T00:00:00Z');
  const dateFin = new Date('2026-12-31T23:59:59Z');
  
  await prisma.exerciceComptable.upsert({
    where: { dateDebut_dateFin: { dateDebut, dateFin } },
    update: {},
    create: {
      libelle: 'Exercice 2026',
      dateDebut,
      dateFin,
      cloture: false,
    }
  })

  // 3. Comptes comptables essentiels
  const comptes = [
    { numero: '000000', libelle: 'Journal par defaut' },
    { numero: '401000', libelle: 'Fournisseurs' },
    { numero: '411000', libelle: 'Clients' },
    { numero: '421000', libelle: 'Personnel' },
    { numero: '443100', libelle: 'TVA facturée' },
    { numero: '445200', libelle: 'TVA récupérable' },
    { numero: '521000', libelle: 'Banque' },
    { numero: '571000', libelle: 'Caisse' },
    { numero: '605100', libelle: 'Achats divers' },
    { numero: '612000', libelle: 'Transports' },
    { numero: '622100', libelle: 'Locations' },
    { numero: '624100', libelle: 'Entretien' },
    { numero: '628100', libelle: 'Frais de téléphone' },
    { numero: '631100', libelle: 'Taxes et impôts' },
    { numero: '632000', libelle: 'Honoraires' },
    { numero: '661100', libelle: 'Salaires' },
    { numero: '706100', libelle: 'Prestations de services' }
  ]
  
  for (const c of comptes) {
    const classe = parseInt(c.numero[0], 10);
    await prisma.compteComptable.upsert({
      where: { numero: c.numero },
      update: {},
      create: {
        ...c,
        classe,
        nature: classe <= 5 ? 'BILAN' : 'GESTION',
        sensNormal: classe === 6 ? 'DEBIT' : 'CREDIT'
      },
    })
  }
  
  console.log('Accounting seeded successfully.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
