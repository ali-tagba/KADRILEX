const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  console.log("Suppression des anciennes données (Dossiers, Clients)...");
  await prisma.dossier.deleteMany({});
  await prisma.client.deleteMany({});
  
  const content = fs.readFileSync('/tmp/import.csv', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  let dossierCount = 0;
  let clientCount = 0;
  let membreCount = 0;

  // 1. Extraire et créer les avocats uniques
  const avocatsSet = new Set();
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;
    let avocat = (row[6] || '').trim();
    if (avocat) {
        avocat = avocat.toUpperCase().replace(/^ME\s+/, 'Me ').replace(/^BATONNIER$/, 'Me BATONNIER');
        avocatsSet.add(avocat);
    }
  }

  const avocatMap = {};
  for (const avocatName of avocatsSet) {
      const parts = avocatName.split(' ');
      const nom = parts.length > 1 ? parts.slice(1).join(' ') : avocatName;
      const prenom = parts.length > 1 ? parts[0] : '';
      
      const email = `${nom.toLowerCase().replace(/[^a-z]/g, '')}@kadrilex.com`;
      
      let membre = await prisma.membre.findFirst({
          where: { OR: [{ nom: nom }, { email: email }] }
      });
      
      if (!membre) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          membre = await prisma.membre.create({
              data: {
                  prenom: prenom || 'Avocat',
                  nom: nom,
                  email: email,
                  role: 'AVOCAT',
                  dateEmbauche: new Date(),
                  codeAccesHash: "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa", // Hash for 'password'
                  statutContrat: 'COLLABORATEUR_CDI'
              }
          });
          membreCount++;
      }
      avocatMap[avocatName] = membre.id;
  }
  console.log(`Membres extraits et créés/trouvés : ${Object.keys(avocatMap).length}`);

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;

    const dateStr = row[0] || '';
    const num = (row[1] || '').trim();
    let clientName = (row[2] || '').trim();
    const contre = (row[3] || '').trim();
    let nature = (row[4] || '').trim();
    const etat = (row[5] || '').trim();
    let avocatStr = (row[6] || '').trim();
    const honorairesStr = (row[7] || '').trim();
    const fraisStr = (row[8] || '').trim();
    const obs = (row[9] || '').trim();

    if (!clientName) continue;

    let dateOuverture = new Date();
    if (dateStr) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            dateOuverture = new Date(year, month - 1, day);
        }
      }
    }

    const upper = clientName.toUpperCase();
    const isMorale = upper.includes('SARL') || upper.includes('GROUPE') || upper.includes('STE') || upper.includes('AGENCE') || upper.includes('CABINET') || upper.includes('LTD') || upper.includes('SA') || upper.includes('SOCIETE') || upper.includes('ETAT');
    
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          { raisonSociale: clientName },
          { nom: clientName }
        ]
      }
    });

    if (!client) {
      let numC = num ? num : String(clientCount + 1).padStart(2, '0');
      let existingClient = await prisma.client.findUnique({ where: { numeroClient: numC } });
      let trC = 1;
      while (existingClient) {
          numC = num + '-' + trC;
          existingClient = await prisma.client.findUnique({ where: { numeroClient: numC } });
          trC++;
      }
      
      client = await prisma.client.create({
        data: {
          numeroClient: numC,
          type: isMorale ? 'PERSONNE_MORALE' : 'PERSONNE_PHYSIQUE',
          raisonSociale: isMorale ? clientName : null,
          nom: isMorale ? null : clientName,
        }
      });
      clientCount++;
    }

    let avocatId = null;
    if (avocatStr) {
        avocatStr = avocatStr.toUpperCase().replace(/^ME\s+/, 'Me ').replace(/^BATONNIER$/, 'Me BATONNIER');
        avocatId = avocatMap[avocatStr] || null;
        if (avocatId) {
            await prisma.clientEquipe.upsert({
                where: { clientId_membreId: { clientId: client.id, membreId: avocatId } },
                update: {},
                create: { clientId: client.id, membreId: avocatId }
            });
        }
    }

    if (!nature) nature = 'Contentieux';
    
    let numD = num ? num : String(dossierCount + 1).padStart(2, '0');
    let existingDossier = await prisma.dossier.findUnique({ where: { numero: numD }});
    let tr = 1;
    while (existingDossier) {
        numD = num + '-' + tr;
        existingDossier = await prisma.dossier.findUnique({ where: { numero: numD }});
        tr++;
    }

    const contreArray = contre ? [contre] : [];
    
    let honorairesJson = [];
    if (honorairesStr) {
        let amt = parseInt(honorairesStr.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(amt)) {
            honorairesJson.push({ phase: "Convenu", type: "FORFAIT", montant: amt });
        }
    }

    let provisionsJson = [];
    if (fraisStr) {
        let amt = parseInt(fraisStr.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(amt)) {
            provisionsJson.push({ id: Math.random().toString(36).substring(7), date: dateOuverture.toISOString(), montant: amt, description: "Frais d'ouverture / Provision" });
        }
    }

    const dossier = await prisma.dossier.create({
      data: {
        numero: numD,
        type: 'AUTRE',
        nature,
        titre: "Affaire " + clientName,
        etatProcedure: etat || null,
        clientId: client.id,
        partiesAdverses: contreArray,
        dateOuverture,
        description: obs || null,
        responsableId: avocatId,
        honoraires: honorairesJson.length ? honorairesJson : null,
        provisionsVersees: provisionsJson.length ? provisionsJson : null
      }
    });
    
    if (avocatId) {
        await prisma.dossierEquipe.create({
            data: { dossierId: dossier.id, membreId: avocatId }
        });
    }
    
    dossierCount++;
  }

  console.log(`Import terminé : ${clientCount} clients créés, ${dossierCount} dossiers créés.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
