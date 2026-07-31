"use client"

/**
 * Context global du membre courant — alimente le RBAC partout dans l'app.
 *
 * Sprint 0 : bootstrap depuis /api/me au mount, avec un membre fallback (gérant
 * stub) pour éviter tout crash avant la réponse de l'API. Persistance localStorage
 * conservée pour le UserSwitcher dev-only.
 *
 * À terme (Sprint 5) : retirer FALLBACK_MEMBRE quand l'auth est obligatoire
 * (rediriger vers /login si /api/me retourne null).
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react"
import { useRouter, usePathname } from "next/navigation"
import { mockMembres } from "@/lib/mock/employes"
import type { Membre } from "@prisma/client"
import {
    can as canFn,
    hasAccess as hasAccessFn,
    getScope as getScopeFn,
    filterByVisibility as filterByVisibilityFn,
    type OwnableResource,
} from "@/lib/auth/permissions"
import type { PermissionKey } from "@/lib/constants/team"

const STORAGE_KEY = "kadrilex.currentMembreId"
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "0"

interface CurrentUserContextValue {
    membre: Membre
    /* Liste des membres connus (pour le UserSwitcher) */
    membres: Membre[]
    /* Bascule (dev) */
    setMembreId: (id: string) => void

    /* Helpers RBAC pré-bindés au membre courant */
    can: (perm: PermissionKey, resource?: OwnableResource) => boolean
    hasAccess: (perm: PermissionKey) => boolean
    getScope: (perm: PermissionKey) => "ALL" | "OWN" | "NONE"
    filterByVisibility: <T extends OwnableResource>(items: T[], perm: PermissionKey) => T[]
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

/* ============================================================
   FALLBACK_MEMBRE — stub utilisé avant la réponse de /api/me
   et tant que la DB des mocks est vide.

   À retirer au Sprint 5 (auth obligatoire + redirect /login si non auth).
   ============================================================ */

const FALLBACK_MEMBRE: Membre = {
    id: "fallback-gerant",
    prenom: "Chargement",
    nom: "...",
    role: "ASSOCIE_GERANT",
    permissionsOverrides: null,
    email: "loading@kadrilegal.test",
    telephone: null,
    photoUrl: null,
    actif: true,
    dateEmbauche: new Date().toISOString(),
    dateSortie: null,
    motifSortie: null,
    invitationStatut: "ACTIF",
    derniereConnexion: null,
    codeAccesHash: "",
    codeAccesGeneAt: new Date().toISOString(),
    statutContrat: "ASSOCIE",
    fonction: null,
    salaireBaseBrut: 0,
    rib: null,
    banque: null,
    mobileMoney: null,
    modeVersementParDefaut: "VIREMENT",
    avocatCabinetKey: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
}

function getDefaultMembre(): Membre {
    return (
        mockMembres.find((m) => m.actif && m.role === "ASSOCIE_GERANT") ??
        mockMembres.find((m) => m.actif) ??
        mockMembres[0] ??
        FALLBACK_MEMBRE
    )
}

/* ============================================================
   localStorage subscription store
   ============================================================ */

type StoreListener = () => void
const listeners = new Set<StoreListener>()

function readStoredId(): string | null {
    if (typeof window === "undefined") return null
    try {
        return window.localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function writeStoredId(id: string | null) {
    if (typeof window === "undefined") return
    try {
        if (id === null) window.localStorage.removeItem(STORAGE_KEY)
        else window.localStorage.setItem(STORAGE_KEY, id)
    } catch {
        /* ignoré */
    }
    listeners.forEach((l) => l())
}

function subscribe(listener: StoreListener): () => void {
    listeners.add(listener)
    if (typeof window !== "undefined") {
        window.addEventListener("storage", listener)
    }
    return () => {
        listeners.delete(listener)
        if (typeof window !== "undefined") {
            window.removeEventListener("storage", listener)
        }
    }
}

/* ============================================================
   Provider
   ============================================================ */

interface ProviderProps {
    children: ReactNode
    initialMembreId?: string
}

/** Type partiel : ce que renvoie /api/me (Membre Prisma sans codeAccesHash) */
type ApiMembre = Omit<Membre, "codeAcces" | "codeAccesGeneAt" | "dateEmbauche" | "dateSortie" | "derniereConnexion" | "createdAt" | "updatedAt"> & {
    codeAccesGeneAt: string
    dateEmbauche: string
    dateSortie: string | null
    derniereConnexion: string | null
    createdAt: string
    updatedAt: string
}

export function CurrentUserProvider({ children, initialMembreId }: ProviderProps) {
    const router = useRouter()
    const pathname = usePathname()

    const storedId = useSyncExternalStore(
        subscribe,
        () => readStoredId(),
        () => null
    )

    /* Membre chargé depuis /api/me — null tant que pas répondu */
    const [serverMembre, setServerMembre] = useState<Membre | null>(null)

    useEffect(() => {
        let cancelled = false
        fetch("/api/me", { credentials: "include" })
            .then((r) => {
                if (r.status === 401 && pathname !== "/login" && !DEMO_MODE) {
                    router.replace("/login")
                    return null
                }
                return r.ok ? r.json() : null
            })
            .then((data: { membre: ApiMembre | null } | null) => {
                if (cancelled || !data?.membre) return
                /* Adapt API shape → Membre (ajoute codeAcces vide pour compat type) */
                setServerMembre({
                    ...data.membre,
                    codeAccesHash: "",
                } as Membre)
            })
            .catch(() => {
                /* /api/me indispo (réseau) : on garde le fallback sans rediriger. */
            })
        return () => {
            cancelled = true
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const effectiveId =
        initialMembreId ??
        (storedId && mockMembres.some((m) => m.id === storedId)
            ? storedId
            : getDefaultMembre().id)

    const membre = useMemo(() => {
        /* Priorité 1 : membre serveur (/api/me) */
        if (serverMembre) return serverMembre
        /* Priorité 2 : membre choisi via UserSwitcher dans les mocks (dev) */
        const fromMock = mockMembres.find((m) => m.id === effectiveId)
        if (fromMock) return fromMock
        /* Priorité 3 : default mock ou FALLBACK */
        return getDefaultMembre()
    }, [serverMembre, effectiveId])

    const setMembreId = useCallback((id: string) => {
        writeStoredId(id)
    }, [])

    const value = useMemo<CurrentUserContextValue>(() => {
        return {
            membre,
            membres: mockMembres,
            setMembreId,
            can: (perm, resource) => canFn(membre, perm, resource),
            hasAccess: (perm) => hasAccessFn(membre, perm),
            getScope: (perm) => getScopeFn(membre, perm),
            filterByVisibility: (items, perm) => filterByVisibilityFn(membre, items, perm),
        }
    }, [membre, setMembreId])

    return (
        <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
    )
}

/* ============================================================
   Hook
   ============================================================ */

export function useCurrentUser(): CurrentUserContextValue {
    const ctx = useContext(CurrentUserContext)
    if (!ctx) {
        throw new Error(
            "useCurrentUser doit être utilisé à l'intérieur de <CurrentUserProvider>"
        )
    }
    return ctx
}
