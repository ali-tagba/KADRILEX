import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError, getQuery } from "@/lib/server/api-helpers"
import ExcelJS from "exceljs"
import {
    addCabinetBanner,
    autoFitWorksheetColumns,
    styleDataRow,
    styleHeaderRow,
    styleTotalRow,
} from "@/lib/server/excel-styling"

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)
        const period = q.period || "ALL"
        const now = new Date()

        let dateGte: Date | undefined
        if (period === "30") {
            dateGte = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
        } else if (period === "90") {
            dateGte = new Date(now.getTime() - 90 * 24 * 3600 * 1000)
        } else if (period === "365") {
            dateGte = new Date(now.getTime() - 365 * 24 * 3600 * 1000)
        }

        const [factures, depenses, encaissements] = await Promise.all([
            prisma.facture.findMany({
                where: dateGte ? { date: { gte: dateGte } } : undefined,
                include: { client: true, dossier: true, fournisseur: true, paiements: true },
                orderBy: { date: "desc" },
            }),
            prisma.depense.findMany({
                where: dateGte ? { date: { gte: dateGte } } : undefined,
                include: { fournisseur: true, dossier: true },
                orderBy: { date: "desc" },
            }),
            prisma.encaissementMensuel.findMany({
                where: dateGte ? { createdAt: { gte: dateGte } } : undefined,
                include: { client: true },
                orderBy: [{ annee: "desc" }, { mois: "desc" }],
            }),
        ])

        interface FluxRow {
            date: string
            kind: string
            numero: string
            libelle: string
            tiers: string
            dossier: string
            mode: string
            statut: string
            entree: number
            sortie: number
            net: number
        }

        const rows: FluxRow[] = []

        // 1. Factures émises & reçues
        for (const f of factures) {
            const tiers = f.direction === "EMISE"
                ? (f.client?.raisonSociale ?? f.client?.nom ?? "Client")
                : (f.fournisseurNomLibre ?? f.fournisseur?.nom ?? "Fournisseur")
            const dossier = f.dossier?.numero ?? ""
            const isEmise = f.direction === "EMISE"

            rows.push({
                date: f.date.toISOString().split("T")[0],
                kind: isEmise ? "Facture émise" : "Facture reçue",
                numero: f.numero,
                libelle: f.description || (isEmise ? "Prestation juridique" : "Achat / Prestation"),
                tiers,
                dossier,
                mode: f.paiements[0]?.mode ?? "—",
                statut: f.statut,
                entree: isEmise ? f.montantTTC : 0,
                sortie: !isEmise ? f.montantTTC : 0,
                net: isEmise ? f.montantTTC : -f.montantTTC,
            })

            // Paiements rattachés à cette facture
            for (const p of f.paiements) {
                rows.push({
                    date: p.date.toISOString().split("T")[0],
                    kind: isEmise ? "Paiement reçu" : "Paiement émis",
                    numero: `PAI-${f.numero}`,
                    libelle: `Règlement facture ${f.numero}${p.reference ? ` (${p.reference})` : ""}`,
                    tiers,
                    dossier,
                    mode: p.mode,
                    statut: "ENCAISSE",
                    entree: isEmise ? p.montant : 0,
                    sortie: !isEmise ? p.montant : 0,
                    net: isEmise ? p.montant : -p.montant,
                })
            }
        }

        // 2. Dépenses internes
        for (const d of depenses) {
            rows.push({
                date: d.date.toISOString().split("T")[0],
                kind: "Dépense interne",
                numero: d.reference || `DEP-${d.id.slice(-6)}`,
                libelle: d.libelle,
                tiers: d.fournisseurNomLibre ?? d.fournisseur?.nom ?? "Cabinet",
                dossier: d.dossier?.numero ?? "",
                mode: d.mode,
                statut: d.statut,
                entree: 0,
                sortie: d.montantTTC,
                net: -d.montantTTC,
            })
        }

        // 3. Encaissements mensuels
        for (const e of encaissements) {
            rows.push({
                date: `${e.annee}-${String(e.mois).padStart(2, "0")}-01`,
                kind: "Encaissement Bilan",
                numero: `ENC-${e.annee}-${String(e.mois).padStart(2, "0")}`,
                libelle: `Encaissement mensuel ${e.client?.raisonSociale ?? "Autres clients"}`,
                tiers: e.client?.raisonSociale ?? e.client?.nom ?? "Autres",
                dossier: "",
                mode: "VIREMENT",
                statut: "ENCAISSE",
                entree: e.montantEncaisse,
                sortie: 0,
                net: e.montantEncaisse,
            })
        }

        // Trier par date décroissante
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        const workbook = new ExcelJS.Workbook()
        workbook.creator = "SCPA KADRI LEGAL"
        workbook.created = new Date()

        // --- Feuille 1 : Flux complets ---
        const sheet = workbook.addWorksheet("Registre des flux", {
            views: [{ showGridLines: true }],
        })

        const periodLabel = period === "ALL" ? "Toute la période" : `Derniers ${period} jours`
        addCabinetBanner(sheet, "VUE D'ENSEMBLE DES FLUX FINANCIERS", `Période sélectionnée : ${periodLabel}`, 11)

        sheet.columns = [
            { header: "Date", key: "date", width: 14 },
            { header: "Nature du flux", key: "kind", width: 18 },
            { header: "N° / Réf.", key: "numero", width: 18 },
            { header: "Libellé / Objet", key: "libelle", width: 38 },
            { header: "Tiers (Client / Fournisseur)", key: "tiers", width: 28 },
            { header: "Dossier", key: "dossier", width: 16 },
            { header: "Mode règlement", key: "mode", width: 16 },
            { header: "Statut", key: "statut", width: 14 },
            { header: "Entrées (FCFA)", key: "entree", width: 18 },
            { header: "Sorties (FCFA)", key: "sortie", width: 18 },
            { header: "Solde Net (FCFA)", key: "net", width: 18 },
        ]

        styleHeaderRow(sheet.getRow(4))

        let totalEntrees = 0
        let totalSorties = 0

        rows.forEach((r, idx) => {
            const added = sheet.addRow(r)
            styleDataRow(added, {
                isEven: idx % 2 === 1,
                currencyCols: [9, 10, 11],
                dateCols: [1],
                centerCols: [2, 3, 6, 7, 8],
            })
            totalEntrees += r.entree
            totalSorties += r.sortie
        })

        sheet.addRow([]) // Séparateur
        const totalRow = sheet.addRow({
            date: "TOTAL GÉNÉRAL",
            entree: totalEntrees,
            sortie: totalSorties,
            net: totalEntrees - totalSorties,
        })
        styleTotalRow(totalRow, { currencyCols: [9, 10, 11] })

        autoFitWorksheetColumns(sheet)

        // --- Feuille 2 : Synthèse par nature ---
        const synthSheet = workbook.addWorksheet("Synthèse par nature", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(synthSheet, "SYNTHÈSE DES OPÉRATIONS PAR NATURE", periodLabel, 5)

        synthSheet.columns = [
            { header: "Nature d'opération", key: "nature", width: 28 },
            { header: "Nombre d'écritures", key: "count", width: 20 },
            { header: "Total Entrées (FCFA)", key: "entrees", width: 22 },
            { header: "Total Sorties (FCFA)", key: "sorties", width: 22 },
            { header: "Impact Trésorerie (FCFA)", key: "solde", width: 22 },
        ]
        styleHeaderRow(synthSheet.getRow(4))

        const byKindMap = new Map<string, { count: number; entrees: number; sorties: number }>()
        for (const r of rows) {
            const cur = byKindMap.get(r.kind) ?? { count: 0, entrees: 0, sorties: 0 }
            cur.count += 1
            cur.entrees += r.entree
            cur.sorties += r.sortie
            byKindMap.set(r.kind, cur)
        }

        let sIdx = 0
        for (const [kind, data] of byKindMap) {
            const added = synthSheet.addRow({
                nature: kind,
                count: data.count,
                entrees: data.entrees,
                sorties: data.sorties,
                solde: data.entrees - data.sorties,
            })
            styleDataRow(added, {
                isEven: sIdx % 2 === 1,
                numberCols: [2],
                currencyCols: [3, 4, 5],
            })
            sIdx++
        }

        synthSheet.addRow([])
        const synthTotal = synthSheet.addRow({
            nature: "TOTAL",
            count: rows.length,
            entrees: totalEntrees,
            sorties: totalSorties,
            solde: totalEntrees - totalSorties,
        })
        styleTotalRow(synthTotal, { numberCols: [2], currencyCols: [3, 4, 5] })
        autoFitWorksheetColumns(synthSheet)

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="vue-ensemble-finance.xlsx"',
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
