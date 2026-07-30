/**
 * Données mockées pour le dashboard — vidées en attendant le branchement DB.
 * Données réelles préservées dans `lib/demo/dashboard.ts` (snapshot V1).
 */

export const mockOverview = {
    audiencesToday: 0,
    nextAudience: null as null | {
        id: string
        label: string
        date: string
        heure: string
    },
    activeDossiers: 0,
    activeDossiersDelta: 0,
    activeTasksCount: 0,
    overdueTasksCount: 0,
    activeClientsCount: 0,
    activeTeamCount: 0,
}

export const mockAudiences: Array<{
    id: string
    label: string
    date: string
    heure: string
    duree: number
    clientName: string
    dossierNumero: string
    juridiction: string
    statut: string
    avocat: string
}> = []

export const mockOverdueInvoices: Array<{
    id: string
    numero: string
    date: string
    dateEcheance: string
    daysLate: number
    clientName: string
    dossierNumero: string
    montantTTC: number
    montantPaye: number
    montantRestant: number
    statut: string
}> = []

export const mockActivity: Array<{
    id: string
    type: "DOSSIER" | "AUDIENCE" | "FACTURE" | "PAIEMENT" | "CLIENT" | "TACHE"
    label: string
    sublabel: string
    href: string
    at: string
    actorInitials: string
    actorName: string
}> = []

export const mockRecentDossiers: Array<{
    id: string
    numero: string
    titre: string
    clientName: string
    statut: string
    avocatPrincipal: string
    dateOuverture: string
    audiencesCount: number
    invoicesCount: number
    lastAudience: { date: string; statut: string } | null
}> = []
