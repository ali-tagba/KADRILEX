import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[--color-primary] text-white shadow hover:bg-[--color-primary-dark]",
                secondary:
                    "border-transparent bg-[--color-secondary] text-white shadow hover:bg-[--color-secondary]/80",
                success:
                    "border-transparent bg-[--color-success] text-white shadow",
                warning:
                    "border-transparent bg-[--color-warning] text-white shadow",
                error:
                    "border-transparent bg-[--color-error] text-white shadow",
                outline: "text-[--color-foreground] border-[--color-border]",
                green:
                    "border-transparent bg-[--color-badge-green] text-white shadow",
                orange:
                    "border-transparent bg-[--color-badge-orange] text-white shadow",
                red:
                    "border-transparent bg-[--color-badge-red] text-white shadow",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
