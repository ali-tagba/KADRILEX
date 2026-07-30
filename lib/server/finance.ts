/**
 * Logiques métier Finance — port server-side de lib/mock/invoices.ts + bulletins.ts.
 *
 * Toutes les fonctions sont pures (calcul sur input). Pas d'accès DB ici.
 * Les routes les utilisent après avoir chargé les entités.
 */

import type {
    Facture,
    FactureStatut,
    Paiement,
    Bulletin,
} from "@prisma/client"

/* ============================================================
   FACTURE — calcul TVA, statut auto, montantPaye
   ============================================================ */

export const TAUX_TVA_NIGER = 19
export const TAUX_CNSS_SALARIE = 5.25
export const TAUX_CNSS_EMPLOYEUR = 16.5

export function calcTVA(montantHT: number, tauxTVA = TAUX_TVA_NIGER): number {
    return Math.round((montantHT * tauxTVA) / 100)
}
export function calcTTC(montantHT: number, tauxTVA = TAUX_TVA_NIGER): number {
    return montantHT + calcTVA(montantHT, tauxTVA)
}

/** Recompute statut + montantPaye depuis paiements. */
export function recomputeFactureStatut(args: {
    statutActuel: FactureStatut
    montantTTC: number
    montantPaye: number
    dateEcheance: Date | null
}): FactureStatut {
    const { statutActuel, montantTTC, montantPaye, dateEcheance } = args
    // BROUILLON / ANNULEE ne sont jamais auto-écrasés
    if (statutActuel === "BROUILLON" || statutActuel === "ANNULEE") return statutActuel
    if (montantPaye >= montantTTC && montantTTC > 0) return "PAYEE"
    if (dateEcheance && dateEcheance.getTime() < Date.now()) return "EN_RETARD"
    if (montantPaye > 0) return "PARTIELLE"
    return "EMISE"
}

/** Somme des paiements d'une facture. */
export function sumPaiements(paiements: Pick<Paiement, "montant">[]): number {
    return paiements.reduce((acc, p) => acc + p.montant, 0)
}

/* ============================================================
   BULLETIN — calcul charges CNSS, salaire net, coût total
   ============================================================ */

export function calcChargesSociales(salaireBrut: number): {
    chargesSalariales: number
    chargesPatronales: number
} {
    return {
        chargesSalariales: Math.round((salaireBrut * TAUX_CNSS_SALARIE) / 100),
        chargesPatronales: Math.round((salaireBrut * TAUX_CNSS_EMPLOYEUR) / 100),
    }
}

export interface BulletinComputed {
    salaireBrut: number
    primes: number
    retenues: number
    chargesSalariales: number
    chargesPatronales: number
    salaireNet: number
    coutTotalEmployeur: number
}

export function recomputeBulletin(input: {
    salaireBrut: number
    primes: number
    retenues: number
}): BulletinComputed {
    const { chargesSalariales, chargesPatronales } = calcChargesSociales(input.salaireBrut)
    const salaireNet =
        input.salaireBrut + input.primes - input.retenues - chargesSalariales
    const coutTotalEmployeur = input.salaireBrut + input.primes + chargesPatronales
    return {
        ...input,
        chargesSalariales,
        chargesPatronales,
        salaireNet,
        coutTotalEmployeur,
    }
}

/* ============================================================
   AGRÉGATIONS — finance dossier / cabinet
   ============================================================ */

export interface DossierFinanceComputed {
    facturesEmisesCount: number
    facturesRecuesCount: number
    montantFactureHT: number
    montantFactureTTC: number
    montantPaye: number
    montantImpaye: number
    fraisEngages: number
    fraisRefacturablesEnAttente: number
}

export function computeDossierFinance(factures: Facture[]): DossierFinanceComputed {
    const emises = factures.filter((f) => f.direction === "EMISE")
    const recues = factures.filter((f) => f.direction === "RECUE")

    const montantFactureHT = emises.reduce((s, f) => s + f.montantHT, 0)
    const montantFactureTTC = emises.reduce((s, f) => s + f.montantTTC, 0)
    const montantPaye = emises.reduce((s, f) => s + f.montantPaye, 0)
    const fraisEngages = recues.reduce((s, f) => s + f.montantTTC, 0)
    const fraisRefacturablesEnAttente = recues
        .filter((f) => f.refacturable && !f.refactureeViaFactureId)
        .reduce((s, f) => s + f.montantTTC, 0)

    return {
        facturesEmisesCount: emises.length,
        facturesRecuesCount: recues.length,
        montantFactureHT,
        montantFactureTTC,
        montantPaye,
        montantImpaye: montantFactureTTC - montantPaye,
        fraisEngages,
        fraisRefacturablesEnAttente,
    }
}
