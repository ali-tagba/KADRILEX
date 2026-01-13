import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon: LucideIcon
    trend?: "up" | "down" | "neutral"
    colorScheme?: "blue" | "purple" | "orange" | "emerald" | "red" | "slate"
    className?: string
}

const colorSchemes = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100"
}

export function KpiCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    colorScheme = "blue",
    className
}: KpiCardProps) {
    return (
        <Card className={cn("hover:shadow-md transition-shadow duration-200", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider truncate" title={title}>
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg flex-shrink-0", colorSchemes[colorScheme])}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-900 truncate" title={String(value)}>
                    {value}
                </div>
                {subtitle && (
                    <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                        {trend === "up" && <span className="text-emerald-500">↑</span>}
                        {trend === "down" && <span className="text-red-500">↓</span>}
                        <span className="truncate" title={subtitle}>{subtitle}</span>
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
