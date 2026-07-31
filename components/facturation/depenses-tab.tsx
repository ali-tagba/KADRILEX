"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    CATEGORIES_DEPENSE,
    FREQUENCES_RECURRENCE,
    MODES_PAIEMENT,
    formatDateCourte,
    formatFCFA,
    type CategorieDepenseKey,
    type ModePaiementKey,
} from "@/lib/constants/finance"
import type { MockDepense } from "@/lib/mock/depenses"
import { DepenseFormDialog, type DepenseFormDraft } from "./depense-form-dialog"
import {
    DepenseFilterDrawer,
    INITIAL_DEPENSE_FILTERS,
    countActiveDepenseFilters,
    type DepenseFiltersState,
} from "./depense-filter-drawer"
import { DepenseActionsMenu } from "./depense-actions-menu"
import { InlineSelectCell, InlineDateCell, InlineTextCell, type InlineOption } from "./inline-cell-editor"

interface DepensesTabProps {
    depenses: MockDepense[]
    employes?: any[]
    onChangeDepenses: (next: MockDepense[]) => void
}

export function DepensesTab({ depenses, employes = [], onChangeDepenses }: DepensesTabProps) {
    const router = useRouter()
    const [filters, setFilters] = useState<DepenseFiltersState>(INITIAL_DEPENSE_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editingDepense, setEditingDepense] = useState<MockDepense | null>(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const filtered = useMemo(() => {
        const q = filters.search.trim().toLowerCase()
        const now = new Date()
        return depenses.filter((d) => {
            if (filters.categories.length > 0 && !filters.categories.includes(d.categorie)) return false
            if (filters.modes.length > 0 && !filters.modes.includes(d.mode)) return false
            if (filters.recurrenceFilter === "RECURRENT" && !d.recurrent) return false
            if (filters.recurrenceFilter === "PONCTUEL" && d.recurrent) return false
            if (filters.frequences.length > 0 && (!d.recurrenceFrequence || !filters.frequences.includes(d.recurrenceFrequence))) return false
            if (filters.avecJustificatif && !d.attachmentUrl) return false
            if (filters.sansJustificatif && d.attachmentUrl) return false
            if (filters.montantMin !== null && d.montantTTC < filters.montantMin) return false
            if (filters.montantMax !== null && d.montantTTC > filters.montantMax) return false
            // Date filtering
            if (filters.datePreset !== "ALL") {
                const date = new Date(d.date)
                if (filters.datePreset === "CURRENT_MONTH") {
                    if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false
                } else if (filters.datePreset === "CURRENT_QUARTER") {
                    const q1 = Math.floor(date.getMonth() / 3)
                    const q2 = Math.floor(now.getMonth() / 3)
                    if (q1 !== q2 || date.getFullYear() !== now.getFullYear()) return false
                } else if (filters.datePreset === "CURRENT_YEAR") {
                    if (date.getFullYear() !== now.getFullYear()) return false
                } else if (filters.datePreset === "CUSTOM") {
                    if (filters.dateStart && date < new Date(filters.dateStart)) return false
                    if (filters.dateEnd) {
                        const end = new Date(filters.dateEnd)
                        end.setDate(end.getDate() + 1)
                        if (date >= end) return false
                    }
                }
            }
            if (q) {
                const hay = [d.libelle, d.fournisseurNomLibre ?? "", d.reference ?? "", d.notes ?? ""].join(" ").toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [depenses, filters])

    const totaux = useMemo(() => {
        const total = filtered.reduce((s, d) => s + d.montantTTC, 0)
        const recurrent = filtered.filter((d) => d.recurrent).reduce((s, d) => s + d.montantTTC, 0)
        return { total, recurrent, ponctuel: total - recurrent }
    }, [filtered])

    const activeCount = countActiveDepenseFilters(filters)

    /* Mutations — appels API réels avec génération auto des écritures comptables */
    const handleSave = async (draft: DepenseFormDraft) => {
        setSaving(true)
        setSaveError(null)
        try {
            const payload = {
                libelle: draft.libelle,
                categorie: draft.categorie,
                date: draft.date,
                montantHT: draft.montantHT,
                tvaRate: draft.tvaRate,
                mode: draft.mode,
                reference: draft.reference ?? null,
                recurrent: draft.recurrent,
                recurrenceFrequence: draft.recurrenceFrequence ?? null,
                fournisseurNomLibre: draft.fournisseurNomLibre ?? null,
                employeId: draft.employeId ?? null,
                notes: draft.notes ?? null,
                attachmentUrl: draft.attachment?.url ?? null,
                statut: draft.statut,
            }

            if (editingDepense) {
                // Mise à jour — PATCH /api/depenses/:id (écriture comptable mise à jour aussi)
                const res = await fetch(`/api/depenses/${editingDepense.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || "Erreur lors de la mise à jour")
                }
            } else {
                // Création — POST /api/depenses (écriture comptable générée automatiquement)
                const res = await fetch("/api/depenses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || "Erreur lors de la création")
                }
            }

            setFormOpen(false)
            setEditingDepense(null)
            // Rafraîchit les données depuis la BDD (SSR)
            router.refresh()
        } catch (err: any) {
            if (err.message === "Failed to fetch") {
                setSaveError("Erreur réseau (Failed to fetch). Si vous utilisez un bloqueur de publicités (Adblock), veuillez le désactiver sur ce site car il peut bloquer les requêtes liées aux 'dépenses'.")
            } else {
                setSaveError(err.message ?? "Une erreur est survenue")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/depenses/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Erreur suppression")
            // Mise à jour optimiste locale
            onChangeDepenses(depenses.filter((d) => d.id !== id))
            router.refresh()
        } catch (err) {
            console.error(err)
        }
    }

    const handleDuplicate = (d: MockDepense) => {
        const now = new Date().toISOString()
        const copy: MockDepense = {
            ...d,
            id: `dep-local-${Date.now()}`,
            libelle: `${d.libelle} (copie)`,
            date: now,
            recurrent: false,
            recurrenceFrequence: null,
            parentRecurrenceId: null,
            createdAt: now,
            updatedAt: now,
        }
        onChangeDepenses([copy, ...depenses])
    }

    /** Inline change catégorie */
    const handleChangeCategorie = (id: string, cat: CategorieDepenseKey) => {
        onChangeDepenses(
            depenses.map((d) =>
                d.id === id ? { ...d, categorie: cat, updatedAt: new Date().toISOString() } : d
            )
        )
    }

    /** Inline change mode paiement */
    const handleChangeMode = (id: string, mode: ModePaiementKey) => {
        onChangeDepenses(
            depenses.map((d) =>
                d.id === id ? { ...d, mode, updatedAt: new Date().toISOString() } : d
            )
        )
    }

    const handleChangeStatut = (id: string, statut: "A_PAYER" | "PAYEE") => {
        // Also fire API update in a real app, but here we just update state, handleSave does the creation.
        // Wait, for inline edits in this mockup, we only update state. The API will need a PATCH.
        onChangeDepenses(
            depenses.map((d) =>
                d.id === id ? { ...d, statut, updatedAt: new Date().toISOString() } : d
            )
        )
        // Optimistic fetch for the inline edit
        fetch(`/api/depenses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statut })
        }).catch(console.error)
    }

    /* Mutations inline rapides */
    const handleChangeDate = (id: string, iso: string | null) => {
        if (!iso) return
        onChangeDepenses(
            depenses.map((d) => (d.id === id ? { ...d, date: iso, updatedAt: new Date().toISOString() } : d))
        )
    }
    const handleChangeLibelle = (id: string, libelle: string) => {
        onChangeDepenses(
            depenses.map((d) => (d.id === id ? { ...d, libelle, updatedAt: new Date().toISOString() } : d))
        )
    }

    /* Options inline */
    const categoriesOptions: InlineOption<CategorieDepenseKey>[] = (
        Object.entries(CATEGORIES_DEPENSE) as [CategorieDepenseKey, { label: string; icon: string }][]
    ).map(([k, m]) => ({ value: k, label: m.label, icon: m.icon }))

    const modesOptions: InlineOption<ModePaiementKey>[] = (
        Object.entries(MODES_PAIEMENT) as [ModePaiementKey, { label: string; icon: string }][]
    ).map(([k, m]) => ({ value: k, label: m.label, icon: m.icon }))

    const statutOptions: InlineOption<"A_PAYER" | "PAYEE">[] = [
        { value: "A_PAYER", label: "À Payer", icon: "pending" },
        { value: "PAYEE", label: "Payée", icon: "check_circle" },
    ]

    return (
        <>
            <div className="flex flex-col gap-density-tight h-full">
                {/* Header compact : titre + chips stats inline + bouton */}
                <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                    <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                        Dépenses internes
                    </h2>
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                        <InlineStat label="Total" value={formatFCFA(totaux.total)} />
                        <InlineStat label="Récurrentes" value={formatFCFA(totaux.recurrent)} />
                        <InlineStat label="Ponctuelles" value={formatFCFA(totaux.ponctuel)} />
                    </div>
                    <button
                        onClick={() => {
                            setEditingDepense(null)
                            setFormOpen(true)
                        }}
                        className="bg-accent text-white px-3 py-1.5 rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-opacity shadow-sm active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Nouvelle dépense
                    </button>
                </header>

                {/* Toolbar (search + Filtres bouton) */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex items-center gap-2 p-density-tight">
                    <div className="relative flex-1 min-w-0">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                            search
                        </span>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Rechercher (libellé, fournisseur, référence, notes…)"
                            className="w-full pl-10 pr-9 py-2 bg-transparent border-0 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilters({ ...filters, search: "" })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        )}
                    </div>
                    <div className="h-6 w-px bg-outline-variant" />
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded font-body-sm text-body-sm font-medium transition-colors",
                            activeCount > 0
                                ? "bg-accent/10 text-primary border border-accent/30 hover:bg-accent/15"
                                : "text-on-surface-variant hover:bg-surface-container-low border border-transparent"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                        Filtres
                        {activeCount > 0 && (
                            <span className="font-mono-num text-mono-num text-[11px] px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                                {activeCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                    {filtered.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
                                account_balance_wallet
                            </span>
                            <p className="font-body-md text-body-md text-on-surface font-medium">Aucune dépense</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                Ajustez les filtres ou créez une nouvelle dépense.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto scrollbar-thin">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="sticky top-0 z-10 bg-surface-container">
                                    <tr className="border-b border-outline-variant">
                                        <Th width="100px">Date</Th>
                                        <Th>Libellé</Th>
                                        <Th width="200px">Catégorie</Th>
                                        <Th width="120px">Statut</Th>
                                        <Th width="140px" align="right">Montant TTC</Th>
                                        <Th width="160px">Mode</Th>
                                        <Th width="100px" align="center">Récur.</Th>
                                        <Th width="60px" align="center">PJ</Th>
                                        <Th width="40px" align="center">⋮</Th>
                                    </tr>
                                </thead>
                                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                                    {filtered.map((d) => {
                                        const cat = CATEGORIES_DEPENSE[d.categorie]
                                        const mode = MODES_PAIEMENT[d.mode]
                                        const freq = d.recurrenceFrequence
                                            ? FREQUENCES_RECURRENCE[d.recurrenceFrequence]
                                            : null
                                        return (
                                            <tr key={d.id} className="hover:bg-surface-container-low/40 transition-colors h-12 group">
                                                <td className="py-2 px-3">
                                                    <InlineDateCell
                                                        value={d.date}
                                                        onChange={(iso) => handleChangeDate(d.id, iso)}
                                                        title="Modifier la date"
                                                        triggerClassName="text-[12px] text-on-surface-variant px-1 py-0.5"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <InlineTextCell
                                                        value={d.libelle}
                                                        onChange={(v) => handleChangeLibelle(d.id, v)}
                                                        title="Cliquer pour renommer"
                                                        displayClassName="font-medium text-on-surface block truncate w-full"
                                                    />
                                                    {d.fournisseurNomLibre && (
                                                        <p className="text-[11px] text-outline truncate mt-0.5">
                                                            {d.fournisseurNomLibre}
                                                            {d.reference && ` · ${d.reference}`}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3">
                                                    {/* Inline catégorie picker (portalisé) */}
                                                    <InlineSelectCell<CategorieDepenseKey>
                                                        trigger={
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]">
                                                                <span className="material-symbols-outlined text-[12px]">{cat.icon}</span>
                                                                {cat.label}
                                                                <span className="material-symbols-outlined text-[10px] opacity-60">expand_more</span>
                                                            </span>
                                                        }
                                                        options={categoriesOptions}
                                                        selected={d.categorie}
                                                        onSelect={(v) => handleChangeCategorie(d.id, v)}
                                                        title="Changer la catégorie"
                                                        menuHeader="Catégorie"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <InlineSelectCell<"A_PAYER" | "PAYEE">
                                                        trigger={
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-label-caps text-[10px]",
                                                                d.statut === "PAYEE" ? "bg-accent/10 text-accent" : "bg-error/10 text-error"
                                                            )}>
                                                                <span className="material-symbols-outlined text-[12px]">{d.statut === "PAYEE" ? "check_circle" : "pending"}</span>
                                                                {d.statut === "PAYEE" ? "Payée" : "À Payer"}
                                                                <span className="material-symbols-outlined text-[10px] opacity-60">expand_more</span>
                                                            </span>
                                                        }
                                                        options={statutOptions}
                                                        selected={d.statut}
                                                        onSelect={(v) => handleChangeStatut(d.id, v)}
                                                        title="Changer le statut"
                                                        menuHeader="Statut de paiement"
                                                    />
                                                </td>
                                                <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums">
                                                    {formatFCFA(d.montantTTC)}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <InlineSelectCell<ModePaiementKey>
                                                        trigger={
                                                            <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant">
                                                                <span className="material-symbols-outlined text-[14px] text-outline">
                                                                    {mode.icon}
                                                                </span>
                                                                {mode.label.split(" ")[0]}
                                                                <span className="material-symbols-outlined text-[10px] opacity-60">expand_more</span>
                                                            </span>
                                                        }
                                                        options={modesOptions}
                                                        selected={d.mode}
                                                        onSelect={(v) => handleChangeMode(d.id, v)}
                                                        title="Changer le mode"
                                                        menuHeader="Mode de paiement"
                                                    />
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {d.recurrent ? (
                                                        <span className="inline-flex items-center gap-1 text-on-tertiary-fixed-variant" title={`Récurrent ${freq?.label ?? ""}`}>
                                                            <span className="material-symbols-outlined text-[16px]">event_repeat</span>
                                                            <span className="text-[10px]">{freq?.label.slice(0, 4)}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-outline-variant text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {d.attachmentUrl ? (
                                                        <a
                                                            href={d.attachmentUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded text-primary-container hover:bg-surface-container-low transition-colors"
                                                            title="Ouvrir le justificatif"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                attach_file
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-outline-variant text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <DepenseActionsMenu
                                                        onEdit={() => {
                                                            setEditingDepense(d)
                                                            setFormOpen(true)
                                                        }}
                                                        onDuplicate={() => handleDuplicate(d)}
                                                        onDelete={() => handleDelete(d.id)}
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <DepenseFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
            />

            {formOpen && (
                <>
                    {saveError && (
                        <div className="fixed top-4 right-4 z-[200] bg-error text-on-error px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {saveError}
                            <button onClick={() => setSaveError(null)} className="ml-2 hover:opacity-70"><span className="material-symbols-outlined text-[16px]">close</span></button>
                        </div>
                    )}
                    <DepenseFormDialog
                        initial={editingDepense}
                        employes={employes}
                        saving={saving}
                        onSave={handleSave}
                        onClose={() => {
                            setFormOpen(false)
                            setEditingDepense(null)
                            setSaveError(null)
                        }}
                    />
                </>
            )}
        </>
    )
}

function InlineStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {label}
            </span>
            <span className="font-mono-num text-mono-num text-body-sm font-semibold text-on-surface tabular-nums">
                {value}
            </span>
        </div>
    )
}

function Th({
    children,
    width,
    align = "left",
}: {
    children: React.ReactNode
    width?: string
    align?: "left" | "center" | "right"
}) {
    return (
        <th
            className={cn(
                "py-2.5 px-3 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap",
                align === "right" && "text-right",
                align === "center" && "text-center"
            )}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
