import { safeDict } from "./safe-dict"
/**
 * Constantes du module Équipe.
 * - ROLES : hiérarchie applicative qui pilote l'accès (RBAC)
 * - PERMISSIONS : matrice par rôle (utilisée au sprint B)
 * Voir BRIEF_DESIGN_EQUIPE.md (à venir).
 */

/* ============================================================
   RÔLES — hiérarchie du cabinet
   ============================================================ */

export const ROLES = {
    ASSOCIE_GERANT: {
        label: "Associé gérant",
        labelCourt: "Gérant",
        icon: "shield_person",
        chip: "bg-[#502e0f] text-white",
        description: "Accès total à tous les modules. Peut gérer l'équipe et les permissions.",
        rang: 1,
    },
    ASSOCIE: {
        label: "Associé",
        labelCourt: "Associé",
        icon: "verified",
        chip: "bg-[#7f5533] text-white",
        description: "Accès complet sauf gestion équipe / permissions.",
        rang: 2,
    },
    AVOCAT: {
        label: "Avocat collaborateur",
        labelCourt: "Avocat",
        icon: "balance",
        chip: "bg-[#c8772f] text-white",
        description: "Voit ses dossiers, clients et audiences. Pas d'accès finance.",
        rang: 3,
    },
    JURISTE: {
        label: "Juriste",
        labelCourt: "Juriste",
        icon: "menu_book",
        chip: "bg-[#a08152] text-white",
        description: "Travaille sur les dossiers attribués. Lecture limitée.",
        rang: 4,
    },
    STAGIAIRE: {
        label: "Stagiaire",
        labelCourt: "Stagiaire",
        icon: "school",
        chip: "bg-[#d3a96a] text-on-surface",
        description: "Lecture seule sur ses dossiers. Pas de modification.",
        rang: 5,
    },
    SECRETAIRE: {
        label: "Secrétaire",
        labelCourt: "Secrétaire",
        icon: "support_agent",
        chip: "bg-[#83746b] text-white",
        description: "Gère clients, audiences, tâches, biblio. Pas d'accès finance.",
        rang: 6,
    },
} as const

export type RoleKey = keyof typeof ROLES

export const ROLE_KEYS: RoleKey[] = (Object.keys(ROLES) as RoleKey[]).sort(
    (a, b) => ROLES[a].rang - ROLES[b].rang
)

/* ============================================================
   PERMISSIONS — matrice par rôle (utilisée au sprint B)
   Forme : "module.action" → "ALL" | "OWN" | "NONE"
     ALL  = voir/modifier toute la donnée
     OWN  = voir/modifier seulement ce dont on est responsable / membre de l'équipe
     NONE = pas d'accès (UI cachée)
   ============================================================ */

export type PermissionScope = "ALL" | "OWN" | "NONE"

export type PermissionKey =
    | "clients.view"
    | "clients.write"
    | "dossiers.view"
    | "dossiers.write"
    | "audiences.view"
    | "audiences.write"
    | "taches.view"
    | "taches.write"
    | "diligences.view"
    | "diligences.write"
    | "bibliotheque.view"
    | "bibliotheque.write"
    | "finance.view"
    | "finance.write"
    | "paie.view"
    | "paie.write"
    | "equipe.view"
    | "equipe.write"
    | "dashboard.global"

export const ROLE_PERMISSIONS: Record<RoleKey, Record<PermissionKey, PermissionScope>> = {
    ASSOCIE_GERANT: {
        "clients.view": "ALL",
        "clients.write": "ALL",
        "dossiers.view": "ALL",
        "dossiers.write": "ALL",
        "audiences.view": "ALL",
        "audiences.write": "ALL",
        "taches.view": "ALL",
        "taches.write": "ALL",
        "diligences.view": "ALL",
        "diligences.write": "ALL",
        "bibliotheque.view": "ALL",
        "bibliotheque.write": "ALL",
        "finance.view": "ALL",
        "finance.write": "ALL",
        "paie.view": "ALL",
        "paie.write": "ALL",
        "equipe.view": "ALL",
        "equipe.write": "ALL",
        "dashboard.global": "ALL",
    },
    ASSOCIE: {
        "clients.view": "ALL",
        "clients.write": "ALL",
        "dossiers.view": "ALL",
        "dossiers.write": "ALL",
        "audiences.view": "ALL",
        "audiences.write": "ALL",
        "taches.view": "ALL",
        "taches.write": "ALL",
        "diligences.view": "ALL",
        "diligences.write": "ALL",
        "bibliotheque.view": "ALL",
        "bibliotheque.write": "ALL",
        "finance.view": "ALL",
        "finance.write": "OWN",
        "paie.view": "OWN",
        "paie.write": "NONE",
        "equipe.view": "ALL",
        "equipe.write": "NONE",
        "dashboard.global": "ALL",
    },
    AVOCAT: {
        "clients.view": "OWN",
        "clients.write": "OWN",
        "dossiers.view": "OWN",
        "dossiers.write": "OWN",
        "audiences.view": "OWN",
        "audiences.write": "ALL",
        "taches.view": "OWN",
        "taches.write": "ALL",
        "diligences.view": "OWN",
        "diligences.write": "ALL",
        "bibliotheque.view": "ALL",
        "bibliotheque.write": "ALL",
        "finance.view": "NONE",
        "finance.write": "NONE",
        "paie.view": "OWN",
        "paie.write": "NONE",
        "equipe.view": "ALL",
        "equipe.write": "NONE",
        "dashboard.global": "OWN",
    },
    JURISTE: {
        "clients.view": "OWN",
        "clients.write": "OWN",
        "dossiers.view": "OWN",
        "dossiers.write": "OWN",
        "audiences.view": "OWN",
        "audiences.write": "OWN",
        "taches.view": "OWN",
        "taches.write": "OWN",
        "diligences.view": "OWN",
        "diligences.write": "OWN",
        "bibliotheque.view": "ALL",
        "bibliotheque.write": "ALL",
        "finance.view": "NONE",
        "finance.write": "NONE",
        "paie.view": "OWN",
        "paie.write": "NONE",
        "equipe.view": "ALL",
        "equipe.write": "NONE",
        "dashboard.global": "OWN",
    },
    STAGIAIRE: {
        "clients.view": "OWN",
        "clients.write": "NONE",
        "dossiers.view": "OWN",
        "dossiers.write": "NONE",
        "audiences.view": "OWN",
        "audiences.write": "NONE",
        "taches.view": "OWN",
        "taches.write": "OWN",
        "diligences.view": "OWN",
        "diligences.write": "OWN",
        "bibliotheque.view": "ALL",
        "bibliotheque.write": "NONE",
        "finance.view": "NONE",
        "finance.write": "NONE",
        "paie.view": "OWN",
        "paie.write": "NONE",
        "equipe.view": "ALL",
        "equipe.write": "NONE",
        "dashboard.global": "OWN",
    },
    SECRETAIRE: {
        "clients.view": "ALL",
        "clients.write": "ALL",
        "dossiers.view": "ALL",
        "dossiers.write": "OWN",
        "audiences.view": "ALL",
        "audiences.write": "ALL",
        "taches.view": "ALL",
        "taches.write": "ALL",
        "diligences.view": "ALL",
        "diligences.write": "ALL",
        "bibliotheque.view": "ALL",
        "bibliotheque.write": "ALL",
        "finance.view": "NONE",
        "finance.write": "NONE",
        "paie.view": "OWN",
        "paie.write": "NONE",
        "equipe.view": "ALL",
        "equipe.write": "NONE",
        "dashboard.global": "OWN",
    },
}

/* ============================================================
   STATUTS D'INVITATION
   ============================================================ */

export const INVITATION_STATUTS = {
    ACTIF: { label: "Actif", chip: "bg-[#e8f5e9] text-[#166534]", icon: "check_circle" },
    INVITE: { label: "Invité", chip: "bg-[#fff3e0] text-[#b45309]", icon: "mail" },
    JAMAIS_CONNECTE: {
        label: "Jamais connecté",
        chip: "bg-surface-container-high text-on-surface-variant",
        icon: "schedule",
    },
    DESACTIVE: {
        label: "Désactivé",
        chip: "bg-surface-container text-outline line-through",
        icon: "block",
    },
} as const

export type InvitationStatutKey = keyof typeof INVITATION_STATUTS

/* ============================================================
   Helpers d'affichage
   ============================================================ */

export function fullName(m: { prenom: string; nom: string }): string {
    return `${m.prenom} ${m.nom}`
}

export function initials(m: { prenom: string; nom: string }): string {
    return `${m.prenom.charAt(0)}${m.nom.charAt(0)}`.toUpperCase()
}

export function ancienneteAnnees(dateEmbauche: string, ref = new Date()): number {
    const e = new Date(dateEmbauche)
    return Math.max(0, Math.floor((ref.getTime() - e.getTime()) / (365.25 * 24 * 3600 * 1000)))
}

export function ancienneteLabel(dateEmbauche: string, ref = new Date()): string {
    const annees = ancienneteAnnees(dateEmbauche, ref)
    if (annees === 0) {
        return `Depuis ${new Date(dateEmbauche).toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
        })}`
    }
    return `${annees} an${annees > 1 ? "s" : ""} d'expérience`
}

/* ============================================================
   Code d'accès — identifiant unique + révocable
   ============================================================ */

/**
 * Génère un code d'accès 12 chars groupé en 3-3-4 (ex: "X7K-9MN-2QPA").
 * Caractères ambigus exclus (0/O, 1/I, etc.) pour saisie sans erreur.
 *
 * Le code est l'identifiant unique du membre pour se connecter (sprint F).
 * Il est stocké en clair dans le mock — sera hashé côté API en prod.
 *
 * Régénérer ce code invalide automatiquement l'ancien : on écrase la valeur,
 * et le contrôle d'accès au login compare strictement `code === membre.codeAcces`.
 */
export function generateAccessCode(): string {
    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sans 0/O/1/I
    const segLengths = [3, 3, 4]
    return segLengths
        .map((len) =>
            Array.from({ length: len }, () =>
                ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
            ).join("")
        )
        .join("-")
}

/** Masque le code pour affichage : "X7K-9MN-2QPA" → "X7K-•••-••••" */
export function maskAccessCode(code: string): string {
    return code
        .split("-")
        .map((seg, i) => (i === 0 ? seg : seg.replace(/./g, "•")))
        .join("-")
}
