"use client"

import Link from "next/link"
import { SectionCard } from "./section-card"
import { useSectionData } from "./use-section-data"

interface InvoiceRow {
    id: string
    numero: string
    clientName: string
    montantRestant: number
}

function formatFCFA(value: number): string {
    return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA"
}

/** 3 lignes visibles (3 × 40px) + en-tête sticky (≈ 36px) = 156px ; scroll révèle jusqu'à 10 lignes max */
const SCROLL_MAX_HEIGHT = 156
const MAX_ROWS = 10

interface OverdueInvoicesProps {
    refreshKey?: number
}

export function OverdueInvoices({ refreshKey }: OverdueInvoicesProps) {
    const { data, isLoading, error, refresh } = useSectionData<InvoiceRow[]>(
        `/api/dashboard/invoices-overdue`,
        [],
        refreshKey
    )

    return (
        <SectionCard
            title="Factures à recouvrer"
            error={error}
            onRetry={refresh}
            actions={
                <Link
                    href="/comptabilite/journaux?type=VENTE"
                    className="font-body-sm text-body-sm text-primary-container hover:text-accent transition-colors"
                >
                    Voir tout
                </Link>
            }
        >
            {isLoading ? (
                <div className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
                    Chargement…
                </div>
            ) : data.length === 0 ? (
                <div className="px-4 py-10 text-center">
                    <span className="material-symbols-outlined text-[32px] text-[#166534]">
                        check_circle
                    </span>
                    <p className="font-body-sm text-body-sm text-on-background font-medium mt-1">
                        Tout est à jour
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Aucune facture en retard
                    </p>
                </div>
            ) : (
                <div
                    className="overflow-y-auto overflow-x-auto scrollbar-thin"
                    style={{ maxHeight: SCROLL_MAX_HEIGHT }}
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-surface-container-lowest">
                            <tr className="border-b border-outline-variant">
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal">
                                    Facture
                                </th>
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal">
                                    Client
                                </th>
                                <th className="py-2 px-4 font-label-caps text-label-caps text-on-surface-variant font-normal text-right">
                                    Reste dû
                                </th>
                            </tr>
                        </thead>
                        <tbody className="font-body-sm text-body-sm">
                            {data.slice(0, MAX_ROWS).map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors h-[40px]"
                                >
                                    <td className="py-2 px-4 font-mono-num text-mono-num text-xs">
                                        {row.numero}
                                    </td>
                                    <td className="py-2 px-4 text-on-background truncate" title={row.clientName}>
                                        {row.clientName}
                                    </td>
                                    <td className="py-2 px-4 font-mono-num text-mono-num text-right text-error font-medium tabular-nums whitespace-nowrap">
                                        {formatFCFA(row.montantRestant)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    )
}
