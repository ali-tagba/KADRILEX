"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    FolderOpen,
    Calendar,
    FileText,
    CreditCard, // Keep CreditCard as Receipt is not imported
    Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
    { name: "Tableau de Bord", href: "/", icon: LayoutDashboard },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Dossiers", href: "/dossiers", icon: FolderOpen },
    { name: "Audiences", href: "/audiences", icon: Calendar },
    { name: "Flash CR", href: "/flash-cr", icon: FileText },
    { name: "Facturation", href: "/facturation", icon: CreditCard }, // Changed icon to CreditCard to maintain syntax correctness as Receipt is not imported
    { name: "Paramètres", href: "/parametres", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Logo Section */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <span className="text-white font-bold text-xl">K</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">KadriLex</h1>
                        <p className="text-xs text-slate-500 font-medium tracking-wide">WORKSPACE</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-400")} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">
                        AV
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">Maître Demo</p>
                        <p className="text-xs text-slate-500 truncate">Avocat Associé</p>
                    </div>
                    <Settings className="h-4 w-4 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors" />
                </div>
            </div>
        </div>
    )
}
