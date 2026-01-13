"use client"

import { create } from "zustand"
import { Invoice } from "@/lib/types/invoice"

interface InvoiceStore {
    invoices: Invoice[]
    addInvoice: (invoice: Omit<Invoice, "id">) => void
    updateInvoice: (id: string, updates: Partial<Invoice>) => void
    deleteInvoice: (id: string) => void
    getInvoiceById: (id: string) => Invoice | undefined
    getInvoicesByClient: (clientId: string) => Invoice[]
    getInvoicesByDossier: (dossierId: string) => Invoice[]
}

const DEMO_INVOICES: Invoice[] = [
    {
        id: "inv-1",
        number: "FA-2024-042",
        date: "2024-03-01T10:00:00Z",
        dueDate: "2024-03-31T10:00:00Z",
        clientId: "client-sotra",
        dossierId: "dossier-1",
        amountHT: 1500000,
        amountTTC: 1770000,
        amountPaid: 0,
        status: "UNPAID",
        items: []
    },
    {
        id: "inv-2",
        number: "FA-2024-038",
        date: "2024-02-15T10:00:00Z",
        dueDate: "2024-03-15T10:00:00Z",
        clientId: "client-2",
        dossierId: "dossier-2",
        audienceId: "aud-2",
        amountHT: 500000,
        amountTTC: 590000,
        amountPaid: 590000,
        status: "PAID",
        paymentMethod: "VIREMENT",
        paymentDate: "2024-02-28T14:30:00Z",
        attachmentUrl: "invoice_fa_2024_038.pdf",
        items: []
    },
    {
        id: "inv-3",
        number: "FA-2024-045",
        date: "2024-03-10T10:00:00Z",
        dueDate: "2024-04-10T10:00:00Z",
        clientId: "client-3",
        amountHT: 2000000,
        amountTTC: 2360000,
        amountPaid: 1000000,
        status: "PARTIAL",
        paymentMethod: "CHEQUE",
        paymentDate: "2024-03-15T09:00:00Z",
        items: []
    }
]

export const useInvoiceStore = create<InvoiceStore>()(
    persist(
        (set, get) => ({
            invoices: DEMO_INVOICES,

            addInvoice: (data) => set((state) => ({
                invoices: [...state.invoices, { ...data, id: `inv-${Date.now()}` }]
            })),

            updateInvoice: (id, updates) => set((state) => ({
                invoices: state.invoices.map((inv) =>
                    inv.id === id ? { ...inv, ...updates } : inv
                )
            })),

            deleteInvoice: (id) => set((state) => ({
                invoices: state.invoices.filter((inv) => inv.id !== id)
            })),

            getInvoiceById: (id) => get().invoices.find((inv) => inv.id === id),
            getInvoicesByClient: (clientId) => get().invoices.filter((inv) => inv.clientId === clientId),
            getInvoicesByDossier: (dossierId) => get().invoices.filter((inv) => inv.dossierId === dossierId),
        }),
        {
            name: "dedalys-invoices",
        }
    )
)
