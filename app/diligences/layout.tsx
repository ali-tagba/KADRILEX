import { Suspense } from "react"

export default function DiligencesLayout({ children }: { children: React.ReactNode }) {
    /* Suspense requis pour useSearchParams côté page enfant (prerender Next). */
    return <Suspense fallback={null}>{children}</Suspense>
}
