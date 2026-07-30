const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'components', 'data-sync-provider.tsx');
let content = fs.readFileSync(file, 'utf8');

const newImports = `import { mockClients } from "@/lib/mock/clients"
import { mockDossiers } from "@/lib/mock/dossiers"
import { mockEmployes as mockMembres } from "@/lib/mock/employes"
import { mockAudiences, mockTaches } from "@/lib/mock/audiences"
import { mockDocuments } from "@/lib/mock/documents"
import { mockFactures, mockDevis } from "@/lib/mock/invoices"
import { mockDepenses } from "@/lib/mock/depenses"
import { mockBulletins } from "@/lib/mock/bulletins"
import { mockClients as demoClients } from "@/lib/mock/clients"
import { mockDossiers as demoDossiers } from "@/lib/mock/dossiers"
import { mockEmployes as demoMembres } from "@/lib/mock/employes"
import { mockAudiences as demoAudiences, mockTaches as demoTaches } from "@/lib/mock/audiences"
import { mockDocuments as demoDocuments } from "@/lib/mock/documents"
import { mockFactures as demoFactures } from "@/lib/mock/invoices"
import { mockDepenses as demoDepenses } from "@/lib/mock/depenses"
import { mockBulletins as demoBulletins } from "@/lib/mock/bulletins"`;

// find everything from import { initialClients as mockClients } to import { mockBulletins as demoBulletins }
const startStr = 'import { initialClients as mockClients } from "@/lib/mock/clients"';
const endStr = 'import { mockBulletins as demoBulletins } from "@/lib/demo/bulletins"';

if (content.includes(startStr) && content.includes(endStr)) {
    const startIdx = content.indexOf(startStr);
    const endIdx = content.indexOf(endStr) + endStr.length;
    content = content.substring(0, startIdx) + newImports + content.substring(endIdx);
    fs.writeFileSync(file, content);
    console.log("Imports fixed successfully");
} else {
    console.log("Could not find import block to replace");
}
