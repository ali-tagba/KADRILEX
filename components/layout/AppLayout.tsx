import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
            {/* Sidebar - Fixed width, strictly anchored */}
            <div className="hidden lg:block w-[280px] flex-shrink-0 border-r border-slate-200 bg-white">
                <Sidebar />
            </div>

            {/* Mobile Nav - visible only on small screens */}
            <MobileNav />

            {/* Main Content - Flex grow, scrollable independent of sidebar */}
            <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
                <div className="max-w-7xl mx-auto p-6 lg:p-10 mb-20 lg:mb-0">
                    {children}
                </div>
            </main>
        </div>
    )
}
