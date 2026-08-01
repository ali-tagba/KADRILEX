"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { CurrentUserProvider } from "@/lib/auth/current-user-context"
import { DataSyncProvider } from "@/components/data-sync-provider"
import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"

const STANDALONE_ROUTES = new Set(["/login"])

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isStandalone = STANDALONE_ROUTES.has(pathname)
    if (isStandalone) {
        return <CurrentUserProvider>{children}</CurrentUserProvider>
    }

    return (
        <CurrentUserProvider>
            <DataSyncProvider>
                <div className="flex h-screen w-full bg-[--color-background] overflow-hidden print:h-auto print:overflow-visible">
                    {/* Sidebar — fixed width */}
                    <div className="hidden lg:block flex-shrink-0 print:hidden">
                        <Sidebar />
                    </div>

                    {/* Mobile nav */}
                    <MobileNav />

                    {/* Main */}
                    <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0 print:h-auto print:overflow-visible">
                        {children}
                    </main>
                </div>

                {/* Bascule de rôle (dev) — à conditionner sur env en V2 */}
            </DataSyncProvider>
        </CurrentUserProvider>
    )
}
