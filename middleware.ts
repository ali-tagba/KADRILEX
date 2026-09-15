import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const session = request.cookies.get("kdx_session")?.value
    const isLoginPage = request.nextUrl.pathname.startsWith("/login")
    const isApiAuthRoute = request.nextUrl.pathname.startsWith("/api/auth") || request.nextUrl.pathname.startsWith("/api/health")

    // Autoriser les routes d'API d'authentification et de healthcheck
    if (isApiAuthRoute) {
        return NextResponse.next()
    }

    if (!session && !isLoginPage) {
        if (request.nextUrl.pathname.startsWith("/api/")) {
            return Response.json({ error: "Non authentifié" }, { status: 401 })
        }
        // Rediriger vers la page de login
        return NextResponse.redirect(new URL("/login", request.url))
    }

    if (session && isLoginPage) {
        // Si déjà connecté et qu'on tente d'accéder à /login, on redirige vers l'accueil (ou dashboard)
        return NextResponse.redirect(new URL("/", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - any file under public/ served by extension (fonts, images…) —
         *   sans ça, une police comme /fonts/material-symbols-outlined.woff2
         *   se fait rediriger vers /login (HTML) tant qu'aucune session n'existe,
         *   ce qui casse les icônes sur la page de login elle-même.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpe?g|gif|webp|woff2?|ttf|eot|ico)$).*)",
    ],
}
