import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Plan Comptable Général OHADA Révisé (Abrégé pour la démo, mais représentatif)
const OHADA_ACCOUNTS = [
  // CLASSE 1 : COMPTES DE RESSOURCES DURABLES
  { numero: "101000", libelle: "Capital social", classe: 1, nature: "BILAN", sensNormal: "CREDIT" },
  { numero: "131000", libelle: "Résultat net : Bénéfice", classe: 1, nature: "BILAN", sensNormal: "CREDIT" },
  { numero: "162000", libelle: "Emprunts et dettes auprès des établissements de crédit", classe: 1, nature: "BILAN", sensNormal: "CREDIT" },
  
  // CLASSE 2 : COMPTES D'ACTIF IMMOBILISE
  { numero: "211000", libelle: "Frais de recherche et de développement", classe: 2, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "231000", libelle: "Bâtiments", classe: 2, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "241000", libelle: "Matériel et outillage", classe: 2, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "244000", libelle: "Matériel de bureau et informatique", classe: 2, nature: "BILAN", sensNormal: "DEBIT" },

  // CLASSE 3 : COMPTES DE STOCKS (Moins pertinents pour un cabinet, mais OHADA oblige)
  { numero: "311000", libelle: "Marchandises", classe: 3, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "331000", libelle: "Matières premières", classe: 3, nature: "BILAN", sensNormal: "DEBIT" },

  // CLASSE 4 : COMPTES DE TIERS
  { numero: "401000", libelle: "Fournisseurs, dettes en compte", classe: 4, nature: "BILAN", sensNormal: "CREDIT", lettrable: true },
  { numero: "411000", libelle: "Clients", classe: 4, nature: "BILAN", sensNormal: "DEBIT", lettrable: true },
  { numero: "419000", libelle: "Clients, avances et acomptes reçus", classe: 4, nature: "BILAN", sensNormal: "CREDIT", lettrable: true },
  { numero: "421000", libelle: "Personnel, rémunérations dues", classe: 4, nature: "BILAN", sensNormal: "CREDIT" },
  { numero: "431000", libelle: "Sécurité sociale", classe: 4, nature: "BILAN", sensNormal: "CREDIT" },
  { numero: "443100", libelle: "TVA facturée sur prestations de services", classe: 4, nature: "BILAN", sensNormal: "CREDIT" },
  { numero: "445200", libelle: "TVA récupérable sur achats", classe: 4, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "448600", libelle: "État, charges à payer", classe: 4, nature: "BILAN", sensNormal: "CREDIT" },
  { numero: "471100", libelle: "Fonds séquestres (CARPA)", classe: 4, nature: "BILAN", sensNormal: "CREDIT" }, // Spécifique avocat

  // CLASSE 5 : COMPTES DE TRESORERIE
  { numero: "521000", libelle: "Banques locales", classe: 5, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "571000", libelle: "Caisse siège social", classe: 5, nature: "BILAN", sensNormal: "DEBIT" },
  { numero: "585000", libelle: "Virements de fonds", classe: 5, nature: "BILAN", sensNormal: "DEBIT" }, // Compte de passage

  // CLASSE 6 : COMPTES DE CHARGES DES ACTIVITES ORDINAIRES
  { numero: "605100", libelle: "Fournitures de bureau", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "612000", libelle: "Transports et déplacements", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "622100", libelle: "Locations de bâtiments", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "624100", libelle: "Frais d'entretien et de réparation", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "628100", libelle: "Frais de téléphone", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "631100", libelle: "Frais bancaires", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "632000", libelle: "Rémunérations d'intermédiaires (Huissiers, Experts)", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "661100", libelle: "Salaires de base", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "664000", libelle: "Charges sociales", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "681000", libelle: "Dotations aux amortissements", classe: 6, nature: "GESTION", sensNormal: "DEBIT" },

  // CLASSE 7 : COMPTES DE PRODUITS DES ACTIVITES ORDINAIRES
  { numero: "701000", libelle: "Ventes de marchandises", classe: 7, nature: "GESTION", sensNormal: "CREDIT" }, // OHADA Standard
  { numero: "706100", libelle: "Honoraires de postulation", classe: 7, nature: "GESTION", sensNormal: "CREDIT" },
  { numero: "706200", libelle: "Honoraires de consultation", classe: 7, nature: "GESTION", sensNormal: "CREDIT" },
  { numero: "706300", libelle: "Honoraires de rédaction d'actes", classe: 7, nature: "GESTION", sensNormal: "CREDIT" },
  { numero: "706400", libelle: "Honoraires de plaidoirie", classe: 7, nature: "GESTION", sensNormal: "CREDIT" },
  { numero: "771000", libelle: "Gains de change", classe: 7, nature: "GESTION", sensNormal: "CREDIT" },

  // CLASSE 8 : COMPTES DES AUTRES CHARGES ET AUTRES PRODUITS
  { numero: "810000", libelle: "Valeurs comptables des cessions d'immobilisations", classe: 8, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "820000", libelle: "Produits des cessions d'immobilisations", classe: 8, nature: "GESTION", sensNormal: "CREDIT" },
  { numero: "831000", libelle: "Charges hors activités ordinaires", classe: 8, nature: "GESTION", sensNormal: "DEBIT" },
  { numero: "841000", libelle: "Produits hors activités ordinaires", classe: 8, nature: "GESTION", sensNormal: "CREDIT" },
]

const JOURNAUX = [
  { code: "VE", libelle: "Ventes et Honoraires", type: "VENTE" },
  { code: "AC", libelle: "Achats et Frais", type: "ACHAT" },
  { code: "BQ", libelle: "Banque", type: "BANQUE" },
  { code: "CA", libelle: "Caisse", type: "CAISSE" },
  { code: "OD", libelle: "Opérations Diverses", type: "OD" },
  { code: "AN", libelle: "À Nouveaux", type: "OD" },
]

async function main() {
  console.log("==> Initialisation du système comptable KadriLex (Odoo-like) <==")
  
  // 1. Vider les tables comptables existantes
  console.log("Nettoyage des anciennes données comptables...")
  await prisma.ligneEcriture.deleteMany()
  await prisma.ecriture.deleteMany()
  await prisma.compteComptable.deleteMany()
  await prisma.journalComptable.deleteMany()
  await prisma.exerciceComptable.deleteMany()

  // 2. Création de l'exercice comptable courant
  const dateDebut = new Date(new Date().getFullYear(), 0, 1)
  const dateFin = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59)
  
  const exercice = await prisma.exerciceComptable.create({
    data: {
      libelle: `Exercice ${dateDebut.getFullYear()}`,
      dateDebut,
      dateFin,
      cloture: false,
    }
  })
  console.log(`Exercice comptable créé : ${exercice.libelle}`)

  // 3. Création des journaux
  console.log("Création des journaux...")
  for (const j of JOURNAUX) {
    await prisma.journalComptable.create({ data: j })
  }

  // 4. Création du Plan Comptable SYSCOHADA
  console.log("Injection du Plan Comptable SYSCOHADA...")
  for (const c of OHADA_ACCOUNTS) {
    await prisma.compteComptable.create({
      data: {
        numero: c.numero,
        libelle: c.libelle,
        classe: c.classe,
        nature: c.nature,
        sensNormal: c.sensNormal,
        lettrable: c.lettrable || false,
        actif: true,
      }
    })
  }

  // 5. Génération d'un solde d'ouverture (A Nouveaux) pour faire joli sur le dashboard
  console.log("Génération d'écritures de démonstration (À Nouveaux)...")
  
  const journalAN = await prisma.journalComptable.findUnique({ where: { code: "AN" } })
  const compteCapital = await prisma.compteComptable.findUnique({ where: { numero: "101000" } })
  const compteBanque = await prisma.compteComptable.findUnique({ where: { numero: "521000" } })
  const compteCaisse = await prisma.compteComptable.findUnique({ where: { numero: "571000" } })
  const compteSequestre = await prisma.compteComptable.findUnique({ where: { numero: "471100" } })

  if (journalAN && compteCapital && compteBanque && compteCaisse && compteSequestre) {
    await prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalAN.id,
        numeroPiece: "AN-00001",
        dateEcriture: dateDebut,
        libelle: "Reprise des soldes à nouveaux",
        validee: true,
        lignes: {
          create: [
            // Capital (1M)
            { compteId: compteCapital.id, credit: 10000000, debit: 0, libelle: "Capital Social" },
            // Banque (8M)
            { compteId: compteBanque.id, credit: 0, debit: 8000000, libelle: "Solde Bancaire Initial" },
            // Caisse (2M)
            { compteId: compteCaisse.id, credit: 0, debit: 2000000, libelle: "Solde Caisse Initial" },
            
            // Séquestre test pour voir le solde dans la dashboard (30M)
            { compteId: compteBanque.id, credit: 0, debit: 30000000, libelle: "Fonds CARPA Déposés en Banque" },
            { compteId: compteSequestre.id, credit: 30000000, debit: 0, libelle: "Fonds CARPA Consignés" },
          ]
        }
      }
    })
  }

  console.log("==> Seed Comptable Terminé ! <==")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
