"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { postEntity, showApiError } from "@/lib/api/patch"
import type { Membre } from "@prisma/client"

interface AccesCodeSectionProps {
    membre: Membre
    onRegenerate: (newCode: string, generatedAt: string) => void
}

export function AccesCodeSection({ membre, onRegenerate }: AccesCodeSectionProps) {
    const [confirming, setConfirming] = useState(false)
    const [plainCode, setPlainCode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        if (!plainCode) return
        try {
            await navigator.clipboard.writeText(plainCode)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
        } catch {
            /* fallback */
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
            setPlainCode(result.codeAccesClair)
        } catch (e) {
            showApiError("Échec régénération")(e)
        }
    }

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

            <div className="p-density-medium flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex-1 px-3 py-2 bg-surface-container-highest rounded border border-outline-variant font-mono text-center tracking-widest text-[20px] font-bold text-on-surface">
                        {plainCode || "••••••"}
                    </div>

                    {plainCode && (
                        <button
                            onClick={handleCopy}
                            title="Copier"
                            className="p-2 rounded-md hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {copied ? "check" : "content_copy"}
                            </span>
                        </button>
                    )}
                </div>
                
                {plainCode && (
                    <div className="text-[12px] text-primary bg-primary-container/30 px-2 py-1 rounded text-center">
                        Ce code ne sera plus affiché. Veuillez le transmettre au membre.
                    </div>
                )}

                {confirming ? (
                    <div className="bg-error-container text-on-error-container p-3 rounded-lg flex flex-col gap-2 animate-in slide-in-from-top-1">
                        <p className="font-body-sm text-body-sm font-medium">
                            Générer un nouveau code ? L&apos;actuel sera désactivé.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRegenerate}
                                className="flex-1 bg-error hover:bg-error/90 text-on-error py-1.5 rounded text-sm font-medium transition-colors"
                            >
                                Confirmer
                            </button>
                            <button
                                onClick={() => setConfirming(false)}
                                className="flex-1 border border-error/20 hover:bg-error/10 text-error py-1.5 rounded text-sm font-medium transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirming(true)}
                        className="flex items-center justify-center gap-2 w-full py-1.5 hover:bg-surface-container rounded transition-colors text-primary font-medium text-sm"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Générer un nouveau code
                    </button>
                )}
            </div>
        </section>
    )
}
