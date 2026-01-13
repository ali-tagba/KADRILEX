import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await prisma.invoice.deleteMany()
    await prisma.flashCR.deleteMany()
    await prisma.dossierFile.deleteMany()
    await prisma.audience.deleteMany()
    await prisma.dossier.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()

    // Create default user (lawyer)
    const user = await prisma.user.create({
        data: {
            email: 'maitre.konan@dedalys.ci',
            name: 'Maître Konan',
            role: 'AVOCAT',
        },
    })

    console.log('✅ Created user:', user.name)

    // ========================================
    // CLIENTS (8 total: 4 companies + 4 individuals)
    // ========================================

    // PERSONNE_MORALE #1 - SOTRA
    const client1 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Société des Transports Abidjanais (SOTRA)',
            formeJuridique: 'SA',
            numeroRCCM: 'CI-ABJ-2015-B-12345',
            representantLegal: 'M. Kouassi Jean-Baptiste',
            email: 'contact@sotra.ci',
            telephone: '+225 27 20 30 40 50',
            adresse: 'Boulevard de la République, Plateau',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
            contacts: {
                create: [
                    {
                        nom: 'Kouassi',
                        prenom: 'Jean-Baptiste',
                        fonction: 'DG',
                        email: 'jb.kouassi@sotra.ci',
                        telephone: '+225 07 08 09 10 11',
                    },
                    {
                        nom: 'Diabaté',
                        prenom: 'Fatou',
                        fonction: 'RESPONSABLE_JURIDIQUE',
                        email: 'f.diabate@sotra.ci',
                        telephone: '+225 05 04 03 02 01',
                    },
                ],
            },
        },
    })

    // PERSONNE_MORALE #2 - Banque Atlantique
    const client2 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Banque Atlantique Côte d\'Ivoire',
            formeJuridique: 'SA',
            numeroRCCM: 'CI-ABJ-2008-B-45678',
            representantLegal: 'Mme Touré Aminata',
            email: 'contact@atlantiquebank.ci',
            telephone: '+225 27 21 25 30 35',
            adresse: 'Avenue Chardy, Plateau',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
            contacts: {
                create: [
                    {
                        nom: 'Touré',
                        prenom: 'Aminata',
                        fonction: 'DG',
                        email: 'a.toure@atlantiquebank.ci',
                        telephone: '+225 07 77 77 77 77',
                    },
                    {
                        nom: 'Koné',
                        prenom: 'Seydou',
                        fonction: 'DIRECTEUR_JURIDIQUE',
                        email: 's.kone@atlantiquebank.ci',
                        telephone: '+225 05 55 55 55 55',
                    },
                    {
                        nom: 'Bamba',
                        prenom: 'Clarisse',
                        fonction: 'RESPONSABLE_CONTENTIEUX',
                        email: 'c.bamba@atlantiquebank.ci',
                        telephone: '+225 01 23 45 67 89',
                    },
                ],
            },
        },
    })

    // PERSONNE_MORALE #3 - Groupe NSIA
    const client3 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Groupe NSIA Assurances',
            formeJuridique: 'SA',
            numeroRCCM: 'CI-ABJ-2010-B-78901',
            representantLegal: 'M. Yao Kouadio',
            email: 'info@nsia.ci',
            telephone: '+225 27 20 00 20 00',
            adresse: 'Rue du Commerce, Marcory',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
            contacts: {
                create: [
                    {
                        nom: 'Yao',
                        prenom: 'Kouadio',
                        fonction: 'PDG',
                        email: 'k.yao@nsia.ci',
                        telephone: '+225 07 00 00 00 01',
                    },
                    {
                        nom: 'Diallo',
                        prenom: 'Mamadou',
                        fonction: 'DIRECTEUR_JURIDIQUE',
                        email: 'm.diallo@nsia.ci',
                        telephone: '+225 05 00 00 00 02',
                    },
                ],
            },
        },
    })

    // PERSONNE_MORALE #4 - CI-Telecom
    const client4 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'CI-Telecom SARL',
            formeJuridique: 'SARL',
            numeroRCCM: 'CI-ABJ-2018-B-23456',
            representantLegal: 'M. Traoré Ibrahim',
            email: 'contact@ci-telecom.ci',
            telephone: '+225 27 22 33 44 55',
            adresse: 'Zone 4C, Marcory',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
            contacts: {
                create: [
                    {
                        nom: 'Traoré',
                        prenom: 'Ibrahim',
                        fonction: 'GERANT',
                        email: 'i.traore@ci-telecom.ci',
                        telephone: '+225 07 22 33 44 55',
                    },
                ],
            },
        },
    })

    // PERSONNE_PHYSIQUE #1 - Aminata Diallo
    const client5 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Diallo',
            prenom: 'Aminata',
            profession: 'Commerçante',
            email: 'a.diallo@email.ci',
            telephone: '+225 05 06 07 08 09',
            adresse: 'Cocody Riviera Palmeraie',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
        },
    })

    // PERSONNE_PHYSIQUE #2 - Kouadio Yao
    const client6 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Yao',
            prenom: 'Kouadio',
            profession: 'Entrepreneur',
            email: 'k.yao@gmail.com',
            telephone: '+225 07 11 22 33 44',
            adresse: 'Angré 8ème Tranche',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
        },
    })

    // PERSONNE_PHYSIQUE #3 - Marie-Claire Bamba
    const client7 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Bamba',
            prenom: 'Marie-Claire',
            profession: 'Propriétaire immobilier',
            email: 'mc.bamba@yahoo.fr',
            telephone: '+225 01 44 55 66 77',
            adresse: 'II Plateaux Vallon',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
        },
    })

    // PERSONNE_PHYSIQUE #4 - Ibrahim Traoré
    const client8 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Traoré',
            prenom: 'Ibrahim',
            profession: 'Cadre bancaire',
            email: 'i.traore@outlook.com',
            telephone: '+225 05 88 99 00 11',
            adresse: 'Cocody Danga',
            ville: 'Abidjan',
            pays: 'Côte d\'Ivoire',
        },
    })

    console.log('✅ Created 8 clients (4 companies, 4 individuals)')

    // ========================================
    // DOSSIERS (18 total)
    // ========================================

    // Client 1 (SOTRA) - 3 dossiers
    const dossier1 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-001',
            clientId: client1.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Litige commercial concernant un contrat de fourniture de pièces détachées',
            dateOuverture: new Date('2024-01-15'),
        },
    })

    const dossier2 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-087',
            clientId: client1.id,
            type: 'ADMINISTRATIF',
            statut: 'TERMINE',
            juridiction: 'Tribunal Administratif d\'Abidjan',
            description: 'Recours contre une décision administrative relative aux licences de transport',
            dateOuverture: new Date('2023-06-10'),
            dateCloture: new Date('2024-11-20'),
        },
    })

    const dossier3 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-045',
            clientId: client1.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Contentieux avec un fournisseur de carburant',
            dateOuverture: new Date('2024-08-22'),
        },
    })

    // Client 2 (Banque Atlantique) - 4 dossiers
    const dossier4 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-012',
            clientId: client2.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Recouvrement de créances bancaires - Dossier SARL IMPORT-EXPORT',
            dateOuverture: new Date('2024-02-05'),
        },
    })

    const dossier5 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-156',
            clientId: client2.id,
            type: 'COMMERCIAL',
            statut: 'TERMINE',
            juridiction: 'Cour d\'Appel d\'Abidjan',
            description: 'Appel suite à jugement défavorable - Affaire crédit immobilier',
            dateOuverture: new Date('2023-09-12'),
            dateCloture: new Date('2024-12-18'),
        },
    })

    const dossier6 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-078',
            clientId: client2.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Litige contractuel avec un prestataire informatique',
            dateOuverture: new Date('2024-10-03'),
        },
    })

    const dossier7 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-089',
            clientId: client2.id,
            type: 'COMMERCIAL',
            statut: 'EN_ATTENTE',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Contestation de garantie bancaire',
            dateOuverture: new Date('2024-11-15'),
        },
    })

    // Client 3 (NSIA) - 3 dossiers
    const dossier8 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-034',
            clientId: client3.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Refus de prise en charge - Sinistre automobile',
            dateOuverture: new Date('2024-05-20'),
        },
    })

    const dossier9 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-198',
            clientId: client3.id,
            type: 'COMMERCIAL',
            statut: 'CLOSTURE',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Litige assurantiel - Incendie commercial (classé sans suite)',
            dateOuverture: new Date('2023-11-08'),
            dateCloture: new Date('2024-03-15'),
        },
    })

    const dossier10 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-067',
            clientId: client3.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Cour d\'Appel d\'Abidjan',
            description: 'Appel - Contestation d\'exclusion de garantie',
            dateOuverture: new Date('2024-09-10'),
        },
    })

    // Client 4 (CI-Telecom) - 2 dossiers
    const dossier11 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-056',
            clientId: client4.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Litige avec un concurrent - Concurrence déloyale',
            dateOuverture: new Date('2024-07-18'),
        },
    })

    const dossier12 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-091',
            clientId: client4.id,
            type: 'COMMERCIAL',
            statut: 'EN_ATTENTE',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Contentieux contractuel - Rupture abusive de contrat fournisseur',
            dateOuverture: new Date('2024-11-28'),
        },
    })

    // Client 5 (Aminata Diallo) - 2 dossiers
    const dossier13 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-023',
            clientId: client5.id,
            type: 'CIVIL',
            statut: 'EN_COURS',
            juridiction: 'TPI Plateau',
            description: 'Affaire de succession - Partage de biens immobiliers',
            dateOuverture: new Date('2024-03-12'),
        },
    })

    const dossier14 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-145',
            clientId: client5.id,
            type: 'CIVIL',
            statut: 'TERMINE',
            juridiction: 'TPI Plateau',
            description: 'Divorce contentieux',
            dateOuverture: new Date('2023-08-05'),
            dateCloture: new Date('2024-10-22'),
        },
    })

    // Client 6 (Kouadio Yao) - 1 dossier
    const dossier15 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-072',
            clientId: client6.id,
            type: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            description: 'Litige commercial - Non-paiement de marchandises',
            dateOuverture: new Date('2024-09-25'),
        },
    })

    // Client 7 (Marie-Claire Bamba) - 2 dossiers
    const dossier16 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-041',
            clientId: client7.id,
            type: 'CIVIL',
            statut: 'EN_COURS',
            juridiction: 'TPI Cocody',
            description: 'Expulsion de locataires indélicats',
            dateOuverture: new Date('2024-06-14'),
        },
    })

    const dossier17 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-083',
            clientId: client7.id,
            type: 'CIVIL',
            statut: 'EN_ATTENTE',
            juridiction: 'TPI Cocody',
            description: 'Litige de voisinage - Empiètement de construction',
            dateOuverture: new Date('2024-10-30'),
        },
    })

    // Client 8 (Ibrahim Traoré) - 1 dossier
    const dossier18 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-167',
            clientId: client8.id,
            type: 'PENAL',
            statut: 'TERMINE',
            juridiction: 'Tribunal Correctionnel d\'Abidjan',
            description: 'Défense - Accusation d\'abus de confiance (acquittement)',
            dateOuverture: new Date('2023-10-02'),
            dateCloture: new Date('2024-09-18'),
        },
    })

    console.log('✅ Created 18 dossiers')

    // ========================================
    // DOSSIER FILES (100+ files/folders)
    // ========================================

    console.log('📁 Creating file hierarchies...')

    // Helper function to create file structure
    async function createFileStructure(dossierId: string, dossierNumero: string) {
        // Root folders
        const pieces = await prisma.dossierFile.create({
            data: {
                dossierId,
                name: 'Pièces',
                type: 'FOLDER',
            },
        })

        const correspondances = await prisma.dossierFile.create({
            data: {
                dossierId,
                name: 'Correspondances',
                type: 'FOLDER',
            },
        })

        const procedures = await prisma.dossierFile.create({
            data: {
                dossierId,
                name: 'Procédures',
                type: 'FOLDER',
            },
        })

        const decisions = await prisma.dossierFile.create({
            data: {
                dossierId,
                name: 'Décisions',
                type: 'FOLDER',
            },
        })

        // Subfolders in Pièces
        const contrats = await prisma.dossierFile.create({
            data: {
                dossierId,
                parentId: pieces.id,
                name: 'Contrats',
                type: 'FOLDER',
            },
        })

        const factures = await prisma.dossierFile.create({
            data: {
                dossierId,
                parentId: pieces.id,
                name: 'Factures',
                type: 'FOLDER',
            },
        })

        const justificatifs = await prisma.dossierFile.create({
            data: {
                dossierId,
                parentId: pieces.id,
                name: 'Justificatifs',
                type: 'FOLDER',
            },
        })

        // Files in Contrats
        await prisma.dossierFile.createMany({
            data: [
                {
                    dossierId,
                    parentId: contrats.id,
                    name: 'Contrat_principal.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/contrat_principal.pdf`,
                    mimeType: 'application/pdf',
                    size: 245678,
                },
                {
                    dossierId,
                    parentId: contrats.id,
                    name: 'Avenant_01.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/avenant_01.pdf`,
                    mimeType: 'application/pdf',
                    size: 89234,
                },
            ],
        })

        // Files in Factures
        await prisma.dossierFile.createMany({
            data: [
                {
                    dossierId,
                    parentId: factures.id,
                    name: 'Facture_001.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/facture_001.pdf`,
                    mimeType: 'application/pdf',
                    size: 125890,
                },
                {
                    dossierId,
                    parentId: factures.id,
                    name: 'Facture_002.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/facture_002.pdf`,
                    mimeType: 'application/pdf',
                    size: 134567,
                },
                {
                    dossierId,
                    parentId: factures.id,
                    name: 'Bon_de_commande.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/bon_commande.pdf`,
                    mimeType: 'application/pdf',
                    size: 98765,
                },
            ],
        })

        // Files in Justificatifs
        await prisma.dossierFile.createMany({
            data: [
                {
                    dossierId,
                    parentId: justificatifs.id,
                    name: 'Attestation_RCCM.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/rccm.pdf`,
                    mimeType: 'application/pdf',
                    size: 156789,
                },
                {
                    dossierId,
                    parentId: justificatifs.id,
                    name: 'Piece_identite.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/piece_id.pdf`,
                    mimeType: 'application/pdf',
                    size: 234567,
                },
            ],
        })

        // Files in Correspondances
        await prisma.dossierFile.createMany({
            data: [
                {
                    dossierId,
                    parentId: correspondances.id,
                    name: 'Mise_en_demeure.docx',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/mise_en_demeure.docx`,
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    size: 45678,
                },
                {
                    dossierId,
                    parentId: correspondances.id,
                    name: 'Reponse_adverse.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/reponse_adverse.pdf`,
                    mimeType: 'application/pdf',
                    size: 178234,
                },
            ],
        })

        // Files in Procédures
        await prisma.dossierFile.createMany({
            data: [
                {
                    dossierId,
                    parentId: procedures.id,
                    name: 'Assignation.pdf',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/assignation.pdf`,
                    mimeType: 'application/pdf',
                    size: 289456,
                },
                {
                    dossierId,
                    parentId: procedures.id,
                    name: 'Conclusions.docx',
                    type: 'FILE',
                    url: `/uploads/${dossierNumero}/conclusions.docx`,
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    size: 67890,
                },
            ],
        })

        // Files in Décisions (if applicable)
        await prisma.dossierFile.create({
            data: {
                dossierId,
                parentId: decisions.id,
                name: 'Ordonnance_refere.pdf',
                type: 'FILE',
                url: `/uploads/${dossierNumero}/ordonnance.pdf`,
                mimeType: 'application/pdf',
                size: 345678,
            },
        })
    }

    // Create file structures for first 6 dossiers (to keep seed time reasonable)
    await createFileStructure(dossier1.id, dossier1.numero)
    await createFileStructure(dossier2.id, dossier2.numero)
    await createFileStructure(dossier3.id, dossier3.numero)
    await createFileStructure(dossier4.id, dossier4.numero)
    await createFileStructure(dossier5.id, dossier5.numero)
    await createFileStructure(dossier6.id, dossier6.numero)

    console.log('✅ Created 100+ files and folders')

    // ========================================
    // AUDIENCES (25 total: 10 past, 15 future)
    // ========================================

    const now = new Date()
    const dayMs = 86400000

    // PAST AUDIENCES (10)
    const pastAudience1 = await prisma.audience.create({
        data: {
            titre: 'Plaidoirie sur le fond',
            date: new Date(now.getTime() - 45 * dayMs),
            heure: '09:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client1.id,
            dossierId: dossier1.id,
            statut: 'TERMINEE',
            notes: 'Audience favorable. Juge a demandé des pièces complémentaires.',
        },
    })

    const pastAudience2 = await prisma.audience.create({
        data: {
            titre: 'Audience de référé',
            date: new Date(now.getTime() - 30 * dayMs),
            heure: '14:30',
            juridiction: 'TPI Plateau',
            avocat: user.name,
            clientId: client5.id,
            dossierId: dossier13.id,
            statut: 'TERMINEE',
            notes: 'Référé accordé. Mesures conservatoires prononcées.',
        },
    })

    const pastAudience3 = await prisma.audience.create({
        data: {
            titre: 'Mise en état',
            date: new Date(now.getTime() - 25 * dayMs),
            heure: '10:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client2.id,
            dossierId: dossier4.id,
            statut: 'TERMINEE',
        },
    })

    const pastAudience4 = await prisma.audience.create({
        data: {
            titre: 'Plaidoirie finale',
            date: new Date(now.getTime() - 20 * dayMs),
            heure: '09:30',
            juridiction: 'Cour d\'Appel d\'Abidjan',
            avocat: user.name,
            clientId: client2.id,
            dossierId: dossier5.id,
            statut: 'TERMINEE',
            notes: 'Plaidoirie effectuée. Mise en délibéré au 15 mars.',
        },
    })

    const pastAudience5 = await prisma.audience.create({
        data: {
            titre: 'Audience de conciliation',
            date: new Date(now.getTime() - 18 * dayMs),
            heure: '15:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client3.id,
            dossierId: dossier8.id,
            statut: 'REPORTEE',
            notes: 'Partie adverse absente. Renvoi au 20 février.',
        },
    })

    const pastAudience6 = await prisma.audience.create({
        data: {
            titre: 'Comparution volontaire',
            date: new Date(now.getTime() - 12 * dayMs),
            heure: '11:00',
            juridiction: 'TPI Cocody',
            avocat: user.name,
            clientId: client7.id,
            dossierId: dossier16.id,
            statut: 'TERMINEE',
        },
    })

    const pastAudience7 = await prisma.audience.create({
        data: {
            titre: 'Audience de plaidoirie',
            date: new Date(now.getTime() - 8 * dayMs),
            heure: '14:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client4.id,
            dossierId: dossier11.id,
            statut: 'TERMINEE',
            notes: 'Excellente audience. Juge semble favorable à notre position.',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Référé provision',
            date: new Date(now.getTime() - 5 * dayMs),
            heure: '09:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client6.id,
            dossierId: dossier15.id,
            statut: 'TERMINEE',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Enquête contradictoire',
            date: new Date(now.getTime() - 3 * dayMs),
            heure: '10:00',
            juridiction: 'Cour d\'Appel d\'Abidjan',
            avocat: user.name,
            clientId: client3.id,
            dossierId: dossier10.id,
            statut: 'ANNULEE',
            notes: 'Annulée à la demande du juge. Reprogrammation en cours.',
        },
    })

    const pastAudience10 = await prisma.audience.create({
        data: {
            titre: 'Audience de jugement',
            date: new Date(now.getTime() - 1 * dayMs),
            heure: '15:30',
            juridiction: 'TPI Plateau',
            avocat: user.name,
            clientId: client5.id,
            dossierId: dossier14.id,
            statut: 'TERMINEE',
            notes: 'Jugement rendu séance tenante. Favorable au client.',
        },
    })

    // FUTURE AUDIENCES (15)
    await prisma.audience.create({
        data: {
            titre: 'Plaidoirie sur le fond',
            date: new Date(now.getTime() + 2 * dayMs),
            heure: '14:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client1.id,
            dossierId: dossier1.id,
            statut: 'A_VENIR',
            notes: 'URGENT - Préparer le dossier complet avec toutes les pièces',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Mise en état',
            date: new Date(now.getTime() + 5 * dayMs),
            heure: '09:00',
            juridiction: 'TPI Plateau',
            avocat: user.name,
            clientId: client5.id,
            dossierId: dossier13.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Référé provision',
            date: new Date(now.getTime() + 7 * dayMs),
            heure: '10:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client6.id,
            dossierId: dossier15.id,
            statut: 'A_VENIR',
            notes: 'Préparer requête en référé',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Audience de conciliation',
            date: new Date(now.getTime() + 10 * dayMs),
            heure: '14:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client2.id,
            dossierId: dossier4.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Plaidoirie',
            date: new Date(now.getTime() + 12 * dayMs),
            heure: '09:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client3.id,
            dossierId: dossier8.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Comparution',
            date: new Date(now.getTime() + 15 * dayMs),
            heure: '11:00',
            juridiction: 'TPI Cocody',
            avocat: user.name,
            clientId: client7.id,
            dossierId: dossier16.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Audience de plaidoirie',
            date: new Date(now.getTime() + 18 * dayMs),
            heure: '15:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client4.id,
            dossierId: dossier11.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Enquête',
            date: new Date(now.getTime() + 21 * dayMs),
            heure: '10:00',
            juridiction: 'Cour d\'Appel d\'Abidjan',
            avocat: user.name,
            clientId: client3.id,
            dossierId: dossier10.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Mise en état',
            date: new Date(now.getTime() + 25 * dayMs),
            heure: '09:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client1.id,
            dossierId: dossier3.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Audience de jugement',
            date: new Date(now.getTime() + 30 * dayMs),
            heure: '14:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client2.id,
            dossierId: dossier6.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Plaidoirie finale',
            date: new Date(now.getTime() + 35 * dayMs),
            heure: '09:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client4.id,
            dossierId: dossier11.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Référé',
            date: new Date(now.getTime() + 42 * dayMs),
            heure: '11:00',
            juridiction: 'TPI Cocody',
            avocat: user.name,
            clientId: client7.id,
            dossierId: dossier16.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Audience de conciliation',
            date: new Date(now.getTime() + 50 * dayMs),
            heure: '10:30',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client3.id,
            dossierId: dossier8.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Plaidoirie',
            date: new Date(now.getTime() + 60 * dayMs),
            heure: '14:00',
            juridiction: 'Tribunal de Commerce d\'Abidjan',
            avocat: user.name,
            clientId: client2.id,
            dossierId: dossier4.id,
            statut: 'A_VENIR',
        },
    })

    await prisma.audience.create({
        data: {
            titre: 'Audience de jugement',
            date: new Date(now.getTime() + 75 * dayMs),
            heure: '09:00',
            juridiction: 'Cour d\'Appel d\'Abidjan',
            avocat: user.name,
            clientId: client3.id,
            dossierId: dossier10.id,
            statut: 'A_VENIR',
        },
    })

    console.log('✅ Created 25 audiences (10 past, 15 future)')

    // ========================================
    // FLASH CR (8 reports)
    // ========================================

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience1.id,
            clientId: client1.id,
            dossierId: dossier1.id,
            contenu: `**Audience du ${pastAudience1.date.toLocaleDateString('fr-FR')}**\n\nL'audience s'est déroulée devant le Tribunal de Commerce d'Abidjan.\n\n**Déroulement:**\n- Plaidoirie effectuée sur le fond du dossier\n- Le juge a écouté attentivement nos arguments\n- Partie adverse a présenté ses conclusions\n\n**Décision:**\nLe juge a demandé la communication de pièces complémentaires (factures et bons de commande). Renvoi au 15 mars pour suite de la procédure.\n\n**Prochaines étapes:**\n- Rassembler les pièces demandées\n- Déposer un mémoire complémentaire avant le 1er mars`,
            destinataires: JSON.stringify(['jb.kouassi@sotra.ci', 'f.diabate@sotra.ci']),
            statut: 'ENVOYE',
        },
    })

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience2.id,
            clientId: client5.id,
            dossierId: dossier13.id,
            contenu: `**Audience de référé - ${pastAudience2.date.toLocaleDateString('fr-FR')}**\n\n**Résultat:** FAVORABLE\n\nLe juge des référés a prononcé des mesures conservatoires en notre faveur.\n\n**Mesures accordées:**\n- Gel des biens immobiliers en litige\n- Interdiction de vente jusqu'au jugement au fond\n\n**Observations:**\nExcellente audience. Le juge a reconnu l'urgence et le bien-fondé de notre demande.`,
            destinataires: JSON.stringify(['a.diallo@email.ci']),
            statut: 'ENVOYE',
        },
    })

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience3.id,
            clientId: client2.id,
            dossierId: dossier4.id,
            contenu: `**Mise en état - ${pastAudience3.date.toLocaleDateString('fr-FR')}**\n\nAudience de mise en état devant le Tribunal de Commerce.\n\nLe juge a fixé le calendrier de procédure:\n- Échange de conclusions: avant le 20 février\n- Audience de plaidoirie: 15 mars\n\nRAS - Procédure suit son cours normal.`,
            destinataires: JSON.stringify(['a.toure@atlantiquebank.ci', 's.kone@atlantiquebank.ci']),
            statut: 'BROUILLON',
        },
    })

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience4.id,
            clientId: client2.id,
            dossierId: dossier5.id,
            contenu: `**Plaidoirie finale en appel**\n\nDate: ${pastAudience4.date.toLocaleDateString('fr-FR')}\nJuridiction: Cour d'Appel d'Abidjan\n\n**Déroulement:**\nPlaidoirie effectuée devant la Cour. Nos arguments ont été bien reçus.\n\n**Décision:**\nAffaire mise en délibéré. Jugement attendu pour le 15 mars.\n\n**Pronostic:** Favorable. La Cour semble sensible à nos arguments.`,
            destinataires: JSON.stringify(['a.toure@atlantiquebank.ci', 'c.bamba@atlantiquebank.ci']),
            statut: 'ENVOYE',
        },
    })

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience10.id,
            clientId: client5.id,
            dossierId: dossier14.id,
            contenu: `**JUGEMENT RENDU - ${pastAudience10.date.toLocaleDateString('fr-FR')}**\n\n✅ **VICTOIRE TOTALE**\n\nLe tribunal a rendu son jugement séance tenante.\n\n**Décision:**\n- Divorce prononcé aux torts exclusifs de l'époux\n- Garde des enfants accordée à notre cliente\n- Pension alimentaire fixée à 150.000 FCFA/mois\n- Partage des biens selon nos demandes\n\n**Félicitations!** Excellent résultat conforme à nos attentes.`,
            destinataires: JSON.stringify(['a.diallo@email.ci']),
            statut: 'ENVOYE',
        },
    })

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience6.id,
            clientId: client7.id,
            dossierId: dossier16.id,
            contenu: `**Comparution volontaire - ${pastAudience6.date.toLocaleDateString('fr-FR')}**\n\nAudience devant le TPI de Cocody.\n\n**Objet:** Expulsion de locataires\n\n**Déroulement:**\nLes deux parties étaient présentes. Discussions constructives.\n\n**Résultat:**\nUn accord amiable a été trouvé. Les locataires s'engagent à libérer les lieux sous 30 jours.`,
            destinataires: JSON.stringify(['mc.bamba@yahoo.fr']),
            statut: 'ENVOYE',
        },
    })

    await prisma.flashCR.create({
        data: {
            audienceId: pastAudience7.id,
            clientId: client4.id,
            dossierId: dossier11.id,
            contenu: `**Plaidoirie - Concurrence déloyale**\n\nDate: ${pastAudience7.date.toLocaleDateString('fr-FR')}\n\n**Impression générale:** TRÈS FAVORABLE\n\nLe juge a été très attentif à nos arguments concernant les pratiques déloyales du concurrent.\n\n**Points forts:**\n- Preuves documentaires solides\n- Témoignages convaincants\n- Jurisprudence en notre faveur\n\n**Prochaine étape:** Attente du jugement (délibéré au 20 mars)`,
            destinataires: JSON.stringify(['i.traore@ci-telecom.ci']),
            statut: 'BROUILLON',
        },
    })

    console.log('✅ Created 7 FlashCR reports')

    // ========================================
    // INVOICES (15 total)
    // ========================================

    // Helper function to calculate TTC
    const calculateTTC = (ht: number) => {
        const tva = ht * 0.18
        return { tva, ttc: ht + tva }
    }

    // Client 1 (SOTRA) - 3 invoices
    const inv1 = calculateTTC(2500000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-001',
            date: new Date('2024-01-20'),
            dateEcheance: new Date('2024-02-20'),
            clientId: client1.id,
            dossierId: dossier1.id,
            montantHT: 2500000,
            montantTVA: inv1.tva,
            montantTTC: inv1.ttc,
            montantPaye: inv1.ttc,
            statut: 'PAYEE',
            methodePaiement: 'VIREMENT',
            datePaiement: new Date('2024-02-15'),
        },
    })

    const inv2 = calculateTTC(1800000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-012',
            date: new Date('2024-08-25'),
            dateEcheance: new Date('2024-09-25'),
            clientId: client1.id,
            dossierId: dossier3.id,
            montantHT: 1800000,
            montantTVA: inv2.tva,
            montantTTC: inv2.ttc,
            montantPaye: 0,
            statut: 'IMPAYEE',
        },
    })

    const inv3 = calculateTTC(3200000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2023-089',
            date: new Date('2023-11-10'),
            dateEcheance: new Date('2023-12-10'),
            clientId: client1.id,
            dossierId: dossier2.id,
            montantHT: 3200000,
            montantTVA: inv3.tva,
            montantTTC: inv3.ttc,
            montantPaye: inv3.ttc,
            statut: 'PAYEE',
            methodePaiement: 'CHEQUE',
            datePaiement: new Date('2023-12-05'),
        },
    })

    // Client 2 (Banque Atlantique) - 4 invoices
    const inv4 = calculateTTC(4500000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-003',
            date: new Date('2024-02-10'),
            dateEcheance: new Date('2024-03-10'),
            clientId: client2.id,
            dossierId: dossier4.id,
            montantHT: 4500000,
            montantTVA: inv4.tva,
            montantTTC: inv4.ttc,
            montantPaye: 2000000,
            statut: 'PARTIELLE',
            methodePaiement: 'VIREMENT',
            datePaiement: new Date('2024-03-05'),
        },
    })

    const inv5 = calculateTTC(2800000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-008',
            date: new Date('2024-10-15'),
            dateEcheance: new Date('2024-11-15'),
            clientId: client2.id,
            dossierId: dossier6.id,
            montantHT: 2800000,
            montantTVA: inv5.tva,
            montantTTC: inv5.ttc,
            montantPaye: 0,
            statut: 'IMPAYEE',
        },
    })

    const inv6 = calculateTTC(5200000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2023-145',
            date: new Date('2023-09-20'),
            dateEcheance: new Date('2023-10-20'),
            clientId: client2.id,
            dossierId: dossier5.id,
            montantHT: 5200000,
            montantTVA: inv6.tva,
            montantTTC: inv6.ttc,
            montantPaye: inv6.ttc,
            statut: 'PAYEE',
            methodePaiement: 'VIREMENT',
            datePaiement: new Date('2023-10-18'),
        },
    })

    const inv7 = calculateTTC(1200000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-015',
            date: new Date('2024-11-20'),
            dateEcheance: new Date('2024-12-20'),
            clientId: client2.id,
            dossierId: dossier7.id,
            montantHT: 1200000,
            montantTVA: inv7.tva,
            montantTTC: inv7.ttc,
            montantPaye: 0,
            statut: 'IMPAYEE',
        },
    })

    // Client 3 (NSIA) - 3 invoices
    const inv8 = calculateTTC(3500000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-005',
            date: new Date('2024-05-25'),
            dateEcheance: new Date('2024-06-25'),
            clientId: client3.id,
            dossierId: dossier8.id,
            montantHT: 3500000,
            montantTVA: inv8.tva,
            montantTTC: inv8.ttc,
            montantPaye: inv8.ttc,
            statut: 'PAYEE',
            methodePaiement: 'VIREMENT',
            datePaiement: new Date('2024-06-20'),
        },
    })

    const inv9 = calculateTTC(2100000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-010',
            date: new Date('2024-09-15'),
            dateEcheance: new Date('2024-10-15'),
            clientId: client3.id,
            dossierId: dossier10.id,
            montantHT: 2100000,
            montantTVA: inv9.tva,
            montantTTC: inv9.ttc,
            montantPaye: 1000000,
            statut: 'PARTIELLE',
            methodePaiement: 'VIREMENT',
        },
    })

    const inv10 = calculateTTC(800000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2023-178',
            date: new Date('2023-11-12'),
            dateEcheance: new Date('2023-12-12'),
            clientId: client3.id,
            dossierId: dossier9.id,
            montantHT: 800000,
            montantTVA: inv10.tva,
            montantTTC: inv10.ttc,
            montantPaye: inv10.ttc,
            statut: 'PAYEE',
            methodePaiement: 'CHEQUE',
            datePaiement: new Date('2023-12-08'),
        },
    })

    // Client 4 (CI-Telecom) - 2 invoices
    const inv11 = calculateTTC(1500000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-007',
            date: new Date('2024-07-22'),
            dateEcheance: new Date('2024-08-22'),
            clientId: client4.id,
            dossierId: dossier11.id,
            montantHT: 1500000,
            montantTVA: inv11.tva,
            montantTTC: inv11.ttc,
            montantPaye: 0,
            statut: 'IMPAYEE',
        },
    })

    const inv12 = calculateTTC(900000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-014',
            date: new Date('2024-12-01'),
            dateEcheance: new Date('2025-01-01'),
            clientId: client4.id,
            dossierId: dossier12.id,
            montantHT: 900000,
            montantTVA: inv12.tva,
            montantTTC: inv12.ttc,
            montantPaye: 0,
            statut: 'IMPAYEE',
        },
    })

    // Client 5 (Aminata Diallo) - 2 invoices
    const inv13 = calculateTTC(1200000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-004',
            date: new Date('2024-03-18'),
            dateEcheance: new Date('2024-04-18'),
            clientId: client5.id,
            dossierId: dossier13.id,
            montantHT: 1200000,
            montantTVA: inv13.tva,
            montantTTC: inv13.ttc,
            montantPaye: inv13.ttc,
            statut: 'PAYEE',
            methodePaiement: 'MOBILE_MONEY',
            datePaiement: new Date('2024-04-10'),
        },
    })

    const inv14 = calculateTTC(850000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2023-156',
            date: new Date('2023-08-10'),
            dateEcheance: new Date('2023-09-10'),
            clientId: client5.id,
            dossierId: dossier14.id,
            montantHT: 850000,
            montantTVA: inv14.tva,
            montantTTC: inv14.ttc,
            montantPaye: inv14.ttc,
            statut: 'PAYEE',
            methodePaiement: 'ESPECES',
            datePaiement: new Date('2023-09-05'),
        },
    })

    // Client 6 (Kouadio Yao) - 1 invoice
    const inv15 = calculateTTC(650000)
    await prisma.invoice.create({
        data: {
            numero: 'FA-2024-011',
            date: new Date('2024-09-28'),
            dateEcheance: new Date('2024-10-28'),
            clientId: client6.id,
            dossierId: dossier15.id,
            montantHT: 650000,
            montantTVA: inv15.tva,
            montantTTC: inv15.ttc,
            montantPaye: 0,
            statut: 'IMPAYEE',
        },
    })

    console.log('✅ Created 15 invoices')

    console.log('🎉 Seeding complete!')
    console.log('\n📊 Summary:')
    console.log('  - 1 user')
    console.log('  - 8 clients (4 companies, 4 individuals)')
    console.log('  - 18 dossiers')
    console.log('  - 100+ files and folders')
    console.log('  - 25 audiences (10 past, 15 future)')
    console.log('  - 7 FlashCR reports')
    console.log('  - 15 invoices')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
