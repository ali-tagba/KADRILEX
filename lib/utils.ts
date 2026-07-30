import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount) + ' FCFA'
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d)
}

export function formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d)
}

/**
 * Date relative en français — gère passé et futur correctement.
 * Exemples : "à l'instant", "il y a 2h", "hier", "il y a 3j", "demain", "dans 5j", "12 mai".
 */
export function formatRelativeFr(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const diff = Date.now() - d.getTime()
    const isFuture = diff < 0
    const absDiff = Math.abs(diff)
    const minutes = Math.floor(absDiff / 60_000)
    const hours = Math.floor(absDiff / 3_600_000)
    const days = Math.floor(absDiff / 86_400_000)

    if (minutes < 1) return "à l'instant"
    if (hours < 1) return isFuture ? `dans ${minutes} min` : `il y a ${minutes} min`
    if (days < 1) return isFuture ? `dans ${hours} h` : `il y a ${hours} h`
    if (days === 1) return isFuture ? "demain" : "hier"
    if (days < 7) return isFuture ? `dans ${days} j` : `il y a ${days} j`
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}
