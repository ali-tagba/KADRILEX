"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export function NouvelleEcritureForm({ journaux, comptes, exercices }: {
  journaux: any[];
  comptes: any[];
  exercices: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [journalId, setJournalId] = useState('');
  const [exerciceId, setExerciceId] = useState(exercices[0]?.id || '');
  const [dateEcriture, setDateEcriture] = useState(new Date().toISOString().split('T')[0]);
  const [libelle, setLibelle] = useState('');
  const [numeroPiece, setNumeroPiece] = useState('');
  
  const [lignes, setLignes] = useState([
    { id: 1, compteId: '', libelle: '', debit: '', credit: '' },
    { id: 2, compteId: '', libelle: '', debit: '', credit: '' },
  ]);

  const totalDebit = lignes.reduce((acc, ligne) => acc + (Number(ligne.debit) || 0), 0);
  const totalCredit = lignes.reduce((acc, ligne) => acc + (Number(ligne.credit) || 0), 0);
  const isEquilibre = totalDebit === totalCredit && totalDebit > 0;

  const handleAddLigne = () => {
    setLignes(prev => [...prev, { id: Date.now(), compteId: '', libelle: '', debit: '', credit: '' }]);
  };

  const handleRemoveLigne = (id: number) => {
    if (lignes.length > 2) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const updateLigne = (id: number, field: string, value: any) => {
    setLignes(lignes.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    // Raccourci Ctrl+Enter ou Cmd+Enter ou Shift+Enter pour ajouter une ligne
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.preventDefault();
      handleAddLigne();
    }
  };

  // Trouver le compte par numéro ou nom (pour le datalist)
  const resolveCompteId = (inputValue: string) => {
    const parts = inputValue.split('·');
    const num = parts[0]?.trim();
    const compte = comptes.find(c => c.numero === num);
    return compte ? compte.id : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEquilibre) return alert("L'écriture n'est pas équilibrée.");

    setLoading(true);
    try {
      const response = await fetch('/api/comptabilite/ecritures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalId,
          exerciceId,
          dateEcriture: new Date(dateEcriture).toISOString(),
          libelle,
          numeroPiece,
          lignes: lignes.map(l => ({
            // On s'assure de récupérer l'ID correct même si l'utilisateur a juste tapé le texte
            compteId: l.compteId || resolveCompteId((document.getElementById(`compte-input-${l.id}`) as HTMLInputElement)?.value),
            libelle: l.libelle,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0
          })).filter(l => l.compteId && (l.debit > 0 || l.credit > 0)) // Filtre les lignes vides
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      router.push('/comptabilite/journaux');
      router.refresh();
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Datalist global pour les comptes (haute performance, natif) */}
      <datalist id="comptes-list">
        {comptes.map(c => (
          <option key={c.id} value={`${c.numero} · ${c.libelle}`} />
        ))}
      </datalist>

      {/* Header Form */}
      <div className="grid grid-cols-5 gap-4 mb-8 bg-surface-container p-5 rounded-xl border border-border/40">
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Journal</label>
          <select 
            value={journalId} 
            onChange={e => setJournalId(e.target.value)} 
            className="w-full bg-transparent border-b border-border/40 hover:border-gray-400 focus:border-primary focus:ring-0 px-0 py-1.5 text-sm font-semibold transition-colors outline-none"
            required
          >
            <option value="" disabled>Sélectionner...</option>
            {journaux.map(j => <option key={j.id} value={j.id}>{j.code}</option>)}
          </select>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
          <input 
            type="date" 
            value={dateEcriture} 
            onChange={e => setDateEcriture(e.target.value)} 
            className="w-full bg-transparent border-b border-border/40 hover:border-gray-400 focus:border-primary focus:ring-0 px-0 py-1.5 text-sm font-semibold transition-colors outline-none font-[family-name:var(--font-mono-num)] tabular-nums"
            required 
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pièce</label>
          <input 
            type="text" 
            placeholder="FAC-2026-001"
            value={numeroPiece} 
            onChange={e => setNumeroPiece(e.target.value)} 
            className="w-full bg-transparent border-b border-border/40 hover:border-gray-400 focus:border-primary focus:ring-0 px-0 py-1.5 text-sm font-semibold transition-colors outline-none placeholder:text-muted-foreground/50 font-[family-name:var(--font-mono-num)] tabular-nums"
            required 
          />
        </div>

        <div className="space-y-1 col-span-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Libellé de l'opération</label>
          <input 
            type="text" 
            placeholder="Description générale..."
            value={libelle} 
            onChange={e => setLibelle(e.target.value)} 
            className="w-full bg-transparent border-b border-border/40 hover:border-gray-400 focus:border-primary focus:ring-0 px-0 py-1.5 text-sm font-semibold transition-colors outline-none placeholder:text-muted-foreground/50"
            required 
          />
        </div>
      </div>

      {/* Lignes de saisie */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px] border border-border/40 rounded-lg overflow-hidden bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-0 border-b border-border/60 bg-gray-50/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4 px-4 py-3">Compte</div>
            <div className="col-span-4 px-4 py-3">Libellé ligne</div>
            <div className="col-span-2 px-4 py-3 text-right">Débit</div>
            <div className="col-span-2 px-4 py-3 text-right pr-12">Crédit</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/20">
            {lignes.map((ligne, index) => (
              <div key={ligne.id} className="grid grid-cols-12 gap-0 items-center group hover:bg-gray-50/30 transition-colors">
                <div className="col-span-4 px-4 py-1.5 border-r border-transparent group-hover:border-border/10">
                  <input 
                    id={`compte-input-${ligne.id}`}
                    type="text"
                    list="comptes-list"
                    placeholder="Numéro ou nom..." 
                    defaultValue={ligne.compteId ? comptes.find(c => c.id === ligne.compteId)?.numero + ' · ' + comptes.find(c => c.id === ligne.compteId)?.libelle : ''}
                    onChange={e => {
                      const id = resolveCompteId(e.target.value);
                      if (id) updateLigne(ligne.id, 'compteId', id);
                    }}
                    className="w-full bg-transparent border-none text-sm font-medium focus:ring-0 outline-none truncate placeholder:text-muted-foreground/40"
                    required
                  />
                </div>
                
                <div className="col-span-4 px-4 py-1.5 border-r border-transparent group-hover:border-border/10">
                  <input 
                    type="text"
                    placeholder="Libellé spécifique (optionnel)" 
                    value={ligne.libelle} 
                    onChange={e => updateLigne(ligne.id, 'libelle', e.target.value)}
                    className="w-full bg-transparent border-none text-sm focus:ring-0 outline-none placeholder:text-transparent group-hover:placeholder:text-muted-foreground/40 transition-colors"
                  />
                </div>

                <div className="col-span-2 px-4 py-1.5 border-r border-transparent group-hover:border-border/10">
                  <input 
                    type="text" 
                    placeholder="—"
                    value={ligne.debit} 
                    onChange={e => {
                      // Autoriser uniquement les nombres
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      updateLigne(ligne.id, 'debit', val);
                      if (val && Number(val) > 0) updateLigne(ligne.id, 'credit', '');
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index, 'debit')}
                    className="w-full bg-transparent border-none text-sm text-right focus:ring-0 outline-none placeholder:text-muted-foreground/50 font-[family-name:var(--font-mono-num)] tabular-nums"
                  />
                </div>

                <div className="col-span-2 relative flex items-center px-4 py-1.5">
                  <input 
                    type="text" 
                    placeholder="—"
                    value={ligne.credit} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      updateLigne(ligne.id, 'credit', val);
                      if (val && Number(val) > 0) updateLigne(ligne.id, 'debit', '');
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index, 'credit')}
                    className="w-full bg-transparent border-none text-sm text-right focus:ring-0 outline-none placeholder:text-muted-foreground/50 font-[family-name:var(--font-mono-num)] tabular-nums pr-8"
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveLigne(ligne.id)}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    disabled={lignes.length <= 2}
                    title="Supprimer la ligne"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-gray-50/30 border-t border-border/20">
            <button 
              type="button" 
              onClick={handleAddLigne}
              className="text-xs font-semibold text-muted-foreground hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Ajouter une ligne <span className="opacity-60 font-normal ml-1">(Ctrl+Enter)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Form (Ligne de Totaux fixée) */}
      <div className="mt-6 border-t-2 border-gray-900/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)] p-6 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Débit</div>
            <div className="text-2xl font-bold font-[family-name:var(--font-mono-num)] tabular-nums text-gray-900">
              {totalDebit > 0 ? totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Crédit</div>
            <div className="text-2xl font-bold font-[family-name:var(--font-mono-num)] tabular-nums text-gray-900">
              {totalCredit > 0 ? totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
            </div>
          </div>
          
          <div className={`pl-8 border-l-2 border-border/40 ${isEquilibre ? 'text-green-600' : 'text-red-600'}`}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1">
              {isEquilibre ? 'Écriture Équilibrée' : 'Déséquilibre'}
            </div>
            <div className="text-2xl font-bold font-[family-name:var(--font-mono-num)] tabular-nums flex items-center">
              {isEquilibre ? '0,00' : `(${Math.abs(totalDebit - totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })})`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()} className="font-semibold">Annuler</Button>
          <Button type="submit" disabled={!isEquilibre || loading || !journalId || !exerciceId} className="gap-2 font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow-md">
            {loading ? 'Enregistrement...' : 'Valider l\'écriture'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
