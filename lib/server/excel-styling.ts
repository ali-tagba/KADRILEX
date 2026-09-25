import type ExcelJS from "exceljs"

export const EXCEL_COLORS = {
    headerBg: "FF1E293B", // Navy / Slate 800
    headerText: "FFFFFFFF",
    subHeaderBg: "FF334155", // Slate 700
    subHeaderText: "FFFFFFFF",
    totalBg: "FFF1F5F9", // Slate 100
    totalText: "FF0F172A", // Slate 900
    borderColor: "FFE2E8F0", // Slate 200
    borderDark: "FF94A3B8", // Slate 400
    accentBg: "FFF8FAFC",
    greenText: "FF15803D",
    redText: "FFB91C1C",
}

export const CURRENCY_FORMAT = '#,##0 "FCFA"'
export const NUMBER_FORMAT = "#,##0"
export const PERCENT_FORMAT = "0.0%"

/**
 * Configure la police par défaut et les options d'affichage de la feuille.
 */
export function setupWorksheet(sheet: ExcelJS.Worksheet, options?: { showGridLines?: boolean }) {
    sheet.views = [{ showGridLines: options?.showGridLines ?? true }]
}

/**
 * Ajoute un bandeau d'en-tête cabinet élégant (titre, sous-titre, date d'export).
 */
export function addCabinetBanner(
    sheet: ExcelJS.Worksheet,
    title: string,
    subtitle?: string,
    maxCols = 8
) {
    sheet.mergeCells(1, 1, 1, maxCols)
    const titleCell = sheet.getCell(1, 1)
    titleCell.value = `SCPA KADRI LEGAL — ${title}`
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF1E293B" } }
    titleCell.alignment = { vertical: "middle", horizontal: "left" }
    sheet.getRow(1).height = 24

    if (subtitle) {
        sheet.mergeCells(2, 1, 2, maxCols)
        const subCell = sheet.getCell(2, 1)
        subCell.value = `${subtitle} · Exporté le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
        subCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF64748B" } }
        subCell.alignment = { vertical: "middle", horizontal: "left" }
        sheet.getRow(2).height = 18
    }

    sheet.addRow([]) // Ligne vide de séparation
    sheet.getRow(3).height = 8
}

/**
 * Applique le style aux en-têtes de colonnes (Navy, texte blanc, gras, centré verticalement).
 */
export function styleHeaderRow(row: ExcelJS.Row) {
    row.height = 24
    row.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: EXCEL_COLORS.headerText } }
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: EXCEL_COLORS.headerBg },
        }
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
        cell.border = {
            top: { style: "thin", color: { argb: EXCEL_COLORS.borderDark } },
            left: { style: "thin", color: { argb: EXCEL_COLORS.borderDark } },
            bottom: { style: "medium", color: { argb: EXCEL_COLORS.borderDark } },
            right: { style: "thin", color: { argb: EXCEL_COLORS.borderDark } },
        }
    })
}

/**
 * Applique le style à une ligne de données.
 */
export function styleDataRow(
    row: ExcelJS.Row,
    options?: {
        isEven?: boolean
        currencyCols?: (number | string)[]
        numberCols?: (number | string)[]
        dateCols?: (number | string)[]
        centerCols?: (number | string)[]
    }
) {
    row.height = 20
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10 }
        cell.border = {
            top: { style: "thin", color: { argb: EXCEL_COLORS.borderColor } },
            left: { style: "thin", color: { argb: EXCEL_COLORS.borderColor } },
            bottom: { style: "thin", color: { argb: EXCEL_COLORS.borderColor } },
            right: { style: "thin", color: { argb: EXCEL_COLORS.borderColor } },
        }

        if (options?.isEven) {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: EXCEL_COLORS.accentBg },
            }
        }

        const isCurrency = options?.currencyCols?.includes(colNumber)
        const isNumber = options?.numberCols?.includes(colNumber)
        const isDate = options?.dateCols?.includes(colNumber)
        const isCenter = options?.centerCols?.includes(colNumber)

        if (isCurrency) {
            cell.numFmt = CURRENCY_FORMAT
            cell.alignment = { vertical: "middle", horizontal: "right" }
        } else if (isNumber) {
            cell.numFmt = NUMBER_FORMAT
            cell.alignment = { vertical: "middle", horizontal: "right" }
        } else if (isDate || isCenter) {
            cell.alignment = { vertical: "middle", horizontal: "center" }
        } else {
            cell.alignment = { vertical: "middle", horizontal: "left" }
        }
    })
}

/**
 * Applique le style comptable à la ligne de totalisation (gras, fond ardoise clair, double bordure inférieure).
 */
export function styleTotalRow(
    row: ExcelJS.Row,
    options?: {
        currencyCols?: (number | string)[]
        numberCols?: (number | string)[]
    }
) {
    row.height = 22
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: EXCEL_COLORS.totalText } }
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: EXCEL_COLORS.totalBg },
        }
        cell.border = {
            top: { style: "thin", color: { argb: EXCEL_COLORS.borderDark } },
            left: { style: "thin", color: { argb: EXCEL_COLORS.borderDark } },
            bottom: { style: "double", color: { argb: EXCEL_COLORS.borderDark } },
            right: { style: "thin", color: { argb: EXCEL_COLORS.borderDark } },
        }

        const isCurrency = options?.currencyCols?.includes(colNumber)
        const isNumber = options?.numberCols?.includes(colNumber)

        if (isCurrency) {
            cell.numFmt = CURRENCY_FORMAT
            cell.alignment = { vertical: "middle", horizontal: "right" }
        } else if (isNumber) {
            cell.numFmt = NUMBER_FORMAT
            cell.alignment = { vertical: "middle", horizontal: "right" }
        } else {
            cell.alignment = { vertical: "middle", horizontal: "left" }
        }
    })
}

/**
 * Ajuste automatiquement la largeur des colonnes avec marges et bornes min/max.
 */
export function autoFitWorksheetColumns(sheet: ExcelJS.Worksheet, minWidth = 12, maxWidth = 55) {
    sheet.columns.forEach((column) => {
        let maxLen = 0
        if (column.eachCell) {
            column.eachCell({ includeEmpty: false }, (cell) => {
                const cellLen = cell.value ? String(cell.value).length : 0
                if (cellLen > maxLen) {
                    maxLen = cellLen
                }
            })
        }
        column.width = Math.min(Math.max(maxLen + 3, minWidth), maxWidth)
    })
}
