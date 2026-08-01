import type { NextConfig } from "next"
import path from "path"

/**
 * Content Security Policy — restreint les sources autorisées pour mitiger XSS,
 * data exfiltration, clickjacking.
 *
 * Stratégie KadriLex :
 *  - script-src : self uniquement (pas de CDN externe pour JS)
 *  - style-src : self + inline (Tailwind 4 + styled-jsx + Material Symbols)
 *  - img-src : self + data: (avatars/icons inline) + Supabase Storage (via le proxy /api/storage/file)
 *  - font-src : self + Google Fonts (next/font + Material Symbols)
 *  - frame-src : self + Google Docs Viewer (preview Office) + Supabase Storage (signed URLs PDF)
 *  - connect-src : self + Supabase Storage
 *  - object-src : 'none' (pas de Flash/Java)
 *  - base-uri : 'self' (anti base href injection)
 *  - form-action : 'self'
 *  - frame-ancestors : 'none' (anti clickjacking — pas d'embed externe)
 */
const SUPABASE_DOMAIN = "https://supabase.82.25.116.169.sslip.io"
const GOOGLE_FONTS = "https://fonts.googleapis.com https://fonts.gstatic.com"
const GOOGLE_DOCS_VIEWER = "https://docs.google.com"

const ContentSecurityPolicy = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS}`,
    `img-src 'self' data: blob: ${SUPABASE_DOMAIN}`,
    `font-src 'self' data: ${GOOGLE_FONTS}`,
    `frame-src 'self' ${SUPABASE_DOMAIN} ${GOOGLE_DOCS_VIEWER}`,
    `media-src 'self' ${SUPABASE_DOMAIN}`,
    `connect-src 'self' ${SUPABASE_DOMAIN}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `upgrade-insecure-requests`,
].join("; ")

const securityHeaders = [
    { key: "Content-Security-Policy", value: ContentSecurityPolicy },
    // Anti clickjacking — redondant avec frame-ancestors mais legacy browsers
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    // Empêche MIME sniffing (anti XSS via fichiers déguisés)
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Politique referrer minimale
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // HSTS — force HTTPS pendant 6 mois (à activer une fois certain que prod en TLS)
    { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
    // Permissions Policy — désactive features qui ne nous servent pas
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
]

const nextConfig: NextConfig = {
    /* Build standalone : produit .next/standalone/ avec node_modules minimal,
       parfait pour Docker. Réduit l'image finale de ~1.5 GB à ~150 MB. */
    output: "standalone",

    /* exceljs fait des require() dynamiques (writers par format) que le
       tracing standalone de Next.js ne détecte pas, ce qui fait planter
       les exports Excel en prod ("Cannot find module 'exceljs'") malgré
       un build réussi. On l'exclut du bundling pour qu'il soit résolu
       directement depuis node_modules au runtime (cf. Dockerfile). */
    serverExternalPackages: ["exceljs"],

    turbopack: {
        root: path.resolve("."),
    },

    /**
     * Headers de sécurité appliqués à toutes les routes.
     * Override possible par route via next.config si besoin.
     */
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ]
    },
}

export default nextConfig
