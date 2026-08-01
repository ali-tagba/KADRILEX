/**
 * Calcul à la volée du fil d'activité d'un client.
 *
 * Au lieu de stocker `client.activity` statiquement, on dérive l'activité depuis
 * les vrais événements du cabinet : dossiers liés, audiences, factures, paiements.
 *
 * Les chiffres financiers (factures émises, paiements reçus) sont **gated** : ils
 * n'apparaissent que si le membre courant a `finance.view`. Sinon, on rapporte
 * l'événement sans le montant.
 *
 * Les éléments sont triés par date desc et capés à 50 entrées par défaut.
 */

import type { MockClient, ClientActivityItem } from "@/lib/mock/clients"
import type { MockDossier } from "@/lib/mock/dossiers"
import type { MockAudience } from "@/lib/mock/audiences"
import type { MockFacture } from "@/lib/mock/invoices"
import { formatFCFA, formatDateCourte } from "@/lib/constants/finance"

interface ComputeOptions {
    /** Si false, masque les montants financiers (rôle sans finance.view) */
    canSeeFinance?: boolean
    /** Cap du nombre d'items retournés (default 50) */
    limit?: number
}

export function computeClientActivity(
    client: MockClient,
    dossiers: MockDossier[],
    audiences: MockAudience[],
    factures: MockFacture[],
    opts: ComputeOptions = {}
): ClientActivityItem[] {
    const canSeeFinance = opts.canSeeFinance ?? true
    const limit = opts.limit ?? 50
    const items: ClientActivityItem[] = []

    /* === Dossiers liés au client === */
    const clientDossiers = dossiers.filter((d) => d.clientId === client.id)
    const dossierIds = new Set(clientDossiers.map((d) => d.id))

    for (const d of clientDossiers) {
        items.push({
            id: `act-dos-open-${d.id}`,
            label: `Ouverture du dossier ${d.numero}`,
            sublabel: d.titre,
            at: d.dateOuverture,
            important: d.statut === "URGENT",
        })
        if (d.dateCloture) {
            items.push({
                id: `act-dos-close-${d.id}`,
                label: `Clôture du dossier ${d.numero}`,
                sublabel: d.titre,
                at: d.dateCloture,
                important: false,
            })
        }
    }

    /* === Audiences sur les dossiers du client === */
    for (const a of audiences) {
        if (!a.dossierId || !dossierIds.has(a.dossierId)) continue
        const dossier = clientDossiers.find((d) => d.id === a.dossierId)
        const dossierLabel = dossier ? dossier.numero : a.dossierId
        if (a.statut === "TERMINEE") {
            items.push({
                id: `act-aud-${a.id}`,
                label: `Audience tenue — ${a.titre}`,
                sublabel: `${dossierLabel} · ${a.juridiction ?? "Juridiction non précisée"}`,
                at: a.dateDebut,
                important: false,
            })
        } else if (a.statut === "A_VENIR") {
            const isFuture = new Date(a.dateDebut).getTime() >= Date.now()
            items.push({
                id: `act-aud-${a.id}`,
                label: isFuture ? `Audience programmée — ${a.titre}` : `Audience passée — ${a.titre}`,
                sublabel: `${dossierLabel} · ${a.juridiction ?? "—"}`,
                at: a.dateDebut,
                important: isFuture,
            })
        }
    }

    /* === Factures émises au client === */
    const facturesClient = factures.filter(
        (f) =>
            f.direction === "EMISE" &&
            f.clientId === client.id &&
            f.statut !== "BROUILLON" &&
            f.statut !== "ANNULEE"
    )

    for (const f of facturesClient) {
        items.push({
            id: `act-fac-${f.id}`,
            label: canSeeFinance
                ? `Facture émise ${f.numero} — ${formatFCFA(f.montantTTC)} TTC`
                : `Facture émise ${f.numero}`,
            sublabel: f.description ?? f.lignes[0]?.libelle ?? "Honoraires",
            at: f.date,
            important: f.statut === "EN_RETARD",
        })
        for (const p of f.paiements) {
            items.push({
                id: `act-pai-${p.id}`,
                label: canSeeFinance
                    ? `Paiement reçu — ${formatFCFA(p.montant)}`
                    : `Paiement reçu`,
                sublabel: `Acompte sur ${f.numero}`,
                at: p.date,
                important: false,
            })
        }
    }

    /* === Frais externes refacturables (factures reçues liées à un dossier de ce client) === */
    const fraisRefactures = factures.filter(
        (f) =>
            f.direction === "RECUE" &&
            f.dossierId !== null &&
            dossierIds.has(f.dossierId) &&
            f.refacturable &&
            f.statut !== "BROUILLON" &&
            f.statut !== "ANNULEE"
    )
    for (const f of fraisRefactures) {
        items.push({
            id: `act-frais-${f.id}`,
            label: canSeeFinance
                ? `Frais externe avancé — ${formatFCFA(f.montantTTC)}`
                : `Frais externe avancé`,
            sublabel: f.description ?? f.fournisseurNomLibre ?? "Frais",
            at: f.date,
            important: false,
        })
    }

    /* Tri date desc + cap */
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    return items.slice(0, limit)
}

/** Helper d'affichage humain ("il y a 3 jours" sinon date courte) — réexporté pour la fiche */
export function formatActivityDate(iso: string, ref = new Date()): string {
    const diffMs = ref.getTime() - new Date(iso).getTime()
    const diffDays = Math.floor(diffMs / 86_400_000)
    if (diffDays < 0) {
        const futureDays = -diffDays
        if (futureDays === 0) return "Aujourd'hui"
        if (futureDays === 1) return "Demain"
        if (futureDays < 7) return `Dans ${futureDays} jours`
        return formatDateCourte(iso)
    }
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} j.`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
    return formatDateCourte(iso)
}
