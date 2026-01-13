
export type AudienceStatus = "UPCOMING" | "COMPLETED" | "CANCELLED" | "POSTPONED"

export interface Audience {
    id: string
    title: string // Nom/Objet de l'audience
    date: string // ISO Date string
    juridiction: string
    avocatId: string // Avocat en charge / "MK" pour Maitre Konan
    avocatSignataireId?: string // Avocat signataire pour le compte du cabinet
    clientId: string
    dossierId: string
    status: AudienceStatus
    flashCrId?: string // Lien optionnel vers une FlashCR existante
    notes?: string
}

export interface FlashCR {
    id: string
    audienceId: string
    clientId: string
    dossierId: string
    contenu: string
    dateCreation: string
    destinataires: string[] // emails
    statutEnvoi: "SENT" | "DRAFT"
}
