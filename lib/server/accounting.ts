import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * Service central de comptabilité SYSCOHADA — KadriLex
 * =====================================================
 * Règles métier strictes pour un cabinet d'avocats (Niger) :
 *
 * 1. FACTURE ÉMISE (honoraires) :
 *    Déclencheur : passage du statut BROUILLON → EMISE
 *    Débit  411000 "Clients"          (TTC)
 *    Crédit 706100 "Honoraires"       (HT)
 *    Crédit 443100 "TVA collectée"    (TVA)
 *
 * 2. PAIEMENT REÇU (encaissement) :
 *    Déclencheur : enregistrement d'un paiement sur une facture émise
 *    Débit  521000 "Banque" / 571000 "Caisse"
 *    Crédit 411000 "Clients"          (montant payé)
 *
 * 3. DÉPENSE / NOTE DE FRAIS :
 *    Déclencheur : création d'une dépense
 *    Débit  6xxxxx "Charge"           (HT)
 *    Débit  445200 "TVA récupérable"  (TVA, si applicable)
 *    Crédit 521000 "Banque" / 401000 "Fournisseur" / 421000 "Personnel"  (TTC)
 *
 * 4. ANNULATION DE FACTURE :
 *    Contre-écriture (inversion) de l'écriture originale
 *
 * Tous les numéros de comptes sont VÉRIFIÉS en base de données de production.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Trouve l'exercice comptable ouvert pour une date donnée */
async function findExercice(date: Date, tx: Prisma.TransactionClient = prisma as any) {
  const exercice = await (tx as any).exerciceComptable.findFirst({
    where: {
      dateDebut: { lte: date },
      dateFin: { gte: date },
      cloture: false,
    },
    orderBy: { dateDebut: "desc" },
  })
  if (!exercice) {
    // Fallback : premier exercice non clôturé
    const fallback = await (tx as any).exerciceComptable.findFirst({
      where: { cloture: false },
      orderBy: { dateDebut: "desc" },
    })
    if (!fallback) throw new Error("Aucun exercice comptable ouvert. Créez d'abord un exercice.")
    return fallback
  }
  return exercice
}

/** Récupère un compte ou lève une erreur claire */
async function requireCompte(numero: string, tx: Prisma.TransactionClient = prisma as any) {
  const compte = await (tx as any).compteComptable.findUnique({ where: { numero } })
  if (!compte) throw new Error(`Compte SYSCOHADA ${numero} introuvable. Vérifiez votre Plan Comptable.`)
  return compte
}

// ─── AccountingService ───────────────────────────────────────────────────────

export class AccountingService {

  /**
   * Génère l'écriture comptable pour une FACTURE.
   * 
   * RÈGLE : Appeler UNIQUEMENT quand la facture passe à EMISE (pas en brouillon).
   * Idempotent : si une écriture existe déjà pour ce numéro de pièce, on ne recrée pas.
   */
  static async generateInvoiceEntries(factureId: string) {
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: { lignes: true, client: true },
    })
    if (!facture) throw new Error("Facture introuvable")

    // Idempotence : ne pas créer de doublon
    const existing = await prisma.ecriture.findFirst({
      where: { numeroPiece: facture.numero, annule: false },
    })
    if (existing) return existing

    const dateEcriture = facture.date || new Date()
    const exercice = await findExercice(dateEcriture)
    const estEmise = facture.direction === "EMISE"

    // Journaux
    const journalCode = estEmise ? "VE" : "AC"
    const journal = await requireCompte("000000").catch(async () => null) // just trick, use below
    const journalObj = await prisma.journalComptable.findUnique({ where: { code: journalCode } })
    if (!journalObj) throw new Error(`Journal ${journalCode} introuvable`)

    // Montants
    const totalHT = facture.montantHT > 0
      ? facture.montantHT
      : facture.lignes.reduce((s, l) => s + Math.round(l.prixUnitaire * Number(l.quantite)), 0)
    const tvaRate = facture.tvaRate ?? 19
    const totalTVA = facture.montantTVA > 0
      ? facture.montantTVA
      : Math.round(totalHT * tvaRate / 100)
    const totalTTC = facture.montantTTC > 0
      ? facture.montantTTC
      : totalHT + totalTVA

    // Comptes (numéros vérifiés en production)
    const compteTiers = await requireCompte(estEmise ? "411000" : "401000")
    const compteHonoraireNum = estEmise ? "706100" : "605100"
    const compteHonoraire = await requireCompte(compteHonoraireNum)
    const compteTvaNum = estEmise ? "443100" : "445200"
    const compteTva = await prisma.compteComptable.findUnique({ where: { numero: compteTvaNum } })

    const lignes: Prisma.LigneEcritureCreateManyEcritureInput[] = []

    if (estEmise) {
      // Facture émise : on débite le client (créance), on crédite le produit et la TVA
      lignes.push({ compteId: compteTiers.id, debit: totalTTC, credit: 0, libelle: `Créance client - ${facture.numero}`, clientId: facture.clientId })
      lignes.push({ compteId: compteHonoraire.id, debit: 0, credit: totalHT, libelle: `Honoraires - ${facture.numero}` })
      if (totalTVA > 0 && compteTva) {
        lignes.push({ compteId: compteTva.id, debit: 0, credit: totalTVA, libelle: `TVA collectée - ${facture.numero}` })
      }
    } else {
      // Facture reçue (fournisseur) : on débite la charge, on crédite le fournisseur
      lignes.push({ compteId: compteHonoraire.id, debit: totalHT, credit: 0, libelle: `Charge - ${facture.numero}` })
      if (totalTVA > 0 && compteTva) {
        lignes.push({ compteId: compteTva.id, debit: totalTVA, credit: 0, libelle: `TVA récupérable - ${facture.numero}` })
      }
      lignes.push({ compteId: compteTiers.id, debit: 0, credit: totalTTC, libelle: `Dette fournisseur - ${facture.numero}`, fournisseurId: facture.fournisseurId })
    }

    return prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalObj.id,
        numeroPiece: facture.numero,
        dateEcriture,
        libelle: `Facture ${estEmise ? "émise" : "reçue"} ${facture.numero} — ${facture.client?.nom ?? facture.client?.raisonSociale ?? ""}`,
        validee: true,
        annule: false,
        dossierId: facture.dossierId,
        lignes: { createMany: { data: lignes } },
      },
    })
  }

  /**
   * Génère une contre-écriture pour ANNULER une facture.
   * Inverse tous les débits/crédits de l'écriture originale.
   */
  static async reverseInvoiceEntries(factureId: string) {
    const facture = await prisma.facture.findUnique({ where: { id: factureId } })
    if (!facture) throw new Error("Facture introuvable")

    const original = await prisma.ecriture.findFirst({
      where: { numeroPiece: facture.numero, annule: false },
      include: { lignes: true },
    })
    if (!original) return // Rien à annuler

    // Marquer l'originale comme annulée
    await prisma.ecriture.update({ where: { id: original.id }, data: { annule: true } })

    const exercice = await findExercice(new Date())
    const journalOD = await prisma.journalComptable.findUnique({ where: { code: "OD" } })
    if (!journalOD) throw new Error("Journal OD introuvable")

    // Créer la contre-écriture (inverser débit ↔ crédit)
    return prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalOD.id,
        numeroPiece: `ANN-${facture.numero}`,
        dateEcriture: new Date(),
        libelle: `Annulation facture ${facture.numero}`,
        validee: true,
        annule: false,
        dossierId: facture.dossierId,
        lignes: {
          create: original.lignes.map(l => ({
            compteId: l.compteId,
            debit: l.credit,   // Inversé
            credit: l.debit,   // Inversé
            libelle: l.libelle ? `[Annulation] ${l.libelle}` : "[Annulation]",
            clientId: l.clientId,
            fournisseurId: l.fournisseurId,
          })),
        },
      },
    })
  }

  /**
   * Génère l'écriture de PAIEMENT et soldage de la créance client.
   * 
   * Débit  521000 "Banque" (ou 571000 Caisse)
   * Crédit 411000 "Clients"  ← solde la créance
   */
  static async generatePaymentEntries(paiementId: string) {
    const paiement = await prisma.paiement.findUnique({
      where: { id: paiementId },
      include: { facture: { include: { client: true } } },
    })
    if (!paiement || !paiement.facture) throw new Error("Paiement ou facture introuvable")

    // Idempotence
    const pieceRef = `PAY-${paiementId.substring(0, 8).toUpperCase()}`
    const existing = await prisma.ecriture.findFirst({ where: { numeroPiece: pieceRef, annule: false } })
    if (existing) return existing

    const exercice = await findExercice(paiement.date)
    const estEmise = paiement.facture.direction === "EMISE"

    // Journal Banque ou Caisse
    const journalCode = paiement.mode === "ESPECES" ? "CA" : "BQ"
    const journalObj = await prisma.journalComptable.findUnique({ where: { code: journalCode } })
    if (!journalObj) throw new Error(`Journal ${journalCode} introuvable`)

    // Comptes trésorerie
    const compteTresoNum = paiement.mode === "ESPECES" ? "571000" : "521000"
    const compteTreso = await requireCompte(compteTresoNum)
    const compteTiersNum = estEmise ? "411000" : "401000"
    const compteTiers = await requireCompte(compteTiersNum)

    const lignes: Prisma.LigneEcritureCreateManyEcritureInput[] = estEmise
      ? [
          // Encaissement : Banque augmente, Créance client diminue
          { compteId: compteTreso.id, debit: paiement.montant, credit: 0, libelle: `Encaissement ${paiement.facture.numero}` },
          { compteId: compteTiers.id, debit: 0, credit: paiement.montant, libelle: `Règlement facture ${paiement.facture.numero}`, clientId: paiement.facture.clientId },
        ]
      : [
          // Décaissement : Fournisseur soldé, Banque diminue
          { compteId: compteTiers.id, debit: paiement.montant, credit: 0, libelle: `Règlement fournisseur ${paiement.facture.numero}`, fournisseurId: paiement.facture.fournisseurId },
          { compteId: compteTreso.id, debit: 0, credit: paiement.montant, libelle: `Décaissement ${paiement.facture.numero}` },
        ]

    return prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalObj.id,
        numeroPiece: pieceRef,
        dateEcriture: paiement.date,
        libelle: `Paiement ${estEmise ? "reçu" : "effectué"} — Facture ${paiement.facture.numero}`,
        validee: true,
        annule: false,
        dossierId: paiement.facture.dossierId,
        lignes: { createMany: { data: lignes } },
      },
    })
  }

  /**
   * Génère l'écriture comptable pour une DÉPENSE / NOTE DE FRAIS.
   * 
   * Débit  6xxxxx "Charge selon catégorie"  (HT)
   * Débit  445200 "TVA récupérable"          (TVA, si > 0)
   * Crédit 521000/401000/421000              (TTC)
   */
  static async generateExpenseEntries(depenseId: string) {
    const depense = await prisma.depense.findUnique({ where: { id: depenseId } })
    if (!depense) throw new Error("Dépense introuvable")

    // Idempotence
    const pieceRef = `NDF-${depenseId.substring(0, 8).toUpperCase()}`
    const existing = await prisma.ecriture.findFirst({ where: { numeroPiece: pieceRef, annule: false } })
    if (existing) {
      // Si écriture existante, la supprimer pour la recréer (cas de modification)
      await prisma.ecriture.delete({ where: { id: existing.id } })
    }

    const exercice = await findExercice(depense.date)
    const journalOD = await prisma.journalComptable.findUnique({ where: { code: "OD" } })
    if (!journalOD) throw new Error("Journal OD introuvable")

    // Mapping catégorie → compte de charge (numéros vérifiés en production)
    const CATEGORIE_COMPTES: Record<string, { numero: string; libelle: string }> = {
      LOYER:               { numero: "622100", libelle: "Locations de bâtiments" },
      ELECTRICITE:         { numero: "605100", libelle: "Fournitures de bureau / Énergie" },
      EAU:                 { numero: "605100", libelle: "Eau" },
      INTERNET:            { numero: "628100", libelle: "Frais de téléphone / Internet" },
      TELEPHONE:           { numero: "628100", libelle: "Téléphone" },
      FOURNITURES:         { numero: "605100", libelle: "Fournitures de bureau" },
      CARBURANT:           { numero: "612000", libelle: "Transports / Carburant" },
      REPARATION:          { numero: "624100", libelle: "Frais d'entretien et réparation" },
      ENTRETIEN:           { numero: "624100", libelle: "Entretien" },
      MAINTENANCE:         { numero: "624100", libelle: "Maintenance" },
      HOTEL:               { numero: "612000", libelle: "Hébergement" },
      VOYAGE:              { numero: "612000", libelle: "Voyage / Déplacements" },
      RESTAURATION:        { numero: "612000", libelle: "Restauration / Déplacement" },
      FOURNISSEURS:        { numero: "605100", libelle: "Achats divers" },
      ABONNEMENT_SOFTWARE: { numero: "628100", libelle: "Abonnements logiciels" },
      FORMATION:           { numero: "632000", libelle: "Formation / Prestations externes" },
      COTISATIONS:         { numero: "631100", libelle: "Cotisations / Frais divers" },
      ASSURANCE:           { numero: "624100", libelle: "Assurance" },
      SALAIRES:            { numero: "661100", libelle: "Salaires de base" },
      TAXES:               { numero: "631100", libelle: "Taxes et impôts" },
      IMPOTS:              { numero: "631100", libelle: "Impôts" },
      FRAIS_BANCAIRES:     { numero: "631100", libelle: "Frais bancaires" },
      SOUS_TRAITANCE:      { numero: "632000", libelle: "Sous-traitance / Intermédiaires" },
      HONORAIRES:          { numero: "632000", libelle: "Honoraires externe" },
      DIVERS:              { numero: "631100", libelle: "Charges diverses" },
      AUTRE:               { numero: "631100", libelle: "Autres charges" },
    }

    const mappedCategorie = CATEGORIE_COMPTES[depense.categorie] ?? { numero: "631100", libelle: "Charges diverses" }
    const compteCharge = await requireCompte(mappedCategorie.numero)

    // Compte créditeur (contrepartie)
    const compteCreditNum = depense.employeId
      ? "421000"   // Personnel, rémunérations dues
      : depense.fournisseurId
        ? "401000"   // Fournisseurs
        : depense.mode === "ESPECES"
          ? "571000"   // Caisse
          : "521000"   // Banque
    const compteCredit = await requireCompte(compteCreditNum)
    const compteTva = await prisma.compteComptable.findUnique({ where: { numero: "445200" } })

    const lignes: Prisma.LigneEcritureCreateManyEcritureInput[] = []
    lignes.push({ compteId: compteCharge.id, debit: depense.montantHT, credit: 0, libelle: depense.libelle })
    if (depense.montantTVA > 0 && compteTva) {
      lignes.push({ compteId: compteTva.id, debit: depense.montantTVA, credit: 0, libelle: `TVA — ${depense.libelle}` })
    }
    lignes.push({
      compteId: compteCredit.id,
      debit: 0,
      credit: depense.montantTTC,
      libelle: depense.libelle,
      fournisseurId: depense.fournisseurId ?? undefined,
    })

    return prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalOD.id,
        numeroPiece: pieceRef,
        dateEcriture: depense.date,
        libelle: `${mappedCategorie.libelle} — ${depense.libelle}`,
        validee: true,
        annule: false,
        dossierId: depense.dossierId,
        lignes: { createMany: { data: lignes } },
      },
    })
  }

  /**
   * Génère une contre-écriture pour ANNULER une dépense.
   */
  static async reverseExpenseEntries(depenseId: string) {
    const depense = await prisma.depense.findUnique({ where: { id: depenseId } })
    if (!depense) return // already deleted or doesn't exist

    const pieceRef = `NDF-${depenseId.substring(0, 8).toUpperCase()}`
    const original = await prisma.ecriture.findFirst({
      where: { numeroPiece: pieceRef, annule: false },
      include: { lignes: true },
    })
    if (!original) return

    await prisma.ecriture.update({ where: { id: original.id }, data: { annule: true } })

    const exercice = await findExercice(new Date())
    const journalOD = await prisma.journalComptable.findUnique({ where: { code: "OD" } })
    if (!journalOD) throw new Error("Journal OD introuvable")

    return prisma.ecriture.create({
      data: {
        exerciceId: exercice.id,
        journalId: journalOD.id,
        numeroPiece: `ANN-${pieceRef}`,
        dateEcriture: new Date(),
        libelle: `Annulation dépense ${depense.libelle}`,
        validee: true,
        annule: false,
        dossierId: depense.dossierId,
        lignes: {
          create: original.lignes.map(l => ({
            compteId: l.compteId,
            debit: l.credit,
            credit: l.debit,
            libelle: l.libelle ? `[Annulation] ${l.libelle}` : "[Annulation]",
            fournisseurId: l.fournisseurId,
          })),
        },
      },
    })
  }
}
