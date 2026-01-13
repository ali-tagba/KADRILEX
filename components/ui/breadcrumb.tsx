import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbProps {
    items: BreadcrumbItem[]
    className?: string
    maxItems?: number
}

export function Breadcrumb({ items, className, maxItems = 4 }: BreadcrumbProps) {
    // If more than maxItems, show first, ellipsis, and last 2
    const displayItems = items.length > maxItems
        ? [
            items[0],
            { label: "...", href: undefined },
            ...items.slice(-2)
        ]
        : items

    return (
        <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
            <Link
                href="/"
                className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                title="Accueil"
            >
                <Home className="h-4 w-4" />
            </Link>

            {displayItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 min-w-0">
                    <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="text-slate-600 hover:text-slate-900 transition-colors truncate max-w-[200px]"
                            title={item.label}
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span
                            className={cn(
                                "truncate max-w-[200px]",
                                index === displayItems.length - 1
                                    ? "text-slate-900 font-medium"
                                    : "text-slate-600"
                            )}
                            title={item.label}
                        >
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
