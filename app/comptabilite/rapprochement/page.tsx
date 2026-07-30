"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Check, AlertCircle, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  date: string;
  libelle: string;
  montant: number;
}

interface Suggestion {
  id: string;
  numero: string;
  partenaire: string;
  montantTotal: number;
  resteAPayer: number;
  score: number;
}

export default function RapprochementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/comptabilite/rapprochement/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTx = async (tx: Transaction) => {
    setSelectedTx(tx);
    setLoadingSuggestions(true);
    try {
      const type = tx.montant > 0 ? "credit" : "debit"; // Simplification
      const res = await fetch(`/api/comptabilite/rapprochement/suggestions?montant=${Math.abs(tx.montant)}&type=${type}`);
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleValider = async (factureId: string) => {
    if (!selectedTx) return;
    try {
      const res = await fetch("/api/comptabilite/rapprochement/valider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factureId, transaction: selectedTx })
      });
      const data = await res.json();
      if (data.success) {
        alert("Rapprochement validé !");
        setTransactions(transactions.filter(t => t.id !== selectedTx.id));
        setSelectedTx(null);
        setSuggestions([]);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la validation");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-none px-6 pt-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-h2 text-h2 text-primary-container leading-none mb-2">Rapprochement Bancaire</h1>
          <p className="text-body-sm text-on-surface-variant">Importez vos relevés bancaires (CSV) et lettrez vos factures automatiquement.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/comptabilite">
            <Button variant="outline" className="border-outline text-primary hover:bg-surface-variant">
              Retour
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne Gauche : Lignes du relevé */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/50 shadow-sm flex items-center gap-4">
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
            />
            <Button onClick={handleUpload} disabled={!file || loading} className="bg-primary text-white">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Importer le relevé
            </Button>
          </div>

          <div className="bg-surface-container-lowest flex-1 rounded-lg border border-outline-variant/50 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-surface-variant p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant/50">
              Lignes à rapprocher ({transactions.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {transactions.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-on-surface-variant/60">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p>Aucune ligne à rapprocher</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div 
                    key={tx.id} 
                    onClick={() => handleSelectTx(tx)}
                    className={`p-4 mb-2 rounded-md border cursor-pointer transition-colors ${selectedTx?.id === tx.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-variant'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-on-surface">{tx.libelle}</div>
                        <div className="text-sm text-on-surface-variant">{tx.date}</div>
                      </div>
                      <div className={`font-mono-num font-bold ${tx.montant > 0 ? 'text-success' : 'text-error'}`}>
                        {tx.montant > 0 ? '+' : ''}{tx.montant.toLocaleString()} FCFA
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Suggestions de lettrage */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-lowest flex-1 rounded-lg border border-outline-variant/50 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-surface-variant p-4 font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant/50">
              Suggestions de Factures / Écritures
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedTx ? (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/60 text-center">
                  <ArrowRight className="w-8 h-8 mb-2 opacity-50" />
                  <p>Sélectionnez une ligne bancaire<br/>pour voir les suggestions</p>
                </div>
              ) : loadingSuggestions ? (
                <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune facture correspondante trouvée.</p>
                </div>
              ) : (
                suggestions.map(sugg => (
                  <div key={sugg.id} className="p-4 mb-3 rounded-md border border-outline-variant bg-white shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-primary">{sugg.numero}</span>
                      <span className="font-mono-num text-sm bg-surface-variant px-2 py-0.5 rounded-sm">Score: {sugg.score}</span>
                    </div>
                    <div>
                      <div className="text-sm text-on-surface">{sugg.partenaire}</div>
                      <div className="text-sm text-on-surface-variant">Reste à payer : <span className="font-mono-num font-semibold">{sugg.resteAPayer.toLocaleString()} FCFA</span></div>
                    </div>
                    <Button onClick={() => handleValider(sugg.id)} className="w-full bg-primary text-white mt-2">
                      <Check className="w-4 h-4 mr-2" /> Valider le lettrage
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
