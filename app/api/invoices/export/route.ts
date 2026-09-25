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
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)

        const where: Prisma.FactureWhereInput = {}
        if (q.direction && (q.direction === "EMISE" || q.direction === "RECUE")) {
            where.direction = q.direction
        }
        if (q.clientId) where.clientId = q.clientId
        if (q.dossierId) where.dossierId = q.dossierId

        const factures = await prisma.facture.findMany({
            where,
            include: {
                client: true,
                dossier: true,
                fournisseur: true,
                lignes: true,
                paiements: { orderBy: { date: "asc" } },
            },
            orderBy: { date: "desc" },
        })

        const emises = factures.filter((f) => f.direction === "EMISE")
        const recues = factures.filter((f) => f.direction === "RECUE")

        const workbook = new ExcelJS.Workbook()
        workbook.creator = "SCPA KADRI LEGAL"
        workbook.created = new Date()

        // ----------------------------------------------------
        // 1. FEUILLE : FACTURES ÉMISES (CLIENTS)
        // ----------------------------------------------------
        const sheetEmises = workbook.addWorksheet("Factures Émises", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetEmises, "REGISTRE DES FACTURES ÉMISES (HONORAIRES & DÉBOURS)", "Cabinet SCPA KADRI LEGAL", 13)

        sheetEmises.columns = [
            { header: "N° Facture", key: "numero", width: 16 },
            { header: "Date Émission", key: "date", width: 14 },
            { header: "Date Échéance", key: "dateEcheance", width: 14 },
            { header: "Client", key: "client", width: 30 },
            { header: "Dossier", key: "dossier", width: 16 },
            { header: "Type", key: "type", width: 16 },
            { header: "Objet / Description", key: "description", width: 35 },
            { header: "Montant HT (FCFA)", key: "montantHT", width: 18 },
            { header: "Taux TVA", key: "tvaRate", width: 12 },
            { header: "TVA (FCFA)", key: "montantTVA", width: 16 },
            { header: "Montant TTC (FCFA)", key: "montantTTC", width: 18 },
            { header: "Montant Réglé (FCFA)", key: "montantPaye", width: 18 },
            { header: "Reste Dû (FCFA)", key: "resteDu", width: 18 },
            { header: "Statut", key: "statut", width: 14 },
        ]
        styleHeaderRow(sheetEmises.getRow(4))

        let totalHT = 0
        let totalTVA = 0
        let totalTTC = 0
        let totalPaye = 0
        let totalReste = 0

        emises.forEach((f, idx) => {
            const clientName = f.client?.raisonSociale ?? f.client?.nom ?? "Client non spécifié"
            const reste = Math.max(0, f.montantTTC - f.montantPaye)
            const added = sheetEmises.addRow({
                numero: f.numero,
                date: f.date.toISOString().split("T")[0],
                dateEcheance: f.dateEcheance ? f.dateEcheance.toISOString().split("T")[0] : "—",
                client: clientName,
                dossier: f.dossier?.numero ?? "—",
                type: f.type,
                description: f.description ?? "—",
                montantHT: f.montantHT,
                tvaRate: `${f.tvaRate}%`,
                montantTVA: f.montantTVA,
                montantTTC: f.montantTTC,
                montantPaye: f.montantPaye,
                resteDu: reste,
                statut: f.statut,
            })
            styleDataRow(added, {
                isEven: idx % 2 === 1,
                dateCols: [2, 3],
                centerCols: [1, 5, 6, 9, 14],
                currencyCols: [8, 10, 11, 12, 13],
            })
            totalHT += f.montantHT
            totalTVA += f.montantTVA
            totalTTC += f.montantTTC
            totalPaye += f.montantPaye
            totalReste += reste
        })

        sheetEmises.addRow([])
        const totalRowEmises = sheetEmises.addRow({
            numero: "TOTAL",
            montantHT: totalHT,
            montantTVA: totalTVA,
            montantTTC: totalTTC,
            montantPaye: totalPaye,
            resteDu: totalReste,
        })
        styleTotalRow(totalRowEmises, { currencyCols: [8, 10, 11, 12, 13] })
        autoFitWorksheetColumns(sheetEmises)

        // ----------------------------------------------------
        // 2. FEUILLE : FACTURES REÇUES (FOURNISSEURS)
        // ----------------------------------------------------
        const sheetRecues = workbook.addWorksheet("Factures Reçues", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetRecues, "FACTURES FOURNISSEURS & ACHATS", "Charges et débours cabinet", 11)

        sheetRecues.columns = [
            { header: "N° Facture", key: "numero", width: 16 },
            { header: "Date", key: "date", width: 14 },
            { header: "Échéance", key: "dateEcheance", width: 14 },
            { header: "Fournisseur", key: "fournisseur", width: 28 },
            { header: "Dossier Lié", key: "dossier", width: 16 },
            { header: "Description", key: "description", width: 35 },
            { header: "Montant HT (FCFA)", key: "montantHT", width: 18 },
            { header: "TVA (FCFA)", key: "montantTVA", width: 16 },
            { header: "Montant TTC (FCFA)", key: "montantTTC", width: 18 },
            { header: "Payé (FCFA)", key: "montantPaye", width: 18 },
            { header: "Statut", key: "statut", width: 14 },
        ]
        styleHeaderRow(sheetRecues.getRow(4))

        let rTotalHT = 0
        let rTotalTVA = 0
        let rTotalTTC = 0
        let rTotalPaye = 0

        recues.forEach((f, idx) => {
            const fourName = f.fournisseurNomLibre ?? f.fournisseur?.nom ?? "Fournisseur"
            const added = sheetRecues.addRow({
                numero: f.numero,
                date: f.date.toISOString().split("T")[0],
                dateEcheance: f.dateEcheance ? f.dateEcheance.toISOString().split("T")[0] : "—",
                fournisseur: fourName,
                dossier: f.dossier?.numero ?? "—",
                description: f.description ?? "—",
                montantHT: f.montantHT,
                montantTVA: f.montantTVA,
                montantTTC: f.montantTTC,
                montantPaye: f.montantPaye,
                statut: f.statut,
            })
            styleDataRow(added, {
                isEven: idx % 2 === 1,
                dateCols: [2, 3],
                centerCols: [1, 5, 11],
                currencyCols: [7, 8, 9, 10],
            })
            rTotalHT += f.montantHT
            rTotalTVA += f.montantTVA
            rTotalTTC += f.montantTTC
            rTotalPaye += f.montantPaye
        })

        sheetRecues.addRow([])
        const rTotalRow = sheetRecues.addRow({
            numero: "TOTAL",
            montantHT: rTotalHT,
            montantTVA: rTotalTVA,
            montantTTC: rTotalTTC,
            montantPaye: rTotalPaye,
        })
        styleTotalRow(rTotalRow, { currencyCols: [7, 8, 9, 10] })
        autoFitWorksheetColumns(sheetRecues)

        // ----------------------------------------------------
        // 3. FEUILLE : ENCAISSEMENTS & PAIEMENTS
        // ----------------------------------------------------
        const sheetPaiements = workbook.addWorksheet("Paiements Reçus", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetPaiements, "HISTORIQUE DES ENCAISSEMENTS SUR FACTURES", "Trésorerie réelle", 8)

        sheetPaiements.columns = [
            { header: "Date Encaissement", key: "date", width: 16 },
            { header: "N° Facture", key: "facture", width: 16 },
            { header: "Client", key: "client", width: 30 },
            { header: "Dossier", key: "dossier", width: 16 },
            { header: "Mode de règlement", key: "mode", width: 18 },
            { header: "Référence paiement", key: "reference", width: 22 },
            { header: "Montant Encaissé (FCFA)", key: "montant", width: 22 },
            { header: "Notes", key: "notes", width: 30 },
        ]
        styleHeaderRow(sheetPaiements.getRow(4))

        let totalPaimts = 0
        let pIdx = 0
        for (const f of emises) {
            for (const p of f.paiements) {
                const added = sheetPaiements.addRow({
                    date: p.date.toISOString().split("T")[0],
                    facture: f.numero,
                    client: f.client?.raisonSociale ?? f.client?.nom ?? "Client",
                    dossier: f.dossier?.numero ?? "—",
                    mode: p.mode,
                    reference: p.reference ?? "—",
                    montant: p.montant,
                    notes: p.notes ?? "—",
                })
                styleDataRow(added, {
                    isEven: pIdx % 2 === 1,
                    dateCols: [1],
                    centerCols: [2, 4, 5],
                    currencyCols: [7],
                })
                totalPaimts += p.montant
                pIdx++
            }
        }

        sheetPaiements.addRow([])
        const pTotalRow = sheetPaiements.addRow({
            date: "TOTAL ENCAISSÉ",
            montant: totalPaimts,
        })
        styleTotalRow(pTotalRow, { currencyCols: [7] })
        autoFitWorksheetColumns(sheetPaiements)

        // ----------------------------------------------------
        // 4. FEUILLE : DÉTAIL DES LIGNES DE FACTURATION
        // ----------------------------------------------------
        const sheetLignes = workbook.addWorksheet("Détail Prestations", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetLignes, "DÉTAIL DES LIGNES ET PRESTATIONS FACTURÉES", undefined, 8)

        sheetLignes.columns = [
            { header: "N° Facture", key: "facture", width: 16 },
            { header: "Date", key: "date", width: 14 },
            { header: "Client / Tiers", key: "client", width: 28 },
            { header: "Libellé de la prestation", key: "libelle", width: 42 },
            { header: "Quantité", key: "quantite", width: 12 },
            { header: "Prix Unitaire (FCFA)", key: "prixUnitaire", width: 18 },
            { header: "Total HT (FCFA)", key: "total", width: 18 },
        ]
        styleHeaderRow(sheetLignes.getRow(4))

        let lIdx = 0
        let totalLignesHT = 0
        for (const f of factures) {
            for (const l of f.lignes) {
                const clientName = f.direction === "EMISE"
                    ? (f.client?.raisonSociale ?? f.client?.nom ?? "Client")
                    : (f.fournisseurNomLibre ?? f.fournisseur?.nom ?? "Fournisseur")
                const added = sheetLignes.addRow({
                    facture: f.numero,
                    date: f.date.toISOString().split("T")[0],
                    client: clientName,
                    libelle: l.libelle,
                    quantite: Number(l.quantite),
                    prixUnitaire: l.prixUnitaire,
                    total: l.total,
                })
                styleDataRow(added, {
                    isEven: lIdx % 2 === 1,
                    dateCols: [2],
                    centerCols: [1, 5],
                    numberCols: [5],
                    currencyCols: [6, 7],
                })
                totalLignesHT += l.total
                lIdx++
            }
        }

        sheetLignes.addRow([])
        const lTotalRow = sheetLignes.addRow({
            facture: "TOTAL PRESTATIONS",
            total: totalLignesHT,
        })
        styleTotalRow(lTotalRow, { currencyCols: [7] })
        autoFitWorksheetColumns(sheetLignes)

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="facturation-kadrilex.xlsx"',
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
