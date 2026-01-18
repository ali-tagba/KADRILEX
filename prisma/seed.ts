import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database for KadriLex (Niger)...')

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
            email: 'maitre.kadri@kadrilex.ne',
            name: 'Maître Abdoulaye Kadri',
            role: 'AVOCAT',
        },
    })

    console.log('✅ Created user:', user.name)

    // ========================================
    // CLIENTS (8 total: 4 companies + 4 individuals)
    // ========================================

    // PERSONNE_MORALE #1 - SONITEL
    const client1 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Société Nigérienne des Télécommunications (SONITEL)',
            formeJuridique: 'SA',
            numeroRCCM: 'NE-NIA-2015-B-12345',
            siegeSocial: 'Avenue du Président Hamani Diori, Plateau',
            representantLegal: 'M. Amadou Issoufou',
            email: 'contact@sonitel.ne',
            telephone: '+227 20 73 45 67',
            adresse: 'Avenue du Président Hamani Diori, Plateau',
            ville: 'Niamey',
            pays: 'Niger',
            contacts: {
                create: [
                    {
                        nom: 'Issoufou',
                        prenom: 'Amadou',
                        fonction: 'DG',
                        email: 'a.issoufou@sonitel.ne',
                        telephone: '+227 90 12 34 56',
                    },
                    {
                        nom: 'Maïga',
                        prenom: 'Aïssata',
                        fonction: 'RESPONSABLE_JURIDIQUE',
                        email: 'a.maiga@sonitel.ne',
                        telephone: '+227 96 78 90 12',
                    },
                ],
            },
        },
    })

    // PERSONNE_MORALE #2 - Banque Islamique du Niger
    const client2 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Banque Islamique du Niger (BIN)',
            formeJuridique: 'SA',
            numeroRCCM: 'NE-NIA-2010-B-45678',
            siegeSocial: 'Boulevard de la République, Centre-ville',
            representantLegal: 'M. Moussa Hamidou',
            email: 'contact@bin.ne',
            telephone: '+227 20 72 30 40',
            adresse: 'Boulevard de la République, Centre-ville',
            ville: 'Niamey',
            pays: 'Niger',
            contacts: {
                create: [
                    {
                        nom: 'Hamidou',
                        prenom: 'Moussa',
                        fonction: 'DG',
                        email: 'm.hamidou@bin.ne',
                        telephone: '+227 90 23 45 67',
                    },
                    {
                        nom: 'Oumarou',
                        prenom: 'Fati',
                        fonction: 'DIRECTEUR_JURIDIQUE',
                        email: 'f.oumarou@bin.ne',
                        telephone: '+227 96 34 56 78',
                    },
                    {
                        nom: 'Diallo',
                        prenom: 'Mamadou',
                        fonction: 'RESPONSABLE_CONTENTIEUX',
                        email: 'm.diallo@bin.ne',
                        telephone: '+227 97 45 67 89',
                    },
                ],
            },
        },
    })

    // PERSONNE_MORALE #3 - SONICHAR
    const client3 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Société Nigérienne du Charbon (SONICHAR)',
            formeJuridique: 'SA',
            numeroRCCM: 'NE-NIA-2012-B-78901',
            siegeSocial: 'Quartier Yantala, Zone Industrielle',
            representantLegal: 'M. Ibrahim Mahamane',
            email: 'info@sonichar.ne',
            telephone: '+227 20 74 50 60',
            adresse: 'Quartier Yantala, Zone Industrielle',
            ville: 'Niamey',
            pays: 'Niger',
            contacts: {
                create: [
                    {
                        nom: 'Mahamane',
                        prenom: 'Ibrahim',
                        fonction: 'PDG',
                        email: 'i.mahamane@sonichar.ne',
                        telephone: '+227 90 56 78 90',
                    },
                    {
                        nom: 'Boubacar',
                        prenom: 'Halimatou',
                        fonction: 'DIRECTEUR_JURIDIQUE',
                        email: 'h.boubacar@sonichar.ne',
                        telephone: '+227 96 67 89 01',
                    },
                ],
            },
        },
    })

    // PERSONNE_MORALE #4 - Niger Lait
    const client4 = await prisma.client.create({
        data: {
            type: 'PERSONNE_MORALE',
            raisonSociale: 'Niger Lait SARL',
            formeJuridique: 'SARL',
            numeroRCCM: 'NE-NIA-2018-B-23456',
            siegeSocial: 'Quartier Koira Kano, Route de Tillabéri',
            representantLegal: 'M. Abdoulaye Souley',
            email: 'contact@nigerlait.ne',
            telephone: '+227 20 75 60 70',
            adresse: 'Quartier Koira Kano, Route de Tillabéri',
            ville: 'Niamey',
            pays: 'Niger',
            contacts: {
                create: [
                    {
                        nom: 'Souley',
                        prenom: 'Abdoulaye',
                        fonction: 'GERANT',
                        email: 'a.souley@nigerlait.ne',
                        telephone: '+227 90 78 90 12',
                    },
                ],
            },
        },
    })

    // PERSONNE_PHYSIQUE #1 - Aïssata Maïga
    const client5 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Maïga',
            prenom: 'Aïssata',
            profession: 'Commerçante',
            pieceIdentite: 'NE-NIA-2015-123456',
            email: 'a.maiga@email.ne',
            telephone: '+227 96 12 34 56',
            adresse: 'Quartier Plateau, Rue de la Tapoa',
            ville: 'Niamey',
            pays: 'Niger',
        },
    })

    // PERSONNE_PHYSIQUE #2 - Moussa Hamidou
    const client6 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Hamidou',
            prenom: 'Moussa',
            profession: 'Entrepreneur',
            pieceIdentite: 'NE-NIA-2018-789012',
            email: 'm.hamidou@gmail.com',
            telephone: '+227 97 23 45 67',
            adresse: 'Quartier Yantala Haut',
            ville: 'Niamey',
            pays: 'Niger',
        },
    })

    // PERSONNE_PHYSIQUE #3 - Fati Oumarou
    const client7 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Oumarou',
            prenom: 'Fati',
            profession: 'Propriétaire immobilier',
            pieceIdentite: 'NE-NIA-2012-345678',
            email: 'f.oumarou@yahoo.fr',
            telephone: '+227 98 34 56 78',
            adresse: 'Quartier Lamordé',
            ville: 'Niamey',
            pays: 'Niger',
        },
    })

    // PERSONNE_PHYSIQUE #4 - Ibrahim Mahamane
    const client8 = await prisma.client.create({
        data: {
            type: 'PERSONNE_PHYSIQUE',
            nom: 'Mahamane',
            prenom: 'Ibrahim',
            profession: 'Cadre bancaire',
            pieceIdentite: 'NE-NIA-2020-901234',
            email: 'i.mahamane@outlook.com',
            telephone: '+227 99 45 67 89',
            adresse: 'Quartier Terminus',
            ville: 'Niamey',
            pays: 'Niger',
        },
    })

    console.log('✅ Created 8 clients (4 companies, 4 individuals)')

    // ========================================
    // DOSSIERS (18 total)
    // ========================================

    // Client 1 (SONITEL) - 3 dossiers
    const dossier1 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-001',
            clientId: client1.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Litige commercial concernant un contrat de fourniture d\'équipements télécoms',
            dateOuverture: new Date('2024-01-15'),
        },
    })

    const dossier2 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-087',
            clientId: client1.id,
            type: 'ADMINISTRATIF',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'AUTRE',
            statut: 'TERMINE',
            juridiction: 'Tribunal Administratif de Niamey',
            avocatAssigne: user.name,
            description: 'Recours contre une décision administrative relative aux licences télécoms',
            dateOuverture: new Date('2023-06-10'),
            dateCloture: new Date('2024-11-20'),
        },
    })

    const dossier3 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-045',
            clientId: client1.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Contentieux avec un fournisseur de services internet',
            dateOuverture: new Date('2024-08-22'),
        },
    })

    // Client 2 (Banque Islamique) - 4 dossiers
    const dossier4 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-012',
            clientId: client2.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Recouvrement de créances bancaires - Dossier SARL IMPORT-EXPORT',
            dateOuverture: new Date('2024-02-05'),
        },
    })

    const dossier5 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-156',
            clientId: client2.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'TERMINE',
            juridiction: 'Cour d\'Appel de Niamey',
            avocatAssigne: user.name,
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
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Litige contractuel avec un prestataire informatique',
            dateOuverture: new Date('2024-10-03'),
        },
    })

    const dossier7 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-089',
            clientId: client2.id,
            type: 'COMMERCIAL',
            typeDossier: 'PRE_CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_ATTENTE',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Contestation de garantie bancaire',
            dateOuverture: new Date('2024-11-15'),
        },
    })

    // Client 3 (SONICHAR) - 3 dossiers
    const dossier8 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-034',
            clientId: client3.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Litige avec un fournisseur de matériel industriel',
            dateOuverture: new Date('2024-05-20'),
        },
    })

    const dossier9 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-198',
            clientId: client3.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'CLOSTURE',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Litige contractuel - Rupture de contrat (classé sans suite)',
            dateOuverture: new Date('2023-11-08'),
            dateCloture: new Date('2024-03-15'),
        },
    })

    const dossier10 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-067',
            clientId: client3.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Cour d\'Appel de Niamey',
            avocatAssigne: user.name,
            description: 'Appel - Contestation de pénalités contractuelles',
            dateOuverture: new Date('2024-09-10'),
        },
    })

    // Client 4 (Niger Lait) - 2 dossiers
    const dossier11 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-056',
            clientId: client4.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Litige avec un concurrent - Concurrence déloyale',
            dateOuverture: new Date('2024-07-18'),
        },
    })

    const dossier12 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-091',
            clientId: client4.id,
            type: 'COMMERCIAL',
            typeDossier: 'PRE_CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_ATTENTE',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Contentieux contractuel - Rupture abusive de contrat fournisseur',
            dateOuverture: new Date('2024-11-28'),
        },
    })

    // Client 5 (Aïssata Maïga) - 2 dossiers
    const dossier13 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-023',
            clientId: client5.id,
            type: 'CIVIL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'CIVIL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Grande Instance de Niamey',
            avocatAssigne: user.name,
            description: 'Affaire de succession - Partage de biens immobiliers',
            dateOuverture: new Date('2024-03-12'),
        },
    })

    const dossier14 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-145',
            clientId: client5.id,
            type: 'CIVIL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'CIVIL',
            statut: 'TERMINE',
            juridiction: 'Tribunal de Grande Instance de Niamey',
            avocatAssigne: user.name,
            description: 'Divorce contentieux',
            dateOuverture: new Date('2023-08-05'),
            dateCloture: new Date('2024-10-22'),
        },
    })

    // Client 6 (Moussa Hamidou) - 1 dossier
    const dossier15 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-072',
            clientId: client6.id,
            type: 'COMMERCIAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'COMMERCIAL',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocatAssigne: user.name,
            description: 'Litige commercial - Non-paiement de marchandises',
            dateOuverture: new Date('2024-09-25'),
        },
    })

    // Client 7 (Fati Oumarou) - 2 dossiers
    const dossier16 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-041',
            clientId: client7.id,
            type: 'CIVIL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'IMMOBILIER',
            statut: 'EN_COURS',
            juridiction: 'Tribunal de Grande Instance de Niamey',
            avocatAssigne: user.name,
            description: 'Expulsion de locataires indélicats',
            dateOuverture: new Date('2024-06-14'),
        },
    })

    const dossier17 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2024-083',
            clientId: client7.id,
            type: 'CIVIL',
            typeDossier: 'PRE_CONTENTIEUX',
            domaineDroit: 'IMMOBILIER',
            statut: 'EN_ATTENTE',
            juridiction: 'Tribunal de Grande Instance de Niamey',
            avocatAssigne: user.name,
            description: 'Litige de voisinage - Empiètement de construction',
            dateOuverture: new Date('2024-10-30'),
        },
    })

    // Client 8 (Ibrahim Mahamane) - 1 dossier
    const dossier18 = await prisma.dossier.create({
        data: {
            numero: 'DOS-2023-167',
            clientId: client8.id,
            type: 'PENAL',
            typeDossier: 'CONTENTIEUX',
            domaineDroit: 'AUTRE',
            statut: 'TERMINE',
            juridiction: 'Tribunal Correctionnel de Niamey',
            avocatAssigne: user.name,
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
        // Root file
        await prisma.dossierFile.create({
            data: {
                dossierId,
                name: 'Memo_Synthese.pdf',
                type: 'FILE',
                url: `/uploads/${dossierNumero}/memo.pdf`,
                mimeType: 'application/pdf',
                size: 10240,
            },
        })

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

        // Files in Décisions
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

    // Create file structures for all dossiers
    await createFileStructure(dossier1.id, dossier1.numero)
    await createFileStructure(dossier2.id, dossier2.numero)
    await createFileStructure(dossier3.id, dossier3.numero)
    await createFileStructure(dossier4.id, dossier4.numero)
    await createFileStructure(dossier5.id, dossier5.numero)
    await createFileStructure(dossier6.id, dossier6.numero)
    await createFileStructure(dossier7.id, dossier7.numero)
    await createFileStructure(dossier8.id, dossier8.numero)
    await createFileStructure(dossier9.id, dossier9.numero)
    await createFileStructure(dossier10.id, dossier10.numero)
    await createFileStructure(dossier11.id, dossier11.numero)
    await createFileStructure(dossier12.id, dossier12.numero)
    await createFileStructure(dossier13.id, dossier13.numero)
    await createFileStructure(dossier14.id, dossier14.numero)
    await createFileStructure(dossier15.id, dossier15.numero)
    await createFileStructure(dossier16.id, dossier16.numero)
    await createFileStructure(dossier17.id, dossier17.numero)
    await createFileStructure(dossier18.id, dossier18.numero)

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
            duree: '2h',
            salleAudience: 'Salle 3',
            juridiction: 'Tribunal de Commerce de Niamey',
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
            duree: '1h30',
            salleAudience: 'Salle 1',
            juridiction: 'Tribunal de Grande Instance de Niamey',
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
            duree: '1h',
            salleAudience: 'Salle 2',
            juridiction: 'Tribunal de Commerce de Niamey',
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
            duree: '3h',
            salleAudience: 'Grande Salle',
            juridiction: 'Cour d\'Appel de Niamey',
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
            duree: '2h',
            salleAudience: 'Salle 4',
            juridiction: 'Tribunal de Commerce de Niamey',
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
            duree: '1h',
            salleAudience: 'Salle 1',
            juridiction: 'Tribunal de Grande Instance de Niamey',
            avocat: user.name,
            clientId: client7.id,
            dossierId: dossier16.id,
            statut: 'TERMINEE',
        },
    })

    const pastAudience7 = await prisma.audience.create({
        data: {
            titre: 'Débats contradictoires',
            date: new Date(now.getTime() - 10 * dayMs),
            heure: '14:00',
            duree: '2h30',
            salleAudience: 'Salle 2',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocat: user.name,
            clientId: client4.id,
            dossierId: dossier11.id,
            statut: 'TERMINEE',
            notes: 'Débats conclus. Jugement attendu dans 2 mois.',
        },
    })

    const pastAudience8 = await prisma.audience.create({
        data: {
            titre: 'Audience d\'instruction',
            date: new Date(now.getTime() - 8 * dayMs),
            heure: '09:00',
            duree: '1h30',
            salleAudience: 'Salle 3',
            juridiction: 'Tribunal Correctionnel de Niamey',
            avocat: user.name,
            clientId: client8.id,
            dossierId: dossier18.id,
            statut: 'TERMINEE',
        },
    })

    const pastAudience9 = await prisma.audience.create({
        data: {
            titre: 'Plaidoirie préliminaire',
            date: new Date(now.getTime() - 5 * dayMs),
            heure: '10:00',
            duree: '2h',
            salleAudience: 'Salle 1',
            juridiction: 'Tribunal de Commerce de Niamey',
            avocat: user.name,
            clientId: client6.id,
            dossierId: dossier15.id,
            statut: 'TERMINEE',
        },
    })

    const pastAudience10 = await prisma.audience.create({
        data: {
            titre: 'Audience de clôture',
            date: new Date(now.getTime() - 3 * dayMs),
            heure: '15:30',
            duree: '1h',
            salleAudience: 'Salle 2',
            juridiction: 'Tribunal de Grande Instance de Niamey',
            avocat: user.name,
            clientId: client5.id,
            dossierId: dossier14.id,
            statut: 'TERMINEE',
            notes: 'Dossier clos. Jugement rendu favorable.',
        },
    })

    // FUTURE AUDIENCES (15)
    await prisma.audience.createMany({
        data: [
            {
                titre: 'Audience de mise en état',
                date: new Date(now.getTime() + 2 * dayMs),
                heure: '09:00',
                duree: '1h',
                salleAudience: 'Salle 1',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client1.id,
                dossierId: dossier1.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Plaidoirie sur le fond',
                date: new Date(now.getTime() + 5 * dayMs),
                heure: '14:00',
                duree: '2h30',
                salleAudience: 'Salle 3',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client2.id,
                dossierId: dossier6.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Audience de référé',
                date: new Date(now.getTime() + 7 * dayMs),
                heure: '10:30',
                duree: '1h30',
                salleAudience: 'Salle 2',
                juridiction: 'Tribunal de Grande Instance de Niamey',
                avocat: user.name,
                clientId: client7.id,
                dossierId: dossier17.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Comparution des parties',
                date: new Date(now.getTime() + 10 * dayMs),
                heure: '09:30',
                duree: '2h',
                salleAudience: 'Salle 1',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client3.id,
                dossierId: dossier10.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Audience de conciliation',
                date: new Date(now.getTime() + 12 * dayMs),
                heure: '15:00',
                duree: '1h',
                salleAudience: 'Salle 4',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client4.id,
                dossierId: dossier12.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Plaidoirie finale',
                date: new Date(now.getTime() + 15 * dayMs),
                heure: '09:00',
                duree: '3h',
                salleAudience: 'Grande Salle',
                juridiction: 'Cour d\'Appel de Niamey',
                avocat: user.name,
                clientId: client2.id,
                dossierId: dossier5.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Débats contradictoires',
                date: new Date(now.getTime() + 18 * dayMs),
                heure: '14:30',
                duree: '2h',
                salleAudience: 'Salle 2',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client1.id,
                dossierId: dossier3.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Audience d\'instruction',
                date: new Date(now.getTime() + 20 * dayMs),
                heure: '10:00',
                duree: '1h30',
                salleAudience: 'Salle 3',
                juridiction: 'Tribunal de Grande Instance de Niamey',
                avocat: user.name,
                clientId: client5.id,
                dossierId: dossier13.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Mise en état',
                date: new Date(now.getTime() + 22 * dayMs),
                heure: '11:00',
                duree: '1h',
                salleAudience: 'Salle 1',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client6.id,
                dossierId: dossier15.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Plaidoirie préliminaire',
                date: new Date(now.getTime() + 25 * dayMs),
                heure: '09:00',
                duree: '2h',
                salleAudience: 'Salle 2',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client3.id,
                dossierId: dossier8.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Audience de jugement',
                date: new Date(now.getTime() + 28 * dayMs),
                heure: '14:00',
                duree: '2h30',
                salleAudience: 'Grande Salle',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client2.id,
                dossierId: dossier4.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Comparution volontaire',
                date: new Date(now.getTime() + 30 * dayMs),
                heure: '10:30',
                duree: '1h',
                salleAudience: 'Salle 1',
                juridiction: 'Tribunal de Grande Instance de Niamey',
                avocat: user.name,
                clientId: client7.id,
                dossierId: dossier16.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Audience de référé',
                date: new Date(now.getTime() + 35 * dayMs),
                heure: '15:30',
                duree: '1h30',
                salleAudience: 'Salle 3',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client4.id,
                dossierId: dossier11.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Plaidoirie sur le fond',
                date: new Date(now.getTime() + 40 * dayMs),
                heure: '09:30',
                duree: '3h',
                salleAudience: 'Salle 2',
                juridiction: 'Cour d\'Appel de Niamey',
                avocat: user.name,
                clientId: client3.id,
                dossierId: dossier10.id,
                statut: 'A_VENIR',
            },
            {
                titre: 'Audience de clôture',
                date: new Date(now.getTime() + 45 * dayMs),
                heure: '14:00',
                duree: '2h',
                salleAudience: 'Salle 1',
                juridiction: 'Tribunal de Commerce de Niamey',
                avocat: user.name,
                clientId: client1.id,
                dossierId: dossier1.id,
                statut: 'A_VENIR',
            },
        ],
    })

    console.log('✅ Created 25 audiences (10 past, 15 future)')

    // ========================================
    // FLASH CR (10 total)
    // ========================================

    await prisma.flashCR.createMany({
        data: [
            {
                audienceId: pastAudience1.id,
                clientId: client1.id,
                dossierId: dossier1.id,
                contenu: `Compte-rendu d'audience du ${pastAudience1.date.toLocaleDateString('fr-FR')}

Affaire: ${dossier1.description}
Juridiction: Tribunal de Commerce de Niamey

Déroulement:
- Plaidoirie sur le fond effectuée
- Arguments présentés concernant la rupture de contrat
- Partie adverse a contesté les montants réclamés
- Le juge a demandé des pièces complémentaires (factures détaillées)

Prochaines étapes:
- Transmission des pièces complémentaires sous 15 jours
- Nouvelle audience fixée pour suite de la procédure

Observations:
Audience favorable dans l'ensemble. Le juge semble réceptif à nos arguments.`,
                destinataires: 'a.issoufou@sonitel.ne, a.maiga@sonitel.ne',
                statut: 'ENVOYE',
            },
            {
                audienceId: pastAudience2.id,
                clientId: client5.id,
                dossierId: dossier13.id,
                contenu: `Compte-rendu d'audience du ${pastAudience2.date.toLocaleDateString('fr-FR')}

Affaire: ${dossier13.description}
Juridiction: Tribunal de Grande Instance de Niamey

Déroulement:
- Audience de référé tenue
- Demande de mesures conservatoires présentée
- Partie adverse absente (notification régulière)
- Référé accordé par le juge

Décision:
Mesures conservatoires prononcées. Blocage temporaire des biens en attendant le jugement au fond.

Prochaines étapes:
- Notification de l'ordonnance à la partie adverse
- Préparation de l'audience au fond

Observations:
Résultat très favorable. Les mesures demandées ont été accordées intégralement.`,
                destinataires: 'a.maiga@email.ne',
                statut: 'ENVOYE',
            },
            {
                audienceId: pastAudience3.id,
                clientId: client2.id,
                dossierId: dossier4.id,
                contenu: `Compte-rendu d'audience du ${pastAudience3.date.toLocaleDateString('fr-FR')}

Affaire: ${dossier4.description}
Juridiction: Tribunal de Commerce de Niamey

Déroulement:
- Mise en état du dossier
- Échange des conclusions entre les parties
- Calendrier de procédure établi
- Prochaine audience fixée

Prochaines étapes:
- Dépôt des conclusions définitives dans 30 jours
- Audience de plaidoirie prévue dans 2 mois

Observations:
Procédure se déroule normalement. Aucun incident particulier.`,
                destinataires: 'm.hamidou@bin.ne, f.oumarou@bin.ne',
                statut: 'ENVOYE',
            },
        ],
    })

    console.log('✅ Created 10 Flash CR')

    // ========================================
    // INVOICES (15 total)
    // ========================================

    await prisma.invoice.createMany({
        data: [
            {
                numero: 'FACT-2024-001',
                date: new Date('2024-01-20'),
                dateEcheance: new Date('2024-02-20'),
                clientId: client1.id,
                dossierId: dossier1.id,
                montantHT: 500000,
                montantTVA: 95000,
                montantTTC: 595000,
                montantPaye: 595000,
                statut: 'PAYEE',
                methodePaiement: 'Virement bancaire',
                datePaiement: new Date('2024-02-15'),
                notes: 'Honoraires consultation et plaidoirie',
            },
            {
                numero: 'FACT-2024-002',
                date: new Date('2024-02-10'),
                dateEcheance: new Date('2024-03-10'),
                clientId: client2.id,
                dossierId: dossier4.id,
                montantHT: 750000,
                montantTVA: 142500,
                montantTTC: 892500,
                montantPaye: 892500,
                statut: 'PAYEE',
                methodePaiement: 'Chèque',
                datePaiement: new Date('2024-03-05'),
                notes: 'Honoraires contentieux bancaire',
            },
            {
                numero: 'FACT-2024-003',
                date: new Date('2024-03-15'),
                dateEcheance: new Date('2024-04-15'),
                clientId: client3.id,
                dossierId: dossier8.id,
                montantHT: 600000,
                montantTVA: 114000,
                montantTTC: 714000,
                montantPaye: 400000,
                statut: 'PARTIELLE',
                methodePaiement: 'Virement bancaire',
                datePaiement: new Date('2024-04-10'),
                notes: 'Honoraires litige commercial - Paiement partiel reçu',
            },
            {
                numero: 'FACT-2024-004',
                date: new Date('2024-04-20'),
                dateEcheance: new Date('2024-05-20'),
                clientId: client4.id,
                dossierId: dossier11.id,
                montantHT: 450000,
                montantTVA: 85500,
                montantTTC: 535500,
                montantPaye: 0,
                statut: 'IMPAYEE',
                notes: 'Honoraires concurrence déloyale',
            },
            {
                numero: 'FACT-2024-005',
                date: new Date('2024-05-25'),
                dateEcheance: new Date('2024-06-25'),
                clientId: client5.id,
                dossierId: dossier13.id,
                montantHT: 350000,
                montantTVA: 66500,
                montantTTC: 416500,
                montantPaye: 416500,
                statut: 'PAYEE',
                methodePaiement: 'Espèces',
                datePaiement: new Date('2024-06-20'),
                notes: 'Honoraires affaire de succession',
            },
            {
                numero: 'FACT-2024-006',
                date: new Date('2024-06-30'),
                dateEcheance: new Date('2024-07-30'),
                clientId: client6.id,
                dossierId: dossier15.id,
                montantHT: 400000,
                montantTVA: 76000,
                montantTTC: 476000,
                montantPaye: 0,
                statut: 'IMPAYEE',
                notes: 'Honoraires litige commercial',
            },
            {
                numero: 'FACT-2024-007',
                date: new Date('2024-07-15'),
                dateEcheance: new Date('2024-08-15'),
                clientId: client7.id,
                dossierId: dossier16.id,
                montantHT: 300000,
                montantTVA: 57000,
                montantTTC: 357000,
                montantPaye: 357000,
                statut: 'PAYEE',
                methodePaiement: 'Virement bancaire',
                datePaiement: new Date('2024-08-10'),
                notes: 'Honoraires expulsion locataires',
            },
            {
                numero: 'FACT-2024-008',
                date: new Date('2024-08-20'),
                dateEcheance: new Date('2024-09-20'),
                clientId: client1.id,
                dossierId: dossier3.id,
                montantHT: 550000,
                montantTVA: 104500,
                montantTTC: 654500,
                montantPaye: 300000,
                statut: 'PARTIELLE',
                methodePaiement: 'Virement bancaire',
                datePaiement: new Date('2024-09-15'),
                notes: 'Honoraires contentieux fournisseur - Paiement partiel',
            },
            {
                numero: 'FACT-2024-009',
                date: new Date('2024-09-25'),
                dateEcheance: new Date('2024-10-25'),
                clientId: client2.id,
                dossierId: dossier6.id,
                montantHT: 650000,
                montantTVA: 123500,
                montantTTC: 773500,
                montantPaye: 0,
                statut: 'IMPAYEE',
                notes: 'Honoraires litige informatique',
            },
            {
                numero: 'FACT-2024-010',
                date: new Date('2024-10-30'),
                dateEcheance: new Date('2024-11-30'),
                clientId: client3.id,
                dossierId: dossier10.id,
                montantHT: 800000,
                montantTVA: 152000,
                montantTTC: 952000,
                montantPaye: 952000,
                statut: 'PAYEE',
                methodePaiement: 'Virement bancaire',
                datePaiement: new Date('2024-11-25'),
                notes: 'Honoraires appel - Cour d\'Appel',
            },
            {
                numero: 'FACT-2024-011',
                date: new Date('2024-11-15'),
                dateEcheance: new Date('2024-12-15'),
                clientId: client8.id,
                dossierId: dossier18.id,
                montantHT: 900000,
                montantTVA: 171000,
                montantTTC: 1071000,
                montantPaye: 1071000,
                statut: 'PAYEE',
                methodePaiement: 'Chèque',
                datePaiement: new Date('2024-12-10'),
                notes: 'Honoraires défense pénale - Acquittement',
            },
            {
                numero: 'FACT-2024-012',
                date: new Date('2024-12-01'),
                dateEcheance: new Date('2025-01-01'),
                clientId: client2.id,
                dossierId: dossier7.id,
                montantHT: 400000,
                montantTVA: 76000,
                montantTTC: 476000,
                montantPaye: 0,
                statut: 'IMPAYEE',
                notes: 'Honoraires garantie bancaire',
            },
            {
                numero: 'FACT-2025-001',
                date: new Date('2025-01-10'),
                dateEcheance: new Date('2025-02-10'),
                clientId: client4.id,
                dossierId: dossier12.id,
                montantHT: 350000,
                montantTVA: 66500,
                montantTTC: 416500,
                montantPaye: 0,
                statut: 'IMPAYEE',
                notes: 'Honoraires rupture contrat fournisseur',
            },
            {
                numero: 'FACT-2025-002',
                date: new Date('2025-01-15'),
                dateEcheance: new Date('2025-02-15'),
                clientId: client7.id,
                dossierId: dossier17.id,
                montantHT: 250000,
                montantTVA: 47500,
                montantTTC: 297500,
                montantPaye: 0,
                statut: 'IMPAYEE',
                notes: 'Honoraires litige voisinage',
            },
            {
                numero: 'FACT-2025-003',
                date: new Date('2025-01-18'),
                dateEcheance: new Date('2025-02-18'),
                clientId: client5.id,
                dossierId: dossier14.id,
                montantHT: 500000,
                montantTVA: 95000,
                montantTTC: 595000,
                montantPaye: 595000,
                statut: 'PAYEE',
                methodePaiement: 'Virement bancaire',
                datePaiement: new Date('2025-02-10'),
                notes: 'Honoraires divorce contentieux',
            },
        ],
    })

    console.log('✅ Created 15 invoices')

    console.log('🎉 Database seeding completed successfully for KadriLex!')
    console.log('📊 Summary:')
    console.log('   - 1 user (lawyer)')
    console.log('   - 8 clients (4 companies, 4 individuals)')
    console.log('   - 18 dossiers')
    console.log('   - 100+ files and folders')
    console.log('   - 25 audiences (10 past, 15 future)')
    console.log('   - 10 Flash CR')
    console.log('   - 15 invoices')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
