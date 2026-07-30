"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import type { PermissionKey } from "@/lib/constants/team"

interface NavItem {
    name: string
    href: string
    icon: string
    /** Permission requise — si l'utilisateur n'a pas de droit (NONE), l'item disparaît */
    perm: PermissionKey
}

const navigation: NavItem[] = [
    { name: "Tableau de bord", href: "/", icon: "dashboard", perm: "dashboard.global" },
    { name: "Clients", href: "/clients", icon: "group", perm: "clients.view" },
    { name: "Dossiers", href: "/dossiers", icon: "folder_open", perm: "dossiers.view" },
    { name: "Audiences", href: "/audiences", icon: "gavel", perm: "audiences.view" },
    { name: "Diligences", href: "/diligences", icon: "checklist", perm: "diligences.view" },
    { name: "Tâches", href: "/taches", icon: "task_alt", perm: "taches.view" },
    {
        name: "Bibliothèque",
        href: "/bibliotheque",
        icon: "library_books",
        perm: "bibliotheque.view",
    },
    { name: "Équipe", href: "/equipe", icon: "groups", perm: "equipe.view" },
    {
        name: "Finance",
        href: "/comptabilite",
        icon: "account_balance_wallet",
        perm: "finance.view",
    },
]

const settingsNav: NavItem = {
    name: "Paramètres",
    href: "/parametres",
    icon: "settings",
    perm: "equipe.view",
}

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { hasAccess, membre } = useCurrentUser()
    const [unreadShares, setUnreadShares] = useState(0)

    useEffect(() => {
        const fetchUnread = () => {
            fetch("/api/shares", { credentials: "include" })
                .then((r) => (r.ok ? r.json() : []))
                .then((list: Array<{ readAt: string | null }>) =>
                    setUnreadShares(list.filter((s) => !s.readAt).length)
                )
                .catch(() => undefined)
        }
        fetchUnread()
        // Refresh toutes les 60s pour voir les nouveaux partages
        const id = window.setInterval(fetchUnread, 60_000)
        return () => window.clearInterval(id)
    }, [pathname])

    const visibleNav = navigation.filter((item) => hasAccess(item.perm))

    async function onLogout() {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
        router.push("/login")
        router.refresh()
    }

    return (
        <nav className="h-screen w-64 flex flex-col border-r border-[#E8DCC8] bg-primary-container z-40 shrink-0">
            {/* Logo + profil */}
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center overflow-hidden flex-shrink-0">
                    <span className="material-symbols-outlined text-primary-container text-[22px]">
                        person
                    </span>
                </div>
                <div className="min-w-0">
                    <h1 className="font-display-md font-bold text-white tracking-widest text-xl truncate">
                        KadriLex
                    </h1>
                    <p className="font-body-sm text-body-sm text-accent-soft opacity-80 truncate">
                        Cabinet Juridique
                    </p>
                </div>
            </div>

            {/* CTA primaire */}
            <div className="p-4">
                <Link
                    href="/dossiers"
                    className="w-full bg-accent text-white rounded py-2 px-4 flex items-center justify-center gap-2 font-body-sm text-body-sm font-semibold hover:bg-opacity-90 transition-colors active:scale-[0.98] duration-150 ease-in-out"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nouveau Dossier
                </Link>
            </div>

            {/* Navigation principale */}
            <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 font-serif font-medium text-sm tracking-tight">
                {visibleNav.map((item) => {
                    const isActive =
                        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98] duration-150 ease-in-out",
                                isActive
                                    ? "text-white border-l-[3px] border-accent bg-white/5"
                                    : "text-accent-soft opacity-80 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
                            )}
                        >
                            <span
                                className={cn(
                                    "material-symbols-outlined",
                                    isActive && "text-accent"
                                )}
                            >
                                {item.icon}
                            </span>
                            {item.name}
                        </Link>
                    )
                })}

                {/* Partages reçus avec badge */}
                <Link
                    href="/partages"
                    className={cn(
                        "px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98] duration-150 ease-in-out",
                        pathname.startsWith("/partages")
                            ? "text-white border-l-[3px] border-accent bg-white/5"
                            : "text-accent-soft opacity-80 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
                    )}
                >
                    <span
                        className={cn(
                            "material-symbols-outlined",
                            pathname.startsWith("/partages") && "text-accent"
                        )}
                    >
                        inbox
                    </span>
                    <span className="flex-1">Partages</span>
                    {unreadShares > 0 && (
                        <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadShares}
                        </span>
                    )}
                </Link>

                {/* Paramètres en bas */}
                <Link
                    href={settingsNav.href}
                    className={cn(
                        "px-4 py-3 flex items-center gap-3 transition-all active:scale-[0.98] duration-150 ease-in-out mt-auto",
                        pathname.startsWith(settingsNav.href)
                            ? "text-white border-l-[3px] border-accent bg-white/5"
                            : "text-accent-soft opacity-80 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
                    )}
                >
                    <span
                        className={cn(
                            "material-symbols-outlined",
                            pathname.startsWith(settingsNav.href) && "text-accent"
                        )}
                    >
                        {settingsNav.icon}
                    </span>
                    {settingsNav.name}
                </Link>
            </div>

            {/* Profil + logout */}
            <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">
                        {membre.prenom} {membre.nom}
                    </p>
                    <p className="text-accent-soft opacity-80 text-xs truncate">
                        {membre.email}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    title="Se déconnecter"
                    className="text-accent-soft opacity-80 hover:text-white hover:opacity-100 p-1 rounded transition"
                >
                    <span className="material-symbols-outlined text-[20px]">
                        logout
                    </span>
                </button>
            </div>
        </nav>
    )
}
