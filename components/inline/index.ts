/**
 * Composants d'édition inline mutualisés — pattern Notion / Excel / Airtable.
 *
 * Single-click sur une cellule → édition immédiate avec focus.
 * Tab/Enter → valide. Échap → annule. Click ailleurs → valide.
 *
 * Réexports depuis le module Finance qui a été le premier consommateur.
 * À utiliser dans : tables Clients, Dossiers, Audiences, Tâches, Bibliothèque.
 */

export {
    InlineSelectCell,
    InlineDateCell,
    InlineTextCell,
    InlineNumberCell,
    type InlineOption,
} from "@/components/facturation/inline-cell-editor"

export { InlineComboCell } from "./combo-cell"
export { InlineMultiComboCell } from "./multi-combo-cell"
