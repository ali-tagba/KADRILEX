"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { DepensesTab } from "@/components/facturation/depenses-tab"
import type { MockDepense } from "@/lib/mock/depenses"

export function DepensesClient({ journaux, comptes, initialDepenses, employes = [] }: { journaux: any[], comptes: any[], initialDepenses: MockDepense[], employes?: any[] }) {
  const [depenses, setDepenses] = useState<MockDepense[]>(initialDepenses)

  return (
    <div className="flex flex-col gap-density-loose w-full max-w-[1600px] mx-auto p-container-margin h-full overflow-y-auto scrollbar-thin">
      {/* Page Header is now inside DepensesTab or we can keep a simpler header here, but DepensesTab has its own header.
          Actually, DepensesTab has "Dépenses internes" header. We can just render DepensesTab. */}
      
      {/* Main Content Area */}
      <section className="flex-1 flex flex-col min-h-[500px]">
        <DepensesTab depenses={depenses} onChangeDepenses={setDepenses} employes={employes} />
      </section>
    </div>
  )
}
