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
  const content = fs.readFileSync('/tmp/import.csv', 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  const header = parseCSVLine(lines[0]);
  console.log("Headers:", header);
  
  let dossierCount = 0;
  let clientCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;

    const dateStr = row[0] || '';
    const num = row[1] || '';
    let clientName = row[2] || '';
    const contre = row[3] || '';
    let nature = row[4] || '';
    const etat = row[5] || '';
    const avocat = row[6] || '';
    const obs = row[9] || '';

    if (!clientName.trim()) continue;

    // Date
    let dateOuverture = new Date();
    if (dateStr) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY or MM/DD/YYYY? 1/1/2022
        const year = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[0], 10);
        dateOuverture = new Date(year, month - 1, day);
      }
    }

    // Client
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
      clientCount++;
      let numC = `CLI-22-${String(clientCount).padStart(3, '0')}`;
      let existingClient = await prisma.client.findUnique({ where: { numeroClient: numC } });
      let trC = 1;
      while (existingClient) {
          numC = `CLI-22-${String(clientCount + trC).padStart(3, '0')}`;
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
    }

    // Dossier
    if (!nature.trim()) nature = 'Contentieux';
    
    let numD = `DOS-22-${String(dossierCount + 1).padStart(3, '0')}`;
    if (num && !isNaN(parseInt(num, 10))) {
      numD = `DOS-22-${String(parseInt(num, 10)).padStart(3, '0')}`;
    }

    let existingDossier = await prisma.dossier.findUnique({ where: { numero: numD }});
    let tr = 1;
    while (existingDossier) {
        numD = `DOS-22-${String(dossierCount + tr).padStart(3, '0')}`;
        existingDossier = await prisma.dossier.findUnique({ where: { numero: numD }});
        tr++;
    }

    const desc = avocat ? `Avocat en charge: ${avocat}\n\n${obs}` : obs;
    const contreArray = contre ? [contre.trim()] : [];

    await prisma.dossier.create({
      data: {
        numero: numD,
        type: 'AUTRE',
        nature,
        titre: `Affaire ${clientName}`,
        etatProcedure: etat || null,
        clientId: client.id,
        partiesAdverses: contreArray,
        dateOuverture,
        description: desc.trim() || null,
      }
    });
    
    dossierCount++;
    if (dossierCount % 50 === 0) console.log(`Imported ${dossierCount} dossiers...`);
  }

  console.log(`✅ Import termin\u00E9 : ${clientCount} clients cr\u00E9\u00E9s, ${dossierCount} dossiers cr\u00E9\u00E9s.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
