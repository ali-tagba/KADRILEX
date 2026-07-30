"use client"

import { useDossier } from "@/components/dossiers/dossier-context"
import { DossierFinanceSection } from "@/components/dossiers/dossier-finance-section"

export default function DossierFinancePage() {
    const { dossier } = useDossier()

    return (
        <div className="space-y-container-margin">
            <DossierFinanceSection dossier={dossier} />
        </div>
    )
}
