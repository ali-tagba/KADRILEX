import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth/server-permissions"

/**
 * Activité récente (timeline) — agrège les 10 dernières actions sur :
 * dossiers, audiences, factures, paiements, clients, tâches.
 * Le tri est fait par date d'événement (createdAt / updatedAt selon le type).
 */

type ActivityItem = {
    id: string
    type: "DOSSIER" | "AUDIENCE" | "FACTURE" | "PAIEMENT" | "CLIENT" | "TACHE"
    label: string
    sublabel: string
    href: string
    at: string
    actorInitials: string
    actorName: string
}

function initials(prenom: string | null | undefined, nom: string | null | undefined): string {
    const p = (prenom?.[0] ?? "").toUpperCase()
    const n = (nom?.[0] ?? "").toUpperCase()
    return (p + n) || "??"
}

export async function GET() {
    try {
        await requireAuth()
        const PER_TYPE = 5

        const [dossiers, audiences, factures, paiements, clients, taches] = await Promise.all([
            prisma.dossier.findMany({
                orderBy: { updatedAt: "desc" },
                take: PER_TYPE,
                include: { responsable: true, client: true },
            }),
            prisma.audience.findMany({
                orderBy: { updatedAt: "desc" },
                take: PER_TYPE,
                include: { dossier: { include: { client: true } } },
            }),
            prisma.facture.findMany({
                orderBy: { updatedAt: "desc" },
                take: PER_TYPE,
                include: { client: true },
            }),
            prisma.paiement.findMany({
                orderBy: { createdAt: "desc" },
                take: PER_TYPE,
                include: { facture: { include: { client: true } } },
            }),
            prisma.client.findMany({
                orderBy: { updatedAt: "desc" },
                take: PER_TYPE,
                include: { responsable: true },
            }),
            prisma.tache.findMany({
                orderBy: { updatedAt: "desc" },
                take: PER_TYPE,
                include: { responsable: true },
            }),
        ])

        const clientLabel = (c: { type: string; raisonSociale: string | null; nom: string | null; prenom: string | null } | null) => {
            if (!c) return "—"
            return c.type === "PERSONNE_MORALE"
                ? c.raisonSociale ?? "—"
                : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "—"
        }

        const items: ActivityItem[] = []

        for (const d of dossiers) {
            items.push({
                id: `dos-${d.id}`,
                type: "DOSSIER",
                label: `Dossier ${d.numero}`,
                sublabel: `${clientLabel(d.client)} · ${d.titre}`,
                href: `/dossiers/${d.id}`,
                at: d.updatedAt.toISOString(),
                actorInitials: initials(d.responsable?.prenom, d.responsable?.nom),
                actorName: d.responsable ? `${d.responsable.prenom} ${d.responsable.nom}` : "—",
            })
        }
        for (const a of audiences) {
            items.push({
                id: `aud-${a.id}`,
                type: "AUDIENCE",
                label: a.titre ?? `Audience ${a.numero}`,
                sublabel: `${clientLabel(a.dossier?.client ?? null)} · ${a.juridiction ?? "—"}`,
                href: `/audiences/${a.id}`,
                at: a.updatedAt.toISOString(),
                actorInitials: "—",
                actorName: "Système",
            })
        }
        for (const f of factures) {
            items.push({
                id: `fac-${f.id}`,
                type: "FACTURE",
                label: `Facture ${f.numero}`,
                sublabel: `${clientLabel(f.client)} · ${(f.montantTTC / 1000).toFixed(0)} k FCFA`,
                href: `/facturation?tab=facturation&id=${f.id}`,
                at: f.updatedAt.toISOString(),
                actorInitials: "—",
                actorName: "Système",
            })
        }
        for (const p of paiements) {
            items.push({
                id: `pai-${p.id}`,
                type: "PAIEMENT",
                label: `Paiement ${p.facture?.numero ?? ""}`,
                sublabel: `+${(p.montant / 1000).toFixed(0)} k FCFA · ${clientLabel(p.facture?.client ?? null)}`,
                href: `/facturation?tab=facturation&id=${p.factureId}`,
                at: p.createdAt.toISOString(),
                actorInitials: "—",
                actorName: "Système",
            })
        }
        for (const c of clients) {
            items.push({
                id: `cli-${c.id}`,
                type: "CLIENT",
                label: clientLabel(c),
                sublabel: c.numeroClient,
                href: `/clients/${c.id}`,
                at: c.updatedAt.toISOString(),
                actorInitials: initials(c.responsable?.prenom, c.responsable?.nom),
                actorName: c.responsable ? `${c.responsable.prenom} ${c.responsable.nom}` : "—",
            })
        }
        for (const t of taches) {
            items.push({
                id: `tac-${t.id}`,
                type: "TACHE",
                label: t.titre,
                sublabel: `${t.statut}${t.priorite !== "MOYENNE" ? ` · ${t.priorite}` : ""}`,
                href: `/taches?id=${t.id}`,
                at: t.updatedAt.toISOString(),
                actorInitials: initials(t.responsable?.prenom, t.responsable?.nom),
                actorName: t.responsable ? `${t.responsable.prenom} ${t.responsable.nom}` : "—",
            })
        }

        // Tri global et top 10
        items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        return NextResponse.json(items.slice(0, 10))
    } catch (e) {
        const status = (e as { status?: number }).status ?? 500
        if (status === 401) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
        console.error("[dashboard/activity] error", e)
        return NextResponse.json([])
    }
}
