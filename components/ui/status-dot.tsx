import { cn } from "@/lib/utils"

const TONES = {
    success: { text: "text-success", dot: "bg-success" },
    warning: { text: "text-secondary", dot: "bg-secondary" },
    error: { text: "text-error", dot: "bg-error" },
    accent: { text: "text-primary-container", dot: "bg-accent" },
    neutral: { text: "text-on-surface-variant", dot: "bg-outline" },
} as const

export type StatusTone = keyof typeof TONES

/** Puce colorée + libellé — remplace les badges/chips à fond coloré (pattern
 *  emprunté à la maquette de référence : plus sobre, moins "logiciel générique"). */
export function StatusDot({
    tone,
    label,
    className,
}: {
    tone: StatusTone
    label: string
    className?: string
}) {
    const t = TONES[tone]
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap", t.text, className)}>
            <span className={cn("w-[6px] h-[6px] rounded-full flex-none", t.dot)} />
            {label}
        </span>
    )
}
