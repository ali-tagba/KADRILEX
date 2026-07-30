"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    DIRECTIONS_FACTURE,
    MODES_PAIEMENT,
    STATUTS_FACTURE,
    formatDateCourte,
    formatDateLongue,
    formatFCFA,
} from "@/lib/constants/finance"
import type { MockFacture } from "@/lib/mock/invoices"
import { mockClients, clientDisplayName } from "@/lib/mock/clients"
import { computeFinance, mockDossiers } from "@/lib/mock/dossiers"
import { mockFournisseurs, factureClientName } from "@/lib/mock/invoices"
import { FilePreviewModal } from "@/components/shared/file-preview-modal"

interface FactureDetailPanelProps {
    facture: MockFacture | null
    onClose: () => void
    onEdit: (f: MockFacture) => void
    onPaiement: (f: MockFacture) => void
    onCancel: (id: string) => void
    /** Suppression d'un paiement spécifique d'une facture (DELETE backend) */
    onDeletePaiement?: (factureId: string, paiementId: string) => void
    /** Callback déclenché après une (re)génération PDF réussie */
    onGenerated?: (factureId: string, data: { generatedPdfUrl: string; generatedPdfAt: string }) => void
}

export function FactureDetailPanel({
    facture,
    onClose,
    onEdit,
    onPaiement,
    onCancel,
    onDeletePaiement,
    onGenerated,
}: FactureDetailPanelProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [generating, setGenerating] = useState(false)
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0
        setPreviewOpen(false)
    }, [facture?.id])

    async function handleGenerate() {
        if (!facture) return
        setGenerating(true)
        try {
            const r = await fetch(`/api/invoices/${facture.id}/generate?force=1`, {
                method: "POST",
                credentials: "include",
            })
            if (!r.ok) {
                const err = await r.json().catch(() => ({}))
                throw new Error(err.error ?? `HTTP ${r.status}`)
            }
            const data = (await r.json()) as { generatedPdfUrl: string; generatedPdfAt: string }
            onGenerated?.(facture.id, data)
            // Import dynamique pour éviter d'importer le toast au top-level
            const { toast } = await import("@/components/ui/toaster")
            toast.success("PDF généré · disponible dans l'aperçu")
        } catch (e) {
            const { toast } = await import("@/components/ui/toaster")
            toast.error("Échec génération : " + (e instanceof Error ? e.message : "Erreur"))
        } finally {
            setGenerating(false)
        }
    }
    useEffect(() => {
        if (!facture) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [facture, onClose])

    if (!facture) return null

    /**
     * Choisit le bon document à prévisualiser selon le type de facture :
     *  - ÉMISE : PDF généré par le cabinet (generatedPdfUrl)
     *  - REÇUE : scan PDF uploadé par l'utilisateur (attachmentUrl)
     */
    const previewPath = facture.direction === "EMISE"
        ? facture.generatedPdfUrl ?? null
        : facture.attachmentUrl ?? null
    const previewLabel = facture.direction === "EMISE"
        ? facture.generatedPdfUrl
            ? "PDF généré"
            : "Pas encore généré"
        : facture.attachmentUrl
            ? "Scan facture"
            : "Aucun scan attaché"

    const stat = STATUTS_FACTURE[facture.statut]
    const dir = DIRECTIONS_FACTURE[facture.direction]
    const restant = facture.montantTTC - facture.montantPaye
    // Mock lookups (dev local) — peuvent être vides en prod
    const clientMock = facture.clientId ? mockClients.find((c) => c.id === facture.clientId) : null
    const dossierFull = facture.dossierId ? mockDossiers.find((d) => d.id === facture.dossierId) : null
    const fournisseurMock = facture.fournisseurId
        ? mockFournisseurs.find((f) => f.id === facture.fournisseurId)
        : null
    // Affichage : préfère les relations embarquées de l'API
    const clientName = facture.client
        ? factureClientName(facture.client)
        : clientMock
        ? clientDisplayName(clientMock)
        : null
    const clientLinkId = facture.client?.id ?? clientMock?.id ?? null
    const dossierRef = facture.dossier ?? (dossierFull ? { id: dossierFull.id, numero: dossierFull.numero, titre: dossierFull.titre } : null)
    const fournisseurName = facture.fournisseur?.nom ?? fournisseurMock?.nom ?? null

    const canEdit = facture.statut === "BROUILLON" || facture.statut === "EMISE" || facture.statut === "EN_RETARD"
    const canPaiement =
        facture.direction === "EMISE" &&
        (facture.statut === "EMISE" || facture.statut === "EN_RETARD" || facture.statut === "PARTIELLE")
    const canCancel = facture.statut !== "ANNULEE" && facture.statut !== "PAYEE"

    const downloadStorage = async (path: string, name: string) => {
        const resolved = path.startsWith("data:")
            ? path
            : await fetch(`/api/storage/download-url?path=${encodeURIComponent(path)}&ttl=3600`, {
                  credentials: "include",
              })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data: { signedUrl?: string } | null) => data?.signedUrl ?? path)
                  .catch(() => path)
        const a = document.createElement("a")
        a.href = resolved
        a.download = name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    return (
        <aside
            role="dialog"
            aria-label="Détail facture"
            className="w-[480px] bg-surface-container-lowest border-l border-outline-variant flex flex-col h-full shadow-[-4px_0_15px_rgba(31,26,20,0.05)] z-20 overflow-hidden shrink-0"
        >
            {/* Header */}
            <header className="px-6 py-4 bg-[#FBF7F0] border-b border-outline-variant flex justify-between items-start shrink-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-h2 text-h2 text-primary-container truncate">{facture.numero}</span>
                        <span
                            className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                stat.chip
                            )}
                        >
                            {stat.label}
                        </span>
                    </div>
                    <p className="font-body-sm text-[12px] text-on-surface-variant flex items-center gap-1.5 flex-wrap">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-label-caps",
                                dir.chip
                            )}
                        >
                            <span className="material-symbols-outlined text-[12px]">{dir.icon}</span>
                            {dir.label}
                        </span>
                        <span>·</span>
                        <span>{facture.direction === "EMISE" ? "Émise" : "Reçue"} le {formatDateCourte(facture.date)}</span>
                        {facture.dateEcheance && (
                            <>
                                <span>·</span>
                                <span>Échéance {formatDateCourte(facture.dateEcheance)}</span>
                            </>
                        )}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Fermer"
                    className="p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </header>

            {/* Body scrollable */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-density-medium py-density-medium space-y-density-medium">
                {/* Destinataire / Émetteur */}
                <section>
                    <h3 className="font-label-caps text-label-caps text-outline uppercase mb-2">
                        {facture.direction === "EMISE" ? "Destinataire" : "Émetteur"}
                    </h3>
                    <div className="p-3 bg-surface-container-low rounded border border-outline-variant">
                        {facture.direction === "EMISE" && clientName && (
                            <>
                                {clientLinkId ? (
                                    <Link
                                        href={`/clients/${clientLinkId}`}
                                        className="font-body-md text-body-md font-semibold text-on-surface hover:text-primary-container transition-colors inline-flex items-center gap-1"
                                    >
                                        {clientName}
                                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                    </Link>
                                ) : (
                                    <p className="font-body-md text-body-md font-semibold text-on-surface">{clientName}</p>
                                )}
                                {clientMock && (
                                    <>
                                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                                            {clientMock.adresse ? `${clientMock.adresse}, ` : ""}{clientMock.ville}
                                        </p>
                                        {clientMock.numeroRCCM && (
                                            <p className="text-[11px] text-on-surface-variant font-mono-num">RCCM : {clientMock.numeroRCCM}</p>
                                        )}
                                        {clientMock.email && (
                                            <p className="text-[11px] text-on-surface-variant truncate">{clientMock.email}</p>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                        {facture.direction === "RECUE" && fournisseurName && (
                            <>
                                <p className="font-body-md text-body-md font-semibold text-on-surface">{fournisseurName}</p>
                                {fournisseurMock?.adresse && (
                                    <p className="text-[11px] text-on-surface-variant mt-0.5">{fournisseurMock.adresse}</p>
                                )}
                                {fournisseurMock?.nif && (
                                    <p className="text-[11px] text-on-surface-variant font-mono-num">NIF : {fournisseurMock.nif}</p>
                                )}
                            </>
                        )}
                        {facture.direction === "RECUE" && !fournisseurName && facture.fournisseurNomLibre && (
                            <p className="font-body-md text-body-md font-semibold text-on-surface">{facture.fournisseurNomLibre}</p>
                        )}
                        {dossierRef && (
                            <div className="mt-2 pt-2 border-t border-outline-variant/60 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                                <Link
                                    href={`/dossiers/${dossierRef.id}`}
                                    className="hover:text-primary-container transition-colors truncate"
                                >
                                    {dossierRef.numero} · {dossierRef.titre}
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* Honoraires convenus du dossier — uniquement pour factures émises liées à un dossier */}
                {dossierFull && facture.direction === "EMISE" && computeFinance(dossierFull).totalHonorairesForfait > 0 && (
                    (() => {
                        const finance = computeFinance(dossierFull)
                        const honoraires = finance.totalHonorairesForfait
                        const facturé = finance.montantFactureHT
                        const resteFacturer = finance.resteAFacturer ?? 0
                        const tauxFact = finance.tauxFacturation ?? 0
                        return (
                            <section>
                                <h3 className="font-label-caps text-label-caps text-outline uppercase mb-2 inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">handshake</span>
                                    Honoraires convenus
                                </h3>
                                <div className="bg-accent/5 border border-accent/30 rounded p-3 space-y-2">
                                    <div className="flex justify-between font-mono-num text-[12px]">
                                        <span className="text-on-surface-variant">Convenus</span>
                                        <span className="text-on-surface font-semibold tabular-nums">
                                            {formatFCFA(honoraires)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-mono-num text-[12px]">
                                        <span className="text-on-surface-variant">Déjà facturé HT</span>
                                        <span className="tabular-nums text-on-surface">
                                            {formatFCFA(facturé)}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-accent/30 flex justify-between font-mono-num text-[12px] font-semibold">
                                        <span className="text-primary">Reste à facturer</span>
                                        <span
                                            className={cn(
                                                "tabular-nums",
                                                resteFacturer > 0 ? "text-primary" : "text-[#166534]"
                                            )}
                                        >
                                            {formatFCFA(resteFacturer)}
                                        </span>
                                    </div>
                                    {/* Barre de progression discrète */}
                                    <div className="pt-1">
                                        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    tauxFact >= 1 ? "bg-[#166534]" : "bg-accent"
                                                )}
                                                style={{ width: `${Math.round(tauxFact * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-outline mt-1 text-right font-mono-num">
                                            {Math.round(tauxFact * 100)}% facturé
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )
                    })()
                )}

                {/* Lignes */}
                {facture.lignes.length > 0 && (
                    <section>
                        <h3 className="font-label-caps text-label-caps text-outline uppercase mb-2">Lignes</h3>
                        <ul className="space-y-1.5">
                            {facture.lignes.map((l) => (
                                <li key={l.id} className="p-2.5 bg-surface-container-low rounded border border-outline-variant flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body-sm text-body-sm text-on-surface">{l.libelle}</p>
                                        <p className="font-mono-num text-[11px] text-outline mt-0.5">
                                            {l.quantite} × {formatFCFA(l.prixUnitaire)}
                                        </p>
                                    </div>
                                    <span className="font-mono-num text-mono-num text-on-surface tabular-nums whitespace-nowrap">
                                        {formatFCFA(l.total)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Détails financiers */}
                <section>
                    <h3 className="font-label-caps text-label-caps text-outline uppercase mb-2">Détails financiers</h3>
                    <div className="bg-surface-container-low rounded border border-outline-variant p-3 space-y-2 font-mono-num text-mono-num">
                        <Line label="Montant HT" value={formatFCFA(facture.montantHT)} />
                        <Line label={`TVA (${facture.tvaRate}%)`} value={formatFCFA(facture.montantTVA)} />
                        <div className="pt-2 border-t border-outline-variant flex justify-between font-medium">
                            <span className="text-on-surface">Montant TTC</span>
                            <span className="text-on-surface tabular-nums">{formatFCFA(facture.montantTTC)}</span>
                        </div>
                        <Line
                            label="Encaissé"
                            value={formatFCFA(facture.montantPaye)}
                            valueClass={facture.montantPaye > 0 ? "text-[#166534]" : "text-outline"}
                        />
                        <div className="pt-2 border-t border-error-container/60 flex justify-between font-medium">
                            <span className="text-on-surface">Reste à payer</span>
                            <span className={cn("tabular-nums", restant > 0 ? "text-error" : "text-outline")}>
                                {formatFCFA(restant)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Aperçu document — iframe réel + clic pour ouvrir en plein écran */}
                <section>
                    <h3 className="font-label-caps text-label-caps text-outline uppercase mb-2 flex items-center justify-between">
                        <span>Aperçu document</span>
                        {previewPath && (
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(true)}
                                className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline normal-case"
                            >
                                <span className="material-symbols-outlined text-[12px]">open_in_full</span>
                                Plein écran
                            </button>
                        )}
                    </h3>
                    {previewPath ? (
                        <button
                            type="button"
                            onClick={() => setPreviewOpen(true)}
                            className="block w-full aspect-[3/4] bg-white rounded-lg border border-outline-variant overflow-hidden relative group hover:ring-2 hover:ring-accent transition-all"
                            title="Cliquer pour prévisualiser en plein écran"
                        >
                            <iframe
                                src={`/api/storage/file?path=${encodeURIComponent(previewPath)}`}
                                title={`Aperçu ${facture.numero}`}
                                className="w-full h-full pointer-events-none"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-primary font-body-sm text-[12px] font-semibold shadow-lg">
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                    Ouvrir le PDF
                                </span>
                            </div>
                        </button>
                    ) : (
                        <div className="w-full aspect-[3/4] bg-surface-variant rounded-lg border border-outline-variant flex flex-col items-center justify-center p-4 text-center">
                            <span className="material-symbols-outlined text-[48px] text-outline mb-2">
                                {facture.direction === "EMISE" ? "auto_awesome" : "upload_file"}
                            </span>
                            <p className="font-body-sm text-[12px] text-on-surface-variant mb-1">
                                {previewLabel}
                            </p>
                            <p className="font-body-sm text-[10px] text-outline italic">
                                {facture.direction === "EMISE"
                                    ? "Clique sur Modifier puis Générer la facture"
                                    : "Joins un scan via le formulaire de modification"}
                            </p>
                        </div>
                    )}
                </section>

                {/* Historique paiements */}
                <section>
                    <h3 className="font-label-caps text-label-caps text-outline uppercase mb-2">
                        Historique des paiements
                        <span className="ml-1 font-mono-num text-[10px] text-outline">({facture.paiements.length})</span>
                    </h3>
                    {facture.paiements.length === 0 ? (
                        <p className="font-body-sm text-[12px] text-on-surface-variant text-center py-4 italic">
                            Aucun paiement enregistré
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {[...facture.paiements]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((p) => {
                                    const mode = MODES_PAIEMENT[p.mode]
                                    return (
                                        <li key={p.id} className="group p-2.5 bg-surface-container-low rounded border border-outline-variant">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-body-sm text-body-sm text-on-surface inline-flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px] text-outline">
                                                            {mode.icon}
                                                        </span>
                                                        {mode.label}
                                                    </p>
                                                    <p className="font-mono-num text-[11px] text-outline mt-0.5">
                                                        {formatDateLongue(p.date)}
                                                        {p.reference && ` · Réf : ${p.reference}`}
                                                    </p>
                                                </div>
                                                <span className="font-mono-num text-mono-num text-[#166534] font-medium tabular-nums whitespace-nowrap">
                                                    +{formatFCFA(p.montant)}
                                                </span>
                                                {onDeletePaiement && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm(`Supprimer le paiement de ${formatFCFA(p.montant)} ? La facture sera recalculée.`)) {
                                                                onDeletePaiement(facture.id, p.id)
                                                            }
                                                        }}
                                                        title="Supprimer ce paiement"
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-outline hover:text-error hover:bg-error-container/40 transition-all flex-shrink-0"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                )}
                                            </div>
                                            {p.notes && (
                                                <p className="font-body-sm text-[11px] text-on-surface-variant mt-1.5 italic">
                                                    {p.notes}
                                                </p>
                                            )}
                                        </li>
                                    )
                                })}
                        </ul>
                    )}
                </section>

                {/* Notes */}
                {facture.notes && (
                    <section className="bg-surface-container-low border border-outline-variant rounded p-3">
                        <h4 className="font-label-caps text-label-caps text-outline uppercase mb-1.5 inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">sticky_note_2</span>
                            Notes internes
                        </h4>
                        <p className="font-body-sm text-[12px] text-on-surface italic">{facture.notes}</p>
                    </section>
                )}
            </div>

            {/* Footer actions */}
            <footer className="flex-none px-density-medium py-3 border-t border-outline-variant bg-surface-container flex flex-col gap-2">
                {/* Bouton Générer / Régénérer — seulement pour les factures émises */}
                {facture.direction === "EMISE" && facture.statut !== "ANNULEE" && (() => {
                    const isGenerated = !!facture.generatedPdfUrl && !!facture.generatedPdfAt
                    const isStale =
                        isGenerated &&
                        new Date(facture.updatedAt).getTime() >
                            new Date(facture.generatedPdfAt!).getTime() + 1000
                    return (
                        <button
                            onClick={handleGenerate}
                            disabled={generating || (isGenerated && !isStale)}
                            title={
                                isGenerated && !isStale
                                    ? "Le PDF est à jour avec les dernières modifications."
                                    : isStale
                                    ? "La facture a été modifiée — régénérer le PDF."
                                    : "Générer le PDF officiel KadriLex (format Niger)"
                            }
                            className={cn(
                                "w-full py-2 rounded font-body-sm text-body-sm font-medium inline-flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed",
                                !isGenerated &&
                                    "bg-primary text-on-primary hover:opacity-90 shadow-sm",
                                isStale &&
                                    "bg-secondary/15 border border-secondary/40 text-secondary hover:bg-secondary/25",
                                isGenerated && !isStale && "border border-outline-variant text-outline opacity-70"
                            )}
                        >
                            <span
                                className={cn(
                                    "material-symbols-outlined text-[18px]",
                                    generating && "animate-spin"
                                )}
                            >
                                {generating
                                    ? "progress_activity"
                                    : !isGenerated
                                    ? "auto_awesome"
                                    : isStale
                                    ? "refresh"
                                    : "check_circle"}
                            </span>
                            {generating
                                ? "Génération…"
                                : !isGenerated
                                ? "Générer la facture"
                                : isStale
                                ? "Régénérer la facture"
                                : "PDF à jour"}
                        </button>
                    )
                })()}

                {canPaiement && (
                    <button
                        onClick={() => onPaiement(facture)}
                        className="w-full bg-accent text-white py-2 rounded font-body-sm text-body-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                        Enregistrer un paiement
                    </button>
                )}
                <div className="flex gap-2">
                    {canEdit && (
                        <button
                            onClick={() => onEdit(facture)}
                            className="flex-1 border border-outline-variant text-on-surface py-1.5 rounded font-body-sm text-[12px] hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Modifier
                        </button>
                    )}
                    {facture.direction === "EMISE" ? (
                        <button
                            onClick={() => {
                                if (facture.generatedPdfUrl) {
                                    void downloadStorage(facture.generatedPdfUrl, `${facture.numero}.pdf`)
                                    return
                                }
                                const a = document.createElement("a")
                                a.href = `/api/invoices/${facture.id}/pdf`
                                a.download = `${facture.numero}.pdf`
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                            }}
                            className="flex-1 border border-outline-variant text-on-surface py-1.5 rounded font-body-sm text-[12px] hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
                            title="Télécharger le PDF de la facture (format Niger)"
                        >
                            <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                            Télécharger PDF
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (!facture.attachmentUrl) {
                                    alert("Aucun scan de facture attaché. Joignez-le via Modifier.")
                                    return
                                }
                                void downloadStorage(facture.attachmentUrl, `${facture.numero}.pdf`)
                            }}
                            disabled={!facture.attachmentUrl}
                            className="flex-1 border border-outline-variant text-on-surface py-1.5 rounded font-body-sm text-[12px] hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                            title={facture.attachmentUrl ? "Télécharger le scan joint" : "Aucun fichier joint"}
                        >
                            <span className="material-symbols-outlined text-[14px]">download</span>
                            Télécharger scan
                        </button>
                    )}
                    {canCancel && (
                        <button
                            onClick={() => {
                                if (confirm("Annuler cette facture ?")) onCancel(facture.id)
                            }}
                            className="flex-1 border border-error/30 text-error py-1.5 rounded font-body-sm text-[12px] hover:bg-error-container/30 transition-colors flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">cancel</span>
                            Annuler
                        </button>
                    )}
                </div>
            </footer>

            {/* Modal preview plein écran — utilise notre FilePreviewModal universel */}
            {previewOpen && previewPath && (
                <FilePreviewModal
                    storagePath={previewPath}
                    fileName={`${facture.numero}.pdf`}
                    mimeType="application/pdf"
                    size={null}
                    onClose={() => setPreviewOpen(false)}
                />
            )}
        </aside>
    )
}

function Line({
    label,
    value,
    valueClass,
}: {
    label: string
    value: string
    valueClass?: string
}) {
    return (
        <div className="flex justify-between items-center text-on-surface-variant">
            <span>{label}</span>
            <span className={cn("tabular-nums", valueClass)}>{value}</span>
        </div>
    )
}
