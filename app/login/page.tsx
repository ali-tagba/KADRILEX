"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [codeAcces, setCodeAcces] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), codeAcces: codeAcces.trim() }),
                credentials: "include",
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${res.status}`)
            }

            router.push("/clients")
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de connexion")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-container p-6">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-md bg-surface rounded-2xl shadow-lg p-8 space-y-5"
            >
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-display font-semibold text-on-surface">
                        KadriLex
                    </h1>
                    <p className="text-sm text-on-surface-variant">
                        Cabinet SCPA Kadri Legal — Niamey
                    </p>
                </div>

                <div className="space-y-1">
                    <label
                        htmlFor="email"
                        className="text-sm font-medium text-on-surface"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ali@kadrilegal.test"
                        autoComplete="email"
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div className="space-y-1">
                    <label
                        htmlFor="code"
                        className="text-sm font-medium text-on-surface"
                    >
                        Code d'accès
                    </label>
                    <input
                        id="code"
                        type="text"
                        value={codeAcces}
                        onChange={(e) => setCodeAcces(e.target.value.toUpperCase())}
                        placeholder="XXX-XXX-XXXX"
                        autoComplete="current-password"
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {error && (
                    <div className="text-sm text-error bg-error-container/40 px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {loading ? "Connexion…" : "Se connecter"}
                </button>

                <p className="text-xs text-on-surface-variant text-center pt-2">
                    Le code d'accès vous a été communiqué par l'administrateur du cabinet.
                </p>
            </form>
        </div>
    )
}
