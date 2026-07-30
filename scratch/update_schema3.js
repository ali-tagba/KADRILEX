const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Add montantRAS to Facture model
content = content.replace(
  'montantTVA Int       @default(0)',
  'montantTVA Int       @default(0)\r\n  montantRAS Int       @default(0)'
);
content = content.replace(
  'montantTVA Int       @default(0)\n',
  'montantTVA Int       @default(0)\n  montantRAS Int       @default(0)\n'
);

fs.writeFileSync(schemaPath, content, 'utf8');
console.log("Schema defaults updated with montantRAS.");
