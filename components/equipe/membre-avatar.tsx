"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { initials, ROLES, type RoleKey } from "@/lib/constants/team"
import type { Membre } from "@prisma/client"

/**
 * Construit l'URL d'affichage de la photo de profil.
 * - Si déjà une URL absolue (http/https) → renvoyée telle quelle
 * - Sinon, c'est un path Supabase Storage privé → on route via le proxy same-origin
 *   qui sert le fichier authentifié (`/api/storage/file?path=...`)
 */
function resolvePhotoUrl(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) return null
    if (/^https?:\/\//i.test(photoUrl)) return photoUrl
    return `/api/storage/file?path=${encodeURIComponent(photoUrl)}`
}

interface MembreAvatarProps {
    membre: Pick<Membre, "prenom" | "nom" | "photoUrl" | "role">
    size?: "xs" | "sm" | "md" | "lg" | "xl"
    /** Affiche un anneau coloré selon le rôle */
    ring?: boolean
    className?: string
}

const SIZE_PX: Record<NonNullable<MembreAvatarProps["size"]>, number> = {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 48,
    xl: 72,
}

const ROLE_COLOR: Record<RoleKey, string> = {
    ASSOCIE_GERANT: "#502e0f",
    ASSOCIE: "#7f5533",
    AVOCAT: "#c8772f",
    JURISTE: "#a08152",
    STAGIAIRE: "#d3a96a",
    SECRETAIRE: "#83746b",
}

export function MembreAvatar({
    membre,
    size = "md",
    ring = false,
    className,
}: MembreAvatarProps) {
    const px = SIZE_PX[size]
    const fontSize = px <= 24 ? 10 : px <= 30 ? 11 : px <= 40 ? 13 : px <= 50 ? 16 : 22
    const color = ROLE_COLOR[membre.role]
    const photoSrc = resolvePhotoUrl(membre.photoUrl)
    /** Si l'image casse (404, accès refusé, réseau), on revient aux initiales */
    const [imgFailed, setImgFailed] = useState(false)
    const showImage = photoSrc && !imgFailed

    return (
        <div
            className={cn(
                "rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white select-none overflow-hidden",
                ring && "ring-2 ring-offset-1 ring-offset-surface-container-lowest",
                className
            )}
            style={{
                width: px,
                height: px,
                fontSize,
                backgroundColor: color,
                ...(ring && { boxShadow: `0 0 0 2px ${color}` }),
            }}
            title={`${membre.prenom} ${membre.nom} — ${ROLES[membre.role].label}`}
        >
            {showImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={photoSrc}
                    alt={`${membre.prenom} ${membre.nom}`}
                    width={px}
                    height={px}
                    className="object-cover w-full h-full"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                initials(membre)
            )}
        </div>
    )
}

/** Pile d'avatars (ex : équipe d'un dossier) — utilisé Sprint C+ */
export function MembreAvatarStack({
    membres,
    max = 4,
    size = "sm",
}: {
    membres: Pick<Membre, "id" | "prenom" | "nom" | "photoUrl" | "role">[]
    max?: number
    size?: MembreAvatarProps["size"]
}) {
    const visible = membres.slice(0, max)
    const rest = membres.length - visible.length
    return (
        <div className="flex items-center -space-x-1.5">
            {visible.map((m) => (
                <MembreAvatar key={m.id} membre={m} size={size} ring />
            ))}
            {rest > 0 && (
                <span
                    className="rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-mono-num font-semibold text-[10px] ring-2 ring-surface-container-lowest"
                    style={{ width: SIZE_PX[size!], height: SIZE_PX[size!] }}
                >
                    +{rest}
                </span>
            )}
        </div>
    )
}
