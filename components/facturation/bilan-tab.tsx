"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { formatFCFA } from "@/lib/constants/finance"
import { EncaissementFormDialog, type EncaissementFormDraft } from "./encaissement-form-dialog"
import { BilanFilterDrawer } from "./bilan-filter-drawer"

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

interface EncBloc {
    parMois: Record<string, number[]>
    totals: Record<string, number>
    retenuesParMois: Record<string, number[]>
    retenuesTotals: Record<string, number>
}

interface BilanData {
    annee: number
    encaissements: {
        autres: EncBloc
        parClient: (EncBloc & { clientId: string; nom: string })[]
        totalEncaissementHT: number
    }
    depenses: {
        categories: { categorie: string; label: string; parMois: number[]; total: number }[]
        retrocessions: { label: string; parMois: number[]; total: number }
        totalCharges: number
        totalChargesParMois: number[]
    }
    soldeProvisoire: { parMois: number[]; total: number }
}

interface BilanTabProps {
    clients: { id: string; label: string }[]
    canWrite: boolean
}

export function BilanTab({ clients, canWrite }: BilanTabProps) {
    const now = new Date()
    const [annee, setAnnee] = useState(now.getFullYear())
    const [data, setData] = useState<BilanData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
    /** Quelle(s) section(s) afficher — évite de faire défiler les 3 blocs
     *  (encaissements / retenues / produits-charges) quand un seul intéresse. */
    const [sectionView, setSectionView] = useState<"TOUT" | "ENCAISSEMENTS" | "RETENUES" | "CHARGES">("TOUT")
    /** Catégories actuellement affichées dans le tableau — par défaut, seulement
     *  celles qui ont des montants sur l'année (comme une feuille Excel qui n'a
     *  jamais de ligne vide). Le reste reste accessible via le filtre (tiroir). */
    const [activeCats, setActiveCats] = useState<Set<string>>(new Set())

    const load = () => {
        setLoading(true)
        fetch(`/api/bilan?annee=${annee}`, { credentials: "include" })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json() as Promise<BilanData>
            })
            .then((d) => {
                setData(d)
                setActiveCats(new Set(d.depenses.categories.filter((c) => c.total > 0).map((c) => c.categorie)))
                setError(null)
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false))
    }

    useEffect(load, [annee]) // eslint-disable-line react-hooks/exhaustive-deps

    const defaultCats = useMemo(
        () => new Set(data?.depenses.categories.filter((c) => c.total > 0).map((c) => c.categorie) ?? []),
        [data]
    )
    const activeFilterCount = data
        ? data.depenses.categories.filter((c) => activeCats.has(c.categorie) !== defaultCats.has(c.categorie)).length
        : 0

    async function handleSave(draft: EncaissementFormDraft) {
        const { toast } = await import("@/components/ui/toaster")
        try {
            const r = await fetch("/api/encaissements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(draft),
            })
            if (!r.ok) {
                const body = await r.json().catch(() => ({}))
                throw new Error(body.error ?? `HTTP ${r.status}`)
            }
            toast.success("Encaissement enregistré.")
            setFormOpen(false)
            load()
        } catch (e) {
            toast.error("Échec : " + (e instanceof Error ? e.message : "Erreur"))
        }
    }

    return (
        <>
            <div className="flex flex-col gap-density-tight h-full">
                <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                    <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px]">summarize</span>
                        Bilan {annee}
                    </h2>
                    <div className="inline-flex items-center bg-surface-container-low border border-outline-variant rounded">
                        <button onClick={() => setAnnee((a) => a - 1)} className="px-1.5 py-0.5 text-outline hover:text-on-surface" aria-label="Année précédente">
                            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <span className="px-2 font-body-sm text-body-sm font-medium text-on-surface min-w-[50px] text-center">{annee}</span>
                        <button onClick={() => setAnnee((a) => a + 1)} className="px-1.5 py-0.5 text-outline hover:text-on-surface" aria-label="Année suivante">
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                    </div>

                    {data && (
                        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                            <InlineStat label="Encaissé HT" value={formatFCFA(data.encaissements.totalEncaissementHT)} />
                            <InlineStat label="Charges" value={formatFCFA(data.depenses.totalCharges)} />
                            <InlineStat
                                label="Solde provisoire"
                                value={formatFCFA(data.soldeProvisoire.total)}
                                tone={data.soldeProvisoire.total >= 0 ? "accent" : "danger"}
                            />
                        </div>
                    )}

                    {data && (
                        <button
                            onClick={() => setFilterDrawerOpen(true)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded font-body-sm text-body-sm font-medium transition-colors",
                                activeFilterCount > 0
                                    ? "bg-accent/10 text-primary border border-accent/30 hover:bg-accent/15"
                                    : "text-on-surface-variant hover:bg-surface-container-low border border-transparent"
                            )}
                        >
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                            Filtres
                            {activeFilterCount > 0 && (
                                <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    )}

                    {canWrite && (
                        <button
                            onClick={() => setFormOpen(true)}
                            className="px-3 py-1.5 rounded bg-accent text-white font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Ajouter un encaissement
                        </button>
                    )}
                </header>

                {data && (
                    <div className="inline-flex items-center gap-0.5 border border-outline-variant rounded overflow-hidden self-start">
                        {(
                            [
                                { v: "TOUT" as const, label: "Tout" },
                                { v: "ENCAISSEMENTS" as const, label: "Encaissements" },
                                { v: "RETENUES" as const, label: "Retenues" },
                                { v: "CHARGES" as const, label: "Produits & charges" },
                            ]
                        ).map((opt) => (
                            <button
                                key={opt.v}
                                onClick={() => setSectionView(opt.v)}
                                className={cn(
                                    "px-2.5 py-1 font-body-sm text-[11px] font-medium transition-colors whitespace-nowrap",
                                    sectionView === opt.v
                                        ? "bg-primary text-white"
                                        : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-density-medium pb-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 font-body-sm text-on-surface-variant">Chargement…</div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-16 font-body-sm text-error">{error}</div>
                    ) : data ? (
                        <>
                            {(sectionView === "TOUT" || sectionView === "ENCAISSEMENTS") && (
                                <Section title="Bilan des encaissements" icon="payments">
                                    <EncaissementsTable bloc={data.encaissements.autres} titre="Autres encaissements" />
                                    {data.encaissements.parClient.map((c) => (
                                        <EncaissementsTable key={c.clientId} bloc={c} titre={`Encaissements — ${c.nom}`} />
                                    ))}
                                </Section>
                            )}

                            {(sectionView === "TOUT" || sectionView === "RETENUES") && (
                                <Section title="Retenues sur produits (ISB 30% / Société 20%)" icon="account_balance">
                                    <RetenuesTable bloc={data.encaissements.autres} titre="Autres" />
                                    {data.encaissements.parClient.map((c) => (
                                        <RetenuesTable key={c.clientId} bloc={c} titre={c.nom} />
                                    ))}
                                </Section>
                            )}

                            {(sectionView === "TOUT" || sectionView === "CHARGES") && (
                            <Section title="Tableau des produits et charges" icon="table_chart">
                                {activeFilterCount > 0 && (
                                    <p className="font-body-xs text-body-xs text-outline mb-2 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                                        {activeCats.size} catégorie{activeCats.size > 1 ? "s" : ""} affichée{activeCats.size > 1 ? "s" : ""} sur {data.depenses.categories.length} —{" "}
                                        <button onClick={() => setFilterDrawerOpen(true)} className="text-primary-container hover:text-accent underline underline-offset-2">
                                            ajuster
                                        </button>
                                    </p>
                                )}
                                <ChargesTable
                                    categories={data.depenses.categories.filter((c) => activeCats.has(c.categorie))}
                                    retrocessions={data.depenses.retrocessions}
                                    totalParMois={data.depenses.totalChargesParMois}
                                    totalGeneral={data.depenses.totalCharges}
                                    soldeParMois={data.soldeProvisoire.parMois}
                                    soldeTotal={data.soldeProvisoire.total}
                                />
                                {data.depenses.retrocessions.total === 0 && (
                                    <p className="mt-2 font-body-sm text-body-sm text-secondary flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">info</span>
                                        Rétrocessions à 0 : aucun apport {annee} saisi dans l&apos;onglet &quot;Apports avocats&quot; pour l&apos;instant — cette ligne se remplit automatiquement au fur et à mesure.
                                    </p>
                                )}
                            </Section>
                            )}
                        </>
                    ) : null}
                </div>
            </div>

            {formOpen && (
                <EncaissementFormDialog
                    defaultAnnee={annee}
                    defaultMois={now.getMonth() + 1}
                    clients={clients}
                    onSave={handleSave}
                    onClose={() => setFormOpen(false)}
                />
            )}

            {data && (
                <BilanFilterDrawer
                    open={filterDrawerOpen}
                    onClose={() => setFilterDrawerOpen(false)}
                    categories={data.depenses.categories}
                    activeCats={activeCats}
                    onChange={setActiveCats}
                    defaultCats={defaultCats}
                />
            )}
        </>
    )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
            <h3 className="font-h3 text-h3 text-primary-container mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                {title}
            </h3>
            {children}
        </div>
    )
}

function EncaissementsTable({ bloc, titre }: { bloc: EncBloc; titre: string }) {
    const rows: { key: string; label: string }[] = [
        { key: "montantHT", label: "Honoraires HT" },
        { key: "montantTVA", label: "TVA" },
        { key: "montantTTC", label: "Honoraires TTC" },
        { key: "montantBIC", label: "BIC" },
        { key: "montantRetenueBIC", label: "Retenue BIC" },
        { key: "montantBICCollecte", label: "BIC collecté" },
        { key: "montantTVARetenueSource", label: "TVA retenue source" },
        { key: "montantTVACollectee", label: "TVA collectée" },
        { key: "montantEncaisse", label: "Honoraires encaissés" },
    ]
    return (
        <div className="mb-3">
            <p className="font-label-caps text-label-caps text-outline uppercase mb-1">{titre}</p>
            <div className="overflow-x-auto scrollbar-thin">
                <table className="text-left border-collapse min-w-[900px] w-full">
                    <thead>
                        <tr className="border-b border-outline-variant">
                            <Th>Métrique</Th>
                            {MOIS_COURTS.map((m) => <Th key={m} align="right" width="70px">{m}</Th>)}
                            <Th align="right" width="90px">Total</Th>
                        </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/40">
                        {rows.map((r) => (
                            <tr key={r.key}>
                                <td className="py-1.5 px-2 text-on-surface-variant whitespace-nowrap">{r.label}</td>
                                {bloc.parMois[r.key].map((v, i) => (
                                    <td key={i} className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums text-[11px]">
                                        {v === 0 ? <span className="text-outline-variant">—</span> : formatFCFA(v)}
                                    </td>
                                ))}
                                <td className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums font-semibold">
                                    {formatFCFA(bloc.totals[r.key])}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function RetenuesTable({ bloc, titre }: { bloc: EncBloc; titre: string }) {
    const rows: { key: string; label: string }[] = [
        { key: "montantHT", label: "Honoraires HT" },
        { key: "montantISB", label: "Retenue ISB 30%" },
        { key: "montantNetApresISB", label: "Net après ISB" },
        { key: "montantSociete", label: "Société 20%" },
        { key: "totalRetenues", label: "Total retenues" },
        { key: "honorairesRestants", label: "Honoraires restants" },
    ]
    return (
        <div className="mb-3">
            <p className="font-label-caps text-label-caps text-outline uppercase mb-1">{titre}</p>
            <div className="overflow-x-auto scrollbar-thin">
                <table className="text-left border-collapse min-w-[700px] w-full">
                    <thead>
                        <tr className="border-b border-outline-variant">
                            <Th>Métrique</Th>
                            {MOIS_COURTS.map((m) => <Th key={m} align="right" width="70px">{m}</Th>)}
                            <Th align="right" width="90px">Total</Th>
                        </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/40">
                        {rows.map((r) => (
                            <tr key={r.key}>
                                <td className="py-1.5 px-2 text-on-surface-variant whitespace-nowrap">{r.label}</td>
                                {bloc.retenuesParMois[r.key].map((v, i) => (
                                    <td key={i} className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums text-[11px]">
                                        {v === 0 ? <span className="text-outline-variant">—</span> : formatFCFA(v)}
                                    </td>
                                ))}
                                <td className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums font-semibold">
                                    {formatFCFA(bloc.retenuesTotals[r.key])}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ChargesTable({
    categories,
    retrocessions,
    totalParMois,
    totalGeneral,
    soldeParMois,
    soldeTotal,
}: {
    categories: { categorie: string; label: string; parMois: number[]; total: number }[]
    retrocessions: { label: string; parMois: number[]; total: number }
    totalParMois: number[]
    totalGeneral: number
    soldeParMois: number[]
    soldeTotal: number
}) {
    return (
        <div className="overflow-x-auto scrollbar-thin">
            <table className="text-left border-collapse min-w-[1100px] w-full">
                <thead>
                    <tr className="border-b border-outline-variant">
                        <Th>Catégorie</Th>
                        {MOIS_COURTS.map((m) => <Th key={m} align="right" width="70px">{m}</Th>)}
                        <Th align="right" width="90px">Total</Th>
                    </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/40">
                    {categories.map((c) => (
                        <tr key={c.categorie}>
                            <td className="py-1.5 px-2 text-on-surface-variant whitespace-nowrap">{c.label}</td>
                            {c.parMois.map((v, i) => (
                                <td key={i} className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums text-[11px]">
                                    {v === 0 ? <span className="text-outline-variant">—</span> : formatFCFA(v)}
                                </td>
                            ))}
                            <td className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums font-semibold">{formatFCFA(c.total)}</td>
                        </tr>
                    ))}
                    <tr className="bg-tertiary-fixed-dim/20">
                        <td className="py-1.5 px-2 text-on-surface font-medium whitespace-nowrap">{retrocessions.label}</td>
                        {retrocessions.parMois.map((v, i) => (
                            <td key={i} className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums text-[11px]">
                                {v === 0 ? <span className="text-outline-variant">—</span> : formatFCFA(v)}
                            </td>
                        ))}
                        <td className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums font-semibold">{formatFCFA(retrocessions.total)}</td>
                    </tr>
                    <tr className="border-t-2 border-outline-variant font-semibold">
                        <td className="py-1.5 px-2 text-on-surface whitespace-nowrap">TOTAL CHARGES</td>
                        {totalParMois.map((v, i) => (
                            <td key={i} className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums text-[11px]">{formatFCFA(v)}</td>
                        ))}
                        <td className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums">{formatFCFA(totalGeneral)}</td>
                    </tr>
                    <tr className={cn("font-semibold", soldeTotal >= 0 ? "text-primary" : "text-error")}>
                        <td className="py-1.5 px-2 whitespace-nowrap">SOLDE PROVISOIRE</td>
                        {soldeParMois.map((v, i) => (
                            <td key={i} className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums text-[11px]">{formatFCFA(v)}</td>
                        ))}
                        <td className="py-1.5 px-2 text-right font-mono-num text-mono-num tabular-nums">{formatFCFA(soldeTotal)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

function InlineStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "accent" | "danger" }) {
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{label}</span>
            <span className={cn(
                "font-mono-num text-mono-num text-body-sm font-semibold tabular-nums",
                tone === "accent" ? "text-primary" : tone === "danger" ? "text-error" : "text-on-surface"
            )}>
                {value}
            </span>
        </div>
    )
}

function Th({ children, width, align = "left" }: { children?: React.ReactNode; width?: string; align?: "left" | "right" }) {
    return (
        <th
            className={cn("py-2 px-2 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap", align === "right" && "text-right")}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
