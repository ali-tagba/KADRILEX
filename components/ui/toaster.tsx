"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/* ============================================================
   Toaster — système de notifications non-bloquant.
   Usage :  import { toast } from "@/components/ui/toaster"
            toast.success("PDF généré")
            toast.error("Échec : ...")
            toast.info("Sauvegarde en cours…")
   Mount <Toaster /> une fois dans le root layout.
   ============================================================ */

type ToastVariant = "success" | "error" | "info"
interface ToastItem {
    id: number
    message: string
    variant: ToastVariant
    duration: number
}

let counter = 0
const listeners: Array<(t: ToastItem) => void> = []

function emit(message: string, variant: ToastVariant, duration: number) {
    const t: ToastItem = { id: ++counter, message, variant, duration }
    listeners.forEach((l) => l(t))
}

export const toast = {
    success: (msg: string, duration = 3500) => emit(msg, "success", duration),
    error: (msg: string, duration = 5000) => emit(msg, "error", duration),
    info: (msg: string, duration = 3000) => emit(msg, "info", duration),
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; iconColor: string }> = {
    success: {
        bg: "bg-[#f1faee]",
        border: "border-[#a7d4b3]",
        icon: "check_circle",
        iconColor: "text-[#166534]",
    },
    error: {
        bg: "bg-[#fef0f0]",
        border: "border-[#f3b3b3]",
        icon: "error",
        iconColor: "text-error",
    },
    info: {
        bg: "bg-surface-container",
        border: "border-outline-variant",
        icon: "info",
        iconColor: "text-accent",
    },
}

export function Toaster() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    useEffect(() => {
        const onToast = (t: ToastItem) => {
            setToasts((prev) => [...prev, t])
            window.setTimeout(() => {
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }, t.duration)
        }
        listeners.push(onToast)
        return () => {
            const i = listeners.indexOf(onToast)
            if (i >= 0) listeners.splice(i, 1)
        }
    }, [])

    if (toasts.length === 0) return null

    return (
        <div
            className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none"
            aria-live="polite"
            aria-atomic="false"
        >
            {toasts.map((t) => {
                const s = VARIANT_STYLES[t.variant]
                return (
                    <div
                        key={t.id}
                        role="status"
                        className={cn(
                            "pointer-events-auto inline-flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-[0_8px_24px_rgba(31,26,20,0.12),0_2px_6px_rgba(31,26,20,0.06)]",
                            "animate-in fade-in slide-in-from-bottom-2 duration-200",
                            s.bg,
                            s.border
                        )}
                    >
                        <span
                            className={cn("material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5", s.iconColor)}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            {s.icon}
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface flex-1 leading-relaxed">
                            {t.message}
                        </p>
                        <button
                            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                            className="text-outline hover:text-on-surface transition-colors -mr-1 -mt-1"
                            aria-label="Fermer"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
