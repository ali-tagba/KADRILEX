import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth/server-permissions"
import { handleApiError, getQuery } from "@/lib/server/api-helpers"
import { recomputeApport } from "@/lib/server/finance"
import { CATEGORIES_DEPENSE, type CategorieDepenseKey } from "@/lib/constants/finance"

function emptyMonths(): number[] {
    return Array(12).fill(0)
}

export async function GET(req: NextRequest) {
    try {
        await requirePermission("finance.view")
        const q = getQuery(req.url)
        const annee = q.annee ? Number(q.annee) : new Date().getFullYear()

        const [encaissements, depenses, apports, bulletins] = await Promise.all([
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
            prisma.bulletin.findMany({
                where: { annee, statut: { not: "BROUILLON" } },
                select: { mois: true, coutTotalEmployeur: true },
            }),
        ])

        // --- Encaissements : bloc "Autres" (clientId null) + un bloc par client majeur ---
        const autresRows = encaissements.filter((e) => !e.clientId)
        const parClientMap = new Map<string, { clientId: string; nom: string; rows: typeof encaissements }>()
        for (const e of encaissements) {
            if (!e.clientId) continue
            const nom = e.client?.raisonSociale ?? e.client?.nom ?? "Client"
            if (!parClientMap.has(e.clientId)) parClientMap.set(e.clientId, { clientId: e.clientId, nom, rows: [] })
            parClientMap.get(e.clientId)!.rows.push(e)
        }

        function buildBloc(rows: typeof encaissements) {
            const parMois: Record<string, number[]> = {
                montantHT: emptyMonths(),
                montantTVA: emptyMonths(),
                montantTTC: emptyMonths(),
                montantBIC: emptyMonths(),
                montantRetenueBIC: emptyMonths(),
                montantBICCollecte: emptyMonths(),
                montantTVARetenueSource: emptyMonths(),
                montantTVACollectee: emptyMonths(),
                montantEncaisse: emptyMonths(),
            }
            const retenuesParMois: Record<string, number[]> = {
                montantHT: emptyMonths(),
                montantISB: emptyMonths(),
                montantNetApresISB: emptyMonths(),
                montantSociete: emptyMonths(),
                totalRetenues: emptyMonths(),
                honorairesRestants: emptyMonths(),
            }
            for (const r of rows) {
                const i = r.mois - 1
                parMois.montantHT[i] += r.montantHT
                parMois.montantTVA[i] += r.montantTVA
                parMois.montantTTC[i] += r.montantTTC
                parMois.montantBIC[i] += r.montantBIC
                parMois.montantRetenueBIC[i] += r.montantRetenueBIC
                parMois.montantBICCollecte[i] += r.montantBICCollecte
                parMois.montantTVARetenueSource[i] += r.montantTVARetenueSource
                parMois.montantTVACollectee[i] += r.montantTVACollectee
                parMois.montantEncaisse[i] += r.montantEncaisse

                const ret = recomputeApport({ montantHT: r.montantHT })
                retenuesParMois.montantHT[i] += r.montantHT
                retenuesParMois.montantISB[i] += ret.montantISB
                retenuesParMois.montantNetApresISB[i] += ret.montantNetApresISB
                retenuesParMois.montantSociete[i] += ret.montantSociete
                retenuesParMois.totalRetenues[i] += ret.montantISB + ret.montantSociete
                retenuesParMois.honorairesRestants[i] += r.montantHT - (ret.montantISB + ret.montantSociete)
            }
            const totals = Object.fromEntries(
                Object.entries(parMois).map(([k, v]) => [k, v.reduce((s, x) => s + x, 0)])
            )
            const retenuesTotals = Object.fromEntries(
                Object.entries(retenuesParMois).map(([k, v]) => [k, v.reduce((s, x) => s + x, 0)])
            )
            return { parMois, totals, retenuesParMois, retenuesTotals, rows }
        }

        const autres = buildBloc(autresRows)
        const parClient = Array.from(parClientMap.values()).map((c) => ({
            clientId: c.clientId,
            nom: c.nom,
            ...buildBloc(c.rows),
        }))

        // --- Dépenses : 18 catégories réelles x 12 mois (montantTTC), + ligne Rétrocessions dérivée d'Apport ---
        const categorieOrder: CategorieDepenseKey[] = [
            "TVA_RECUPERABLE", "EAU", "ELECTRICITE", "CARBURANT", "TELECOM", "ENTRETIEN_VEHICULE",
            "SALAIRES", "HONORAIRES", "AUTRE", "IMPOTS", "TAXES", "FOURNITURES",
            "MOBILIER_BUREAU", "EQUIPEMENT_MATERIAUX", "PRESTATIONS_SERVICES_VOYAGE",
            "PRODUITS_ENTRETIEN", "DOCUMENTATION", "SANTE",
        ]
        const parCategorie = new Map<string, number[]>()
        for (const cat of categorieOrder) parCategorie.set(cat, emptyMonths())
        for (const d of depenses) {
            const arr = parCategorie.get(d.categorie)
            if (!arr) continue // catégorie hors périmètre bilan (ex: LOYER géré ailleurs)
            arr[d.date.getMonth()] += d.montantTTC
        }
        // Salaires : depenses saisies manuellement (historique importe) + bulletins de paie
        // generes via l'onglet Paie (hors brouillon) -- meme principe que les Rétrocessions,
        // pour ne jamais dependre d'une double saisie manuelle une fois les bulletins en place.
        const salairesArr = parCategorie.get("SALAIRES")
        if (salairesArr) {
            for (const b of bulletins) salairesArr[b.mois - 1] += b.coutTotalEmployeur
        }

        const categories = categorieOrder.map((cat) => {
            const parMois = parCategorie.get(cat)!
            return {
                categorie: cat,
                label: CATEGORIES_DEPENSE[cat].label,
                parMois,
                total: parMois.reduce((s, x) => s + x, 0),
            }
        })

        const retrocessionsParMois = emptyMonths()
        for (const a of apports) retrocessionsParMois[a.mois - 1] += a.montantRetrocessionTotal
        const retrocessions = {
            categorie: "RETROCESSIONS" as const,
            label: "Rétrocessions (calculé depuis Apports)",
            parMois: retrocessionsParMois,
            total: retrocessionsParMois.reduce((s, x) => s + x, 0),
        }

        const totalChargesParMois = emptyMonths()
        for (let i = 0; i < 12; i++) {
            totalChargesParMois[i] = categories.reduce((s, c) => s + c.parMois[i], 0) + retrocessionsParMois[i]
        }
        const totalCharges = totalChargesParMois.reduce((s, x) => s + x, 0)

        // Solde provisoire = total encaissements HT (autres + clients) - total charges
        const totalEncaissementHT =
            autres.totals.montantHT + parClient.reduce((s, c) => s + c.totals.montantHT, 0)
        const soldeParMois = emptyMonths()
        for (let i = 0; i < 12; i++) {
            const encHTMois = autres.parMois.montantHT[i] + parClient.reduce((s, c) => s + c.parMois.montantHT[i], 0)
            soldeParMois[i] = encHTMois - totalChargesParMois[i]
        }

        return Response.json({
            annee,
            encaissements: { autres, parClient, totalEncaissementHT },
            depenses: { categories, retrocessions, totalCharges, totalChargesParMois },
            soldeProvisoire: { parMois: soldeParMois, total: totalEncaissementHT - totalCharges },
        })
    } catch (e) {
        return handleApiError(e)
    }
}
