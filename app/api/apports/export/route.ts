import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getScope, requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError, getQuery } from "@/lib/server/api-helpers"
import ExcelJS from "exceljs"
import type { Prisma } from "@prisma/client"

const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

const COLUMNS = [
    { header: "Période", key: "periode", width: 14 },
    { header: "Client", key: "client", width: 30 },
    { header: "Référence", key: "reference", width: 45 },
    { header: "Montant réglé HT", key: "montantHT", width: 18 },
    { header: "ISB", key: "isb", width: 14 },
    { header: "Net après ISB", key: "net", width: 16 },
    { header: "SOCIETE", key: "societe", width: 14 },
    { header: "Rétrocession", key: "retrocession", width: 16 },
]

export async function GET(req: NextRequest) {
    try {
        const membre = await requirePermission("apports.view")
        const q = getQuery(req.url)

        const where: Prisma.ApportWhereInput = {}
        if (q.annee) where.annee = Number(q.annee)
        if (getScope(membre, "apports.view") === "OWN") {
            where.beneficiaires = { some: { membreId: membre.id } }
        }

        const apports = await prisma.apport.findMany({
            where,
            orderBy: [{ annee: "asc" }, { mois: "asc" }],
            include: { dossier: true, client: true, beneficiaires: { include: { membre: true } } },
        })

        const workbook = new ExcelJS.Workbook()

        const byMembre = new Map<string, { nom: string; rows: typeof apports }>()
        for (const a of apports) {
            for (const b of a.beneficiaires) {
                const key = b.membreId
                if (!byMembre.has(key)) {
                    byMembre.set(key, { nom: `${b.membre.prenom} ${b.membre.nom}`.trim(), rows: [] })
                }
                byMembre.get(key)!.rows.push(a)
            }
        }

        function addSheet(name: string, rows: typeof apports, forMembreId: string | null) {
            const sheet = workbook.addWorksheet(name.slice(0, 31))
            sheet.columns = COLUMNS
            sheet.getRow(1).font = { bold: true }
            let totalHT = 0, totalISB = 0, totalNet = 0, totalSociete = 0, totalRetro = 0
            for (const a of rows) {
                const beneficiaire = forMembreId
                    ? a.beneficiaires.find((b) => b.membreId === forMembreId)
                    : null
                const retrocessionLigne = forMembreId
                    ? (beneficiaire?.montant ?? 0)
                    : a.montantRetrocessionTotal
                sheet.addRow({
                    periode: `${MOIS_FR[a.mois - 1] ?? a.mois} ${a.annee}`,
                    client: a.client?.raisonSociale ?? a.client?.nom ?? a.clientLibre ?? "",
                    reference: a.dossier?.numero ?? a.referenceLibre ?? "",
                    montantHT: a.montantHT,
                    isb: a.montantISB,
                    net: a.montantNetApresISB,
                    societe: a.montantSociete,
                    retrocession: retrocessionLigne,
                })
                totalHT += a.montantHT
                totalISB += a.montantISB
                totalNet += a.montantNetApresISB
                totalSociete += a.montantSociete
                totalRetro += retrocessionLigne
            }
            sheet.addRow({})
            const totalRow = sheet.addRow({
                periode: "TOTAL",
                montantHT: totalHT,
                isb: totalISB,
                net: totalNet,
                societe: totalSociete,
                retrocession: totalRetro,
            })
            totalRow.font = { bold: true }
        }

        addSheet("Maîtresse", apports, null)
        for (const [membreId, { nom, rows }] of byMembre) {
            addSheet(nom, rows, membreId)
        }

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": 'attachment; filename="etat-des-apports.xlsx"',
            },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
