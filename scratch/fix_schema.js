const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// The multi_replace_file_content deleted CategorieDepense and DepenseStatut! Let's just add them back.
const missingEnums = `
  BAILLEUR
  PRESTATAIRE_SERVICE
  AUTRE
}

enum CategorieDepense {
  LOYER
  ELECTRICITE
  INTERNET
  EAU
  TELEPHONE
  ABONNEMENT_SOFTWARE
  FOURNITURES
  CARBURANT
  REPARATION
  ENTRETIEN
  HOTEL
  VOYAGE
  RESTAURATION
  FOURNISSEURS
  FORMATION
  COTISATIONS
  FRAIS_BANCAIRES
  ASSURANCE
  SALAIRES
  TAXES
  IMPOTS
  DIVERS
  MAINTENANCE
  AUTRE
}

enum DepenseStatut {
  PAYEE
  A_PAYER
}`;

content = content.replace(/HUISSIER\s+EXPERT\s+GREFFE\s+}/, `HUISSIER\n  EXPERT\n  GREFFE\n${missingEnums}`);

fs.writeFileSync(schemaPath, content);
console.log("Schema fixed!");
