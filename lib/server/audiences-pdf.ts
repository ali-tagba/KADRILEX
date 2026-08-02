/**
 * Générateur de PDF récapitulatif des audiences — tableau professionnel
 * (paysage, une ligne par audience) dans la charte sépia/doré du cabinet.
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { CABINET_INFO } from "@/lib/constants/cabinet"
import { AUDIENCE_NATURES, AUDIENCE_STATUTS, type AudienceNatureKey, type AudienceStatutKey } from "@/lib/constants/legal"

const SEPIA_PRIMARY: [number, number, number] = [85, 65, 35]
const SEPIA_ACCENT: [number, number, number] = [180, 140, 70]
const SEPIA_TEXT: [number, number, number] = [50, 35, 20]
const SEPIA_MUTED: [number, number, number] = [130, 115, 95]
const SEPIA_BG_LIGHT: [number, number, number] = [248, 240, 225]

export interface AudiencePdfRow {
    numero: string
    titre: string
    nature: AudienceNatureKey
    statut: AudienceStatutKey
    dateDebut: Date | string
    dureeMinutes: number
    juridiction: string | null
    salleAudience: string | null
    dossierNumero: string | null
    clientNom: string | null
    responsableNom: string | null
}

function formatDate(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatHeure(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export async function generateAudiencesPdf(audiences: AudiencePdfRow[], generatedBy?: string): Promise<Uint8Array> {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 12

    /* ----------------- EN-TÊTE ----------------- */
    doc.setFillColor(...SEPIA_BG_LIGHT)
    doc.rect(0, 0, pageW, 26, "F")

    doc.setTextColor(...SEPIA_PRIMARY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.text(CABINET_INFO.nomCommercial, margin, 11)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...SEPIA_TEXT)
    doc.text(
        `${CABINET_INFO.adresse.ligne1} · ${CABINET_INFO.adresse.ville} · ${CABINET_INFO.adresse.pays}`,
        margin,
        16
    )
    doc.setTextColor(...SEPIA_MUTED)
    doc.setFontSize(7)
    doc.text(`NIF : ${CABINET_INFO.nif}   ·   RCCM : ${CABINET_INFO.rccm}`, margin, 20.5)

    doc.setDrawColor(...SEPIA_ACCENT)
    doc.setLineWidth(0.5)
    doc.line(0, 26, pageW, 26)

    /* ----------------- TITRE ----------------- */
    doc.setTextColor(...SEPIA_PRIMARY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("REGISTRE DES AUDIENCES", margin, 36)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...SEPIA_MUTED)
    const genLabel = `Édité le ${formatDate(new Date())} à ${formatHeure(new Date())}${generatedBy ? ` par ${generatedBy}` : ""} · ${audiences.length} audience${audiences.length > 1 ? "s" : ""}`
    doc.text(genLabel, margin, 41)

    /* ----------------- TABLEAU ----------------- */
    const body = audiences.map((a) => [
        a.numero,
        `${formatDate(a.dateDebut)}\n${formatHeure(a.dateDebut)}`,
        a.titre,
        AUDIENCE_NATURES[a.nature]?.label ?? a.nature,
        AUDIENCE_STATUTS[a.statut]?.label ?? a.statut,
        a.dossierNumero ?? "—",
        a.clientNom ?? "—",
        [a.juridiction, a.salleAudience].filter(Boolean).join(" · ") || "—",
        a.responsableNom ?? "—",
    ])

    autoTable(doc, {
        startY: 46,
        margin: { left: margin, right: margin },
        head: [["N°", "Date / Heure", "Titre", "Nature", "Statut", "Dossier", "Client", "Juridiction / Salle", "Avocat"]],
        body,
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 2,
            textColor: SEPIA_TEXT,
            lineColor: [220, 210, 195],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: SEPIA_PRIMARY,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: SEPIA_BG_LIGHT,
        },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 20 },
            3: { cellWidth: 22 },
            4: { cellWidth: 18 },
            5: { cellWidth: 20 },
        },
        didDrawPage: (data) => {
            const pageCount = doc.getNumberOfPages()
            const pageH = doc.internal.pageSize.getHeight()
            doc.setFontSize(7)
            doc.setTextColor(...SEPIA_MUTED)
            doc.text(
                `${CABINET_INFO.nomCommercial} — Document confidentiel — Page ${data.pageNumber}/${pageCount}`,
                margin,
                pageH - 6
            )
        },
    })

    return doc.output("arraybuffer") as unknown as Uint8Array
}
