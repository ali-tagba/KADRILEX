/**
 * Nettoyage des données fictives — à exécuter sur le VPS pour passer en "mode prod réel".
 *
 * Conserve :
 *   - Les Membres (sinon impossible de se connecter)
 *
 * Supprime :
 *   - Clients, Contacts, Dossiers, DossierFiles, DossierNotes
 *   - Audiences
 *   - Tâches
 *   - Documents (bibliothèque) + liaisons DocumentDossier
 *   - Factures, FactureLignes, Paiements
 *   - Dépenses
 *   - Fournisseurs
 *   - Toutes les tables de jointure (équipes)
 *
 * Usage :
 *   docker compose exec -T app node -e "require('./scripts/clean-fixtures.js')"
 *   ou via tsx en dev
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🧹 Nettoyage des fixtures (préserve les membres)...")

    // Ordre : feuilles d'abord pour éviter les contraintes FK
    const ops = [
        ["Paiement", () => prisma.paiement.deleteMany()],
        ["FactureLigne", () => prisma.factureLigne.deleteMany()],
        ["Facture", () => prisma.facture.deleteMany()],
        ["Depense", () => prisma.depense.deleteMany()],
        ["Fournisseur", () => prisma.fournisseur.deleteMany()],
        ["DocumentDossier", () => prisma.documentDossier.deleteMany()],
        ["Document", () => prisma.document.deleteMany()],
        ["TacheEquipe", () => prisma.tacheEquipe.deleteMany()],
        ["Tache", () => prisma.tache.deleteMany()],
        ["AudienceEquipe", () => prisma.audienceEquipe.deleteMany()],
        ["Audience", () => prisma.audience.deleteMany()],
        ["DossierNote", () => prisma.dossierNote.deleteMany()],
        ["DossierFile", () => prisma.dossierFile.deleteMany()],
        ["DossierEquipe", () => prisma.dossierEquipe.deleteMany()],
        ["Dossier", () => prisma.dossier.deleteMany()],
        ["Contact", () => prisma.contact.deleteMany()],
        ["ClientEquipe", () => prisma.clientEquipe.deleteMany()],
        ["Client", () => prisma.client.deleteMany()],
    ] as const

    for (const [name, op] of ops) {
        const result = await op()
        console.log(`  ✓ ${name.padEnd(20)} ${result.count} supprimé(s)`)
    }

    const remainingMembres = await prisma.membre.count()
    console.log(`\n🎉 Nettoyage terminé. Membres conservés : ${remainingMembres}`)
    console.log("   Le user peut maintenant créer ses propres données via l'UI.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
