"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { maskAccessCode } from "@/lib/constants/team"
import { postEntity, showApiError } from "@/lib/api/patch"
import type { MockMembre } from "@/lib/mock/employes"

interface AccesCodeSectionProps {
    membre: MockMembre
    onRegenerate: (newCode: string, generatedAt: string) => void
}

export function AccesCodeSection({ membre, onRegenerate }: AccesCodeSectionProps) {
    const [revealed, setRevealed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(membre.codeAcces)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
        } catch {
            /* fallback : sélection manuelle si clipboard refusé */
        }
    }

    const handleRegenerate = async () => {
        try {
            const result = await postEntity<{ codeAccesClair: string }>(
                `/api/membres/${membre.id}/regenerate-code`,
                {}
            )
            onRegenerate(result.codeAccesClair, new Date().toISOString())
            setConfirming(false)
            setRevealed(true)
            // Hack : afficher le code en clair temporairement via alert pour que le user puisse le noter
            alert(`Nouveau code généré (à transmettre au membre) :\n\n${result.codeAccesClair}\n\nL'ancien code est désormais invalide.`)
        } catch (e) {
            showApiError("Échec régénération")(e)
        }
    }

    const display = revealed ? membre.codeAcces : maskAccessCode(membre.codeAcces)

    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_1px_3px_rgba(31,26,20,0.08)] flex-shrink-0">
            <header className="px-density-medium py-2 bg-surface-container border-b border-outline-variant rounded-t-lg flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-outline">key</span>
                <h2 className="font-body-sm text-body-sm font-semibold text-on-surface flex-1">
                    Code d&apos;accès
                </h2>
                <span className="font-mono-num text-[10px] text-outline">
                    Généré{" "}
                    {new Date(membre.codeAccesGeneAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                    })}
                </span>
            </header>

            <div className="p-density-medium space-y-2">
                <p className="font-body-xs text-[11px] text-outline italic">
                    Identifiant unique pour la connexion à l&apos;application. Régénérer ce code
                    invalide immédiatement l&apos;ancien.
                </p>

                {/* Affichage du code + actions */}
                <div className="flex items-center gap-2">
                    <code
                        className={cn(
                            "font-mono-num font-semibold text-on-surface tabular-nums tracking-wider px-3 py-2 bg-surface-container-highest border border-outline-variant rounded flex-1 text-center select-all",
                            "text-base"
                        )}
                    >
                        {display}
                    </code>
                    <button
                        type="button"
                        onClick={() => setRevealed((v) => !v)}
                        className="p-2 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
                        title={revealed ? "Masquer" : "Révéler"}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {revealed ? "visibility_off" : "visibility"}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={cn(
                            "p-2 rounded border transition-colors",
                            copied
                                ? "border-[#166534]/30 bg-[#166534]/10 text-[#166534]"
                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                        )}
                        title={copied ? "Copié !" : "Copier"}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {copied ? "check" : "content_copy"}
                        </span>
                    </button>
                </div>

                {/* Régénération */}
                {confirming ? (
                    <div className="bg-error-container/40 border border-error/30 rounded p-2.5 flex flex-col gap-2">
                        <p className="font-body-sm text-body-sm text-on-error-container leading-snug">
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                                warning
                            </span>
                            Régénérer le code d&apos;accès. L&apos;ancien code{" "}
                            <span className="font-mono-num font-semibold">{maskAccessCode(membre.codeAcces)}</span>{" "}
                            ne fonctionnera plus.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleRegenerate}
                                className="flex-1 px-2 py-1 rounded bg-error text-white font-body-sm text-body-sm hover:bg-opacity-90"
                            >
                                Régénérer maintenant
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirming(false)}
                                className="flex-1 px-2 py-1 rounded border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="w-full px-3 py-1.5 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors font-body-sm text-body-sm flex items-center justify-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Régénérer le code
                    </button>
                )}
            </div>
        </section>
    )
}
