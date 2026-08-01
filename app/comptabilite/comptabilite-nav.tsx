"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function ComptabiliteNav() {
  const pathname = usePathname()
  
  const navItems = [
    { name: "Tableau de bord", href: "/comptabilite" },
    { name: "Factures Clients", href: "/comptabilite/factures" },
    { name: "Dépenses & Frais", href: "/comptabilite/depenses" },
    { name: "Journaux & Rapprochement", href: "/comptabilite/journaux" },
    { name: "Grand Livre", href: "/comptabilite/grand-livre" },
    { name: "Balance", href: "/comptabilite/balance" },
  ]

  return (
    <div className="print:hidden flex-none px-container-margin pt-container-margin flex items-center justify-between border-b border-outline-variant/30 pb-0 bg-[#FBF7F0]">
      {/* Gauche: Titre et Tabs */}
      <div className="flex items-end gap-8 flex-wrap">
        <div className="flex items-baseline gap-2 pb-3">
          <h1 className="font-h2 text-h2 text-[#6B4423] leading-none">Finance</h1>
          <span className="font-label-caps text-label-caps text-[#9C8B73] uppercase tracking-wider hidden sm:inline">
            Comptabilité
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-body-md font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`pb-3 border-b-2 transition-colors ${
                  isActive 
                    ? "text-[#6B4423] border-[#6B4423] font-semibold" 
                    : "text-[#9C8B73] border-transparent hover:text-[#6B4423]"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Droite: Boutons d'action contextuels */}
      <div className="flex items-center gap-3 pb-3">
        <Button asChild variant="outline" className="h-9 px-4 text-sm font-medium border-[#9C8B73] text-[#6B4423] hover:bg-[#9C8B73]/10">
          <Link href="/comptabilite/comptes">
            <span className="material-symbols-outlined text-[18px] mr-2">settings</span>
            Plan Comptable
          </Link>
        </Button>
        {/* PAS de "Nouvelle Écriture" sur les pages de consultation/auto-génération :
            Dépenses et Factures génèrent leurs écritures automatiquement, Grand Livre
            et Balance sont des vues de lecture seule. */}
        {pathname !== "/comptabilite/depenses" &&
          pathname !== "/comptabilite/factures" &&
          pathname !== "/comptabilite/grand-livre" &&
          pathname !== "/comptabilite/balance" && (
          <Button asChild className="h-9 px-4 text-sm font-medium bg-[#6B4423] text-white hover:bg-[#5a381c] shadow-sm">
            <Link href="/comptabilite/ecritures/nouvelle">
              <span className="material-symbols-outlined text-[18px] mr-2">add</span>
              Nouvelle Écriture
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
