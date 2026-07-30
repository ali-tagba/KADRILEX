import { prisma } from "@/lib/prisma"
import { DepensesClient } from "./depenses-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'Dépenses & Frais | Comptabilité',
}

export default async function DepensesPage() {
  const journaux = await prisma.journalComptable.findMany({
    where: { type: { in: ['BANQUE', 'CAISSE', 'OD'] } },
    orderBy: { code: 'asc' }
  })
  
  const comptesList = await prisma.compteComptable.findMany({
    orderBy: { numero: 'asc' }
  })

  const depensesDb = await prisma.depense.findMany({
    orderBy: { date: 'desc' },
    include: { fournisseur: true, dossier: true, employe: true }
  })

  const employes = await prisma.membre.findMany({
    where: { actif: true },
    select: { id: true, nom: true, prenom: true, role: true }
  })

  // Format Prisma to MockDepense format for the UI
  const depenses = depensesDb.map(d => ({
    id: d.id,
    libelle: d.libelle,
    categorie: d.categorie,
    date: d.date.toISOString(),
    montantHT: d.montantHT,
    tvaRate: d.tvaRate,
    montantTVA: d.montantTVA,
    montantTTC: d.montantTTC,
    mode: d.mode,
    reference: d.reference,
    recurrent: d.recurrent,
    recurrenceFrequence: d.recurrenceFrequence,
    parentRecurrenceId: d.parentRecurrenceId,
    fournisseurId: d.fournisseurId,
    fournisseurNomLibre: d.fournisseurNomLibre,
    employeId: d.employeId,
    dossierId: d.dossierId,
    attachmentUrl: d.attachmentUrl,
    notes: d.notes,
    statut: d.statut,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }))

  return (
    <DepensesClient journaux={journaux} comptes={comptesList} initialDepenses={depenses} employes={employes} />
  )
}
