"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
    DOC_CATEGORIES,
    DOMAINES_JURIDIQUES,
    ISSUES_JURIS,
    type DocCategorieKey,
    type DomaineJuridiqueKey,
} from "@/lib/constants/biblio"
import type { MockDocument } from "@/lib/mock/documents"
import { DocumentActionsMenu } from "./document-actions-menu"
import {
    InlineComboCell,
    InlineDateCell,
    InlineMultiComboCell,
    InlineSelectCell,
    InlineTextCell,
    type InlineOption,
} from "@/components/inline"

interface DocumentTableViewProps {
    documents: MockDocument[]
    selectedId: string | null
    onSelect: (doc: MockDocument) => void
    onToggleFavori: (id: string) => void
    onEdit: (doc: MockDocument) => void
    onDuplicate: (doc: MockDocument) => void
    onAttach: (doc: MockDocument) => void
    onArchive: (id: string) => void
    /** Patch inline d'une cellule (édition rapide style Notion). Si non fourni, lecture seule. */
    onPatch?: (id: string, patch: Partial<MockDocument>) => void
}

/* ============================================================
   Options réutilisables pour les drop-downs
   ============================================================ */
const CATEGORIE_OPTIONS: InlineOption<DocCategorieKey>[] = (
    Object.entries(DOC_CATEGORIES) as [DocCategorieKey, { label: string; chip: string }][]
).map(([k, m]) => ({
    value: k,
    label: m.label,
    preview: (
        <span
            className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase",
                m.chip
            )}
        >
            {m.label}
        </span>
    ),
}))

const DOMAINE_OPTIONS = (
    Object.entries(DOMAINES_JURIDIQUES) as [DomaineJuridiqueKey, { label: string }][]
).map(([k, m]) => ({ value: k, label: m.label }))

/** Map label → key pour le combo qui travaille en string */
const DOMAINE_LABEL_TO_KEY = new Map<string, DomaineJuridiqueKey>(
    DOMAINE_OPTIONS.map((o) => [o.label, o.value as DomaineJuridiqueKey])
)
const DOMAINE_LABELS_LIST: readonly string[] = DOMAINE_OPTIONS.map((o) => o.label)

function formatDate(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

export function DocumentTableView({
    documents,
    selectedId,
    onSelect,
    onToggleFavori,
    onEdit,
    onDuplicate,
    onAttach,
    onArchive,
    onPatch,
}: DocumentTableViewProps) {
    const editable = !!onPatch
    /* Suggestions de tags : agrégat de tous les tags présents dans la base, dédupliqués */
    const tagsSuggestions = useMemo(() => {
        const set = new Set<string>()
        for (const d of documents) {
            if (!d.tags) continue
            for (const t of d.tags.split(",").map((s) => s.trim())) {
                if (t) set.add(t)
            }
        }
        return Array.from(set).sort()
    }, [documents])
    if (documents.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col items-center justify-center text-center p-12">
                <span className="material-symbols-outlined text-[56px] text-outline-variant mb-3">
                    library_books
                </span>
                <p className="font-body-md text-body-md text-on-surface font-medium">
                    Aucun document trouvé
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Ajustez la recherche ou les filtres.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead className="sticky top-0 z-10 bg-surface-container">
                        <tr className="border-b border-outline-variant">
                            <Th width="40px" className="text-center">★</Th>
                            <Th>Référence &amp; titre</Th>
                            <Th width="130px">Catégorie</Th>
                            <Th width="140px">Domaine</Th>
                            <Th width="160px">Juridiction</Th>
                            <Th width="100px">Date</Th>
                            <Th width="160px">Tags</Th>
                            <Th width="120px">Issue</Th>
                            <Th width="40px" className="text-center sticky right-0 bg-surface-container border-l border-outline-variant z-10">
                                ⋮
                            </Th>
                        </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/50">
                        {documents.map((d) => {
                            const isSelected = selectedId === d.id
                            const cat = DOC_CATEGORIES[d.categorie]
                            const dom = d.domaineJuridique ? DOMAINES_JURIDIQUES[d.domaineJuridique] : null
                            const issue = d.issue ? ISSUES_JURIS[d.issue] : null
                            const tagsList = d.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []

                            return (
                                <tr
                                    key={d.id}
                                    onClick={() => onSelect(d)}
                                    className={cn(
                                        "hover:bg-surface-container-low/40 transition-colors cursor-pointer group h-12",
                                        isSelected && "bg-accent/10 hover:bg-accent/15"
                                    )}
                                >
                                    {/* Favori */}
                                    <td className="py-2 px-3 text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onToggleFavori(d.id)
                                            }}
                                            aria-label={d.estFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
                                            className="p-1 rounded hover:bg-surface-container transition-colors"
                                        >
                                            <span
                                                className={cn(
                                                    "material-symbols-outlined text-[18px] block",
                                                    d.estFavori ? "text-secondary" : "text-outline-variant"
                                                )}
                                                style={d.estFavori ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                            >
                                                star
                                            </span>
                                        </button>
                                    </td>

                                    {/* Titre + référence — édition inline single-click */}
                                    <td className="py-2 px-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                                        {editable && onPatch ? (
                                            <>
                                                <InlineTextCell
                                                    value={d.titre}
                                                    onChange={(v) => onPatch(d.id, { titre: v })}
                                                    displayClassName="font-body-md text-body-md font-medium text-on-surface truncate block"
                                                    title="Modifier le titre"
                                                />
                                                <div className="flex items-center gap-2 font-mono-num text-[11px] text-outline mt-0.5">
                                                    <InlineTextCell
                                                        value={d.reference ?? ""}
                                                        onChange={(v) => onPatch(d.id, { reference: v || null })}
                                                        placeholder="+ référence"
                                                        displayClassName="font-mono-num text-[11px] text-outline"
                                                        title="Modifier la référence"
                                                    />
                                                    {d.fileName && (
                                                        <span className="inline-flex items-center gap-0.5 truncate">
                                                            <span className="material-symbols-outlined text-[12px]">
                                                                attach_file
                                                            </span>
                                                            {d.fileName}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-body-md text-body-md font-medium text-on-surface truncate" title={d.titre}>
                                                    {d.titre}
                                                </div>
                                                <div className="flex items-center gap-2 font-mono-num text-[11px] text-outline mt-0.5">
                                                    {d.reference && <span>{d.reference}</span>}
                                                    {d.fileName && (
                                                        <span className="inline-flex items-center gap-0.5 truncate">
                                                            <span className="material-symbols-outlined text-[12px]">
                                                                attach_file
                                                            </span>
                                                            {d.fileName}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </td>

                                    {/* Catégorie — single select (liste fixe, pas de custom) */}
                                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                        {editable && onPatch ? (
                                            <InlineSelectCell<DocCategorieKey>
                                                trigger={
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                                            cat.chip
                                                        )}
                                                    >
                                                        {cat.label}
                                                        <span className="material-symbols-outlined text-[10px] opacity-60">
                                                            expand_more
                                                        </span>
                                                    </span>
                                                }
                                                options={CATEGORIE_OPTIONS}
                                                selected={d.categorie}
                                                onSelect={(v) => onPatch(d.id, { categorie: v })}
                                                menuHeader="Catégorie"
                                                align="start"
                                            />
                                        ) : (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded font-label-caps text-[10px] uppercase",
                                                    cat.chip
                                                )}
                                            >
                                                {cat.label}
                                            </span>
                                        )}
                                    </td>

                                    {/* Domaine — combo : suggestions + Autre… */}
                                    <td className="py-2 px-3 text-on-surface-variant" onClick={(e) => e.stopPropagation()}>
                                        {editable && onPatch ? (
                                            <InlineComboCell
                                                value={dom ? dom.label : ""}
                                                onChange={(v) => {
                                                    /* domaineJuridique est un enum Prisma strict : aucune valeur
                                                       libre n'est persistable. Si le libellé saisi ne correspond
                                                       à aucune option connue, on retombe sur "Autre" (au lieu de
                                                       silencieusement effacer la saisie de l'utilisateur) et on
                                                       le prévient que le texte libre n'est pas conservé. */
                                                    const key = DOMAINE_LABEL_TO_KEY.get(v)
                                                    if (!key && v !== "") {
                                                        import("@/components/ui/toaster").then(({ toast }) =>
                                                            toast.error(
                                                                `"${v}" n'est pas un domaine reconnu — classé en "Autre" (la saisie libre n'est pas conservée).`
                                                            )
                                                        )
                                                    }
                                                    onPatch(d.id, {
                                                        domaineJuridique: key ?? (v === "" ? null : "AUTRE"),
                                                    })
                                                }}
                                                options={DOMAINE_LABELS_LIST}
                                                menuHeader="Domaine juridique"
                                                placeholder="—"
                                                triggerClassName="truncate max-w-[140px] block py-0.5 px-1"
                                                title="Choisir le domaine ou saisir une valeur libre"
                                                nullable
                                            />
                                        ) : dom ? (
                                            <span className="inline-flex items-center gap-1 truncate">
                                                <span className="material-symbols-outlined text-[14px] text-outline">
                                                    {dom.icon}
                                                </span>
                                                {dom.label}
                                            </span>
                                        ) : (
                                            <span className="text-outline-variant">—</span>
                                        )}
                                    </td>

                                    {/* Juridiction — texte libre inline */}
                                    <td className="py-2 px-3 text-on-surface-variant" onClick={(e) => e.stopPropagation()}>
                                        {editable && onPatch ? (
                                            <InlineTextCell
                                                value={d.juridiction ?? ""}
                                                onChange={(v) => onPatch(d.id, { juridiction: v || null })}
                                                placeholder="—"
                                                displayClassName="truncate max-w-[160px] block"
                                                title="Modifier la juridiction"
                                            />
                                        ) : (
                                            d.juridiction ?? <span className="text-outline-variant">—</span>
                                        )}
                                    </td>

                                    {/* Date du document */}
                                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                        {editable && onPatch ? (
                                            <InlineDateCell
                                                value={d.dateDocument}
                                                onChange={(iso) => onPatch(d.id, { dateDocument: iso })}
                                                placeholder="—"
                                                title="Modifier la date du document"
                                                nullable
                                                triggerClassName="text-[12px] text-on-surface-variant px-1 py-0.5"
                                            />
                                        ) : (
                                            <span className="font-mono-num text-mono-num text-on-surface-variant text-[12px]">
                                                {formatDate(d.dateDocument)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Tags — multi-combo avec custom */}
                                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                        {editable && onPatch ? (
                                            <InlineMultiComboCell
                                                values={tagsList}
                                                onChange={(next) =>
                                                    onPatch(d.id, {
                                                        tags: next.length === 0 ? null : next.join(", "),
                                                    })
                                                }
                                                options={tagsSuggestions}
                                                menuHeader="Tags"
                                                placeholder="+ tags"
                                            />
                                        ) : tagsList.length === 0 ? (
                                            <span className="text-outline-variant text-xs">—</span>
                                        ) : (
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {tagsList.slice(0, 2).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex px-1.5 py-0.5 border border-outline-variant rounded text-[10px] text-outline truncate max-w-[80px]"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {tagsList.length > 2 && (
                                                    <span className="text-[10px] text-outline-variant">
                                                        +{tagsList.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* Issue */}
                                    <td className="py-2 px-3">
                                        {issue ? (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-body-sm text-[11px]",
                                                    issue.chip
                                                )}
                                            >
                                                <span className="material-symbols-outlined text-[12px]">{issue.icon}</span>
                                                {issue.label}
                                            </span>
                                        ) : (
                                            <span className="text-outline-variant text-xs">—</span>
                                        )}
                                    </td>

                                    {/* Actions (3-dot menu — fixed-positioned, escape overflow) */}
                                    <td
                                        onClick={(e) => e.stopPropagation()}
                                        className={cn(
                                            "py-2 px-3 text-center sticky right-0 transition-colors border-l border-outline-variant/30",
                                            isSelected ? "bg-accent/10" : "bg-surface-container-lowest group-hover:bg-surface-container-low/40"
                                        )}
                                    >
                                        <DocumentActionsMenu
                                            onEdit={() => onEdit(d)}
                                            onDuplicate={() => onDuplicate(d)}
                                            onAttach={() => onAttach(d)}
                                            onToggleFavori={() => onToggleFavori(d.id)}
                                            onArchive={() => onArchive(d.id)}
                                            isFavori={d.estFavori}
                                            archived={d.statut === "ARCHIVE"}
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function Th({
    children,
    width,
    className,
}: {
    children: React.ReactNode
    width?: string
    className?: string
}) {
    return (
        <th
            className={cn(
                "py-2.5 px-3 font-label-caps text-label-caps text-on-surface-variant uppercase whitespace-nowrap",
                className
            )}
            style={width ? { width } : undefined}
        >
            {children}
        </th>
    )
}
