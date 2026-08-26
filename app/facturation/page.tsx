"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageGate } from "@/components/auth/require-permission"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { patchEntity, postEntity, deleteEntity, showApiError } from "@/lib/api/patch"
import type { MockFacture } from "@/lib/mock/invoices"
import type { MockDepense } from "@/lib/mock/depenses"
import type { MockBulletin } from "@/lib/mock/bulletins"
import type { Membre } from "@prisma/client"
import { FinanceTabs, type FinanceTabKey } from "@/components/facturation/finance-tabs"
import { FinanceDashboard } from "@/components/facturation/finance-dashboard"
import { VueEnsembleTab } from "@/components/facturation/vue-ensemble-tab"
import { FacturationTab } from "@/components/facturation/facturation-tab"
import { FraisExternesTab } from "@/components/facturation/frais-externes-tab"
import { DepensesTab } from "@/components/facturation/depenses-tab"
import { PaieTab } from "@/components/facturation/paie-tab"
import { ApportsTab } from "@/components/facturation/apports-tab"
import { BilanTab } from "@/components/facturation/bilan-tab"

const VALID_TABS: FinanceTabKey[] = [
    "dashboard",
    "vue-ensemble",
    "facturation",
    "frais-externes",
    "depenses",
    "paie",
    "apports",
    "bilan",
]

export default function FinancePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasAccess } = useCurrentUser()

    const tabParam = searchParams.get("tab") as FinanceTabKey | null
    const initialTab: FinanceTabKey = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "dashboard"
    const [activeTab, setActiveTab] = useState<FinanceTabKey>(initialTab)

    const presetClientId = searchParams.get("clientId")
    const presetMembreId = searchParams.get("membreId")
    const presetDossierId = searchParams.get("dossierId")

    const handleTabChange = (tab: FinanceTabKey) => {
        setActiveTab(tab)
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", tab)
        router.replace(`/facturation?${params.toString()}`, { scroll: false })
    }

    const [factures, setFactures] = useState<MockFacture[]>([])
    const [depenses, setDepenses] = useState<MockDepense[]>([])
    const [bulletins, setBulletins] = useState<MockBulletin[]>([])
    const [employes, setEmployes] = useState<Membre[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [dossiers, setDossiers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const clientOptions = useMemo(
        () =>
            clients.map((c) => ({
                id: c.id as string,
                label: (c.raisonSociale ?? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() ?? "Client") as string,
            })),
        [clients]
    )

    /**
     * Wrapper qui détecte les diffs et appelle l'API correspondante.
     * Important : après POST réussi, on remplace l'item local par le vrai item DB (avec cuid),
     * sinon les éditions suivantes PATCH un id qui n'existe pas en base → "introuvable".
     */
    const syncCollection = async <T extends { id: string }>(
        prev: T[],
        next: T[],
        endpoint: string,
        toPostBody: (item: T) => Record<string, unknown>,
        toPatchBody: (item: T) => Record<string, unknown>,
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        isLocalId: (id: string) => boolean
    ) => {
        const prevById = new Map(prev.map((x) => [x.id, x]))
        const nextById = new Map(next.map((x) => [x.id, x]))

        // 1) POST : items dont l'id est local OU absents du prev (et pas dans prev)
        for (const item of next) {
            if (isLocalId(item.id) || !prevById.has(item.id)) {
                try {
                    const created = await postEntity<T>(endpoint, toPostBody(item))
                    // Remplace l'item local par le vrai item (avec cuid)
                    setter((cur) => cur.map((x) => (x.id === item.id ? created : x)))
                } catch (e) {
                    showApiError("Création")(e)
                }
            }
        }

        // 2) PATCH : items dont l'id existe en DB ET les CHAMPS PATCHABLES ont changé
        //    (skip locaux : gérés par POST. Compare uniquement la subset utile pour
        //    éviter des PATCH inutiles déclenchés par des champs internes comme
        //    generatedPdfUrl/At qui sont mis à jour par d'autres endpoints.)
        for (const item of next) {
            if (isLocalId(item.id)) continue
            const prevItem = prevById.get(item.id)
            if (!prevItem) continue
            const prevBody = JSON.stringify(toPatchBody(prevItem))
            const nextBody = JSON.stringify(toPatchBody(item))
            if (prevBody !== nextBody) {
                patchEntity(`${endpoint}/${item.id}`, toPatchBody(item)).catch(
                    showApiError("Modification")
                )
            }
        }

        // 3) DELETE : items présents dans prev mais plus dans next
        for (const item of prev) {
            if (!nextById.has(item.id)) {
                deleteEntity(`${endpoint}/${item.id}`).catch(showApiError("Suppression"))
            }
        }
    }

    const syncBulletins = (next: MockBulletin[]) => {
        setBulletins(next)
        void syncCollection(
            bulletins,
            next,
            "/api/bulletins",
            (b) => ({
                employeId: b.employeId,
                annee: b.annee,
                mois: b.mois,
                salaireBrut: b.salaireBrut,
                primes: b.primes,
                retenues: b.retenues,
                statut: b.statut,
                notes: b.notes,
            }),
            (b) => ({
                salaireBrut: b.salaireBrut,
                primes: b.primes,
                retenues: b.retenues,
                statut: b.statut,
                dateVersement: b.dateVersement,
                modeVersement: b.modeVersement,
                reference: b.reference,
                notes: b.notes,
            }),
            setBulletins,
            (id) => id.startsWith("bul-local-")
        )
    }

    const syncFactures = (next: MockFacture[]) => {
        setFactures(next)
        void syncCollection(
            factures,
            next,
            "/api/invoices",
            (f) => ({
                direction: f.direction,
                date: f.date,
                dateEcheance: f.dateEcheance,
                clientId: f.clientId,
                dossierId: f.dossierId,
                fournisseurId: f.fournisseurId,
                fournisseurNomLibre: f.fournisseurNomLibre,
                montantHT: f.montantHT,
                tvaRate: f.tvaRate,
                statut: f.statut,
                description: f.description,
                notes: f.notes,
                refacturable: f.refacturable,
                attachmentUrl: f.attachmentUrl,
                // CRITIQUE : les lignes doivent être envoyées pour être persistées
                lignes: (f.lignes ?? []).map((l) => ({
                    libelle: l.libelle,
                    quantite: l.quantite,
                    prixUnitaire: l.prixUnitaire,
                    total: l.total,
                    audienceId: l.audienceId ?? null,
                })),
            }),
            (f) => ({
                date: f.date,
                dateEcheance: f.dateEcheance,
                montantHT: f.montantHT,
                tvaRate: f.tvaRate,
                statut: f.statut,
                description: f.description,
                notes: f.notes,
                refacturable: f.refacturable,
                attachmentUrl: f.attachmentUrl,
                // Lignes incluses au PATCH : l'endpoint les remplace si présent
                lignes: (f.lignes ?? []).map((l) => ({
                    libelle: l.libelle,
                    quantite: l.quantite,
                    prixUnitaire: l.prixUnitaire,
                    total: l.total,
                    audienceId: l.audienceId ?? null,
                })),
            }),
            setFactures,
            (id) => id.startsWith("fac-local-")
        )
    }

    const syncDepenses = (next: MockDepense[]) => {
        setDepenses(next)
        void syncCollection(
            depenses,
            next,
            "/api/depenses",
            (d) => ({
                libelle: d.libelle,
                categorie: d.categorie,
                date: d.date,
                montantHT: d.montantHT,
                tvaRate: d.tvaRate,
                mode: d.mode,
                reference: d.reference,
                recurrent: d.recurrent,
                recurrenceFrequence: d.recurrenceFrequence,
                fournisseurId: d.fournisseurId,
                fournisseurNomLibre: d.fournisseurNomLibre,
                notes: d.notes,
                statut: d.statut,
                attachmentUrl: d.attachmentUrl,
            }),
            (d) => ({
                libelle: d.libelle,
                categorie: d.categorie,
                date: d.date,
                montantHT: d.montantHT,
                tvaRate: d.tvaRate,
                mode: d.mode,
                reference: d.reference,
                recurrent: d.recurrent,
                recurrenceFrequence: d.recurrenceFrequence,
                notes: d.notes,
                statut: d.statut,
                attachmentUrl: d.attachmentUrl,
            }),
            setDepenses,
            (id) => id.startsWith("dep-local-")
        )
    }

    useEffect(() => {
        let alive = true
        Promise.all([
            fetch("/api/invoices").then((r) => (r.ok ? (r.json() as Promise<MockFacture[]>) : [])).catch(() => []),
            fetch("/api/depenses").then((r) => (r.ok ? (r.json() as Promise<MockDepense[]>) : [])).catch(() => []),
            fetch("/api/bulletins").then((r) => (r.ok ? (r.json() as Promise<MockBulletin[]>) : [])).catch(() => []),
            fetch("/api/employes").then((r) => (r.ok ? (r.json() as Promise<Membre[]>) : [])).catch(() => []),
            fetch("/api/clients").then((r) => (r.ok ? (r.json() as Promise<any[]>) : [])).catch(() => []),
            fetch("/api/dossiers").then((r) => (r.ok ? (r.json() as Promise<any[]>) : [])).catch(() => []),
        ])
            .then(([fac, dep, bul, emp, cli, dos]) => {
                if (!alive) return
                setFactures(fac)
                setDepenses(dep)
                setBulletins(bul)
                setEmployes(emp)
                setClients(cli)
                setDossiers(dos)
            })
            .catch((e) => {
                if (alive) setError(e instanceof Error ? e.message : "Erreur inconnue")
            })
            .finally(() => {
                if (alive) setLoading(false)
            })
        return () => {
            alive = false
        }
    }, [])

    /* Compteurs onglets (badges) */
    const tabCounters = useMemo(() => {
        const facturesEnRetard = factures.filter(
            (f) => f.direction === "EMISE" && f.statut === "EN_RETARD"
        ).length
        const fraisAEnAttente = factures.filter(
            (f) => f.direction === "RECUE" && f.refacturable && !f.refactureeViaFactureId
        ).length
        const bulletinsBrouillons = bulletins.filter((b) => b.statut === "BROUILLON").length
        return {
            dashboard: undefined,
            "vue-ensemble": undefined,
            facturation: facturesEnRetard > 0 ? facturesEnRetard : undefined,
            "frais-externes": fraisAEnAttente > 0 ? fraisAEnAttente : undefined,
            depenses: undefined,
            paie: bulletinsBrouillons > 0 ? bulletinsBrouillons : undefined,
        }
    }, [factures, bulletins])

    return (
        <PageGate perm="finance.view" moduleName="Finance">
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header compact : titre + onglets sur la même ligne sticky */}
            <div className="flex-none px-container-margin pt-container-margin flex items-center gap-density-loose flex-wrap">
                <div className="flex items-baseline gap-2 min-w-0 flex-shrink-0">
                    <h1 className="font-h2 text-h2 text-primary-container leading-none">Finance</h1>
                    <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider hidden sm:inline">
                        Comptabilité
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <FinanceTabs active={activeTab} onChange={handleTabChange} counters={tabCounters} />
                </div>
            </div>

            {/* Contenu — scroll vertical pour Dashboard, full-height pour autres tabs */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center font-body-sm text-on-surface-variant">
                        Chargement…
                    </div>
                ) : error ? (
                    <div className="m-container-margin bg-error-container border border-outline-variant rounded-lg p-6 text-center">
                        <p className="font-body-sm text-on-error-container">
                            Impossible de charger le module Finance ({error})
                        </p>
                    </div>
                ) : activeTab === "dashboard" ? (
                    <div className="flex-1 overflow-y-auto scrollbar-thin px-container-margin py-density-medium">
                        <FinanceDashboard />
                    </div>
                ) : activeTab === "vue-ensemble" ? (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <VueEnsembleTab
                            factures={factures}
                            depenses={depenses}
                            bulletins={bulletins}
                        />
                    </div>
                ) : activeTab === "facturation" ? (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <FacturationTab
                            factures={factures}
                            onChangeFactures={syncFactures}
                            presetClientId={presetClientId}
                            presetDossierId={presetDossierId}
                            clients={clients}
                            dossiers={dossiers}
                        />
                    </div>
                ) : activeTab === "frais-externes" ? (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <FraisExternesTab
                            factures={factures}
                            onChangeFactures={syncFactures}
                            clients={clients}
                            dossiers={dossiers}
                            onSelect={(f) => {
                                /* On bascule vers la tab Facturation avec la facture sélectionnée */
                                handleTabChange("facturation")
                                /* La sélection sera gérée via URL — pour l'instant on bascule juste */
                            }}
                        />
                    </div>
                ) : activeTab === "depenses" ? (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <DepensesTab depenses={depenses} onChangeDepenses={syncDepenses} />
                    </div>
                ) : activeTab === "paie" ? (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <PaieTab employes={employes} bulletins={bulletins} onChangeBulletins={syncBulletins} />
                    </div>
                ) : activeTab === "apports" ? (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <ApportsTab
                            membres={employes}
                            dossiers={dossiers}
                            canWrite={hasAccess("apports.write")}
                            presetMembreId={presetMembreId}
                        />
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 px-container-margin py-density-medium">
                        <BilanTab clients={clientOptions} canWrite={hasAccess("finance.write")} />
                    </div>
                )}
            </div>
        </div>
        </PageGate>
    )
}

