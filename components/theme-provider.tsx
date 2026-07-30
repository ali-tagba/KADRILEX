"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Theme = "light" | "dark"

interface ThemeContextValue {
    theme: Theme
    setTheme: (t: Theme) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "kadrilex:theme"

/**
 * Lit le thème stocké, ou détecte la préférence système au premier load.
 * Light par défaut (la DA est conçue pour le mode clair).
 */
function readInitialTheme(): Theme {
    if (typeof window === "undefined") return "light"
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
        if (stored === "light" || stored === "dark") return stored
    } catch {
        /* localStorage indisponible */
    }
    return "light"
}

/**
 * Applique le thème sur <html data-theme="..."> et persiste en localStorage.
 * À monter UNE seule fois dans le root layout (sous AppLayout).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light")

    // Init au mount (évite la divergence SSR/CSR : l'attribut data-theme est posé après hydration)
    useEffect(() => {
        const initial = readInitialTheme()
        setThemeState(initial)
        document.documentElement.dataset.theme = initial
        // Active les transitions après le premier render — évite un flash sur le hot-load
        requestAnimationFrame(() => {
            document.documentElement.classList.add("theme-ready")
        })

        // Sync cross-tab : si l'utilisateur change le thème dans un autre onglet,
        // on l'applique ici aussi via l'event 'storage' du navigateur.
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
                setThemeState(e.newValue)
                document.documentElement.dataset.theme = e.newValue
            }
        }
        window.addEventListener("storage", onStorage)
        return () => window.removeEventListener("storage", onStorage)
    }, [])

    const setTheme = (t: Theme) => {
        setThemeState(t)
        document.documentElement.dataset.theme = t
        try {
            window.localStorage.setItem(STORAGE_KEY, t)
        } catch {
            /* noop */
        }
    }

    const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light")

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) {
        // Fallback no-op : si quelqu'un appelle useTheme hors provider, on évite le crash
        return { theme: "light", setTheme: () => undefined, toggleTheme: () => undefined }
    }
    return ctx
}
