"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function CompteFormDialog({ onClose }: { onClose: () => void }) {
    const router = useRouter()
    const [numero, setNumero] = useState("")
    const [libelle, setLibelle] = useState("")
    const [classe, setClasse] = useState("6")
    const [nature, setNature] = useState<"BILAN" | "GESTION">("GESTION")
    const [sensNormal, setSensNormal] = useState<"DEBIT" | "CREDIT">("DEBIT")
    const [lettrable, setLettrable] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSave() {
        if (!numero.trim() || !libelle.trim()) {
            setError("Numéro et libellé sont obligatoires.")
            return
        }
        setSaving(true)
        setError(null)
        try {
            const r = await fetch("/api/comptabilite/comptes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: numero.trim(),
                    libelle: libelle.trim(),
                    classe: Number(classe),
                    nature,
                    sensNormal,
                    lettrable,
                }),
            })
            if (!r.ok) {
                const msg = await r.text().catch(() => "")
                throw new Error(msg || `HTTP ${r.status}`)
            }
            router.refresh()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Échec de la création")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="px-4 py-3 border-b border-outline-variant bg-surface-container">
                    <h3 className="font-h2 text-h2 text-primary">Nouveau compte comptable</h3>
                </header>
                <div className="p-4 space-y-3">
                    {error && (
                        <p className="text-error font-body-sm text-body-sm bg-error-container/40 border border-error/30 rounded px-3 py-2">
                            {error}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-1">Numéro</label>
                            <input
                                value={numero}
                                onChange={(e) => setNumero(e.target.value)}
                                placeholder="ex: 622100"
                                className="w-full px-3 py-2 rounded border border-outline-variant bg-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                        </div>
                        <div>
                            <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-1">Classe</label>
                            <select
                                value={classe}
                                onChange={(e) => setClasse(e.target.value)}
                                className="w-full px-3 py-2 rounded border border-outline-variant bg-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-1">Libellé</label>
                        <input
                            value={libelle}
                            onChange={(e) => setLibelle(e.target.value)}
                            placeholder="ex: Locations de bâtiments"
                            className="w-full px-3 py-2 rounded border border-outline-variant bg-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-1">Nature</label>
                            <select
                                value={nature}
                                onChange={(e) => setNature(e.target.value as "BILAN" | "GESTION")}
                                className="w-full px-3 py-2 rounded border border-outline-variant bg-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="BILAN">Bilan</option>
                                <option value="GESTION">Gestion</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-1">Sens normal</label>
                            <select
                                value={sensNormal}
                                onChange={(e) => setSensNormal(e.target.value as "DEBIT" | "CREDIT")}
                                className="w-full px-3 py-2 rounded border border-outline-variant bg-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <option value="DEBIT">Débit</option>
                                <option value="CREDIT">Crédit</option>
                            </select>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                        <input type="checkbox" checked={lettrable} onChange={(e) => setLettrable(e.target.checked)} />
                        Compte lettrable (rapprochement)
                    </label>
                </div>
                <footer className="px-4 py-3 border-t border-outline-variant bg-surface-container-low/40 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm hover:bg-surface-container-low"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 rounded bg-primary text-on-primary font-body-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? "Création…" : "Créer"}
                    </button>
                </footer>
            </div>
        </div>
    )
}
