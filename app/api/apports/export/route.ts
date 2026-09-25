import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getScope, requirePermission } from "@/lib/auth/server-permissions"
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

const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

const COLUMNS = [
    { header: "Période", key: "periode", width: 16 },
    { header: "Client", key: "client", width: 32 },
    { header: "Référence Dossier", key: "reference", width: 30 },
    { header: "Montant Réglé HT", key: "montantHT", width: 20 },
    { header: "ISB (30%)", key: "isb", width: 16 },
    { header: "Net après ISB", key: "net", width: 18 },
    { header: "SOCIÉTÉ (20%)", key: "societe", width: 18 },
    { header: "Rétrocession Avocat", key: "retrocession", width: 22 },
]

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("apports.view")
        const q = getQuery(req.url)
        const annee = q.annee ? Number(q.annee) : new Date().getFullYear()

        const where: Prisma.ApportWhereInput = { annee }
        if (getScope(membre, "apports.view") === "OWN") {
            where.beneficiaires = { some: { membreId: membre.id } }
        } else if (q.membreId) {
            where.beneficiaires = { some: { membreId: q.membreId } }
        }

        const apports = await prisma.apport.findMany({
            where,
            orderBy: [{ annee: "asc" }, { mois: "asc" }],
            include: { dossier: true, client: true, beneficiaires: { include: { membre: true } } },
        })

        const workbook = new ExcelJS.Workbook()
        workbook.creator = "SCPA KADRI LEGAL"
        workbook.created = new Date()

        const byMembre = new Map<string, { nom: string; rows: typeof apports }>()
        for (const a of apports) {
            for (const b of a.beneficiaires) {
                const key = b.membreId
                if (q.membreId && key !== q.membreId) continue
                if (!byMembre.has(key)) {
                    byMembre.set(key, { nom: `${b.membre.prenom} ${b.membre.nom}`.trim(), rows: [] })
                }
                byMembre.get(key)!.rows.push(a)
            }
        }

        function addSheet(name: string, rows: typeof apports, forMembreId: string | null) {
            const sheet = workbook.addWorksheet(name.slice(0, 31), {
                views: [{ showGridLines: true }],
            })

            const subTitle = forMembreId
                ? `Rétrocessions individuelles : ${name} — Exercice ${annee}`
                : `Feuille Générale Maîtresse — Exercice ${annee}`
            addCabinetBanner(sheet, "ÉTAT DES APPORTS & RÉTROCESSIONS D'HONORAIRES", subTitle, 8)

            sheet.columns = COLUMNS
            styleHeaderRow(sheet.getRow(4))

            let totalHT = 0
            let totalISB = 0
            let totalNet = 0
            let totalSociete = 0
            let totalRetro = 0

            rows.forEach((a, idx) => {
                const beneficiaire = forMembreId
                    ? a.beneficiaires.find((b) => b.membreId === forMembreId)
                    : null
                const retrocessionLigne = forMembreId
                    ? (beneficiaire?.montant ?? 0)
                    : a.montantRetrocessionTotal

                const added = sheet.addRow({
                    periode: `${MOIS_FR[a.mois - 1] ?? a.mois} ${a.annee}`,
                    client: a.client?.raisonSociale ?? a.client?.nom ?? a.clientLibre ?? "",
                    reference: a.dossier?.numero ?? a.referenceLibre ?? "—",
                    montantHT: a.montantHT,
                    isb: a.montantISB,
                    net: a.montantNetApresISB,
                    societe: a.montantSociete,
                    retrocession: retrocessionLigne,
                })

                styleDataRow(added, {
                    isEven: idx % 2 === 1,
                    centerCols: [1, 3],
                    currencyCols: [4, 5, 6, 7, 8],
                })

                totalHT += a.montantHT
                totalISB += a.montantISB
                totalNet += a.montantNetApresISB
                totalSociete += a.montantSociete
                totalRetro += retrocessionLigne
            })

            sheet.addRow([])
            const totalRow = sheet.addRow({
                periode: "TOTAL GÉNÉRAL",
                montantHT: totalHT,
                isb: totalISB,
                net: totalNet,
                societe: totalSociete,
                retrocession: totalRetro,
            })
            styleTotalRow(totalRow, { currencyCols: [4, 5, 6, 7, 8] })
            autoFitWorksheetColumns(sheet)
        }

        // Si filtré par un avocat spécifique, on affiche directement sa feuille
        if (q.membreId && byMembre.size === 1) {
            const single = Array.from(byMembre.values())[0]
            addSheet(single.nom, single.rows, q.membreId)
        } else {
            addSheet("Feuille Maîtresse", apports, null)
            for (const [membreId, { nom, rows }] of byMembre) {
                addSheet(nom, rows, membreId)
            }
        }

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="etat-des-apports-${annee}.xlsx"`,
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
