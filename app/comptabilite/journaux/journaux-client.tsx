"use client"
import React, { useState } from "react"
import { cn } from "@/lib/utils"

export function JournauxClient({ journaux, ecritures = [] }: { journaux: any[], ecritures?: any[] }) {
  const [activeTab, setActiveTab] = useState<"journaux" | "rapprochement">("journaux")

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Tabs */}
      <div className="px-container-margin pt-4 border-b border-outline-variant bg-surface-container-lowest flex gap-6">
        <button 
          onClick={() => setActiveTab("journaux")}
          className={cn(
            "pb-3 font-body-sm text-body-sm font-semibold border-b-2 transition-colors",
            activeTab === "journaux" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          )}
        >
          Écritures & Journaux
        </button>
        <button 
          onClick={() => setActiveTab("rapprochement")}
          className={cn(
            "pb-3 font-body-sm text-body-sm font-semibold border-b-2 transition-colors",
            activeTab === "rapprochement" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          )}
        >
          Rapprochement Bancaire
        </button>
      </div>

      <div className="flex-1 overflow-auto p-container-margin">
        {activeTab === "journaux" ? <JournauxView journaux={journaux} ecritures={ecritures} /> : <RapprochementView />}
      </div>
    </div>
  )
}

function JournauxView({ journaux, ecritures = [] }: { journaux: any[], ecritures?: any[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => setExpanded(prev => ({...prev, [id]: !prev[id]}))

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 bg-[#FBF7F0] border-b border-outline-variant flex justify-between items-center">
        <h2 className="font-h2 text-h2 text-on-surface">Grand Livre / Écritures</h2>
      </div>
      
      <table className="w-full text-left">
        <thead className="bg-surface-container border-b border-outline-variant">
          <tr>
            <th className="w-10"></th>
            <th className="py-2.5 px-4 font-label-caps text-label-caps text-[#9C8B73] font-semibold">Date</th>
            <th className="py-2.5 px-4 font-label-caps text-label-caps text-[#9C8B73] font-semibold">Journal</th>
            <th className="py-2.5 px-4 font-label-caps text-label-caps text-[#9C8B73] font-semibold">Référence</th>
            <th className="py-2.5 px-4 font-label-caps text-label-caps text-[#9C8B73] font-semibold text-right">Débit</th>
            <th className="py-2.5 px-4 font-label-caps text-label-caps text-[#9C8B73] font-semibold text-right">Crédit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant font-body-sm text-body-sm">
          {ecritures.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-on-surface-variant font-medium">
                Aucune écriture comptable trouvée.
              </td>
            </tr>
          ) : (
            ecritures.map((ecriture) => {
              const totalDebit = ecriture.lignes.reduce((sum: number, l: any) => sum + l.debit, 0);
              const totalCredit = ecriture.lignes.reduce((sum: number, l: any) => sum + l.credit, 0);
              const isExpanded = expanded[ecriture.id];
              
              return (
                <React.Fragment key={ecriture.id}>
                  <tr className="hover:bg-surface-container-low cursor-pointer transition-colors" onClick={() => toggle(ecriture.id)}>
                    <td className="py-2 px-2 text-center text-outline">
                      <span className="material-symbols-outlined text-[18px]">{isExpanded ? 'expand_more' : 'chevron_right'}</span>
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant">
                      {new Date(ecriture.dateEcriture).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-2 px-4">
                      <span className="bg-primary-container/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                        {ecriture.journal.code}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-medium text-on-surface flex items-center gap-2">
                      {ecriture.numeroPiece} {ecriture.annule && <span className="text-error text-[10px] font-bold bg-error/10 px-1 rounded">ANNULÉ</span>}
                    </td>
                    <td className="py-2 px-4 text-right font-mono-num font-medium">{formatCurrency(totalDebit)}</td>
                    <td className="py-2 px-4 text-right font-mono-num font-medium">{formatCurrency(totalCredit)}</td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="bg-surface-container-lowest">
                      <td colSpan={6} className="p-0 border-b-2 border-primary/20">
                        <table className="w-full text-[12px] bg-surface/50">
                          <tbody className="divide-y divide-outline-variant/30">
                            {ecriture.lignes.map((ligne: any) => (
                              <tr key={ligne.id} className="text-on-surface-variant">
                                <td className="py-1.5 pl-12 w-32 font-mono-num font-medium text-on-surface">{ligne.compte.numero}</td>
                                <td className="py-1.5">{ligne.compte.libelle} {ligne.libelle ? `— ${ligne.libelle}` : ''}</td>
                                <td className="py-1.5 text-right font-mono-num pr-4 text-on-surface font-semibold">
                                  {ligne.debit > 0 ? formatCurrency(ligne.debit) : ''}
                                </td>
                                <td className="py-1.5 text-right font-mono-num pr-4 text-on-surface font-semibold">
                                  {ligne.credit > 0 ? formatCurrency(ligne.credit) : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

interface BankTx {
  id: string
  date: string
  libelle: string
  montant: number // positif = encaissement (credit banque), négatif = décaissement (debit banque)
}

interface FactureSuggestion {
  id: string
  numero: string
  partenaire: string
  montantTotal: number
  resteAPayer: number
  score: number
}

function formatMontant(n: number): string {
  return Math.abs(n).toLocaleString("fr-FR")
}

function RapprochementView() {
  const [transactions, setTransactions] = useState<BankTx[]>([])
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<FactureSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [importing, setImporting] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedTx = transactions.find((t) => t.id === selectedTxId) ?? null

  async function handleImport(file: File) {
    setImporting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const r = await fetch("/api/comptabilite/rapprochement/import", {
        method: "POST",
        body: formData,
      })
      const data = await r.json()
      if (!r.ok || !data.success) throw new Error(data.error ?? `HTTP ${r.status}`)
      // Préfixe les ids pour garantir l'unicité entre plusieurs imports successifs
      const batch = Date.now()
      const imported = (data.transactions as BankTx[]).map((t) => ({ ...t, id: `${batch}-${t.id}` }))
      setTransactions((prev) => [...prev, ...imported])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'import du relevé")
    } finally {
      setImporting(false)
    }
  }

  async function selectTransaction(tx: BankTx) {
    setSelectedTxId(tx.id)
    setSuggestions([])
    setLoadingSuggestions(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        montant: String(Math.abs(tx.montant)),
        type: tx.montant >= 0 ? "credit" : "debit",
      })
      const r = await fetch(`/api/comptabilite/rapprochement/suggestions?${params}`)
      const data = await r.json()
      if (!r.ok || !data.success) throw new Error(data.error ?? `HTTP ${r.status}`)
      setSuggestions(data.suggestions as FactureSuggestion[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la recherche de correspondances")
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function validerMatch(suggestion: FactureSuggestion) {
    if (!selectedTx) return
    setValidatingId(suggestion.id)
    setError(null)
    try {
      const r = await fetch("/api/comptabilite/rapprochement/valider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factureId: suggestion.id,
          transaction: {
            date: selectedTx.date,
            montant: Math.abs(selectedTx.montant),
            libelle: selectedTx.libelle,
          },
        }),
      })
      const data = await r.json()
      if (!r.ok || !data.success) throw new Error(data.error ?? `HTTP ${r.status}`)
      setTransactions((prev) => prev.filter((t) => t.id !== selectedTx.id))
      setSelectedTxId(null)
      setSuggestions([])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la validation du rapprochement")
    } finally {
      setValidatingId(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="font-h2 text-h2 text-on-surface">Rapprochement Bancaire</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Importez un relevé (CSV : Date, Libellé, Montant) et associez chaque mouvement à une facture.
          </p>
        </div>
        <label className="px-3 py-1.5 bg-surface border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-variant transition-colors flex items-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">upload</span>
          {importing ? "Import…" : "Importer Relevé (CSV)"}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ""
            }}
          />
        </label>
      </div>

      {error && (
        <p className="mb-3 text-error font-body-sm text-body-sm bg-error-container/40 border border-error/30 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Relevé Bancaire (transactions importées, en session) */}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-[#FBF7F0] border-b border-outline-variant font-label-caps text-label-caps text-[#9C8B73] font-semibold flex items-center justify-between">
            <span>Relevé importé</span>
            <span className="bg-white px-2 py-0.5 rounded border border-outline-variant/50">{transactions.length} à rapprocher</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-surface">
            {transactions.length === 0 ? (
              <div className="py-10 text-center font-body-sm text-on-surface-variant">
                Aucun relevé importé. Utilisez « Importer Relevé (CSV) » ci-dessus.
              </div>
            ) : (
              transactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => void selectTransaction(tx)}
                  className={cn(
                    "w-full text-left p-3 bg-white border rounded-lg transition-colors relative overflow-hidden",
                    selectedTxId === tx.id ? "border-2 border-primary/40 shadow-sm" : "border-outline-variant hover:border-outline"
                  )}
                >
                  {selectedTxId === tx.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono-num text-[11px] text-on-surface-variant">
                      {new Date(tx.date).toLocaleDateString("fr-FR")}
                    </span>
                    <span className={cn("font-mono-num text-body-sm font-bold", tx.montant >= 0 ? "text-[#166534]" : "text-error")}>
                      {tx.montant >= 0 ? "+" : "- "}{formatMontant(tx.montant)}
                    </span>
                  </div>
                  <p className="font-body-sm font-medium text-on-surface">{tx.libelle}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Suggestions de factures correspondantes */}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-surface-container border-b border-outline-variant font-label-caps text-label-caps text-on-surface-variant font-semibold">
            {selectedTx ? `Factures correspondantes — ${formatMontant(selectedTx.montant)}` : "Sélectionnez un mouvement"}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-surface">
            {!selectedTx ? (
              <div className="py-10 text-center font-body-sm text-on-surface-variant">
                Cliquez sur un mouvement à gauche pour voir les factures correspondantes.
              </div>
            ) : loadingSuggestions ? (
              <div className="py-10 text-center font-body-sm text-on-surface-variant">Recherche…</div>
            ) : suggestions.length === 0 ? (
              <div className="py-10 text-center font-body-sm text-on-surface-variant">
                Aucune facture {selectedTx.montant >= 0 ? "émise" : "reçue"} en attente ne correspond.
              </div>
            ) : (
              suggestions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "p-3 bg-white border rounded-lg",
                    s.score > 0 ? "border-2 border-primary/40" : "border-outline-variant"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono-num text-[11px] text-on-surface-variant">
                      <span className="text-secondary font-bold">{s.numero}</span>
                    </span>
                    <span className="font-mono-num text-body-sm font-bold text-on-surface">{formatMontant(s.resteAPayer)}</span>
                  </div>
                  <p className="font-body-sm font-medium text-on-surface">{s.partenaire}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Reste à payer sur montant total {formatMontant(s.montantTotal)}</p>
                  {s.score > 0 && (
                    <div className="mt-2 text-[10px] text-primary flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Montant exact
                    </div>
                  )}
                  <button
                    onClick={() => void validerMatch(s)}
                    disabled={validatingId === s.id}
                    className="mt-2 w-full px-3 py-1.5 bg-primary text-on-primary rounded font-body-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                    {validatingId === s.id ? "Rapprochement…" : "Rapprocher"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
