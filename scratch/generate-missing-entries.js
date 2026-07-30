const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting retroactive generation of expense accounting entries...");
  
  // Find all depenses
  const depenses = await prisma.depense.findMany();
  console.log(`Found ${depenses.length} expenses in total.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const depense of depenses) {
    const pieceRef = `NDF-${depense.id.substring(0, 8).toUpperCase()}`;
    
    // Check if entry already exists
    const existingEntry = await prisma.ecriture.findFirst({
      where: { numeroPiece: pieceRef }
    });

    if (existingEntry) {
      skippedCount++;
      continue;
    }

    try {
      console.log(`Generating entry for expense: ${pieceRef}`);
      
      // 1. Find or create exercice
      let exercice = await prisma.exerciceComptable.findFirst({
        where: {
          dateDebut: { lte: depense.date },
          dateFin: { gte: depense.date },
          cloture: false
        }
      });
      
      if (!exercice) {
        // Fallback: create exercice for that year
        const year = depense.date.getFullYear();
        exercice = await prisma.exerciceComptable.create({
          data: {
            libelle: `Exercice ${year}`,
            dateDebut: new Date(`${year}-01-01T00:00:00.000Z`),
            dateFin: new Date(`${year}-12-31T23:59:59.999Z`),
            cloture: false
          }
        });
        console.log(`Created new Exercice for year ${year}`);
      }

      // 2. Determine mapped category
      const DEPENSE_COMPTE_MAPPING = {
        'Fournitures': { numero: '604000', libelle: 'Achats stockés de matières et fournitures', classe: 6 },
        'Logiciels': { numero: '613000', libelle: 'Locations (Logiciels / SaaS)', classe: 6 },
        'Equipement': { numero: '244000', libelle: 'Matériel de bureau', classe: 2 },
        'Deplacement': { numero: '624000', libelle: 'Transports de biens et déplacements', classe: 6 },
        'Repas': { numero: '628000', libelle: 'Frais de réception', classe: 6 },
        'Autre': { numero: '632000', libelle: 'Frais bancaires et autres', classe: 6 },
        'Sous-traitance': { numero: '622000', libelle: 'Sous-traitance et Rémunérations d\'intermédiaires', classe: 6 },
        'Honoraires': { numero: '622100', libelle: 'Honoraires (Avocats, Experts)', classe: 6 },
        'Maintenance': { numero: '615000', libelle: 'Entretien et réparations', classe: 6 }
      };

      const mappedCategorie = DEPENSE_COMPTE_MAPPING[depense.categorie] || DEPENSE_COMPTE_MAPPING['Autre'];
      
      // 3. Find or create accounts
      let compteCharge = await prisma.compteComptable.findUnique({ where: { numero: mappedCategorie.numero } });
      if (!compteCharge) {
        compteCharge = await prisma.compteComptable.create({
          data: {
            numero: mappedCategorie.numero,
            libelle: mappedCategorie.libelle,
            classe: mappedCategorie.classe,
            nature: mappedCategorie.classe === 2 ? 'BILAN' : 'GESTION',
            sensNormal: 'DEBIT'
          }
        });
      }

      let compteBanque = await prisma.compteComptable.findUnique({ where: { numero: '521000' } });
      if (!compteBanque) {
        compteBanque = await prisma.compteComptable.create({
          data: { numero: '521000', libelle: 'Banque locale', classe: 5, nature: 'BILAN', sensNormal: 'DEBIT' }
        });
      }

      let compteTva = await prisma.compteComptable.findUnique({ where: { numero: '445400' } });
      if (!compteTva) {
        compteTva = await prisma.compteComptable.create({
          data: { numero: '445400', libelle: 'TVA récupérable sur achats', classe: 4, nature: 'BILAN', sensNormal: 'DEBIT' }
        });
      }

      // 4. Find Journal OD
      let journalOD = await prisma.journalComptable.findUnique({ where: { code: 'OD' } });
      if (!journalOD) {
        journalOD = await prisma.journalComptable.create({
          data: { code: 'OD', libelle: 'Opérations Diverses', type: 'OD' }
        });
      }

      // 5. Generate entry
      const lignes = [];
      lignes.push({
        compteId: compteCharge.id,
        debit: depense.montantHT,
        credit: 0,
        libelle: depense.libelle,
        fournisseurId: depense.fournisseurId,
      });

      if (depense.montantTVA > 0) {
        lignes.push({
          compteId: compteTva.id,
          debit: depense.montantTVA,
          credit: 0,
          libelle: `TVA déductible - ${depense.libelle}`,
          fournisseurId: depense.fournisseurId,
        });
      }

      lignes.push({
        compteId: compteBanque.id,
        debit: 0,
        credit: depense.montantTTC,
        libelle: `Paiement ${depense.libelle}`,
        fournisseurId: depense.fournisseurId,
      });

      await prisma.ecriture.create({
        data: {
          exerciceId: exercice.id,
          journalId: journalOD.id,
          numeroPiece: pieceRef,
          dateEcriture: depense.date,
          libelle: `${mappedCategorie.libelle} — ${depense.libelle}`,
          validee: true,
          annule: false,
          dossierId: depense.dossierId,
          lignes: { create: lignes },
        },
      });
      
      createdCount++;
    } catch (err) {
      console.error(`Failed to generate entry for ${pieceRef}:`, err.message);
    }
  }

  console.log(`\nFinished! Created: ${createdCount}, Skipped (already existed): ${skippedCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
