"use client"

import { ReactNode } from "react"

interface SectionCardProps {
    title: string
    actions?: ReactNode
    children: ReactNode
    error?: string | null
    onRetry?: () => void
    className?: string
}

export function SectionCard({
    title,
    actions,
    children,
    error,
    onRetry,
    className = "",
}: SectionCardProps) {
    return (
        <section
            className={`bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden ${className}`}
        >
            <header className="bg-surface-container py-2 px-4 border-b border-outline-variant flex justify-between items-center gap-3">
                <h2 className="font-h2 text-h2 text-primary-container text-base font-serif">
                    {title}
                </h2>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </header>

            {error ? (
                <div
                    role="alert"
                    className="px-4 py-2 bg-error-container border-b border-outline-variant flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[16px] text-error">
                        error
                    </span>
                    <span className="font-body-sm text-body-sm text-on-error-container flex-1">
                        Impossible de charger
                    </span>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="font-body-sm text-body-sm text-on-error-container underline hover:no-underline"
                        >
                            Réessayer
                        </button>
                    )}
                </div>
            ) : null}

            <div>{children}</div>
        </section>
    )
}
