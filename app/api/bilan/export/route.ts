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
import { recomputeApport } from "@/lib/server/finance"

const MOIS_ENTETES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

function emptyMonths(): number[] {
    return Array(12).fill(0)
}

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)
        const annee = q.annee ? Number(q.annee) : new Date().getFullYear()

        const [encaissements, depenses, apports] = await Promise.all([
            prisma.encaissementMensuel.findMany({
                where: { annee },
                include: { client: true },
                orderBy: [{ mois: "asc" }],
            }),
            prisma.depense.findMany({
                where: { date: { gte: new Date(annee, 0, 1), lt: new Date(annee + 1, 0, 1) } },
                select: { categorie: true, montantTTC: true, date: true },
            }),
            prisma.apport.findMany({
                where: { annee },
                select: { mois: true, montantRetrocessionTotal: true },
            }),
        ])

        const workbook = new ExcelJS.Workbook()
        workbook.creator = "SCPA KADRI LEGAL"
        workbook.created = new Date()

        // -------------------------------------------------------------------
        // FEUILLE 1 : ENCAISSEMENTS MENSUELS
        // -------------------------------------------------------------------
        const sheetEnc = workbook.addWorksheet("Encaissements Mensuels", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetEnc, `BILAN DES ENCAISSEMENTS MENSUELS ${annee}`, "Montants HT & récapitulatif annuel", 14)

        sheetEnc.columns = [
            { header: "Client / Libellé", key: "client", width: 32 },
            ...MOIS_ENTETES.map((m, i) => ({ header: m, key: `m_${i}`, width: 15 })),
            { header: "TOTAL ANNUEL", key: "total", width: 20 },
        ]
        styleHeaderRow(sheetEnc.getRow(4))

        // Grouper par client
        const parClientMap = new Map<string, { nom: string; parMois: number[] }>()
        const autresParMois = emptyMonths()

        for (const e of encaissements) {
            const mIdx = e.mois - 1
            if (e.clientId) {
                const nom = e.client?.raisonSociale ?? e.client?.nom ?? "Client"
                if (!parClientMap.has(e.clientId)) {
                    parClientMap.set(e.clientId, { nom, parMois: emptyMonths() })
                }
                parClientMap.get(e.clientId)!.parMois[mIdx] += e.montantHT
            } else {
                autresParMois[mIdx] += e.montantHT
            }
        }

        const totalGeneralParMois = emptyMonths()
        let encIdx = 0

        // Ligne pour chaque client majeur
        for (const [, item] of parClientMap) {
            const rowData: Record<string, string | number> = { client: item.nom }
            let clientTot = 0
            for (let i = 0; i < 12; i++) {
                rowData[`m_${i}`] = item.parMois[i]
                clientTot += item.parMois[i]
                totalGeneralParMois[i] += item.parMois[i]
            }
            rowData.total = clientTot

            const added = sheetEnc.addRow(rowData)
            styleDataRow(added, {
                isEven: encIdx % 2 === 1,
                currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            })
            encIdx++
        }

        // Ligne Autres clients
        const autresRowData: Record<string, string | number> = { client: "Autres clients (divers)" }
        let autresTot = 0
        for (let i = 0; i < 12; i++) {
            autresRowData[`m_${i}`] = autresParMois[i]
            autresTot += autresParMois[i]
            totalGeneralParMois[i] += autresParMois[i]
        }
        autresRowData.total = autresTot
        const autresAdded = sheetEnc.addRow(autresRowData)
        styleDataRow(autresAdded, {
            isEven: encIdx % 2 === 1,
            currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        })

        // Ligne Total Encaissements
        sheetEnc.addRow([])
        const totalEncRowData: Record<string, string | number> = { client: "TOTAL ENCAISSEMENTS HT" }
        let totalAnnuelEncHT = 0
        for (let i = 0; i < 12; i++) {
            totalEncRowData[`m_${i}`] = totalGeneralParMois[i]
            totalAnnuelEncHT += totalGeneralParMois[i]
        }
        totalEncRowData.total = totalAnnuelEncHT
        const totalEncRow = sheetEnc.addRow(totalEncRowData)
        styleTotalRow(totalEncRow, { currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] })
        autoFitWorksheetColumns(sheetEnc)

        // -------------------------------------------------------------------
        // FEUILLE 2 : CHARGES & DÉPENSES
        // -------------------------------------------------------------------
        const sheetDep = workbook.addWorksheet("Charges & Dépenses", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetDep, `CHARGES DE FONCTIONNEMENT DU CABINET ${annee}`, "Ventilation mensuelle par catégorie TTC", 14)

        sheetDep.columns = [
            { header: "Catégorie de charge", key: "categorie", width: 34 },
            ...MOIS_ENTETES.map((m, i) => ({ header: m, key: `m_${i}`, width: 15 })),
            { header: "TOTAL ANNUEL", key: "total", width: 20 },
        ]
        styleHeaderRow(sheetDep.getRow(4))

        const categorieOrderHistorique: CategorieDepenseKey[] = [
            "TVA_RECUPERABLE", "EAU", "ELECTRICITE", "CARBURANT", "TELECOM", "ENTRETIEN_VEHICULE",
            "SALAIRES", "HONORAIRES", "AUTRE", "IMPOTS", "TAXES", "FOURNITURES",
            "MOBILIER_BUREAU", "EQUIPEMENT_MATERIAUX", "PRESTATIONS_SERVICES_VOYAGE",
            "PRODUITS_ENTRETIEN", "DOCUMENTATION", "SANTE",
        ]
        const allCatKeys = Object.keys(CATEGORIES_DEPENSE) as CategorieDepenseKey[]
        const fullCatOrder = [
            ...categorieOrderHistorique,
            ...allCatKeys.filter((k) => !categorieOrderHistorique.includes(k)),
        ]

        const parCatMap = new Map<string, number[]>()
        for (const cat of fullCatOrder) parCatMap.set(cat, emptyMonths())
        for (const d of depenses) {
            const arr = parCatMap.get(d.categorie)
            if (arr) arr[d.date.getMonth()] += d.montantTTC
        }

        const retrocessionsParMois = emptyMonths()
        for (const a of apports) retrocessionsParMois[a.mois - 1] += a.montantRetrocessionTotal

        const totalChargesParMois = emptyMonths()
        let depIdx = 0

        for (const catKey of fullCatOrder) {
            const moisArr = parCatMap.get(catKey)!
            const totalCat = moisArr.reduce((s, x) => s + x, 0)
            if (totalCat === 0) continue // masquer les catégories vides comme le template Excel

            const label = CATEGORIES_DEPENSE[catKey]?.label ?? catKey
            const rowData: Record<string, string | number> = { categorie: label }
            for (let i = 0; i < 12; i++) {
                rowData[`m_${i}`] = moisArr[i]
                totalChargesParMois[i] += moisArr[i]
            }
            rowData.total = totalCat

            const added = sheetDep.addRow(rowData)
            styleDataRow(added, {
                isEven: depIdx % 2 === 1,
                currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            })
            depIdx++
        }

        // Ligne Rétrocessions
        const retroRowData: Record<string, string | number> = { categorie: "Rétrocessions d'honoraires (Apports)" }
        let totalRetros = 0
        for (let i = 0; i < 12; i++) {
            retroRowData[`m_${i}`] = retrocessionsParMois[i]
            totalRetros += retrocessionsParMois[i]
            totalChargesParMois[i] += retrocessionsParMois[i]
        }
        retroRowData.total = totalRetros
        const retroAdded = sheetDep.addRow(retroRowData)
        styleDataRow(retroAdded, {
            isEven: depIdx % 2 === 1,
            currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        })

        // Ligne Total Charges
        sheetDep.addRow([])
        const totalChargesRowData: Record<string, string | number> = { categorie: "TOTAL GÉNÉRAL DES CHARGES" }
        let totalAnnuelCharges = 0
        for (let i = 0; i < 12; i++) {
            totalChargesRowData[`m_${i}`] = totalChargesParMois[i]
            totalAnnuelCharges += totalChargesParMois[i]
        }
        totalChargesRowData.total = totalAnnuelCharges
        const totalChargesRow = sheetDep.addRow(totalChargesRowData)
        styleTotalRow(totalChargesRow, { currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] })
        autoFitWorksheetColumns(sheetDep)

        // -------------------------------------------------------------------
        // FEUILLE 3 : SOLDE PROVISOIRE & TRÉSORERIE
        // -------------------------------------------------------------------
        const sheetSolde = workbook.addWorksheet("Solde Provisoire", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetSolde, `SYNTHÈSE DU SOLDE PROVISOIRE ${annee}`, "Encaissements HT - Total Charges", 14)

        sheetSolde.columns = [
            { header: "Indicateur Financier", key: "indicateur", width: 34 },
            ...MOIS_ENTETES.map((m, i) => ({ header: m, key: `m_${i}`, width: 15 })),
            { header: "TOTAL ANNUEL", key: "total", width: 20 },
        ]
        styleHeaderRow(sheetSolde.getRow(4))

        // 1. Total Produits (Encaissements HT)
        const rowProd: Record<string, string | number> = { indicateur: "1. Encaissements HT (Produits)" }
        for (let i = 0; i < 12; i++) rowProd[`m_${i}`] = totalGeneralParMois[i]
        rowProd.total = totalAnnuelEncHT
        const pRow = sheetSolde.addRow(rowProd)
        styleDataRow(pRow, { currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] })

        // 2. Total Charges
        const rowCharg: Record<string, string | number> = { indicateur: "2. Total Charges de fonctionnement" }
        for (let i = 0; i < 12; i++) rowCharg[`m_${i}`] = totalChargesParMois[i]
        rowCharg.total = totalAnnuelCharges
        const cRow = sheetSolde.addRow(rowCharg)
        styleDataRow(cRow, { currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] })

        // 3. Solde
        sheetSolde.addRow([])
        const rowSolde: Record<string, string | number> = { indicateur: "SOLDE PROVISOIRE (1 - 2)" }
        for (let i = 0; i < 12; i++) {
            rowSolde[`m_${i}`] = totalGeneralParMois[i] - totalChargesParMois[i]
        }
        rowSolde.total = totalAnnuelEncHT - totalAnnuelCharges
        const sRow = sheetSolde.addRow(rowSolde)
        styleTotalRow(sRow, { currencyCols: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] })
        autoFitWorksheetColumns(sheetSolde)

        // -------------------------------------------------------------------
        // FEUILLE 4 : RETENUES SUR PRODUITS (ISB / SOCIÉTÉ)
        // -------------------------------------------------------------------
        const sheetRetenues = workbook.addWorksheet("Retenues sur Produits", {
            views: [{ showGridLines: true }],
        })
        addCabinetBanner(sheetRetenues, `RETENUES SUR PRODUITS ${annee}`, "Barème cabinet : 30% ISB, 20% Société", 8)

        sheetRetenues.columns = [
            { header: "Mois", key: "mois", width: 16 },
            { header: "Montant HT (FCFA)", key: "montantHT", width: 20 },
            { header: "ISB 30% (FCFA)", key: "isb", width: 18 },
            { header: "Net après ISB", key: "net", width: 18 },
            { header: "Société 20% (FCFA)", key: "societe", width: 18 },
            { header: "Total Retenues", key: "totalRetenues", width: 18 },
            { header: "Honoraires Restants", key: "honoraires", width: 22 },
        ]
        styleHeaderRow(sheetRetenues.getRow(4))

        let rTotHT = 0, rTotISB = 0, rTotNet = 0, rTotSoc = 0, rTotRet = 0, rTotHono = 0

        for (let i = 0; i < 12; i++) {
            const ht = totalGeneralParMois[i]
            const ret = recomputeApport({ montantHT: ht })
            const totRet = ret.montantISB + ret.montantSociete
            const honoRestant = ht - totRet

            const added = sheetRetenues.addRow({
                mois: MOIS_ENTETES[i],
                montantHT: ht,
                isb: ret.montantISB,
                net: ret.montantNetApresISB,
                societe: ret.montantSociete,
                totalRetenues: totRet,
                honoraires: honoRestant,
            })
            styleDataRow(added, {
                isEven: i % 2 === 1,
                centerCols: [1],
                currencyCols: [2, 3, 4, 5, 6, 7],
            })

            rTotHT += ht
            rTotISB += ret.montantISB
            rTotNet += ret.montantNetApresISB
            rTotSoc += ret.montantSociete
            rTotRet += totRet
            rTotHono += honoRestant
        }

        sheetRetenues.addRow([])
        const rTotalRow = sheetRetenues.addRow({
            mois: "TOTAL ANNUEL",
            montantHT: rTotHT,
            isb: rTotISB,
            net: rTotNet,
            societe: rTotSoc,
            totalRetenues: rTotRet,
            honoraires: rTotHono,
        })
        styleTotalRow(rTotalRow, { currencyCols: [2, 3, 4, 5, 6, 7] })
        autoFitWorksheetColumns(sheetRetenues)

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="bilan-cabinet-${annee}.xlsx"`,
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
