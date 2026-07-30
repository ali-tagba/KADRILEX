/**
 * Générateur de PDF de facture conforme au format Niger.
 *
 * Structure :
 *  - En-tête cabinet (logo + identité + coordonnées + mentions légales)
 *  - Titre FACTURE en grand + N° + dates
 *  - Coordonnées client (encadré droit)
 *  - Description / référence dossier
 *  - Tableau des lignes (Désignation · Qté · PU · Total HT)
 *  - Totaux (Sous-total HT, TVA, Net à payer TTC)
 *  - Mentions légales (modalités de paiement, IBAN, RCCM, NIF)
 *  - Pied de page
 *
 * Mentions obligatoires Niger (loi de finances + OHADA) :
 *  - Nom commercial + forme juridique
 *  - Adresse complète
 *  - NIF (Numéro d'Identification Fiscale)
 *  - RCCM (Registre du Commerce)
 *  - Mention TVA (taux 19% ou exonération CGI art. 24 pour services juridiques)
 *  - Coordonnées bancaires
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { CABINET_INFO } from "@/lib/constants/cabinet"

/* ============================================================
   Types d'entrée — shape minimale d'une facture Prisma include client/lignes
   ============================================================ */

export interface FacturePdfInput {
    numero: string
    direction: "EMISE" | "RECUE"
    date: Date | string
    dateEcheance: Date | string | null
    description: string | null
    notes: string | null
    montantHT: number
    montantTVA: number
    montantTTC: number
    montantPaye: number
    tvaRate: number
    statut: string
    lignes: Array<{
        libelle: string
        quantite: number
        prixUnitaire: number
        total: number
    }>
    client: {
        nom: string
        adresse?: string | null
        ville?: string | null
        codePostal?: string | null
        rccm?: string | null
        nif?: string | null
        email?: string | null
        telephone?: string | null
    } | null
    fournisseur: {
        nom: string
        adresse?: string | null
        rccm?: string | null
        nif?: string | null
    } | null
    fournisseurNomLibre: string | null
    dossier: {
        numero: string
        titre: string
    } | null
}

/* ============================================================
   Helpers de formatage
   ============================================================ */

const SEPIA_PRIMARY: [number, number, number] = [85, 65, 35] // brun foncé
const SEPIA_ACCENT: [number, number, number] = [180, 140, 70] // doré
const SEPIA_TEXT: [number, number, number] = [50, 35, 20]
const SEPIA_MUTED: [number, number, number] = [130, 115, 95]
const SEPIA_BG_LIGHT: [number, number, number] = [248, 240, 225]

function formatFCFA(amount: number): string {
    return new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })
        .format(amount)
        .replace(/ /g, " ") // normalise les espaces fines
        + " FCFA"
}

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return "—"
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

/* ============================================================
   Génération
   ============================================================ */

export async function generateFacturePdf(facture: FacturePdfInput): Promise<Uint8Array> {
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 15

    /* ----------------- EN-TÊTE — bandeau crème ----------------- */
    doc.setFillColor(...SEPIA_BG_LIGHT)
    doc.rect(0, 0, pageW, 38, "F")

    // Identité cabinet (gauche)
    doc.setTextColor(...SEPIA_PRIMARY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text(CABINET_INFO.nomCommercial, margin, 16)

    doc.setFont("helvetica", "italic")
    doc.setFontSize(9)
    doc.setTextColor(...SEPIA_ACCENT)
    doc.text(CABINET_INFO.tagline, margin, 21)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...SEPIA_TEXT)
    const adr = CABINET_INFO.adresse
    doc.text(`${adr.ligne1} · ${adr.ville} · ${adr.pays}`, margin, 26)
    doc.text(
        `Tél : ${CABINET_INFO.telephones.join(" / ")}  ·  ${CABINET_INFO.emails[0]}  ·  ${CABINET_INFO.siteWeb}`,
        margin,
        30
    )
    doc.setTextColor(...SEPIA_MUTED)
    doc.setFontSize(7)
    doc.text(
        `NIF : ${CABINET_INFO.nif}   ·   RCCM : ${CABINET_INFO.rccm}   ·   ${CABINET_INFO.cnaa}`,
        margin,
        34
    )

    // Ligne dorée sous le bandeau
    doc.setDrawColor(...SEPIA_ACCENT)
    doc.setLineWidth(0.5)
    doc.line(0, 38, pageW, 38)

    /* ----------------- TITRE FACTURE ----------------- */
    let y = 50
    doc.setTextColor(...SEPIA_PRIMARY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(26)
    const titre = facture.direction === "EMISE" ? "FACTURE" : "FACTURE REÇUE"
    doc.text(titre, margin, y)

    // N° + dates (à droite du titre)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...SEPIA_TEXT)
    const infoX = pageW - margin - 60
    let infoY = y - 8
    const labelW = 28
    const printInfoRow = (label: string, value: string) => {
        doc.setTextColor(...SEPIA_MUTED)
        doc.setFontSize(8)
        doc.text(label.toUpperCase(), infoX, infoY)
        doc.setTextColor(...SEPIA_TEXT)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.text(value, infoX + labelW, infoY)
        doc.setFont("helvetica", "normal")
        infoY += 5
    }
    printInfoRow("N°", facture.numero)
    printInfoRow("Date émission", formatDate(facture.date))
    if (facture.dateEcheance) printInfoRow("Échéance", formatDate(facture.dateEcheance))

    /* ----------------- BLOC CLIENT (gauche) + DOSSIER (droite) ----------------- */
    y += 12
    doc.setDrawColor(220, 210, 195)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // Encadré client
    const clientNom =
        facture.client?.nom ?? facture.fournisseurNomLibre ?? facture.fournisseur?.nom ?? "—"
    const clientLigne = facture.direction === "EMISE" ? "Facturé à" : "Fournisseur"

    doc.setFontSize(8)
    doc.setTextColor(...SEPIA_MUTED)
    doc.text(clientLigne.toUpperCase(), margin, y)
    y += 5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...SEPIA_TEXT)
    doc.text(clientNom, margin, y)
    y += 5
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const clientAdresse = [
        facture.client?.adresse,
        [facture.client?.codePostal, facture.client?.ville].filter(Boolean).join(" "),
    ]
        .filter(Boolean)
        .join("\n")
    if (clientAdresse) {
        doc.text(clientAdresse, margin, y)
        y += clientAdresse.split("\n").length * 4 + 1
    }
    if (facture.client?.email) {
        doc.text(facture.client.email, margin, y)
        y += 4
    }
    if (facture.client?.rccm || facture.client?.nif) {
        doc.setTextColor(...SEPIA_MUTED)
        doc.setFontSize(7.5)
        const legalLine = [
            facture.client.rccm ? `RCCM : ${facture.client.rccm}` : null,
            facture.client.nif ? `NIF : ${facture.client.nif}` : null,
        ]
            .filter(Boolean)
            .join(" · ")
        doc.text(legalLine, margin, y)
        y += 4
    }

    // Dossier lié (à droite)
    if (facture.dossier) {
        let dy = y - 18
        doc.setTextColor(...SEPIA_MUTED)
        doc.setFontSize(8)
        doc.text("DOSSIER", infoX, dy)
        dy += 5
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(...SEPIA_TEXT)
        doc.text(facture.dossier.numero, infoX, dy)
        dy += 5
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        const titreLines = doc.splitTextToSize(facture.dossier.titre, 60)
        doc.text(titreLines, infoX, dy)
    }

    /* ----------------- DESCRIPTION ----------------- */
    y += 4
    if (facture.description) {
        doc.setFillColor(...SEPIA_BG_LIGHT)
        const lines = doc.splitTextToSize(facture.description, pageW - 2 * margin - 8)
        const h = lines.length * 4 + 6
        doc.rect(margin, y, pageW - 2 * margin, h, "F")
        doc.setTextColor(...SEPIA_TEXT)
        doc.setFontSize(9)
        doc.setFont("helvetica", "italic")
        doc.text(lines, margin + 4, y + 5)
        y += h + 4
        doc.setFont("helvetica", "normal")
    } else {
        y += 4
    }

    /* ----------------- TABLEAU DES LIGNES ----------------- */
    const lignes =
        facture.lignes.length > 0
            ? facture.lignes
            : [
                  {
                      libelle: facture.description ?? "Prestations juridiques",
                      quantite: 1,
                      prixUnitaire: facture.montantHT,
                      total: facture.montantHT,
                  },
              ]

    autoTable(doc, {
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [["Désignation", "Qté", "Prix unitaire HT", "Total HT"]],
        body: lignes.map((l) => [
            l.libelle,
            String(l.quantite),
            formatFCFA(l.prixUnitaire),
            formatFCFA(l.total),
        ]),
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            textColor: SEPIA_TEXT,
            lineColor: [220, 210, 195],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: SEPIA_PRIMARY,
            textColor: [255, 250, 240],
            fontStyle: "bold",
            fontSize: 9,
            cellPadding: 3,
        },
        columnStyles: {
            0: { cellWidth: "auto" },
            1: { cellWidth: 15, halign: "right" },
            2: { cellWidth: 35, halign: "right" },
            3: { cellWidth: 35, halign: "right" },
        },
        alternateRowStyles: { fillColor: [252, 248, 240] },
    })

    /* ----------------- TOTAUX ----------------- */
    let totalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    const totalsX = pageW - margin - 70
    const totalsW = 70

    const drawTotalRow = (
        label: string,
        value: string,
        opts?: { highlight?: boolean; bold?: boolean }
    ) => {
        if (opts?.highlight) {
            doc.setFillColor(...SEPIA_PRIMARY)
            doc.rect(totalsX, totalY - 4, totalsW, 9, "F")
            doc.setTextColor(255, 250, 240)
        } else {
            doc.setTextColor(...SEPIA_TEXT)
        }
        doc.setFont("helvetica", opts?.bold || opts?.highlight ? "bold" : "normal")
        doc.setFontSize(opts?.highlight ? 11 : 9)
        doc.text(label, totalsX + 3, totalY + 1.5)
        doc.text(value, totalsX + totalsW - 3, totalY + 1.5, { align: "right" })
        totalY += opts?.highlight ? 11 : 6
    }

    drawTotalRow("Sous-total HT", formatFCFA(facture.montantHT))
    drawTotalRow(
        `TVA (${facture.tvaRate}%)`,
        facture.montantTVA > 0 ? formatFCFA(facture.montantTVA) : "Exonéré"
    )
    drawTotalRow("Net à payer TTC", formatFCFA(facture.montantTTC), { highlight: true })
    if (facture.montantPaye > 0 && facture.montantPaye < facture.montantTTC) {
        totalY += 1
        doc.setTextColor(...SEPIA_MUTED)
        doc.setFontSize(8)
        doc.text(
            `Déjà payé : ${formatFCFA(facture.montantPaye)}`,
            totalsX + totalsW - 3,
            totalY,
            { align: "right" }
        )
        totalY += 4
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(180, 60, 60)
        doc.text(
            `Reste dû : ${formatFCFA(facture.montantTTC - facture.montantPaye)}`,
            totalsX + totalsW - 3,
            totalY,
            { align: "right" }
        )
    }

    /* ----------------- MENTIONS LÉGALES + BANQUE ----------------- */
    const mentionsY = Math.max(totalY + 15, pageH - 60)
    doc.setDrawColor(...SEPIA_ACCENT)
    doc.setLineWidth(0.3)
    doc.line(margin, mentionsY - 6, pageW - margin, mentionsY - 6)

    doc.setTextColor(...SEPIA_MUTED)
    doc.setFontSize(7.5)
    doc.setFont("helvetica", "bold")
    doc.text("MODALITÉS DE PAIEMENT", margin, mentionsY)
    doc.setFont("helvetica", "normal")
    doc.text(
        [
            `Virement : ${CABINET_INFO.banque.nom} — ${CABINET_INFO.banque.agence}`,
            `IBAN : ${CABINET_INFO.banque.iban}`,
            `SWIFT : ${CABINET_INFO.banque.swift}`,
            facture.dateEcheance
                ? `Paiement attendu au plus tard le ${formatDate(facture.dateEcheance)}`
                : "Paiement à réception de la facture",
        ].join("\n"),
        margin,
        mentionsY + 4
    )

    // Mention TVA
    doc.setFont("helvetica", "italic")
    doc.text(CABINET_INFO.mentionTVA, pageW - margin, mentionsY, { align: "right" })

    /* ----------------- PIED DE PAGE ----------------- */
    doc.setDrawColor(...SEPIA_ACCENT)
    doc.setLineWidth(0.3)
    doc.line(margin, pageH - 18, pageW - margin, pageH - 18)

    doc.setTextColor(...SEPIA_MUTED)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.text(
        `${CABINET_INFO.nomCommercial} — ${CABINET_INFO.formeJuridique} — RCCM ${CABINET_INFO.rccm} — NIF ${CABINET_INFO.nif}`,
        pageW / 2,
        pageH - 12,
        { align: "center" }
    )
    doc.text(
        `${CABINET_INFO.adresse.ligne1}, ${CABINET_INFO.adresse.ville}, ${CABINET_INFO.adresse.pays} — ${CABINET_INFO.telephones[0]} — ${CABINET_INFO.emails[0]}`,
        pageW / 2,
        pageH - 8,
        { align: "center" }
    )

    // Page numérotation
    doc.setFontSize(7)
    doc.text(`Document généré par KadriLex le ${formatDate(new Date())}`, margin, pageH - 4)

    return new Uint8Array(doc.output("arraybuffer"))
}
