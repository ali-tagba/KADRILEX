"use client"

import { useEffect } from "react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.error("[KadriLex GlobalError]", error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="max-w-xl w-full bg-error-container/40 border border-error/40 rounded-lg p-6 space-y-3">
                <h2 className="text-lg font-semibold text-error">
                    Une erreur est survenue
                </h2>
                <p className="text-sm text-on-surface-variant">
                    {error.message ?? "Erreur inconnue"}
                </p>
                {error.digest && (
                    <p className="text-xs text-outline font-mono">
                        Digest : {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="px-4 py-2 rounded bg-primary text-on-primary text-sm hover:opacity-90"
                >
                    Réessayer
                </button>
            </div>
        </div>
    )
}
