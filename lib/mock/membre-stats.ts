/**
 * Calcul de la "charge stratégique" d'un membre :
 * combien de dossiers, clients, tâches, audiences, bulletins lui sont rattachés.
 *
 * Pendant la phase de transition (sprint A) les modèles existants utilisent encore
 * `AvocatCabinet` (string) comme FK. On bridge via `membre.avocatCabinetKey` et le
 * nom complet du membre. Le sprint C migrera tout vers les IDs (`responsableId`,
 * `equipeIds[]`) et ce helper deviendra plus simple et plus précis.
 */

import { mockClients, type MockClient } from "@/lib/mock/clients"
import { mockDossiers, type MockDossier } from "@/lib/mock/dossiers"
import { mockAudiences, mockTaches, type MockAudience, type MockTache } from "@/lib/mock/audiences"
import type { Membre } from "@prisma/client"
import { mockMembres } from "@/lib/mock/employes"
import { membreIdFromAvocatKey, membreIdFromText } from "@/lib/mock/membre-bridge"

export interface MembreStats {
    clients: number
    dossiers: number
    dossiersActifs: number
    audiencesAVenir: number
    audiencesTotal: number
    tachesEnCours: number
    tachesTotal: number
    tachesEnRetard: number
    /** Charge composite [0..100] — pondération naïve pour visualiser la barre de progression */
    chargePct: number
}

const EMPTY: MembreStats = {
    clients: 0,
    dossiers: 0,
    dossiersActifs: 0,
    audiencesAVenir: 0,
    audiencesTotal: 0,
    tachesEnCours: 0,
    tachesTotal: 0,
    tachesEnRetard: 0,
    chargePct: 0,
}

/**
 * Détermine si un membre appartient à une entité — vérifie d'abord les nouveaux
 * champs `responsableId`/`equipeIds[]`, puis fallback sur le legacy.
 */
function isMembreOnClient(c: MockClient, membreId: string, fallbackKey: string | null): boolean {
    if (c.responsableId === membreId) return true
    if (c.equipeIds.includes(membreId)) return true
    /* Fallback bridge si l'entité n'a pas encore été migrée */
    if (c.responsableId === null && c.equipeIds.length === 0 && fallbackKey) {
        return membreIdFromAvocatKey(c.avocatEnCharge) === membreId
    }
    return false
}

function isMembreOnDossier(d: MockDossier, membreId: string, parent: MockClient | null, fallbackKey: string | null): boolean {
    if (d.responsableId === membreId) return true
    if (d.equipeIds.includes(membreId)) return true
    /* Héritage du client parent si dossier non migré */
    if (d.responsableId === null && d.equipeIds.length === 0 && parent) {
        return isMembreOnClient(parent, membreId, fallbackKey)
    }
    return false
}

function isMembreOnAudience(a: MockAudience, membreId: string): boolean {
    if (a.responsableId === membreId) return true
    if (a.equipeIds.includes(membreId)) return true
    /* Fallback bridge */
    if (a.responsableId === null && a.equipeIds.length === 0) {
        return membreIdFromAvocatKey(a.avocatPlaidant) === membreId
    }
    return false
}

function isMembreOnTache(t: MockTache, membreId: string): boolean {
    if (t.responsableId === membreId) return true
    if (t.equipeIds.includes(membreId)) return true
    if (t.responsableId === null && t.equipeIds.length === 0) {
        return membreIdFromText(t.assigneA) === membreId
    }
    return false
}

export function computeMembreStats(membre: Membre, ref = new Date()): MembreStats {
    if (!membre.actif) return EMPTY

    /* Clients */
    const clients = mockClients.filter((c) =>
        isMembreOnClient(c, membre.id, membre.avocatCabinetKey)
    )

    /* Dossiers : direct ou via héritage du client parent */
    const dossiers = mockDossiers.filter((d) => {
        const parent = d.clientId ? mockClients.find((c) => c.id === d.clientId) ?? null : null
        return isMembreOnDossier(d, membre.id, parent, membre.avocatCabinetKey)
    })
    const dossiersActifs = dossiers.filter((d) => d.statut === "EN_COURS")

    /* Audiences */
    const audiencesTotal = mockAudiences.filter((a) => isMembreOnAudience(a, membre.id))
    const audiencesAVenir = audiencesTotal.filter((a) => {
        const d = new Date(a.dateDebut)
        return d.getTime() >= ref.getTime() && a.statut !== "ANNULEE" && a.statut !== "REPORTEE"
    })

    /* Tâches */
    const tachesTotal = mockTaches.filter((t) => isMembreOnTache(t, membre.id))
    const tachesEnCours = tachesTotal.filter(
        (t) => t.statut !== "FAIT" && t.statut !== "ANNULE"
    )
    const tachesEnRetard = tachesEnCours.filter((t) => {
        if (!t.echeance) return false
        return new Date(t.echeance).getTime() < ref.getTime()
    })

    /* Charge composite : pondération naïve, plafonnée 100 */
    const score =
        dossiersActifs.length * 4 +
        audiencesAVenir.length * 8 +
        tachesEnCours.length * 2 +
        tachesEnRetard.length * 6
    const chargePct = Math.min(100, Math.round(score))

    return {
        clients: clients.length,
        dossiers: dossiers.length,
        dossiersActifs: dossiersActifs.length,
        audiencesAVenir: audiencesAVenir.length,
        audiencesTotal: audiencesTotal.length,
        tachesEnCours: tachesEnCours.length,
        tachesTotal: tachesTotal.length,
        tachesEnRetard: tachesEnRetard.length,
        chargePct,
    }
}

/** Récupère le détail (objets, pas juste compteurs) — pour la fiche membre. */
export function getMembreActivity(membre: Membre, ref = new Date()) {
    const clients = mockClients.filter((c) => isMembreOnClient(c, membre.id, membre.avocatCabinetKey))
    const dossiers = mockDossiers.filter((d) => {
        const parent = d.clientId ? mockClients.find((c) => c.id === d.clientId) ?? null : null
        return isMembreOnDossier(d, membre.id, parent, membre.avocatCabinetKey)
    })
    const audiences = mockAudiences
        .filter((a) => isMembreOnAudience(a, membre.id))
        .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime())
    const taches = mockTaches
        .filter((t) => isMembreOnTache(t, membre.id))
        .sort((a, b) => {
            const aDate = a.echeance ? new Date(a.echeance).getTime() : Infinity
            const bDate = b.echeance ? new Date(b.echeance).getTime() : Infinity
            return aDate - bDate
        })
    return { clients, dossiers, audiences, taches, ref }
}

/** Liste des membres triés par rang de rôle puis nom. */
export function sortMembres(membres: Membre[]): Membre[] {
    const ROLE_RANG: Record<string, number> = {
        ASSOCIE_GERANT: 1,
        ASSOCIE: 2,
        AVOCAT: 3,
        JURISTE: 4,
        STAGIAIRE: 5,
        SECRETAIRE: 6,
    }
    return [...membres].sort((a, b) => {
        if (a.actif !== b.actif) return a.actif ? -1 : 1
        const ra = ROLE_RANG[a.role] ?? 99
        const rb = ROLE_RANG[b.role] ?? 99
        if (ra !== rb) return ra - rb
        return a.nom.localeCompare(b.nom, "fr")
    })
}

/** Re-export pour confort : `import { mockMembres } from "@/lib/mock/membre-stats"` */
export { mockMembres }
export type { Membre }
