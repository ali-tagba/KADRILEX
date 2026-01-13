
export type InvoiceStatus = "PAID" | "UNPAID" | "PARTIAL"

export interface Invoice {
    id: string
    number: string // Numéro de facture (ex: FA-2024-001)
    date: string // ISO Date string
    dueDate: string // Date d'échéance

    clientId: string
    dossierId?: string // Relation optionnelle
    audienceId?: string // Relation optionnelle (ex: facturation d'une audience spécifique)

    amountHT: number
    amountTTC: number
    amountPaid: number // Montant déjà réglé

    status: InvoiceStatus
    paymentMethod?: "VIREMENT" | "CHEQUE" | "ESPECES" | "MOBILE_MONEY"
    paymentDate?: string // Date du dernier paiement
    attachmentUrl?: string // URL du fichier (PDF/Image)

    items: InvoiceItem[]
}

export interface InvoiceItem {
    description: string
    quantity: number
    unitPrice: number
    total: number
}
