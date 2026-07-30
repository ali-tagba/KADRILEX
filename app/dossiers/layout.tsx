import { Suspense } from "react"

export default function DossiersLayout({ children }: { children: React.ReactNode }) {
    /* Wrap dans Suspense pour permettre useSearchParams dans la page enfant.
       Sinon Next refuse le prerender. */
    return <Suspense fallback={null}>{children}</Suspense>
}
