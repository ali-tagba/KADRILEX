"use client"

import { cn } from "@/lib/utils"

export type FinanceTabKey =
    | "dashboard"
    | "vue-ensemble"
    | "facturation"
    | "frais-externes"
    | "depenses"
    | "paie"
    | "apports"

interface FinanceTabsProps {
    active: FinanceTabKey
    onChange: (tab: FinanceTabKey) => void
    /** Compteurs optionnels affichés à droite du label de chaque onglet */
    counters?: Partial<Record<FinanceTabKey, number>>
}

const TABS: { key: FinanceTabKey; label: string; icon: string }[] = [
    { key: "dashboard", label: "Tableau de bord", icon: "dashboard" },
    { key: "vue-ensemble", label: "Vue d'ensemble", icon: "dataset" },
    { key: "facturation", label: "Facturation", icon: "receipt_long" },
    { key: "frais-externes", label: "Frais externes", icon: "inbox" },
    { key: "depenses", label: "Dépenses internes", icon: "account_balance_wallet" },
    { key: "paie", label: "Paie", icon: "groups" },
    { key: "apports", label: "Apports avocats", icon: "handshake" },
]

/**
 * Sub-nav onglets de la page Finance.
 * Pattern emprunté à fiche dossier (border-b sticky).
 */
export function FinanceTabs({ active, onChange, counters }: FinanceTabsProps) {
    return (
        <div className="flex-none border-b border-outline-variant bg-surface-container-lowest">
            <div className="flex gap-1 px-density-tight overflow-x-auto scrollbar-thin">
                {TABS.map((t) => {
                    const isActive = active === t.key
                    const count = counters?.[t.key]
                    return (
                        <button
                            key={t.key}
                            onClick={() => onChange(t.key)}
                            aria-pressed={isActive}
                            className={cn(
                                "px-3 py-2.5 inline-flex items-center gap-1.5 font-body-sm text-body-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
                                isActive
                                    ? "border-accent text-primary-container font-semibold"
                                    : "border-transparent text-on-surface-variant hover:text-primary-container hover:border-outline-variant"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                            <span>{t.label}</span>
                            {typeof count === "number" && count > 0 && (
                                <span
                                    className={cn(
                                        "ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full font-mono-num text-[10px] leading-none",
                                        isActive
                                            ? "bg-accent text-white"
                                            : "bg-surface-container-high text-on-surface-variant"
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
