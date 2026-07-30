import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { date, journalId, typeOperation, libelle, compteCharge, comptePaiement, montant } = data

    if (!date || !journalId || !libelle || !compteCharge || !comptePaiement || !montant) {
      return new NextResponse('Données incomplètes', { status: 400 })
    }

    const exercice = await prisma.exerciceComptable.findFirst({
      where: { cloture: false },
      orderBy: { dateDebut: 'desc' }
    })
    
    if (!exercice) {
      return new NextResponse('Aucun exercice comptable actif', { status: 400 })
    }

    // Resolve compte IDs from strings like "626000 - Internet"
    const chargeNum = compteCharge.split(' - ')[0].trim()
    const paiementNum = comptePaiement.split(' - ')[0].trim()

    const dbCompteCharge = await prisma.compteComptable.findUnique({ where: { numero: chargeNum } })
    const dbComptePaiement = await prisma.compteComptable.findUnique({ where: { numero: paiementNum } })

    if (!dbCompteCharge || !dbComptePaiement) {
      return new NextResponse('Numéro de compte invalide ou introuvable', { status: 400 })
    }

    const valeurMontant = Number(montant)
    if (isNaN(valeurMontant) || valeurMontant <= 0) {
      return new NextResponse('Montant invalide', { status: 400 })
    }

    // DEPENSE / SALAIRE = Débit de la charge/salarié, Crédit de la banque/caisse
    // RECETTE = Débit de la banque, Crédit du produit
    const isDepense = typeOperation === 'DEPENSE' || typeOperation === 'SALAIRE'

    const ecriture = await prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalId,
        numeroPiece: `SR-${Date.now().toString().slice(-6)}`,
        dateEcriture: new Date(date),
        libelle: libelle,
        validee: true,
        lignes: {
          create: [
            {
              compteId: dbCompteCharge.id,
              debit: isDepense ? valeurMontant : 0,
              credit: isDepense ? 0 : valeurMontant,
              libelle: libelle
            },
            {
              compteId: dbComptePaiement.id,
              debit: isDepense ? 0 : valeurMontant,
              credit: isDepense ? valeurMontant : 0,
              libelle: libelle
            }
          ]
        }
      }
    })

    return NextResponse.json(ecriture)
  } catch (error: any) {
    console.error('[SAISIE_RAPIDE_POST]', error)
    return new NextResponse('Erreur Interne', { status: 500 })
  }
}
