import { Suspense } from "react"
export const dynamic = "force-dynamic";

export default function FacturationLayout({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={null}>{children}</Suspense>
}
