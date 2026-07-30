"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import type { PermissionKey } from "@/lib/constants/team"

interface MobileNavItem {
    name: string
    href: string
    icon: string
    perm: PermissionKey | null
}

const navigation: MobileNavItem[] = [
    { name: "Tableau", href: "/", icon: "dashboard", perm: "dashboard.global" },
    { name: "Clients", href: "/clients", icon: "group", perm: "clients.view" },
    { name: "Dossiers", href: "/dossiers", icon: "folder_open", perm: "dossiers.view" },
    { name: "Audiences", href: "/audiences", icon: "gavel", perm: "audiences.view" },
    { name: "Tâches", href: "/taches", icon: "task_alt", perm: "taches.view" },
    /* "Plus" reste toujours visible pour accéder aux Paramètres / Équipe */
    { name: "Plus", href: "/parametres", icon: "more_horiz", perm: null },
]

export function MobileNav() {
    const pathname = usePathname()
    const { hasAccess } = useCurrentUser()

    /* Filtre par permission, mais on garde au moins 4 items visibles pour
       éviter une nav mobile vide. */
    const visible = navigation.filter((item) => item.perm === null || hasAccess(item.perm))

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[--color-primary-container] border-t border-white/10">
            <div className="flex items-center justify-around h-16 px-2">
                {visible.map((item) => {
                    const isActive =
                        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-12 h-14 rounded-md transition-colors",
                                isActive
                                    ? "text-[--color-accent]"
                                    : "text-[--color-accent-soft] opacity-70 hover:opacity-100"
                            )}
                        >
                            <span className="material-symbols-outlined text-[22px]">
                                {item.icon}
                            </span>
                            <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
