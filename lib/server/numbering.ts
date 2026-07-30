/**
 * Auto-numérotation atomique des entités (CLI-YY-NNN, DOS-YY-NNN, etc.).
 *
 * Stratégie : transaction Prisma serializable + count(numero starts with prefix-YY).
 * Pas d'index de compteur séparé — simple et suffisant pour le volume cabinet.
 *
 * À surveiller : si forte concurrence (>100 créations/s), envisager une séquence
 * Postgres dédiée. Pour KadriLex c'est largement overkill.
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

function currentYY(): string {
    return (new Date().getFullYear() % 100).toString().padStart(2, "0")
}

async function nextNumber(
    tx: Prisma.TransactionClient,
    table: "client" | "dossier" | "audience" | "facture" | "diligence",
    prefix: string
): Promise<string> {
    const yy = currentYY()
    const startsWith = `${prefix}-${yy}-`
    let count: number
    if (table === "client") {
        count = await tx.client.count({ where: { numeroClient: { startsWith } } })
    } else if (table === "dossier") {
        count = await tx.dossier.count({ where: { numero: { startsWith } } })
    } else if (table === "audience") {
        count = await tx.audience.count({ where: { numero: { startsWith } } })
    } else if (table === "diligence") {
        count = await tx.diligence.count({ where: { numero: { startsWith } } })
    } else {
        count = await tx.facture.count({ where: { numero: { startsWith } } })
    }
    return `${prefix}-${yy}-${(count + 1).toString().padStart(3, "0")}`
}

export async function nextClientNumber(
    tx: Prisma.TransactionClient
): Promise<string> {
    return nextNumber(tx, "client", "CLI")
}

export async function nextDossierNumber(
    tx: Prisma.TransactionClient,
    kind: "CLIENT" | "ADMIN"
): Promise<string> {
    return nextNumber(tx, "dossier", kind === "ADMIN" ? "ADM" : "DOS")
}

export async function nextAudienceNumber(
    tx: Prisma.TransactionClient
): Promise<string> {
    return nextNumber(tx, "audience", "AUD")
}

export async function nextFactureNumber(
    tx: Prisma.TransactionClient,
    direction: "EMISE" | "RECUE"
): Promise<string> {
    return nextNumber(tx, "facture", direction === "EMISE" ? "FAC" : "REC")
}

export async function nextDiligenceNumber(
    tx: Prisma.TransactionClient
): Promise<string> {
    return nextNumber(tx, "diligence", "DIL")
}
