/**
 * Source de vérité unique des dépenses internes du cabinet (charges de fonctionnement).
 * Distinct des factures reçues refacturables (qui sont dans invoices.ts avec direction=RECUE).
 */

import type {
    CategorieDepenseKey,
    FrequenceRecurrenceKey,
    ModePaiementKey,
} from "@/lib/constants/finance"
import { TVA_NIGER } from "@/lib/constants/finance"

export interface MockDepense {
    id: string
    libelle: string
    categorie: CategorieDepenseKey
    date: string

    montantHT: number
    tvaRate: number
    montantTVA: number
    montantTTC: number

    mode: ModePaiementKey
    reference: string | null
    employeId?: string | null
    /** Récurrence */
    recurrent: boolean
    recurrenceFrequence: FrequenceRecurrenceKey | null
    /** id parent qui regroupe toutes les occurrences générées */
    parentRecurrenceId: string | null

    /** Optionnel : fournisseur connu */
    fournisseurId: string | null
    fournisseurNomLibre: string | null

    /** Justificatif (PDF/photo reçu) */
    attachmentUrl: string | null
    notes: string | null

    /** Statut : PAYEE par défaut (la dépense est enregistrée APRÈS paiement effectif), A_PAYER si avant */
    statut: "PAYEE" | "A_PAYER"

    createdAt: string
    updatedAt: string
}

/* ============================================================
   Helpers
   ============================================================ */

function dateAt(year: number, month: number, day: number): string {
    return new Date(year, month - 1, day, 10, 0).toISOString()
}
function daysAgo(d: number): string {
    const dt = new Date()
    dt.setDate(dt.getDate() - d)
    return dt.toISOString()
}

/* ============================================================
   Mock dépenses (mois courants Niger réalistes)
   ============================================================ */

export const mockDepenses: MockDepense[] = []

/* ============================================================
   Helpers de calcul
   ============================================================ */

export interface CabinetCharges {
    total: number
    parCategorie: Record<CategorieDepenseKey, number>
    recurrent: number
    ponctuel: number
    nbDepenses: number
}

export function getCabinetCharges(periode: { start: Date; end: Date }): CabinetCharges {
    const dans = mockDepenses.filter((d) => {
        const dt = new Date(d.date)
        return dt >= periode.start && dt < periode.end
    })
    const parCategorie = {} as Record<CategorieDepenseKey, number>
    let total = 0
    let recurrent = 0
    let ponctuel = 0
    for (const d of dans) {
        total += d.montantTTC
        parCategorie[d.categorie] = (parCategorie[d.categorie] ?? 0) + d.montantTTC
        if (d.recurrent) recurrent += d.montantTTC
        else ponctuel += d.montantTTC
    }
    return { total, parCategorie, recurrent, ponctuel, nbDepenses: dans.length }
}
