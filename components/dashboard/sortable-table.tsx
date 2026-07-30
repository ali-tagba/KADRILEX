"use client"

import { ReactNode, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type SortDir = "asc" | "desc"

export interface ColumnDef<T> {
    key: string
    header: string
    accessor?: (row: T) => string | number | null | undefined
    cell?: (row: T) => ReactNode
    align?: "left" | "right" | "center"
    sortable?: boolean
    headerClassName?: string
    cellClassName?: string
    width?: string
}

interface SortableTableProps<T extends { id: string }> {
    columns: ColumnDef<T>[]
    rows: T[]
    initialSort?: { key: string; dir: SortDir }
    emptyState?: ReactNode
    onRowClick?: (row: T) => void
    rowKey?: (row: T) => string
    rowHeight?: number
}

export function SortableTable<T extends { id: string }>({
    columns,
    rows,
    initialSort,
    emptyState,
    onRowClick,
    rowKey,
    rowHeight = 48,
}: SortableTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null)
    const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc")

    const sortedRows = useMemo(() => {
        if (!sortKey) return rows
        const col = columns.find((c) => c.key === sortKey)
        if (!col?.accessor) return rows
        const accessor = col.accessor
        return [...rows].sort((a, b) => {
            const va = accessor(a)
            const vb = accessor(b)
            if (va == null && vb == null) return 0
            if (va == null) return 1
            if (vb == null) return -1
            if (typeof va === "number" && typeof vb === "number") {
                return sortDir === "asc" ? va - vb : vb - va
            }
            return sortDir === "asc"
                ? String(va).localeCompare(String(vb), "fr")
                : String(vb).localeCompare(String(va), "fr")
        })
    }, [rows, columns, sortKey, sortDir])

    const handleSort = (key: string, sortable?: boolean) => {
        if (!sortable) return
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    if (rows.length === 0 && emptyState) {
        return <>{emptyState}</>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-[--color-surface-container-lowest] border-b border-[--color-outline-variant]">
                        {columns.map((col) => {
                            const isActive = sortKey === col.key
                            const align =
                                col.align === "right"
                                    ? "text-right"
                                    : col.align === "center"
                                        ? "text-center"
                                        : "text-left"
                            return (
                                <th
                                    key={col.key}
                                    style={col.width ? { width: col.width } : undefined}
                                    onClick={() => handleSort(col.key, col.sortable)}
                                    className={cn(
                                        "py-2 px-4 text-label-caps text-[--color-on-surface-variant] font-normal",
                                        align,
                                        col.sortable && "cursor-pointer select-none hover:text-[--color-on-surface]",
                                        col.headerClassName
                                    )}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && isActive && (
                                            <span className="text-[--color-accent] text-[10px]">
                                                {sortDir === "asc" ? "▲" : "▼"}
                                            </span>
                                        )}
                                    </span>
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {sortedRows.map((row) => (
                        <tr
                            key={rowKey ? rowKey(row) : row.id}
                            style={{ height: `${rowHeight}px` }}
                            className={cn(
                                "border-b border-[--color-outline-variant]/50 transition-colors",
                                onRowClick
                                    ? "cursor-pointer hover:bg-[--color-surface-container-low]"
                                    : "hover:bg-[--color-surface-container-low]"
                            )}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((col) => {
                                const align =
                                    col.align === "right"
                                        ? "text-right"
                                        : col.align === "center"
                                            ? "text-center"
                                            : "text-left"
                                return (
                                    <td
                                        key={col.key}
                                        className={cn(
                                            "py-2 px-4 text-[--color-on-background]",
                                            align,
                                            col.cellClassName
                                        )}
                                    >
                                        {col.cell
                                            ? col.cell(row)
                                            : col.accessor
                                                ? (col.accessor(row) ?? "—")
                                                : "—"}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
