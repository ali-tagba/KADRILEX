"use client"

import { useMemo, useState, useSyncExternalStore, useCallback } from "react"
import { cn } from "@/lib/utils"

/* ============================================================
   Store local pour le toggle "génération auto des bulletins"
   Persisté en localStorage, partagé entre onglets via 'storage' event.
   ============================================================ */
const AUTO_PAIE_KEY = "kadrilex.autoPaie"
const autoPaieListeners = new Set<() => void>()

function readAutoPaie(): boolean {
    if (typeof window === "undefined") return false
    try {
        return window.localStorage.getItem(AUTO_PAIE_KEY) === "true"
    } catch {
        return false
    }
}

function writeAutoPaie(value: boolean) {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(AUTO_PAIE_KEY, String(value))
    } catch {
        /* ignoré */
    }
    autoPaieListeners.forEach((l) => l())
}

function subscribeAutoPaie(listener: () => void) {
    autoPaieListeners.add(listener)
    if (typeof window !== "undefined") {
        window.addEventListener("storage", listener)
    }
    return () => {
        autoPaieListeners.delete(listener)
        if (typeof window !== "undefined") {
            window.removeEventListener("storage", listener)
        }
    }
}
import {
    STATUTS_BULLETIN,
    STATUTS_CONTRAT,
    formatFCFA,
    formatMoisLong,
    type StatutBulletinKey,
} from "@/lib/constants/finance"
import {
    calcChargesSociales,
    recomputeBulletin,
    type MockBulletin,
} from "@/lib/mock/bulletins"
import type { MockEmploye } from "@/lib/mock/employes"
import { BulletinFormDialog, type BulletinFormDraft } from "./bulletin-form-dialog"
import {
    AjouterSalaireDialog,
    type AjouterSalaireDraft,
} from "./ajouter-salaire-dialog"
import {
    INITIAL_PAIE_FILTERS,
    PaieFilterDrawer,
    countActivePaieFilters,
    type PaieFiltersState,
} from "./paie-filter-drawer"
import { BulletinActionsMenu } from "./bulletin-actions-menu"
import { InlineNumberCell, InlineSelectCell, type InlineOption } from "./inline-cell-editor"

interface PaieTabProps {
    employes: MockEmploye[]
    bulletins: MockBulletin[]
    onChangeBulletins: (next: MockBulletin[]) => void
}

export function PaieTab({ employes, bulletins, onChangeBulletins }: PaieTabProps) {
    const now = new Date()
    const [periode, setPeriode] = useState<{ annee: number; mois: number }>({
        annee: now.getFullYear(),
        mois: now.getMonth() + 1,
    })
    const [filters, setFilters] = useState<PaieFiltersState>(INITIAL_PAIE_FILTERS)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editingBulletin, setEditingBulletin] = useState<MockBulletin | null>(null)
    const [editingEmploye, setEditingEmploye] = useState<MockEmploye | null>(null)
    /* Bouton "Ajouter un salaire" — création manuelle d'un bulletin */
    const [ajoutOpen, setAjoutOpen] = useState(false)
    /* Mode d'affichage : MOIS = mois courant (édition), HISTORIQUE = tous mois passés (consultation) */
    const [viewMode, setViewMode] = useState<"MOIS" | "HISTORIQUE">("MOIS")
    /* Filtres historique */
    const [histAnnee, setHistAnnee] = useState<number | "ALL">("ALL")
    const [histMois, setHistMois] = useState<number | "ALL">("ALL")
    const [histEmploye, setHistEmploye] = useState<string>("")
    /* Génération auto mensuelle (persistée localStorage, sync via useSyncExternalStore) */
    const autoPaie = useSyncExternalStore(
        subscribeAutoPaie,
        readAutoPaie,
        () => false
    )
    const toggleAutoPaie = useCallback(() => {
        writeAutoPaie(!readAutoPaie())
    }, [])

    const navMois = (delta: number) => {
        const d = new Date(periode.annee, periode.mois - 1 + delta, 1)
        setPeriode({ annee: d.getFullYear(), mois: d.getMonth() + 1 })
    }
    const isCurrentMois = periode.annee === now.getFullYear() && periode.mois === now.getMonth() + 1

    const bulletinsPeriode = useMemo(
        () => bulletins.filter((b) => b.annee === periode.annee && b.mois === periode.mois),
        [bulletins, periode]
    )

    /* Bulletins selon le mode :
       - MOIS : ceux du mois courant (édition courante)
       - HISTORIQUE : tous, filtrés par année/mois/employé */
    const bulletinsScope = useMemo(() => {
        if (viewMode === "MOIS") return bulletinsPeriode
        return bulletins.filter((b) => {
            if (histAnnee !== "ALL" && b.annee !== histAnnee) return false
            if (histMois !== "ALL" && b.mois !== histMois) return false
            if (histEmploye && b.employeId !== histEmploye) return false
            return true
        })
    }, [viewMode, bulletinsPeriode, bulletins, histAnnee, histMois, histEmploye])

    /* Liste des années présentes dans les bulletins, pour le filtre historique */
    const availableYears = useMemo(() => {
        const set = new Set<number>()
        for (const b of bulletins) set.add(b.annee)
        return Array.from(set).sort((a, b) => b - a)
    }, [bulletins])

    const filtered = useMemo(() => {
        const q = filters.search.trim().toLowerCase()
        return bulletinsScope.filter((b) => {
            if (filters.statuts.length > 0 && !filters.statuts.includes(b.statut)) return false
            if (filters.employeIds.length > 0 && !filters.employeIds.includes(b.employeId)) return false
            const emp = employes.find((e) => e.id === b.employeId)
            if (filters.statutsContrat.length > 0 && (!emp || !filters.statutsContrat.includes(emp.statutContrat))) return false
            if (filters.modesVersement.length > 0 && (!b.modeVersement || !filters.modesVersement.includes(b.modeVersement))) return false
            if (filters.salaireBrutMin !== null && b.salaireBrut < filters.salaireBrutMin) return false
            if (filters.salaireBrutMax !== null && b.salaireBrut > filters.salaireBrutMax) return false
            if (filters.avecPrimes && b.primes <= 0) return false
            if (filters.avecRetenues && b.retenues <= 0) return false
            if (q && emp) {
                const hay = `${emp.prenom} ${emp.nom}`.toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [bulletinsScope, filters, employes])

    const totaux = useMemo(() => {
        const totalBrut = filtered.reduce((s, b) => s + b.salaireBrut, 0)
        const totalNet = filtered.reduce((s, b) => s + b.salaireNet, 0)
        const coutEmployeur = filtered.reduce((s, b) => s + b.coutTotalEmployeur, 0)
        return { totalBrut, totalNet, coutEmployeur }
    }, [filtered])

    const employesSansBulletin = useMemo(() => {
        const ids = new Set(bulletinsPeriode.map((b) => b.employeId))
        return employes.filter((e) => e.actif && !ids.has(e.id))
    }, [employes, bulletinsPeriode])

    const activeCount = countActivePaieFilters(filters)

    const availableEmployes = useMemo(
        () => employes.map((e) => ({ id: e.id, name: `${e.prenom} ${e.nom}` })),
        [employes]
    )

    /* Mutations */
    const handleGenererBulletins = () => {
        if (employesSansBulletin.length === 0) {
            alert("Tous les employés actifs ont déjà un bulletin pour ce mois.")
            return
        }
        const nouveaux: MockBulletin[] = employesSansBulletin.map((emp) => {
            const { chargesSalariales, chargesPatronales } = calcChargesSociales(emp.salaireBaseBrut)
            const id = `bul-local-${emp.id}-${periode.annee}-${periode.mois}-${Date.now()}`
            return recomputeBulletin({
                id,
                employeId: emp.id,
                annee: periode.annee,
                mois: periode.mois,
                salaireBrut: emp.salaireBaseBrut,
                primes: 0,
                retenues: 0,
                chargesSalariales,
                chargesPatronales,
                lignes: [
                    { id: `${id}-l1`, libelle: "Salaire de base", type: "GAIN", montant: emp.salaireBaseBrut },
                    { id: `${id}-l2`, libelle: "CNSS — part salariale", type: "CHARGE_SALARIALE", montant: chargesSalariales },
                    { id: `${id}-l3`, libelle: "CNSS — part patronale", type: "CHARGE_PATRONALE", montant: chargesPatronales },
                ],
                statut: "BROUILLON",
                dateVersement: null,
                modeVersement: null,
                reference: null,
                pdfUrl: null,
                notes: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
        })
        onChangeBulletins([...nouveaux, ...bulletins])
    }

    const handleSaveBulletin = (draft: BulletinFormDraft) => {
        if (!editingBulletin) return
        const { chargesSalariales, chargesPatronales } = calcChargesSociales(draft.salaireBrut)
        const nowIso = new Date().toISOString()
        const updated = recomputeBulletin({
            ...editingBulletin,
            salaireBrut: draft.salaireBrut,
            primes: draft.primes,
            retenues: draft.retenues,
            chargesSalariales,
            chargesPatronales,
            statut: draft.statut,
            dateVersement: draft.statut === "VERSE" ? draft.dateVersement ?? nowIso : null,
            modeVersement: draft.statut === "VERSE" ? draft.modeVersement : null,
            reference: draft.statut === "VERSE" ? draft.reference : null,
            notes: draft.notes,
            updatedAt: nowIso,
        })
        onChangeBulletins(bulletins.map((b) => (b.id === editingBulletin.id ? updated : b)))
        setFormOpen(false)
        setEditingBulletin(null)
        setEditingEmploye(null)
    }

    const updateStatut = (b: MockBulletin, statut: StatutBulletinKey) => {
        const updated = recomputeBulletin({
            ...b,
            statut,
            dateVersement: statut === "VERSE" && !b.dateVersement ? new Date().toISOString() : b.dateVersement,
            modeVersement: statut === "VERSE" && !b.modeVersement ? "VIREMENT" : b.modeVersement,
            updatedAt: new Date().toISOString(),
        })
        onChangeBulletins(bulletins.map((x) => (x.id === b.id ? updated : x)))
    }

    /** Création manuelle d'un bulletin via le dialog "Ajouter un salaire" */
    const handleAjouterSalaire = (draft: AjouterSalaireDraft) => {
        const emp = employes.find((e) => e.id === draft.employeId)
        if (!emp) return
        const { chargesSalariales, chargesPatronales } = calcChargesSociales(draft.salaireBrut)
        const id = `bul-local-${draft.employeId}-${draft.annee}-${draft.mois}-${Date.now()}`
        const now = new Date().toISOString()
        const nouveau = recomputeBulletin({
            id,
            employeId: draft.employeId,
            annee: draft.annee,
            mois: draft.mois,
            salaireBrut: draft.salaireBrut,
            primes: draft.primes,
            retenues: draft.retenues,
            chargesSalariales,
            chargesPatronales,
            lignes: [
                {
                    id: `${id}-l1`,
                    libelle: "Salaire de base",
                    type: "GAIN",
                    montant: draft.salaireBrut,
                },
                ...(draft.primes > 0
                    ? [
                          {
                              id: `${id}-l2`,
                              libelle: "Primes",
                              type: "GAIN" as const,
                              montant: draft.primes,
                          },
                      ]
                    : []),
                ...(draft.retenues > 0
                    ? [
                          {
                              id: `${id}-l3`,
                              libelle: "Retenues",
                              type: "RETENUE" as const,
                              montant: draft.retenues,
                          },
                      ]
                    : []),
                {
                    id: `${id}-l4`,
                    libelle: "CNSS — part salariale",
                    type: "CHARGE_SALARIALE",
                    montant: chargesSalariales,
                },
                {
                    id: `${id}-l5`,
                    libelle: "CNSS — part patronale",
                    type: "CHARGE_PATRONALE",
                    montant: chargesPatronales,
                },
            ],
            statut: draft.statut,
            dateVersement: draft.dateVersement,
            modeVersement: draft.modeVersement,
            reference: draft.reference,
            pdfUrl: draft.attachment?.url ?? null,
            notes: draft.notes,
            createdAt: now,
            updatedAt: now,
        })
        onChangeBulletins([nouveau, ...bulletins])
        setAjoutOpen(false)
    }

    /** Édition inline d'un montant (brut / primes / retenues). Recalcule charges + net. */
    const updateMontant = (
        b: MockBulletin,
        field: "salaireBrut" | "primes" | "retenues",
        value: number
    ) => {
        const next = { ...b, [field]: value }
        if (field === "salaireBrut") {
            const { chargesSalariales, chargesPatronales } = calcChargesSociales(value)
            next.chargesSalariales = chargesSalariales
            next.chargesPatronales = chargesPatronales
        }
        next.updatedAt = new Date().toISOString()
        const updated = recomputeBulletin(next)
        onChangeBulletins(bulletins.map((x) => (x.id === b.id ? updated : x)))
    }

    const handleDelete = (id: string) => {
        onChangeBulletins(bulletins.filter((b) => b.id !== id))
    }

    /* Inline statut options */
    const statutOptions: InlineOption<StatutBulletinKey>[] = (
        Object.entries(STATUTS_BULLETIN) as [StatutBulletinKey, { label: string; chip: string }][]
    ).map(([k, m]) => ({
        value: k,
        label: m.label,
        preview: <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase", m.chip)}>{m.label}</span>,
    }))

    return (
        <>
            <div className="flex flex-col gap-density-tight h-full">
                {/* Header compact : titre + nav mois + chips stats inline + bouton */}
                <header className="flex items-center gap-3 flex-wrap bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5">
                    <h2 className="font-h3 text-h3 text-primary-container leading-none flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                        Paie
                    </h2>

                    {/* Toggle MOIS / HISTORIQUE */}
                    <div className="flex bg-surface-container-low border border-outline-variant rounded p-0.5">
                        <button
                            onClick={() => setViewMode("MOIS")}
                            className={cn(
                                "px-2.5 py-1 rounded font-body-sm text-[11px] transition-all whitespace-nowrap",
                                viewMode === "MOIS"
                                    ? "bg-white shadow-sm text-primary-container font-medium"
                                    : "text-outline hover:text-on-surface"
                            )}
                        >
                            Mois en cours
                        </button>
                        <button
                            onClick={() => setViewMode("HISTORIQUE")}
                            className={cn(
                                "px-2.5 py-1 rounded font-body-sm text-[11px] transition-all whitespace-nowrap inline-flex items-center gap-1",
                                viewMode === "HISTORIQUE"
                                    ? "bg-white shadow-sm text-primary-container font-medium"
                                    : "text-outline hover:text-on-surface"
                            )}
                        >
                            <span className="material-symbols-outlined text-[14px]">history</span>
                            Historique
                        </button>
                    </div>

                    {viewMode === "MOIS" ? (
                        /* Nav mois inline */
                        <div className="inline-flex items-center bg-surface-container-low border border-outline-variant rounded">
                            <button
                                onClick={() => navMois(-1)}
                                className="px-1.5 py-0.5 text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                                aria-label="Mois précédent"
                            >
                                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                            </button>
                            <span className="px-2 font-body-sm text-body-sm font-medium text-on-surface min-w-[120px] text-center whitespace-nowrap">
                                {formatMoisLong(periode.annee, periode.mois)}
                                {isCurrentMois && (
                                    <span className="ml-1 text-[9px] uppercase font-label-caps text-accent">en cours</span>
                                )}
                            </span>
                            <button
                                onClick={() => navMois(1)}
                                className="px-1.5 py-0.5 text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                                aria-label="Mois suivant"
                            >
                                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                        </div>
                    ) : (
                        /* Filtres historique : année + mois + employé */
                        <div className="flex items-center gap-1.5">
                            <select
                                value={String(histAnnee)}
                                onChange={(e) =>
                                    setHistAnnee(
                                        e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                                    )
                                }
                                className="bg-surface border border-outline-variant rounded px-2 py-1 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent"
                            >
                                <option value="ALL">Toutes années</option>
                                {availableYears.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={String(histMois)}
                                onChange={(e) =>
                                    setHistMois(
                                        e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                                    )
                                }
                                className="bg-surface border border-outline-variant rounded px-2 py-1 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent"
                            >
                                <option value="ALL">Tous mois</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>
                                        {new Date(2000, m - 1, 1)
                                            .toLocaleDateString("fr-FR", { month: "long" })
                                            .replace(/^./, (c) => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={histEmploye}
                                onChange={(e) => setHistEmploye(e.target.value)}
                                className="bg-surface border border-outline-variant rounded px-2 py-1 font-body-sm text-[11px] text-on-surface outline-none focus:border-accent max-w-[160px]"
                            >
                                <option value="">Tous employés</option>
                                {employes.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.prenom} {e.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                        <InlineStat label="Nets" value={formatFCFA(totaux.totalNet)} />
                        <InlineStat label="Brut" value={formatFCFA(totaux.totalBrut)} />
                        <InlineStat label="Coût" value={formatFCFA(totaux.coutEmployeur)} tone="warning" />
                        <span className="font-body-xs text-body-xs text-outline">
                            · {employes.filter((e) => e.actif).length} actifs
                        </span>
                    </div>

                    {/* Toggle automatisation mensuelle */}
                    <button
                        onClick={toggleAutoPaie}
                        title={
                            autoPaie
                                ? "Auto-paie activée : génération automatique des bulletins en début de mois"
                                : "Activer la génération automatique en début de mois"
                        }
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1.5 rounded border font-body-sm text-body-sm transition-all",
                            autoPaie
                                ? "border-accent/40 bg-accent/10 text-primary"
                                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                        )}
                        aria-pressed={autoPaie}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {autoPaie ? "autoplay" : "schedule_send"}
                        </span>
                        <span className="font-label-caps text-[10px] uppercase tracking-wider">
                            Auto
                        </span>
                        <span
                            className={cn(
                                "relative w-7 h-3.5 rounded-full transition-colors",
                                autoPaie ? "bg-accent" : "bg-outline-variant"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all",
                                    autoPaie ? "left-3.5" : "left-0.5"
                                )}
                            />
                        </span>
                    </button>

                    {viewMode === "MOIS" && employesSansBulletin.length > 0 && (
                        <button
                            onClick={handleGenererBulletins}
                            title="Générer un bulletin en BROUILLON pour chaque employé actif sans bulletin ce mois"
                            className="px-3 py-1.5 border border-accent/40 bg-accent/10 text-primary rounded font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-accent/15 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                            Générer {employesSansBulletin.length}
                        </button>
                    )}

                    {/* Ajout manuel d'un salaire — disponible quel que soit le mode */}
                    <button
                        onClick={() => setAjoutOpen(true)}
                        className="px-3 py-1.5 rounded bg-accent text-white font-body-sm text-body-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-colors shadow-sm active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Ajouter un salaire
                    </button>
                </header>

                {/* Toolbar */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex items-center gap-2 p-density-tight">
                    <div className="relative flex-1 min-w-0">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                            search
                        </span>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Rechercher un employé…"
                            className="w-full pl-10 pr-3 py-2 bg-transparent border-0 font-body-sm text-body-sm focus:outline-none placeholder:text-outline"
                        />
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
                            <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">groups</span>
                            <p className="font-body-md text-body-md text-on-surface font-medium">
                                Aucun bulletin pour ce mois
                            </p>
                            {employesSansBulletin.length > 0 && (
                                <button
                                    onClick={handleGenererBulletins}
                                    className="mt-3 text-primary-container hover:text-accent inline-flex items-center gap-1 font-body-sm text-body-sm font-medium"
                                >
                                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                    Générer les bulletins
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto scrollbar-thin">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead className="sticky top-0 z-10 bg-surface-container">
                                    <tr className="border-b border-outline-variant">
                                        <Th>Employé</Th>
                                        <Th width="150px">Statut contrat</Th>
                                        {viewMode === "HISTORIQUE" && <Th width="110px">Mois</Th>}
                                        <Th width="110px">Embauche</Th>
                                        <Th width="120px" align="right">Brut</Th>
                                        <Th width="100px" align="right">Primes</Th>
                                        <Th width="100px" align="right">Retenues</Th>
                                        <Th width="120px" align="right">Net</Th>
                                        <Th width="130px" align="right">Coût total</Th>
                                        <Th width="120px" align="center">Statut</Th>
                                        <Th width="40px" align="center" />
                                        <Th width="40px" align="center">⋮</Th>
                                    </tr>
                                </thead>
                                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                                    {filtered.map((b) => {
                                        const emp = employes.find((e) => e.id === b.employeId)
                                        if (!emp) return null
                                        const stat = STATUTS_BULLETIN[b.statut]
                                        const contrat = STATUTS_CONTRAT[emp.statutContrat]
                                        return (
                                            <tr key={b.id} className="hover:bg-surface-container-low/40 transition-colors h-12 group">
                                                <td className="py-2 px-3">
                                                    <p className="font-medium text-on-surface">
                                                        {emp.prenom} {emp.nom}
                                                    </p>
                                                    <p className="text-[11px] text-outline">{emp.fonction}</p>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]">
                                                        <span className="material-symbols-outlined text-[12px]">{contrat.icon}</span>
                                                        {contrat.label}
                                                    </span>
                                                </td>
                                                {viewMode === "HISTORIQUE" && (
                                                    <td className="py-2 px-3 font-mono-num text-mono-num text-[11px] text-on-surface whitespace-nowrap">
                                                        {formatMoisLong(b.annee, b.mois)}
                                                    </td>
                                                )}
                                                <td className="py-2 px-3 font-mono-num text-mono-num text-[11px] text-on-surface-variant tabular-nums whitespace-nowrap">
                                                    {(() => {
                                                        const dEmb = new Date(emp.dateEmbauche)
                                                        const annees = Math.max(
                                                            0,
                                                            Math.floor(
                                                                (Date.now() - dEmb.getTime()) /
                                                                    (365.25 * 24 * 3600 * 1000)
                                                            )
                                                        )
                                                        const dateCourte = dEmb.toLocaleDateString("fr-FR", {
                                                            month: "2-digit",
                                                            year: "numeric",
                                                        })
                                                        return (
                                                            <span title={`Embauché·e le ${dEmb.toLocaleDateString("fr-FR")}`}>
                                                                {dateCourte}
                                                                <span className="ml-1 text-outline">
                                                                    · {annees} an{annees > 1 ? "s" : ""}
                                                                </span>
                                                            </span>
                                                        )
                                                    })()}
                                                </td>
                                                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                                    <InlineNumberCell
                                                        value={b.salaireBrut}
                                                        onChange={(v) => updateMontant(b, "salaireBrut", v)}
                                                        formatDisplay={formatFCFA}
                                                        title="Modifier le salaire brut (recalcule charges et net)"
                                                        displayClassName="font-mono-num text-mono-num text-on-surface-variant tabular-nums block"
                                                    />
                                                </td>
                                                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                                    <InlineNumberCell
                                                        value={b.primes}
                                                        onChange={(v) => updateMontant(b, "primes", v)}
                                                        formatDisplay={formatFCFA}
                                                        prefix="+"
                                                        showDashOnZero
                                                        title="Modifier les primes"
                                                        displayClassName={cn(
                                                            "font-mono-num text-mono-num tabular-nums block",
                                                            b.primes > 0 ? "text-[#166534]" : "text-outline-variant"
                                                        )}
                                                    />
                                                </td>
                                                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                                    <InlineNumberCell
                                                        value={b.retenues}
                                                        onChange={(v) => updateMontant(b, "retenues", v)}
                                                        formatDisplay={formatFCFA}
                                                        prefix="−"
                                                        showDashOnZero
                                                        title="Modifier les retenues"
                                                        displayClassName={cn(
                                                            "font-mono-num text-mono-num tabular-nums block",
                                                            b.retenues > 0 ? "text-error" : "text-outline-variant"
                                                        )}
                                                    />
                                                </td>
                                                <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums text-on-surface font-semibold">
                                                    {formatFCFA(b.salaireNet)}
                                                </td>
                                                <td className="py-2 px-3 font-mono-num text-mono-num text-right tabular-nums text-on-surface-variant">
                                                    {formatFCFA(b.coutTotalEmployeur)}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    <InlineSelectCell<StatutBulletinKey>
                                                        trigger={
                                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase", stat.chip)}>
                                                                {stat.label}
                                                                <span className="material-symbols-outlined text-[10px] opacity-60">expand_more</span>
                                                            </span>
                                                        }
                                                        options={statutOptions}
                                                        selected={b.statut}
                                                        onSelect={(v) => updateStatut(b, v)}
                                                        title="Changer le statut"
                                                        menuHeader="Statut bulletin"
                                                        align="end"
                                                    />
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {b.pdfUrl ? (
                                                        <a
                                                            href={b.pdfUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Voir la fiche de paie / justificatif"
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded text-primary-container hover:bg-surface-container-low transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                attach_file
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-outline-variant text-[10px]">—</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <BulletinActionsMenu
                                                        statut={b.statut}
                                                        onEdit={() => {
                                                            setEditingBulletin(b)
                                                            setEditingEmploye(emp)
                                                            setFormOpen(true)
                                                        }}
                                                        onValidate={() => updateStatut(b, "VALIDE")}
                                                        onMarkPaid={() => updateStatut(b, "VERSE")}
                                                        onRevertToDraft={() => updateStatut(b, "BROUILLON")}
                                                        onDelete={() => handleDelete(b.id)}
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

            <PaieFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                filters={filters}
                onChange={setFilters}
                availableEmployes={availableEmployes}
            />

            {formOpen && editingBulletin && editingEmploye && (
                <BulletinFormDialog
                    employe={editingEmploye}
                    bulletin={editingBulletin}
                    onSave={handleSaveBulletin}
                    onClose={() => {
                        setFormOpen(false)
                        setEditingBulletin(null)
                        setEditingEmploye(null)
                    }}
                />
            )}

            {ajoutOpen && (
                <AjouterSalaireDialog
                    membresDispo={employesSansBulletin}
                    membresActifs={employes.filter((e) => e.actif)}
                    annee={periode.annee}
                    mois={periode.mois}
                    onSave={handleAjouterSalaire}
                    onClose={() => setAjoutOpen(false)}
                />
            )}
        </>
    )
}

function InlineStat({
    label,
    value,
    tone = "neutral",
}: {
    label: string
    value: string
    tone?: "neutral" | "warning"
}) {
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {label}
            </span>
            <span
                className={cn(
                    "font-mono-num text-mono-num text-body-sm font-semibold tabular-nums",
                    tone === "warning" ? "text-secondary" : "text-on-surface"
                )}
            >
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
    children?: React.ReactNode
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
