const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Suppression des données fictives...");
    
    // On utilise CASCADE pour vider toutes ces tables sans se soucier de l'ordre exact, 
    // et ON GARDE la table Membre pour ne pas déconnecter l'utilisateur.
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE 
            "LigneEcriture", 
            "Ecriture", 
            "JournalComptable", 
            "ExerciceComptable", 
            "Paiement", 
            "FactureLigne", 
            "Facture", 
            "Depense",
            "CompteSequestre",
            "BulletinLigne",
            "Bulletin",
            "DocumentDossier",
            "Document",
            "DiligenceEquipe",
            "Diligence",
            "TacheEquipe",
            "Tache",
            "AudienceEquipe",
            "Audience",
            "DossierNote",
            "DossierFile",
            "DossierEquipe",
            "Dossier",
            "Contact", 
            "ClientEquipe",
            "Client",
            "Fournisseur" 
        CASCADE;
    `);

    console.log("✅ Toutes les données fictives ont été supprimées !");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
