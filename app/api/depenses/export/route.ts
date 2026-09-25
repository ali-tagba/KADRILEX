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
import { CATEGORIES_DEPENSE, type CategorieDepenseKey } from "@/lib/constants/finance"
import type { Prisma, CategorieDepense } from "@prisma/client"

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)

        const where: Prisma.DepenseWhereInput = {}
        if (q.annee) {
            const annee = Number(q.annee)
            where.date = {
                gte: new Date(annee, 0, 1),
                lt: new Date(annee + 1, 0, 1),
            }
        }
        if (q.categorie) {
            where.categorie = q.categorie as CategorieDepense
        }
        if (q.recurrent === "true") where.recurrent = true
        if (q.recurrent === "false") where.recurrent = false

        const depenses = await prisma.depense.findMany({
            where,
            include: { fournisseur: true, employe: true, dossier: true },
            orderBy: { date: "desc" },
        })

        const workbook = new ExcelJS.Workbook()
        workbook.creator = "SCPA KADRI LEGAL"
        workbook.created = new Date()

        // ----------------------------------------------------
        // 1. FEUILLE : TOUTES LES DÉPENSES INTERNES
        // ----------------------------------------------------
        const sheet = workbook.addWorksheet("Dépenses Internes", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheet, "CHARGES DE FONCTIONNEMENT ET DÉPENSES INTERNES", "Cabinet SCPA KADRI LEGAL", 12)

        sheet.columns = [
            { header: "Date", key: "date", width: 14 },
            { header: "Réf. / N°", key: "reference", width: 16 },
            { header: "Libellé", key: "libelle", width: 36 },
            { header: "Catégorie", key: "categorie", width: 26 },
            { header: "Fournisseur / Bénéficiaire", key: "fournisseur", width: 28 },
            { header: "Mode Règlement", key: "mode", width: 18 },
            { header: "Type Charge", key: "recurrent", width: 14 },
            { header: "Fréquence", key: "frequence", width: 14 },
            { header: "Montant HT (FCFA)", key: "montantHT", width: 18 },
            { header: "TVA (FCFA)", key: "montantTVA", width: 16 },
            { header: "Montant TTC (FCFA)", key: "montantTTC", width: 18 },
            { header: "Statut", key: "statut", width: 14 },
        ]
        styleHeaderRow(sheet.getRow(4))

        let totalHT = 0
        let totalTVA = 0
        let totalTTC = 0

        depenses.forEach((d, idx) => {
            const catLabel = CATEGORIES_DEPENSE[d.categorie as CategorieDepenseKey]?.label ?? d.categorie
            const fourName = d.fournisseurNomLibre ?? d.fournisseur?.nom ?? "—"
            const added = sheet.addRow({
                date: d.date.toISOString().split("T")[0],
                reference: d.reference || `DEP-${d.id.slice(-6)}`,
                libelle: d.libelle,
                categorie: catLabel,
                fournisseur: fourName,
                mode: d.mode,
                recurrent: d.recurrent ? "Récurrente" : "Ponctuelle",
                frequence: d.recurrenceFrequence ?? "—",
                montantHT: d.montantHT,
                montantTVA: d.montantTVA,
                montantTTC: d.montantTTC,
                statut: d.statut,
            })
            styleDataRow(added, {
                isEven: idx % 2 === 1,
                dateCols: [1],
                centerCols: [2, 6, 7, 8, 12],
                currencyCols: [9, 10, 11],
            })
            totalHT += d.montantHT
            totalTVA += d.montantTVA
            totalTTC += d.montantTTC
        })

        sheet.addRow([])
        const totalRow = sheet.addRow({
            reference: "TOTAL",
            montantHT: totalHT,
            montantTVA: totalTVA,
            montantTTC: totalTTC,
        })
        styleTotalRow(totalRow, { currencyCols: [9, 10, 11] })
        autoFitWorksheetColumns(sheet)

        // ----------------------------------------------------
        // 2. FEUILLE : SYNTHÈSE PAR CATÉGORIE
        // ----------------------------------------------------
        const catSheet = workbook.addWorksheet("Par Catégorie", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(catSheet, "RÉPARTITION DES DÉPENSES PAR CATÉGORIE", undefined, 5)

        catSheet.columns = [
            { header: "Catégorie de dépense", key: "categorie", width: 32 },
            { header: "Nombre de dépenses", key: "count", width: 20 },
            { header: "Montant Total TTC (FCFA)", key: "totalTTC", width: 25 },
            { header: "Part dans les charges (%)", key: "part", width: 24 },
        ]
        styleHeaderRow(catSheet.getRow(4))

        const byCat = new Map<string, { count: number; total: number }>()
        for (const d of depenses) {
            const label = CATEGORIES_DEPENSE[d.categorie as CategorieDepenseKey]?.label ?? d.categorie
            const cur = byCat.get(label) ?? { count: 0, total: 0 }
            cur.count += 1
            cur.total += d.montantTTC
            byCat.set(label, cur)
        }

        const sortedCats = Array.from(byCat.entries()).sort((a, b) => b[1].total - a[1].total)

        sortedCats.forEach(([cat, data], idx) => {
            const part = totalTTC > 0 ? (data.total / totalTTC) * 100 : 0
            const added = catSheet.addRow({
                categorie: cat,
                count: data.count,
                totalTTC: data.total,
                part: `${part.toFixed(1)}%`,
            })
            styleDataRow(added, {
                isEven: idx % 2 === 1,
                numberCols: [2],
                currencyCols: [3],
                centerCols: [4],
            })
        })

        catSheet.addRow([])
        const catTotalRow = catSheet.addRow({
            categorie: "TOTAL",
            count: depenses.length,
            totalTTC: totalTTC,
            part: "100.0%",
        })
        styleTotalRow(catTotalRow, { numberCols: [2], currencyCols: [3] })
        autoFitWorksheetColumns(catSheet)

        // ----------------------------------------------------
        // 3. FEUILLE : CHARGES RÉCURRENTES
        // ----------------------------------------------------
        const recurrentes = depenses.filter((d) => d.recurrent)
        if (recurrentes.length > 0) {
            const recSheet = workbook.addWorksheet("Charges Récurrentes", {
                views: [{ showGridLines: true }],
            })
            addCabinetBanner(recSheet, "CHARGES FIXES ET ABONNEMENTS RÉCURRENTS", undefined, 7)

            recSheet.columns = [
                { header: "Libellé", key: "libelle", width: 34 },
                { header: "Catégorie", key: "categorie", width: 26 },
                { header: "Fréquence", key: "frequence", width: 16 },
                { header: "Fournisseur", key: "fournisseur", width: 28 },
                { header: "Mode Règlement", key: "mode", width: 18 },
                { header: "Montant TTC (FCFA)", key: "montantTTC", width: 22 },
                { header: "Statut", key: "statut", width: 14 },
            ]
            styleHeaderRow(recSheet.getRow(4))

            let recTotal = 0
            recurrentes.forEach((d, idx) => {
                const catLabel = CATEGORIES_DEPENSE[d.categorie as CategorieDepenseKey]?.label ?? d.categorie
                const fourName = d.fournisseurNomLibre ?? d.fournisseur?.nom ?? "—"
                const added = recSheet.addRow({
                    libelle: d.libelle,
                    categorie: catLabel,
                    frequence: d.recurrenceFrequence ?? "MENSUEL",
                    fournisseur: fourName,
                    mode: d.mode,
                    montantTTC: d.montantTTC,
                    statut: d.statut,
                })
                styleDataRow(added, {
                    isEven: idx % 2 === 1,
                    centerCols: [3, 5, 7],
                    currencyCols: [6],
                })
                recTotal += d.montantTTC
            })

            recSheet.addRow([])
            const recTotalRow = recSheet.addRow({
                libelle: "TOTAL CHARGES RÉCURRENTES",
                montantTTC: recTotal,
            })
            styleTotalRow(recTotalRow, { currencyCols: [6] })
            autoFitWorksheetColumns(recSheet)
        }

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="depenses-internes.xlsx"',
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
