/**
 * Seed KadriLex — Sprint 0
 *
 * Génère un dataset réaliste pour le dev :
 *   - 7 Membres (couvrant les 6 rôles) avec codeAcces hashed bcrypt
 *   - 8 Clients (4 PM Niamey + 4 PP) avec contacts
 *   - 18 Dossiers répartis sur les clients
 *   - 25 Audiences (15 à venir + 10 passées)
 *   - 20 Tâches (Kanban A_FAIRE/EN_COURS/FAIT)
 *   - 15 Factures (10 émises + 5 reçues) + paiements
 *   - 8 Dépenses internes
 *   - 5 Bulletins (mois courant pour membres salariés)
 *   - 20 Documents bibliothèque
 *
 * Les codes d'accès en clair sont AFFICHÉS à la fin → à copier pour se connecter.
 */

import { PrismaClient, type Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

/* ============================================================
   Utilitaires
   ============================================================ */

function genCode(): string {
    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const segs = [3, 3, 4]
    return segs
        .map((n) =>
            Array.from({ length: n }, () =>
                ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
            ).join("")
        )
        .join("-")
}

function daysAgo(n: number): Date {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d
}

function daysFromNow(n: number): Date {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d
}

function pick<T>(arr: T[], rng: () => number = Math.random): T {
    return arr[Math.floor(rng() * arr.length)]
}

/* ============================================================
   Main
   ============================================================ */

async function main() {
    console.log("🧹 Nettoyage des tables...")

    // Ordre : tables de jointure et feuilles avant racines
    await prisma.bulletinLigne.deleteMany()
    await prisma.bulletin.deleteMany()
    await prisma.paiement.deleteMany()
    await prisma.factureLigne.deleteMany()
    await prisma.facture.deleteMany()
    await prisma.depense.deleteMany()
    await prisma.fournisseur.deleteMany()
    await prisma.documentDossier.deleteMany()
    await prisma.document.deleteMany()
    await prisma.tacheEquipe.deleteMany()
    await prisma.tache.deleteMany()
    await prisma.audienceEquipe.deleteMany()
    await prisma.audience.deleteMany()
    await prisma.dossierNote.deleteMany()
    await prisma.dossierFile.deleteMany()
    await prisma.dossierEquipe.deleteMany()
    await prisma.dossier.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.clientEquipe.deleteMany()
    await prisma.client.deleteMany()
    await prisma.membre.deleteMany()

    /* ========================================================
       MEMBRES — 7 (1 gérant + 1 associé + 2 avocats + 1 juriste + 1 stagiaire + 1 secrétaire)
       ======================================================== */
    console.log("👥 Création des membres...")

    const membreDefs = [
        {
            prenom: "Oumarou Sanda",
            nom: "KADRI",
            email: "osk@kadrilegal.test",
            role: "ASSOCIE_GERANT" as const,
            statutContrat: "ASSOCIE" as const,
            fonction: "Associé gérant",
            salaireBaseBrut: 0,
            avocatCabinetKey: "Me Oumarou Sanda KADRI",
            dateEmbauche: new Date("2015-01-15"),
        },
        {
            prenom: "Ali",
            nom: "KADRI",
            email: "ali@kadrilegal.test",
            role: "ASSOCIE" as const,
            statutContrat: "ASSOCIE" as const,
            fonction: "Associé",
            salaireBaseBrut: 0,
            avocatCabinetKey: "Me Ali KADRI",
            dateEmbauche: new Date("2017-03-01"),
        },
        {
            prenom: "Mahaman Rabiou",
            nom: "OUMAROU",
            email: "rabiou@kadrilegal.test",
            role: "AVOCAT" as const,
            statutContrat: "COLLABORATEUR_CDI" as const,
            fonction: "Avocat collaborateur",
            salaireBaseBrut: 850_000,
            avocatCabinetKey: "Me Mahaman Rabiou OUMAROU",
            dateEmbauche: new Date("2019-09-15"),
        },
        {
            prenom: "Mariama",
            nom: "ABDOU ISSA",
            email: "mariama@kadrilegal.test",
            role: "AVOCAT" as const,
            statutContrat: "COLLABORATEUR_CDI" as const,
            fonction: "Avocate collaboratrice",
            salaireBaseBrut: 750_000,
            avocatCabinetKey: "Me Mariama ABDOU ISSA",
            dateEmbauche: new Date("2021-01-04"),
        },
        {
            prenom: "Aïcha",
            nom: "SOULEY",
            email: "aicha@kadrilegal.test",
            role: "JURISTE" as const,
            statutContrat: "COLLABORATEUR_CDI" as const,
            fonction: "Juriste",
            salaireBaseBrut: 450_000,
            avocatCabinetKey: null,
            dateEmbauche: new Date("2023-06-01"),
        },
        {
            prenom: "Issa",
            nom: "MAÏGA",
            email: "issa@kadrilegal.test",
            role: "STAGIAIRE" as const,
            statutContrat: "STAGIAIRE" as const,
            fonction: "Élève-avocat",
            salaireBaseBrut: 150_000,
            avocatCabinetKey: null,
            dateEmbauche: new Date("2026-01-15"),
        },
        {
            prenom: "Fatima",
            nom: "BARMOU",
            email: "fatima@kadrilegal.test",
            role: "SECRETAIRE" as const,
            statutContrat: "SECRETAIRE_CDI" as const,
            fonction: "Secrétaire de direction",
            salaireBaseBrut: 350_000,
            avocatCabinetKey: null,
            dateEmbauche: new Date("2018-11-12"),
        },
    ]

    const codesAcces: Record<string, string> = {}
    const membres: Awaited<ReturnType<typeof prisma.membre.create>>[] = []
    for (const def of membreDefs) {
        const code = "ADM-KAD-2026"
        codesAcces[def.email] = code
        const hash = await bcrypt.hash(code, 10)
        const m = await prisma.membre.create({
            data: {
                ...def,
                telephone: "+227 90 00 0" + (membres.length + 1).toString().padStart(2, "0"),
                actif: true,
                invitationStatut: "ACTIF",
                codeAccesHash: hash,
                modeVersementParDefaut: def.salaireBaseBrut > 500_000 ? "VIREMENT" : "MOBILE_MONEY",
                rib: def.salaireBaseBrut >= 500_000 ? "NE058 01001 03124" : null,
                banque: def.salaireBaseBrut >= 500_000 ? "Banque Atlantique Niger" : null,
                mobileMoney: def.salaireBaseBrut < 500_000 ? "+227 90 00 0" + (membres.length + 1) : null,
            },
        })
        membres.push(m)
    }
    const [gerant, associe, avocat1, avocat2, juriste, stagiaire, secretaire] = membres

    /* ========================================================
       CLIENTS — 4 PM + 4 PP
       ======================================================== */
    console.log("🏢 Création des clients...")

    const annee = new Date().getFullYear() % 100
    let cliCounter = 0
    const numCli = () => `CLI-${annee}-${(++cliCounter).toString().padStart(3, "0")}`

    const clientPMDefs = [
        {
            raisonSociale: "SONITEL SA",
            formeJuridique: "SA",
            numeroRCCM: "NIM-2008-B-1234",
            nif: "1234567/B",
            conventionnee: true,
            siegeSocial: "Avenue du Général Bonecarrère, Niamey",
            representantLegal: "Mohamed AGALY",
            email: "contact@sonitel.ne",
            telephone: "+227 20 73 30 00",
            ville: "Niamey",
            honorairesConvenus: "Convention annuelle",
            responsableId: gerant.id,
            equipeIds: [associe.id, avocat1.id],
        },
        {
            raisonSociale: "NIGELEC",
            formeJuridique: "Société d'État",
            numeroRCCM: "NIM-1968-A-001",
            nif: "9876543/A",
            conventionnee: true,
            siegeSocial: "Rue du Lac Tchad, Niamey",
            representantLegal: "Halid HALIDOU",
            email: "siege@nigelec.ne",
            telephone: "+227 20 72 22 33",
            ville: "Niamey",
            honorairesConvenus: "Convention trimestrielle",
            responsableId: associe.id,
            equipeIds: [avocat1.id],
        },
        {
            raisonSociale: "Banque Atlantique Niger",
            formeJuridique: "SA",
            numeroRCCM: "NIM-2006-B-789",
            nif: "5544332/B",
            conventionnee: false,
            siegeSocial: "Plateau, Niamey",
            representantLegal: "Aminata DIOP",
            email: "juridique@banqueatlantique.ne",
            telephone: "+227 20 73 35 00",
            ville: "Niamey",
            honorairesConvenus: "Facturation hors convention",
            responsableId: avocat1.id,
            equipeIds: [],
        },
        {
            raisonSociale: "SEEN",
            formeJuridique: "SA",
            numeroRCCM: "NIM-2001-B-456",
            nif: "1122334/B",
            conventionnee: true,
            siegeSocial: "Rue Heinrich Lübke, Niamey",
            representantLegal: "Issoufou MAMANE",
            email: "dg@seen.ne",
            telephone: "+227 20 73 27 27",
            ville: "Niamey",
            honorairesConvenus: "Convention mensuelle",
            responsableId: gerant.id,
            equipeIds: [avocat2.id, juriste.id],
        },
    ]

    const clientPPDefs = [
        {
            nom: "ABDOULAYE",
            prenom: "Hassane",
            profession: "Commerçant",
            pieceIdentite: "CNI 1234567",
            nationalite: "Nigérienne",
            email: "h.abdoulaye@gmail.com",
            telephone: "+227 96 12 34 56",
            ville: "Niamey",
            honorairesConvenus: "Honoraires au forfait",
            responsableId: avocat2.id,
            equipeIds: [],
        },
        {
            nom: "DIALLO",
            prenom: "Mariam",
            profession: "Médecin",
            pieceIdentite: "CNI 7654321",
            nationalite: "Nigérienne",
            email: "m.diallo@yahoo.fr",
            telephone: "+227 90 55 44 33",
            whatsapp: "+227 90 55 44 33",
            ville: "Niamey",
            honorairesConvenus: "Honoraires au temps passé",
            responsableId: avocat1.id,
            equipeIds: [juriste.id],
        },
        {
            nom: "OUSMANE",
            prenom: "Boubacar",
            profession: "Entrepreneur BTP",
            pieceIdentite: "CNI 9988776",
            nationalite: "Nigérienne",
            email: "boubacar.ousmane@bati-niger.ne",
            telephone: "+227 96 88 22 11",
            ville: "Maradi",
            honorairesConvenus: "Honoraires au forfait",
            responsableId: avocat2.id,
            equipeIds: [],
        },
        {
            nom: "TRAORÉ",
            prenom: "Fatoumata",
            profession: "Fonctionnaire",
            pieceIdentite: "CNI 5544332",
            nationalite: "Nigérienne",
            email: "f.traore@gov.ne",
            telephone: "+227 90 11 22 33",
            ville: "Zinder",
            honorairesConvenus: "Honoraires au forfait",
            responsableId: avocat1.id,
            equipeIds: [],
        },
    ]

    const clients = []
    for (const def of clientPMDefs) {
        const { equipeIds, ...rest } = def
        const c = await prisma.client.create({
            data: {
                ...rest,
                numeroClient: numCli(),
                type: "PERSONNE_MORALE",
                iconHint: "domain",
                pays: "Niger",
                actif: true,
                equipe: { create: equipeIds.map((mId) => ({ membreId: mId })) },
            },
        })
        clients.push(c)
    }
    for (const def of clientPPDefs) {
        const { equipeIds, ...rest } = def
        const c = await prisma.client.create({
            data: {
                ...rest,
                numeroClient: numCli(),
                type: "PERSONNE_PHYSIQUE",
                iconHint: "person",
                pays: "Niger",
                actif: true,
                equipe: { create: equipeIds.map((mId) => ({ membreId: mId })) },
            },
        })
        clients.push(c)
    }

    /* ========================================================
       CONTACTS (~ 2 par client PM)
       ======================================================== */
    for (const c of clients.slice(0, 4)) {
        await prisma.contact.createMany({
            data: [
                { clientId: c.id, nom: "MOUSSA", prenom: "Aboubakar", fonction: "Directeur juridique", email: `juridique@${c.raisonSociale?.toLowerCase().replace(/\s/g, "")}.ne`, telephone: "+227 20 00 00 00" },
                { clientId: c.id, nom: "MAÏGA", prenom: "Aïssata", fonction: "Assistante de direction", email: `secretariat@${c.raisonSociale?.toLowerCase().replace(/\s/g, "")}.ne`, telephone: "+227 20 00 00 01" },
            ],
        })
    }

    /* ========================================================
       DOSSIERS — 18
       ======================================================== */
    console.log("📁 Création des dossiers...")
    let dosCounter = 0
    const numDos = () => `DOS-${annee}-${(++dosCounter).toString().padStart(3, "0")}`

    const NATURES = ["Conseil / Assistance", "Contentieux / Judiciaire", "Droit des Affaires / Sociétés", "Droit Social / Travail", "Recouvrement de créances"]
    const TYPES: Array<"CIVIL" | "COMMERCIAL" | "PENAL" | "ADMINISTRATIF" | "SOCIAL"> = ["CIVIL", "COMMERCIAL", "PENAL", "ADMINISTRATIF", "SOCIAL"]
    const STATUTS: Array<"EN_COURS" | "EN_ATTENTE" | "URGENT" | "CLOTURE"> = ["EN_COURS", "EN_COURS", "EN_COURS", "EN_ATTENTE", "URGENT", "CLOTURE"]
    const JURIDICTIONS = ["TGI Hors-Classe Niamey", "Tribunal de Commerce de Niamey", "Cour d'Appel de Niamey", "TAC I Niamey"]

    const dossiers = []
    for (let i = 0; i < 18; i++) {
        const client = clients[i % clients.length]
        const responsableId = client.responsableId ?? gerant.id
        const dossier = await prisma.dossier.create({
            data: {
                numero: numDos(),
                kind: "CLIENT",
                type: TYPES[i % TYPES.length],
                nature: NATURES[i % NATURES.length],
                titre: `Affaire ${i + 1} — ${client.raisonSociale ?? `${client.prenom} ${client.nom}`}`,
                statut: STATUTS[i % STATUTS.length],
                juridiction: JURIDICTIONS[i % JURIDICTIONS.length],
                clientId: client.id,
                partiesAdverses: i % 3 === 0 ? [`Adversaire ${i + 1}`, "État du Niger"] : [`Adversaire ${i + 1}`],
                dateOuverture: daysAgo(360 - i * 15),
                honoraires: [{ id: `seed-h-${i}`, phase: "Unique / Global", type: "FORFAIT", montant: 500_000 + i * 100_000 }],
                description: `Dossier d'illustration n°${i + 1}.`,
                responsableId,
            },
        })
        dossiers.push(dossier)
    }

    /* ========================================================
       AUDIENCES — 25 (15 à venir + 10 passées)
       ======================================================== */
    console.log("⚖️  Création des audiences...")
    let audCounter = 0
    const numAud = () => `AUD-${annee}-${(++audCounter).toString().padStart(3, "0")}`
    const NATURES_AUD: Array<"PLAIDOIRIE" | "MISE_EN_ETAT" | "REFERE" | "DELIBERE"> = ["PLAIDOIRIE", "MISE_EN_ETAT", "REFERE", "DELIBERE"]

    for (let i = 0; i < 15; i++) {
        const dossier = dossiers[i % dossiers.length]
        await prisma.audience.create({
            data: {
                numero: numAud(),
                titre: `Audience ${NATURES_AUD[i % 4]} — ${dossier.numero}`,
                nature: NATURES_AUD[i % 4],
                statut: "A_VENIR",
                dateDebut: daysFromNow(2 + i * 2),
                dureeMinutes: [30, 60, 90, 120][i % 4],
                juridiction: dossier.juridiction,
                salleAudience: `Salle ${(i % 4) + 1}`,
                dossierId: dossier.id,
                responsableId: dossier.responsableId,
                notes: i % 3 === 0 ? "Prévoir dépôt de conclusions" : null,
            },
        })
    }
    for (let i = 0; i < 10; i++) {
        const dossier = dossiers[(i + 5) % dossiers.length]
        await prisma.audience.create({
            data: {
                numero: numAud(),
                titre: `Audience tenue ${i + 1}`,
                nature: NATURES_AUD[i % 4],
                statut: "TERMINEE",
                dateDebut: daysAgo(7 + i * 5),
                dureeMinutes: 60,
                juridiction: dossier.juridiction,
                dossierId: dossier.id,
                responsableId: dossier.responsableId,
                resultat: ["RENVOI", "PLAIDOIRIE", "DELIBERE", "DECISION_RENDUE"][i % 4] as
                    | "RENVOI" | "PLAIDOIRIE" | "DELIBERE" | "DECISION_RENDUE",
                compteRendu: `Audience tenue avec succès. ${i % 2 === 0 ? "Renvoi à la prochaine audience." : "Décision en délibéré."}`,
            },
        })
    }

    /* ========================================================
       TÂCHES — 20
       ======================================================== */
    console.log("✅ Création des tâches...")
    const TACHE_TITRES = [
        "Préparer conclusions",
        "Relire contrat",
        "Appeler client",
        "Déposer requête au tribunal",
        "Récupérer pièces complémentaires",
        "Préparer plaidoirie",
        "Rédiger note de synthèse",
        "Recouvrer créance",
        "Suivi paiement honoraires",
        "Préparer mémoire en appel",
    ]
    const PRIORITES: Array<"BASSE" | "MOYENNE" | "HAUTE" | "URGENTE"> = ["BASSE", "MOYENNE", "HAUTE", "URGENTE"]
    const STATUTS_T: Array<"A_FAIRE" | "EN_COURS" | "FAIT"> = ["A_FAIRE", "EN_COURS", "FAIT"]

    for (let i = 0; i < 20; i++) {
        const dossier = dossiers[i % dossiers.length]
        const statut = STATUTS_T[i % 3]
        await prisma.tache.create({
            data: {
                titre: TACHE_TITRES[i % TACHE_TITRES.length],
                description: i % 2 === 0 ? "Action prioritaire à traiter." : null,
                statut,
                priorite: PRIORITES[i % PRIORITES.length],
                echeance: i % 4 === 0 ? null : daysFromNow(i % 14),
                responsableId: dossier.responsableId,
                clientId: dossier.clientId,
                dossierId: dossier.id,
                completedAt: statut === "FAIT" ? daysAgo(i % 7) : null,
            },
        })
    }

    /* ========================================================
       FOURNISSEURS — 4
       ======================================================== */
    console.log("🧾 Création des fournisseurs...")
    const fournisseurDefs = [
        { nom: "Maître HUISSIER Salou", type: "HUISSIER" as const, telephone: "+227 96 11 22 33" },
        { nom: "Cabinet d'Expertise Niamey", type: "EXPERT" as const, telephone: "+227 96 44 55 66" },
        { nom: "Greffe TGI Niamey", type: "GREFFE" as const, telephone: "+227 20 73 30 33" },
        { nom: "Cabinet immobilier Sahel", type: "BAILLEUR" as const, telephone: "+227 96 77 88 99" },
    ]
    const fournisseurs = []
    for (const f of fournisseurDefs) {
        fournisseurs.push(await prisma.fournisseur.create({ data: f }))
    }

    /* ========================================================
       FACTURES — 10 émises + 5 reçues
       ======================================================== */
    console.log("💰 Création des factures...")
    let facCounter = 0
    const numFac = (dir: "EMISE" | "RECUE") => {
        facCounter++
        return `${dir === "EMISE" ? "FAC" : "REC"}-${annee}-${facCounter.toString().padStart(3, "0")}`
    }
    const calcMontants = (HT: number, tva = 19) => ({
        montantHT: HT,
        tvaRate: tva,
        montantTVA: Math.round((HT * tva) / 100),
        montantTTC: HT + Math.round((HT * tva) / 100),
    })

    // 10 émises
    for (let i = 0; i < 10; i++) {
        const dossier = dossiers[i % dossiers.length]
        const HT = 250_000 + i * 50_000
        const m = calcMontants(HT)
        const dateEmise = daysAgo(60 - i * 4)
        const statutBrut: "EMISE" | "PARTIELLE" | "PAYEE" = i < 3 ? "PAYEE" : i < 6 ? "PARTIELLE" : "EMISE"
        const montantPaye = statutBrut === "PAYEE" ? m.montantTTC : statutBrut === "PARTIELLE" ? Math.round(m.montantTTC * 0.5) : 0
        const f = await prisma.facture.create({
            data: {
                numero: numFac("EMISE"),
                direction: "EMISE",
                date: dateEmise,
                dateEcheance: daysFromNow(30 - i * 3),
                clientId: dossier.clientId,
                dossierId: dossier.id,
                description: `Honoraires sur dossier ${dossier.numero}`,
                ...m,
                montantPaye,
                statut: statutBrut,
            },
        })
        // Ligne
        await prisma.factureLigne.create({
            data: {
                factureId: f.id,
                libelle: "Honoraires forfaitaires",
                quantite: 1.0,
                prixUnitaire: HT,
                total: HT,
            },
        })
        // Paiement si payé
        if (montantPaye > 0) {
            await prisma.paiement.create({
                data: {
                    factureId: f.id,
                    date: daysAgo(20 - i * 2),
                    montant: montantPaye,
                    mode: "VIREMENT",
                    reference: `VIR-${i + 1000}`,
                },
            })
        }
    }

    // 5 reçues
    for (let i = 0; i < 5; i++) {
        const dossier = dossiers[i % dossiers.length]
        const fournisseur = fournisseurs[i % fournisseurs.length]
        const HT = 80_000 + i * 20_000
        const m = calcMontants(HT, 0) // huissier = 0% TVA souvent
        await prisma.facture.create({
            data: {
                numero: numFac("RECUE"),
                direction: "RECUE",
                date: daysAgo(45 - i * 6),
                dossierId: dossier.id,
                fournisseurId: fournisseur.id,
                description: `Frais ${fournisseur.type}`,
                ...m,
                montantPaye: m.montantTTC,
                statut: "PAYEE",
            },
        })
    }

    /* ========================================================
       DÉPENSES INTERNES — 8
       ======================================================== */
    console.log("📊 Création des dépenses...")
    const depenseDefs: Array<{
        libelle: string
        categorie:
            | "LOYER" | "ELECTRICITE" | "INTERNET" | "ABONNEMENT_SOFTWARE"
            | "FOURNITURES" | "CARBURANT" | "FORMATION" | "ASSURANCE"
        montantHT: number
        tvaRate: number
        recurrent: boolean
    }> = [
        { libelle: "Loyer cabinet Niamey", categorie: "LOYER", montantHT: 600_000, tvaRate: 0, recurrent: true },
        { libelle: "Facture NIGELEC", categorie: "ELECTRICITE", montantHT: 85_000, tvaRate: 19, recurrent: true },
        { libelle: "Abonnement Internet ORANGE PRO", categorie: "INTERNET", montantHT: 75_000, tvaRate: 19, recurrent: true },
        { libelle: "Microsoft 365 (5 sièges)", categorie: "ABONNEMENT_SOFTWARE", montantHT: 60_000, tvaRate: 19, recurrent: true },
        { libelle: "Fournitures bureau Q2", categorie: "FOURNITURES", montantHT: 45_000, tvaRate: 19, recurrent: false },
        { libelle: "Carburant véhicule de service", categorie: "CARBURANT", montantHT: 120_000, tvaRate: 19, recurrent: false },
        { libelle: "Formation OHADA Cotonou", categorie: "FORMATION", montantHT: 350_000, tvaRate: 0, recurrent: false },
        { libelle: "Assurance RC professionnelle", categorie: "ASSURANCE", montantHT: 240_000, tvaRate: 0, recurrent: true },
    ]
    for (let i = 0; i < depenseDefs.length; i++) {
        const d = depenseDefs[i]
        const tva = Math.round((d.montantHT * d.tvaRate) / 100)
        await prisma.depense.create({
            data: {
                libelle: d.libelle,
                categorie: d.categorie,
                date: daysAgo(i * 7),
                montantHT: d.montantHT,
                tvaRate: d.tvaRate,
                montantTVA: tva,
                montantTTC: d.montantHT + tva,
                mode: "VIREMENT",
                recurrent: d.recurrent,
                recurrenceFrequence: d.recurrent ? "MENSUEL" : null,
                statut: "PAYEE",
            },
        })
    }

    /* ========================================================
       BULLETINS — 5 (mois courant pour les 5 salariés)
       ======================================================== */
    console.log("📑 Création des bulletins de paie...")
    const TAUX_CNSS_SALARIE = 5.25
    const TAUX_CNSS_EMPLOYEUR = 16.5
    const now = new Date()
    const annee2 = now.getFullYear()
    const mois2 = now.getMonth() + 1

    const salaries = membres.filter((m) => m.statutContrat !== "ASSOCIE" && m.salaireBaseBrut > 0)
    for (const m of salaries) {
        const brut = m.salaireBaseBrut
        const primes = 0
        const retenues = 0
        const chargesSal = Math.round((brut * TAUX_CNSS_SALARIE) / 100)
        const chargesPat = Math.round((brut * TAUX_CNSS_EMPLOYEUR) / 100)
        const net = brut + primes - retenues - chargesSal
        const coutTotal = brut + primes + chargesPat
        await prisma.bulletin.create({
            data: {
                employeId: m.id,
                annee: annee2,
                mois: mois2,
                salaireBrut: brut,
                primes,
                retenues,
                chargesSalariales: chargesSal,
                chargesPatronales: chargesPat,
                salaireNet: net,
                coutTotalEmployeur: coutTotal,
                statut: "BROUILLON",
                modeVersement: m.modeVersementParDefaut,
                lignes: {
                    create: [
                        { libelle: "Salaire de base", type: "GAIN", montant: brut },
                        { libelle: "CNSS salariale", type: "CHARGE_SALARIALE", montant: chargesSal },
                        { libelle: "CNSS patronale", type: "CHARGE_PATRONALE", montant: chargesPat },
                    ],
                },
            },
        })
    }

    /* ========================================================
       DOCUMENTS — 20
       ======================================================== */
    console.log("📚 Création des documents bibliothèque...")
    const DOC_DEFS: Array<{
        titre: string
        categorie: "JURISPRUDENCE" | "DOCTRINE" | "MODELE" | "INTERNE"
        domaineJuridique: "AFFAIRES" | "SOCIAL" | "ADMINISTRATIF" | "OHADA" | "FISCAL"
        type?: "ARRET" | "JUGEMENT" | "OUVRAGE" | "CONTRAT" | "ARTICLE"
        reference?: string
        tags: string[]
    }> = [
        { titre: "CCJA 12 mai 2024 — Société X c/ Banque Y", categorie: "JURISPRUDENCE", domaineJuridique: "OHADA", type: "ARRET", reference: "CCJA-2024-127", tags: ["OHADA", "Recouvrement", "Saisie"] },
        { titre: "TGI Niamey 3 mars 2025 — Affaire emplois fictifs", categorie: "JURISPRUDENCE", domaineJuridique: "ADMINISTRATIF", type: "JUGEMENT", reference: "TGI-NIAM-2025-456", tags: ["Pénal", "Administration"] },
        { titre: "AUSC&GIE — Édition annotée 2024", categorie: "DOCTRINE", domaineJuridique: "AFFAIRES", type: "OUVRAGE", tags: ["OHADA", "Sociétés"] },
        { titre: "Modèle Contrat de bail commercial Niger", categorie: "MODELE", domaineJuridique: "AFFAIRES", type: "CONTRAT", tags: ["Bail", "Commercial"] },
        { titre: "Modèle Mise en demeure recouvrement", categorie: "MODELE", domaineJuridique: "AFFAIRES", type: "CONTRAT", tags: ["Recouvrement"] },
        { titre: "Code du Travail Nigérien 2012 + modifications", categorie: "DOCTRINE", domaineJuridique: "SOCIAL", type: "OUVRAGE", tags: ["Code", "Travail"] },
        { titre: "Note interne — Procédure recouvrement amiable", categorie: "INTERNE", domaineJuridique: "AFFAIRES", tags: ["Procédure", "Cabinet"] },
        { titre: "CCJA 18 oct 2023 — sûretés mobilières", categorie: "JURISPRUDENCE", domaineJuridique: "OHADA", type: "ARRET", reference: "CCJA-2023-298", tags: ["Sûretés", "OHADA"] },
        { titre: "Loi de Finances Niger 2026", categorie: "DOCTRINE", domaineJuridique: "FISCAL", type: "OUVRAGE", reference: "Loi 2025-XX", tags: ["Fiscalité"] },
        { titre: "Modèle Statuts SARL OHADA", categorie: "MODELE", domaineJuridique: "AFFAIRES", type: "CONTRAT", tags: ["SARL", "OHADA"] },
        { titre: "Cour d'Appel Niamey — Audience sociale type", categorie: "JURISPRUDENCE", domaineJuridique: "SOCIAL", type: "ARRET", tags: ["Travail"] },
        { titre: "Décret n°2023-456 sur l'investissement", categorie: "DOCTRINE", domaineJuridique: "ADMINISTRATIF", type: "OUVRAGE", reference: "Décret 2023-456", tags: ["Investissement"] },
        { titre: "Modèle Conclusions en défense", categorie: "MODELE", domaineJuridique: "AUTRE" as never, type: "CONTRAT", tags: ["Procédure"] },
        { titre: "Article — La preuve dans le droit OHADA", categorie: "DOCTRINE", domaineJuridique: "OHADA", type: "ARTICLE", tags: ["Preuve"] },
        { titre: "Note client — Risques fiscaux 2026", categorie: "INTERNE", domaineJuridique: "FISCAL", tags: ["Note"] },
        { titre: "CCJA — Reconnaissance d'arbitrage international", categorie: "JURISPRUDENCE", domaineJuridique: "OHADA", type: "ARRET", reference: "CCJA-2024-301", tags: ["Arbitrage"] },
        { titre: "Modèle Compromis de vente", categorie: "MODELE", domaineJuridique: "AFFAIRES", type: "CONTRAT", tags: ["Vente"] },
        { titre: "Modèle Procès-verbal AGO", categorie: "MODELE", domaineJuridique: "AFFAIRES", type: "CONTRAT", tags: ["Sociétés", "AGO"] },
        { titre: "Convention collective interprofessionnelle Niger", categorie: "DOCTRINE", domaineJuridique: "SOCIAL", type: "OUVRAGE", tags: ["Convention"] },
        { titre: "Charte du cabinet — Confidentialité", categorie: "INTERNE", domaineJuridique: "AUTRE" as never, tags: ["Charte", "Cabinet"] },
    ]
    for (const d of DOC_DEFS) {
        await prisma.document.create({
            data: {
                titre: d.titre,
                categorie: d.categorie,
                domaineJuridique: d.domaineJuridique === ("AUTRE" as never) ? "AUTRE" : d.domaineJuridique,
                type: d.type ?? null,
                reference: d.reference,
                dateDocument: daysAgo(Math.floor(Math.random() * 365)),
                tags: d.tags,
                estFavori: Math.random() > 0.7,
                statut: "ACTIF",
            },
        })
    }

    /* ========================================================
       Récap + codes d'accès en clair
       ======================================================== */
    const counts = {
        membres: await prisma.membre.count(),
        clients: await prisma.client.count(),
        dossiers: await prisma.dossier.count(),
        audiences: await prisma.audience.count(),
        taches: await prisma.tache.count(),
        factures: await prisma.facture.count(),
        depenses: await prisma.depense.count(),
        bulletins: await prisma.bulletin.count(),
        documents: await prisma.document.count(),
    }

    console.log("\n🎉 Seed terminé avec succès !\n")
    console.log("📊 Récapitulatif :")
    Object.entries(counts).forEach(([k, v]) => console.log(`   ${k.padEnd(12)} : ${v}`))

    console.log("\n🔑 Codes d'accès en clair (à copier dans un gestionnaire de mots de passe) :")
    console.log("   ⚠️  Ces codes ne seront PLUS jamais affichés. Si tu les perds, régénérer via /api/membres/[id]/regenerate-code (Sprint 3).\n")
    for (const [email, code] of Object.entries(codesAcces)) {
        console.log(`   ${email.padEnd(35)} → ${code}`)
    }
    console.log("\n   Tester la connexion : POST /api/auth/login { email, codeAcces }\n")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
