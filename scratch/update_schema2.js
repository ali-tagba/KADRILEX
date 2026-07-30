const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

content = content.replace(
  'numeroClient String     @unique // CLI-YY-NNN auto-généré',
  'numeroClient String     @unique @default("CLI-000") // CLI-YY-NNN auto-généré'
);

content = content.replace(
  'nature        String\r\n  titre         String',
  'nature        String @default("Contentieux")\r\n  titre         String @default("Sans titre")'
);
content = content.replace(
  'nature        String\n  titre         String',
  'nature        String @default("Contentieux")\n  titre         String @default("Sans titre")'
);

content = content.replace(
  'nature    AudienceNature\r\n  dateDebut DateTime',
  'nature    AudienceNature @default(PLAIDOIRIE)\r\n  dateDebut DateTime @default(now())'
);
content = content.replace(
  'nature    AudienceNature\n  dateDebut DateTime',
  'nature    AudienceNature @default(PLAIDOIRIE)\n  dateDebut DateTime @default(now())'
);

content = content.replace(
  'numero        String         @unique // AUD-YY-NNN',
  'numero        String         @unique @default("AUD-000") // AUD-YY-NNN'
);

fs.writeFileSync(schemaPath, content, 'utf8');
console.log("Schema defaults updated.");
