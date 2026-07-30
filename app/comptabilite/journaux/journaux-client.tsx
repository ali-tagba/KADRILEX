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
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-surface border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-variant transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span> Filtrer
          </button>
          <button className="px-3 py-1.5 bg-[#6B4423] text-white rounded font-body-sm hover:bg-[#5a381c] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span> Nouvelle Écriture
          </button>
        </div>
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

function RapprochementView() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="font-h2 text-h2 text-on-surface">Rapprochement Bancaire</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">Liez vos relevés bancaires aux écritures comptables.</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-1.5 bg-surface border border-outline-variant rounded font-body-sm outline-none">
            <option>SGBS - Compte Courant</option>
            <option>ECOBANK - Compte Séquestre</option>
          </select>
          <button className="px-3 py-1.5 bg-surface border border-outline-variant rounded text-on-surface font-body-sm hover:bg-surface-variant transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">upload</span> Importer Relevé
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Relevé Bancaire */}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-[#FBF7F0] border-b border-outline-variant font-label-caps text-label-caps text-[#9C8B73] font-semibold flex items-center justify-between">
            <span>Relevé Bancaire (SGBS)</span>
            <span className="bg-white px-2 py-0.5 rounded border border-outline-variant/50">3 à rapprocher</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-surface">
            {/* Ligne Relevé 1 */}
            <div className="p-3 bg-white border-2 border-primary/40 rounded-lg shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono-num text-[11px] text-on-surface-variant">20 Oct 2026</span>
                <span className="font-mono-num text-body-sm font-bold text-[#166534]">+ 8 950 000</span>
              </div>
              <p className="font-body-sm font-medium text-on-surface">VIREMENT RECU IMMOBILIERE HAUSSMANN</p>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">Ref: VIR-89320 / Motif: FACTURE FAC-2026-042</p>
            </div>

            {/* Ligne Relevé 2 */}
            <div className="p-3 bg-white border border-outline-variant rounded-lg hover:border-outline transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono-num text-[11px] text-on-surface-variant">16 Oct 2026</span>
                <span className="font-mono-num text-body-sm font-bold text-error">- 85 000</span>
              </div>
              <p className="font-body-sm font-medium text-on-surface">PRLV SENELEC DAKAR</p>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">Ref: PRLV-9921 / Motif: FACTURE SEPT 26</p>
            </div>

            {/* Ligne Relevé 3 */}
            <div className="p-3 bg-white border border-outline-variant rounded-lg hover:border-outline transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono-num text-[11px] text-on-surface-variant">15 Oct 2026</span>
                <span className="font-mono-num text-body-sm font-bold text-[#166534]">+ 4 500 000</span>
              </div>
              <p className="font-body-sm font-medium text-on-surface">REMISE CHQ 8928374</p>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">Dépôt Guichet Agence Plateau</p>
            </div>
          </div>
        </div>

        {/* Center: Match Button */}
        <div className="flex flex-col items-center justify-center">
          <button className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-transform hover:scale-105" title="Rapprocher (Match)">
            <span className="material-symbols-outlined text-[24px]">sync_alt</span>
          </button>
        </div>

        {/* Right: Écritures Comptables */}
        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-surface-container border-b border-outline-variant font-label-caps text-label-caps text-on-surface-variant font-semibold flex items-center justify-between">
            <span>Écritures (En attente de lettrage)</span>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-outline cursor-pointer">search</span>
              <span className="material-symbols-outlined text-[16px] text-outline cursor-pointer">filter_list</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-surface">
            {/* Ligne Compta 1 (Selected/Suggested Match) */}
            <div className="p-3 bg-primary-container/10 border-2 border-primary/40 rounded-lg cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono-num text-[11px] text-on-surface-variant">18 Oct 2026 · <span className="text-secondary font-bold">FAC-2026-042</span></span>
                <span className="font-mono-num text-body-sm font-bold text-on-surface">8 950 000</span>
              </div>
              <p className="font-body-sm font-medium text-on-surface">Immobilière Haussmann</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Paiement Facture (Banque 521000)</p>
              
              <div className="mt-2 text-[10px] text-primary flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Suggestion automatique (Montant & Réf)
              </div>
            </div>

            {/* Ligne Compta 2 */}
            <div className="p-3 bg-white border border-outline-variant rounded-lg hover:border-outline transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono-num text-[11px] text-on-surface-variant">15 Oct 2026 · <span className="text-primary font-bold">DEP-102</span></span>
                <span className="font-mono-num text-body-sm font-bold text-on-surface">85 000</span>
              </div>
              <p className="font-body-sm font-medium text-on-surface">Facture SENELEC</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Paiement Dépense (Banque 521000)</p>
            </div>

            {/* Ligne Compta 3 */}
            <div className="p-3 bg-white border border-outline-variant rounded-lg hover:border-outline transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono-num text-[11px] text-on-surface-variant">12 Oct 2026 · <span className="text-secondary font-bold">FAC-2026-040</span></span>
                <span className="font-mono-num text-body-sm font-bold text-on-surface">4 500 000</span>
              </div>
              <p className="font-body-sm font-medium text-on-surface">SA TechInnovate</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Acompte Provision (Banque 521000)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
