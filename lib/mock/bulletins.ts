/**
 * Source de vérité unique des bulletins de paie.
 * 1 bulletin = 1 employé × 1 mois.
 * Calculs : net = brut + primes − retenues − charges salariales · coût total = brut + primes + charges patronales
 */

import {
    TAUX_CNSS_EMPLOYEUR,
    TAUX_CNSS_SALARIE,
    type ModePaiementKey,
    type StatutBulletinKey,
    type TypeLigneBulletinKey,
} from "@/lib/constants/finance"
import { mockEmployes } from "@/lib/mock/employes"

export interface MockBulletinLigne {
    id: string
    libelle: string
    type: TypeLigneBulletinKey
    montant: number
}

export interface MockBulletin {
    id: string
    employeId: string
    annee: number
    mois: number // 1-12

    /** Montants */
    salaireBrut: number
    primes: number
    retenues: number
    chargesSalariales: number
    chargesPatronales: number

    /** Calculés */
    salaireNet: number
    coutTotalEmployeur: number

    lignes: MockBulletinLigne[]

    /** Versement */
    statut: StatutBulletinKey
    dateVersement: string | null
    modeVersement: ModePaiementKey | null
    reference: string | null

    pdfUrl: string | null
    notes: string | null

    createdAt: string
    updatedAt: string
}

/* ============================================================
   Helpers de calcul
   ============================================================ */

/** Calcule les charges sociales selon les taux CNSS Niger */
export function calcChargesSociales(brut: number): {
    chargesSalariales: number
    chargesPatronales: number
} {
    return {
        chargesSalariales: Math.round((brut * TAUX_CNSS_SALARIE) / 100),
        chargesPatronales: Math.round((brut * TAUX_CNSS_EMPLOYEUR) / 100),
    }
}

/** Recalcule net + coût employeur depuis les composantes */
export function recomputeBulletin(b: Omit<MockBulletin, "salaireNet" | "coutTotalEmployeur">): MockBulletin {
    const salaireNet = b.salaireBrut + b.primes - b.retenues - b.chargesSalariales
    const coutTotalEmployeur = b.salaireBrut + b.primes + b.chargesPatronales
    return { ...b, salaireNet, coutTotalEmployeur }
}

/* ============================================================
   Génération automatique de bulletins (3 derniers mois × 5 employés = 15 bulletins)
   ============================================================ */

function buildBulletin(args: {
    employeId: string
    annee: number
    mois: number
    brut: number
    primes?: number
    retenues?: number
    statut?: StatutBulletinKey
    modeVersement?: ModePaiementKey
}): MockBulletin {
    const { employeId, annee, mois, brut, primes = 0, retenues = 0, statut = "VERSE", modeVersement = "VIREMENT" } = args
    const { chargesSalariales, chargesPatronales } = calcChargesSociales(brut)
    const lignes: MockBulletinLigne[] = [
        {
            id: `lig-${employeId}-${annee}-${mois}-1`,
            libelle: "Salaire de base",
            type: "GAIN",
            montant: brut,
        },
    ]
    if (primes > 0) {
        lignes.push({
            id: `lig-${employeId}-${annee}-${mois}-2`,
            libelle: "Prime de performance",
            type: "GAIN",
            montant: primes,
        })
    }
    if (retenues > 0) {
        lignes.push({
            id: `lig-${employeId}-${annee}-${mois}-3`,
            libelle: "Avance sur salaire",
            type: "RETENUE",
            montant: retenues,
        })
    }
    lignes.push(
        {
            id: `lig-${employeId}-${annee}-${mois}-4`,
            libelle: "CNSS — part salariale",
            type: "CHARGE_SALARIALE",
            montant: chargesSalariales,
        },
        {
            id: `lig-${employeId}-${annee}-${mois}-5`,
            libelle: "CNSS — part patronale",
            type: "CHARGE_PATRONALE",
            montant: chargesPatronales,
        }
    )

    const dateVersement = statut === "VERSE" ? new Date(annee, mois - 1, 28).toISOString() : null
    const isoCreated = new Date(annee, mois - 1, 25).toISOString()

    return recomputeBulletin({
        id: `bul-${employeId}-${annee}-${mois}`,
        employeId,
        annee,
        mois,
        salaireBrut: brut,
        primes,
        retenues,
        chargesSalariales,
        chargesPatronales,
        lignes,
        statut,
        dateVersement,
        modeVersement: statut === "VERSE" ? modeVersement : null,
        reference: statut === "VERSE" ? `VIR-PAIE-${annee}-${String(mois).padStart(2, "0")}` : null,
        pdfUrl: null,
        notes: null,
        createdAt: isoCreated,
        updatedAt: isoCreated,
    })
}

const NOW = new Date()
const Y = NOW.getFullYear()
const M = NOW.getMonth() + 1 // mois courant 1-12

/** Génère une plage de mois (mois courant - N) → mois courant */
function previousMonths(count: number): { annee: number; mois: number }[] {
    const out: { annee: number; mois: number }[] = []
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(Y, M - 1 - i, 1)
        out.push({ annee: d.getFullYear(), mois: d.getMonth() + 1 })
    }
    return out
}

const periodes = previousMonths(3)

export const mockBulletins: MockBulletin[] = []
for (const { annee, mois } of periodes) {
    for (const emp of mockEmployes) {
        const isMoisCourant = annee === Y && mois === M
        // Mois courant : VALIDE pour la moitié, BROUILLON pour les autres
        // Mois antérieurs : tous VERSE
        const statut: StatutBulletinKey = isMoisCourant
            ? mockEmployes.indexOf(emp) % 2 === 0
                ? "VALIDE"
                : "BROUILLON"
            : "VERSE"
        // Petite variation : prime occasionnelle pour les associés en mois antérieur
        const primes = !isMoisCourant && emp.statutContrat === "ASSOCIE" && mois === M - 2 ? 200_000 : 0
        mockBulletins.push(
            buildBulletin({
                employeId: emp.id,
                annee,
                mois,
                brut: emp.salaireBaseBrut,
                primes,
                statut,
                modeVersement: emp.modeVersementParDefaut,
            })
        )
    }
}

/* ============================================================
   Helpers — masse salariale, cumul annuel
   ============================================================ */

export interface MasseSalariale {
    nbBulletins: number
    nbEmployes: number
    totalBrut: number
    totalPrimes: number
    totalRetenues: number
    totalNet: number
    totalChargesSalariales: number
    totalChargesPatronales: number
    coutTotalEmployeur: number
    parStatutContrat: Record<string, number>
}

export function getMassesalariale(periode: { annee: number; mois: number }): MasseSalariale {
    const dans = mockBulletins.filter((b) => b.annee === periode.annee && b.mois === periode.mois)
    const ms: MasseSalariale = {
        nbBulletins: dans.length,
        nbEmployes: new Set(dans.map((b) => b.employeId)).size,
        totalBrut: 0,
        totalPrimes: 0,
        totalRetenues: 0,
        totalNet: 0,
        totalChargesSalariales: 0,
        totalChargesPatronales: 0,
        coutTotalEmployeur: 0,
        parStatutContrat: {},
    }
    for (const b of dans) {
        ms.totalBrut += b.salaireBrut
        ms.totalPrimes += b.primes
        ms.totalRetenues += b.retenues
        ms.totalNet += b.salaireNet
        ms.totalChargesSalariales += b.chargesSalariales
        ms.totalChargesPatronales += b.chargesPatronales
        ms.coutTotalEmployeur += b.coutTotalEmployeur
        const emp = mockEmployes.find((e) => e.id === b.employeId)
        if (emp) {
            ms.parStatutContrat[emp.statutContrat] =
                (ms.parStatutContrat[emp.statutContrat] ?? 0) + b.coutTotalEmployeur
        }
    }
    return ms
}

export interface EmployeAnnuel {
    bulletins: MockBulletin[]
    cumulBrut: number
    cumulNet: number
    cumulChargesPatronales: number
    cumulCoutTotal: number
}

export function getEmployeAnnuel(employeId: string, annee: number): EmployeAnnuel {
    const bulletins = mockBulletins
        .filter((b) => b.employeId === employeId && b.annee === annee)
        .sort((a, b) => a.mois - b.mois)
    return {
        bulletins,
        cumulBrut: bulletins.reduce((s, b) => s + b.salaireBrut, 0),
        cumulNet: bulletins.reduce((s, b) => s + b.salaireNet, 0),
        cumulChargesPatronales: bulletins.reduce((s, b) => s + b.chargesPatronales, 0),
        cumulCoutTotal: bulletins.reduce((s, b) => s + b.coutTotalEmployeur, 0),
    }
}
