"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    FolderOpen,
    Calendar,
    MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Dossiers", href: "/dossiers", icon: FolderOpen },
    { name: "Audiences", href: "/audiences", icon: Calendar },
    { name: "Plus", href: "/more", icon: MoreHorizontal },
]

export function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
            <div className="glass rounded-2xl shadow-xl flex items-center justify-around h-20 px-4 bg-white/90 backdrop-blur-lg border border-white/20">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 relative",
                                isActive
                                    ? "text-blue-600 bg-blue-50 shadow-inner"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-6 w-6 transition-all duration-300",
                                    isActive && "scale-110 drop-shadow-md"
                                )}
                            />
                            <span className={cn(
                                "text-[10px] font-medium mt-1 transition-all duration-300",
                                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
