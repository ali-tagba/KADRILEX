"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { DossierFile, FolderColorKey } from "@/lib/mock/dossiers"
import { FilePreviewModal } from "@/components/shared/file-preview-modal"

/* ============================================================
   Tokens & helpers
   ============================================================ */

interface FolderColor {
    key: FolderColorKey
    label: string
    bg: string
    text: string
    icon: string
    svgFront: string
    svgBack: string
}

const FOLDER_COLORS: FolderColor[] = [
    { key: "blue", label: "Bleu", bg: "bg-blue-100", text: "text-blue-500", icon: "text-blue-500", svgFront: "#3B82F6", svgBack: "#93C5FD" },
    { key: "red", label: "Rouge", bg: "bg-red-100", text: "text-red-500", icon: "text-red-500", svgFront: "#EF4444", svgBack: "#FCA5A5" },
    { key: "green", label: "Vert", bg: "bg-emerald-100", text: "text-emerald-600", icon: "text-emerald-600", svgFront: "#10B981", svgBack: "#6EE7B7" },
    { key: "orange", label: "Orange", bg: "bg-orange-100", text: "text-orange-500", icon: "text-orange-500", svgFront: "#F59E0B", svgBack: "#FCD34D" },
    { key: "purple", label: "Violet", bg: "bg-purple-100", text: "text-purple-500", icon: "text-purple-500", svgFront: "#8B5CF6", svgBack: "#C4B5FD" },
    { key: "yellow", label: "Jaune", bg: "bg-yellow-100", text: "text-yellow-600", icon: "text-yellow-600", svgFront: "#FACC15", svgBack: "#FDE047" },
    { key: "pink", label: "Rose", bg: "bg-pink-100", text: "text-pink-500", icon: "text-pink-500", svgFront: "#EC4899", svgBack: "#FBCFE8" },
    { key: "gray", label: "Gris", bg: "bg-slate-100", text: "text-slate-500", icon: "text-slate-500", svgFront: "#94A3B8", svgBack: "#CBD5E1" },
]

function getFolderColor(key?: string): FolderColor {
    return FOLDER_COLORS.find((c) => c.key === key) ?? FOLDER_COLORS[0]
}

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
    pdf: { icon: "picture_as_pdf", color: "text-red-500" },
    doc: { icon: "description", color: "text-blue-600" },
    docx: { icon: "description", color: "text-blue-600" },
    xls: { icon: "table_chart", color: "text-emerald-600" },
    xlsx: { icon: "table_chart", color: "text-emerald-600" },
    ppt: { icon: "present_to_all", color: "text-orange-500" },
    pptx: { icon: "present_to_all", color: "text-orange-500" },
    png: { icon: "image", color: "text-purple-500" },
    jpg: { icon: "image", color: "text-purple-500" },
    jpeg: { icon: "image", color: "text-purple-500" },
    gif: { icon: "gif", color: "text-purple-400" },
    mp4: { icon: "videocam", color: "text-blue-500" },
    mp3: { icon: "music_note", color: "text-pink-500" },
    zip: { icon: "archive", color: "text-amber-500" },
    rar: { icon: "archive", color: "text-amber-500" },
    txt: { icon: "text_snippet", color: "text-slate-500" },
    csv: { icon: "table_rows", color: "text-emerald-500" },
    default: { icon: "insert_drive_file", color: "text-on-surface-variant" },
}

function getFileIcon(filename: string): { icon: string; color: string } {
    const ext = filename?.split(".").pop()?.toLowerCase() ?? ""
    return FILE_ICONS[ext] ?? FILE_ICONS.default
}

function formatSize(bytes: number | null | undefined): string {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(s: string | null | undefined): string {
    if (!s) return "—"
    return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

/* ============================================================
   Folder SVG (OS-style — signature visuelle)
   ============================================================ */

function FolderSVG({ color, size = 72 }: { color: FolderColor; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-300 group-hover:scale-[1.05] drop-shadow-sm pointer-events-none"
        >
            <path
                d="M4 14C4 10.6863 6.68629 8 10 8H24C25.6569 8 27.2456 8.65848 28.4175 9.83042L31.5858 13H54C57.3137 13 60 15.6863 60 19V50C60 53.3137 57.3137 56 54 56H10C6.68629 56 4 53.3137 4 50V14Z"
                fill={color.svgBack}
            />
            <path
                d="M4 22C4 18.6863 6.68629 16 10 16H54C57.3137 16 60 18.6863 60 22V50C60 53.3137 57.3137 56 54 56H10C6.68629 56 4 53.3137 4 50V22Z"
                fill={color.svgFront}
            />
            <path d="M4 22C4 18.6863 6.68629 16 10 16H54C57.3137 16 60 18.6863 60 22V26H4V22Z" fill="white" fillOpacity="0.25" />
        </svg>
    )
}

/* ============================================================
   Dropdown menu — position: fixed avec coords calculées
   (échappe les overflow:hidden parents + auto-flip viewport)
   ============================================================ */

interface DropdownMenuProps {
    trigger: React.ReactNode
    children: (close: () => void) => React.ReactNode
    align?: "start" | "end"
}

const MENU_WIDTH = 220
const MENU_HEIGHT_APPROX = 240
const MENU_MARGIN = 8

function DropdownMenu({ trigger, children, align = "end" }: DropdownMenuProps) {
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const triggerRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Calcul des coords + auto-flip + clamp viewport
    // Mise à jour au scroll (le menu suit le trigger) — pas de fermeture pour ne pas
    // gêner le scroll dans la GED.
    useEffect(() => {
        if (!open) return
        const compute = () => {
            const t = triggerRef.current
            if (!t) return
            const r = t.getBoundingClientRect()
            // Si le trigger sort complètement de l'écran, on ferme
            if (r.bottom < 0 || r.top > window.innerHeight) {
                setOpen(false)
                return
            }
            const goUp =
                window.innerHeight - r.bottom < MENU_HEIGHT_APPROX + 12 &&
                r.top > MENU_HEIGHT_APPROX
            let left = align === "end" ? r.right - MENU_WIDTH : r.left
            left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - MENU_MARGIN))
            const top = goUp ? r.top - MENU_HEIGHT_APPROX - 4 : r.bottom + 4
            setCoords({ top, left })
        }
        compute()
        // Passive : pour ne pas bloquer le scroll. Capture : pour attraper scrolls sur ancêtres.
        window.addEventListener("scroll", compute, { capture: true, passive: true })
        window.addEventListener("resize", compute)
        return () => {
            window.removeEventListener("scroll", compute, { capture: true } as EventListenerOptions)
            window.removeEventListener("resize", compute)
        }
    }, [open, align])

    // Click-outside + Escape
    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
            setOpen(false)
        }
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        // Ouverture juste avant : on diffère pour éviter de capturer le click qui ouvre
        const tid = window.setTimeout(() => {
            window.addEventListener("mousedown", onClick)
            window.addEventListener("keydown", onEsc)
        }, 0)
        return () => {
            window.clearTimeout(tid)
            window.removeEventListener("mousedown", onClick)
            window.removeEventListener("keydown", onEsc)
        }
    }, [open])

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-block"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((v) => !v)
                }}
            >
                {trigger}
            </div>
            {open && coords && (
                <div
                    ref={menuRef}
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        width: MENU_WIDTH,
                        zIndex: 9999,
                    }}
                    className={cn(
                        "rounded-md border border-outline-variant bg-surface-container-lowest",
                        "shadow-[0_8px_24px_rgba(31,26,20,0.18),0_2px_6px_rgba(31,26,20,0.08)]",
                        "overflow-hidden py-1",
                        "animate-in fade-in-0 zoom-in-95 duration-100"
                    )}
                >
                    {children(() => setOpen(false))}
                </div>
            )}
        </>
    )
}

interface DropdownItemProps {
    icon: string
    label: string
    onClick: () => void
    danger?: boolean
}

function DropdownItem({ icon, label, onClick, danger }: DropdownItemProps) {
    return (
        <button
            onClick={onClick}
            role="menuitem"
            className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 font-body-sm text-body-sm transition-colors text-left group/item",
                danger
                    ? "text-error hover:bg-error-container/40 hover:text-on-error-container"
                    : "text-on-surface hover:bg-accent/8 hover:text-primary"
            )}
        >
            <span
                className={cn(
                    "material-symbols-outlined text-[18px] transition-colors",
                    danger ? "text-error" : "text-outline group-hover/item:text-accent"
                )}
            >
                {icon}
            </span>
            <span className="truncate">{label}</span>
        </button>
    )
}

function DropdownSeparator() {
    return <div className="border-t border-outline-variant/50 my-1 mx-1" />
}

/* ============================================================
   FileExplorer
   ============================================================ */

export interface FileExplorerProps {
    files: DossierFile[]
    rootLabel?: string
    /** Callbacks (optionnels). Si fournis, appelés en plus de la mutation locale. */
    onCreateFolder?: (input: { name: string; couleur: FolderColorKey; parentId: string | null }) => Promise<void>
    /**
     * Upload réel. Retourne le DossierFile créé (avec url) — le placeholder local est remplacé.
     * Reçoit un callback onProgress (0-100) qu'il peut appeler pendant l'upload XHR.
     */
    onUploadFile?: (input: {
        file: File
        parentId: string | null
        onProgress: (pct: number) => void
    }) => Promise<DossierFile | void>
    onRename?: (input: { id: string; name: string; couleur?: FolderColorKey }) => Promise<void>
    onMove?: (input: { id: string; newParentId: string | null }) => Promise<void>
    onDelete?: (id: string) => Promise<void>
}

type ViewMode = "grid" | "list"

export function FileExplorer({
    files,
    rootLabel = "GED",
    onCreateFolder,
    onUploadFile,
    onRename,
    onMove,
    onDelete,
}: FileExplorerProps) {
    /* === State local pour mutations en mode mock === */
    const [localFiles, setLocalFiles] = useState<DossierFile[]>(files)
    useEffect(() => {
        setLocalFiles(files)
    }, [files])

    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
        { id: null, name: rootLabel },
    ])

    /* === Drag & drop internes (déplacement) + externes (upload) === */
    const [draggedItem, setDraggedItem] = useState<DossierFile | null>(null)
    const [dragOverTarget, setDragOverTarget] = useState<string | "ROOT" | null>(null)
    /** True quand l'OS glisse des fichiers (externe) sur la zone GED. */
    const [externalDragActive, setExternalDragActive] = useState(false)
    /** Compteur d'enter/leave pour gérer le bubbling enfants. */
    const externalDragCounter = useRef(0)

    /* === Dialogs === */
    const [createOpen, setCreateOpen] = useState(false)
    const [createType, setCreateType] = useState<"folder" | "file">("folder")
    const [newName, setNewName] = useState("")
    const [newColor, setNewColor] = useState<FolderColorKey>("blue")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const [editOpen, setEditOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<DossierFile | null>(null)
    const [editName, setEditName] = useState("")
    const [editColor, setEditColor] = useState<FolderColorKey>("blue")

    const [moveOpen, setMoveOpen] = useState(false)
    const [moveTarget, setMoveTarget] = useState<DossierFile | null>(null)
    const [moveDestination, setMoveDestination] = useState<string | null>(null)

    /* === Helpers de hiérarchie === */
    const isDescendantOf = (potentialDescendantId: string, ancestorId: string): boolean => {
        const item = localFiles.find((f) => f.id === potentialDescendantId)
        if (!item || !item.parentId) return false
        if (item.parentId === ancestorId) return true
        return isDescendantOf(item.parentId, ancestorId)
    }

    const canDropOn = (item: DossierFile | null, targetFolderId: string | null): boolean => {
        if (!item) return false
        // Pas de drop dans soi-même
        if (item.id === targetFolderId) return false
        // Pas de drop d'un dossier dans son descendant
        if (item.type === "FOLDER" && targetFolderId && isDescendantOf(targetFolderId, item.id)) return false
        // Pas de drop dans le parent actuel (no-op)
        if (item.parentId === targetFolderId) return false
        return true
    }

    /* === Mutations locales === */
    const internalDelete = (id: string) => {
        // Supprime aussi tous les descendants (cascade)
        const toDelete = new Set<string>([id])
        let added = true
        while (added) {
            added = false
            for (const f of localFiles) {
                if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
                    toDelete.add(f.id)
                    added = true
                }
            }
        }
        setLocalFiles((prev) => prev.filter((f) => !toDelete.has(f.id)))
    }

    const internalRename = (id: string, name: string, couleur?: FolderColorKey) => {
        setLocalFiles((prev) =>
            prev.map((f) =>
                f.id === id
                    ? { ...f, name, couleur: couleur ?? f.couleur, updatedAt: new Date().toISOString() }
                    : f
            )
        )
    }

    const internalMove = (id: string, newParentId: string | null) => {
        setLocalFiles((prev) =>
            prev.map((f) =>
                f.id === id
                    ? { ...f, parentId: newParentId, updatedAt: new Date().toISOString() }
                    : f
            )
        )
    }

    const internalCreateFolder = (name: string, couleur: FolderColorKey, parentId: string | null) => {
        const newFolder: DossierFile = {
            id: `f-new-${Date.now()}`,
            parentId,
            name,
            type: "FOLDER",
            mimeType: null,
            size: null,
            couleur,
            updatedAt: new Date().toISOString(),
        }
        setLocalFiles((prev) => [...prev, newFolder])
    }

    /**
     * État d'upload : keyed par tempId du placeholder.
     * progress : 0–100. error : message d'erreur (placeholder gardé pour retry).
     */
    const [uploads, setUploads] = useState<Record<string, { progress: number; error?: string }>>({})
    const uploadCounter = useRef(0)

    const internalCreatePlaceholder = (file: File, parentId: string | null): string => {
        const tempId = `f-upload-${Date.now()}-${uploadCounter.current++}`
        const newFile: DossierFile = {
            id: tempId,
            parentId,
            name: file.name,
            type: "FILE",
            mimeType: file.type || null,
            size: file.size,
            updatedAt: new Date().toISOString(),
            url: null,
        }
        setLocalFiles((prev) => [...prev, newFile])
        setUploads((prev) => ({ ...prev, [tempId]: { progress: 0 } }))
        return tempId
    }

    const internalReplaceFile = (tempId: string, real: DossierFile) => {
        setLocalFiles((prev) => prev.map((f) => (f.id === tempId ? real : f)))
        setUploads((prev) => {
            const next = { ...prev }
            delete next[tempId]
            return next
        })
    }

    const internalRemovePlaceholder = (tempId: string) => {
        setLocalFiles((prev) => prev.filter((f) => f.id !== tempId))
        setUploads((prev) => {
            const next = { ...prev }
            delete next[tempId]
            return next
        })
    }

    /** Upload d'un fichier avec placeholder + progress + remplacement par le réel. */
    const uploadFile = async (file: File, parentId: string | null) => {
        const tempId = internalCreatePlaceholder(file, parentId)
        if (!onUploadFile) {
            // Mode mock : on garde le placeholder tel quel
            setUploads((prev) => {
                const next = { ...prev }
                delete next[tempId]
                return next
            })
            return
        }
        try {
            const real = await onUploadFile({
                file,
                parentId,
                onProgress: (pct) =>
                    setUploads((prev) =>
                        prev[tempId] ? { ...prev, [tempId]: { progress: pct } } : prev
                    ),
            })
            if (real) {
                internalReplaceFile(tempId, real)
            } else {
                // Pas de retour API : on enlève juste l'état d'upload, placeholder reste
                setUploads((prev) => {
                    const next = { ...prev }
                    delete next[tempId]
                    return next
                })
            }
        } catch (err) {
            console.error("Upload error", err)
            const msg = err instanceof Error ? err.message : "Échec téléversement"
            setUploads((prev) => ({ ...prev, [tempId]: { progress: 0, error: msg } }))
            // Auto-retire le placeholder après 4s pour ne pas polluer la grille
            window.setTimeout(() => internalRemovePlaceholder(tempId), 4000)
        }
    }

    /** Upload de plusieurs fichiers (drag-drop ou input multiple). */
    const uploadFiles = async (files: FileList | File[]) => {
        const arr = Array.from(files)
        // Upload en parallèle pour fluidité
        await Promise.all(arr.map((f) => uploadFile(f, currentFolderId)))
    }

    /* === Navigation === */
    const navigateInto = (folder: DossierFile) => {
        setCurrentFolderId(folder.id)
        setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
    }

    const navigateToCrumb = (i: number) => {
        const cropped = breadcrumb.slice(0, i + 1)
        setBreadcrumb(cropped)
        setCurrentFolderId(cropped[cropped.length - 1].id)
    }

    /* === Filtrage du contenu courant === */
    const currentFiles = useMemo(
        () => localFiles.filter((f) => f.parentId === currentFolderId),
        [localFiles, currentFolderId]
    )
    const folderItems = useMemo(
        () => currentFiles.filter((f) => f.type === "FOLDER").sort((a, b) => a.name.localeCompare(b.name, "fr")),
        [currentFiles]
    )
    const fileItems = useMemo(
        () => currentFiles.filter((f) => f.type === "FILE").sort((a, b) => a.name.localeCompare(b.name, "fr")),
        [currentFiles]
    )

    /* === Action handlers === */
    const openCreateFolder = () => {
        setCreateType("folder")
        setNewName("")
        setNewColor("blue")
        setCreateOpen(true)
    }

    const openUploadFile = () => {
        setCreateType("file")
        setSelectedFile(null)
        setCreateOpen(true)
    }

    const openEdit = (target: DossierFile) => {
        setEditTarget(target)
        setEditName(target.name)
        setEditColor((target.couleur as FolderColorKey) ?? "blue")
        setEditOpen(true)
    }

    const openMove = (target: DossierFile) => {
        setMoveTarget(target)
        setMoveDestination(null)
        setMoveOpen(true)
    }

    const submitCreate = async () => {
        if (createType === "folder") {
            const name = newName.trim()
            if (!name) return
            internalCreateFolder(name, newColor, currentFolderId)
            if (onCreateFolder) {
                try {
                    await onCreateFolder({ name, couleur: newColor, parentId: currentFolderId })
                } catch (err) {
                    console.error(err)
                }
            }
            setCreateOpen(false)
        } else {
            if (!selectedFile) return
            // Ferme la dialog immédiatement — la progression s'affiche sur la tuile fichier
            const fileToUpload = selectedFile
            setSelectedFile(null)
            setCreateOpen(false)
            void uploadFile(fileToUpload, currentFolderId)
        }
    }

    const submitEdit = async () => {
        if (!editTarget) return
        const name = editName.trim()
        if (!name) return
        const couleur = editTarget.type === "FOLDER" ? editColor : undefined
        internalRename(editTarget.id, name, couleur)
        if (onRename) {
            try {
                await onRename({ id: editTarget.id, name, couleur })
            } catch (err) {
                console.error(err)
            }
        }
        setEditOpen(false)
    }

    const submitMove = async () => {
        if (!moveTarget) return
        // moveDestination peut être null = racine
        const dest = moveDestination
        internalMove(moveTarget.id, dest)
        if (onMove) {
            try {
                await onMove({ id: moveTarget.id, newParentId: dest })
            } catch (err) {
                console.error(err)
            }
        }
        setMoveOpen(false)
    }

    const handleDelete = async (target: DossierFile) => {
        const what = target.type === "FOLDER" ? "ce dossier (et tout son contenu)" : "ce fichier"
        if (!confirm(`Supprimer ${what} ? Cette action est irréversible.`)) return
        internalDelete(target.id)
        if (onDelete) {
            try {
                await onDelete(target.id)
            } catch (err) {
                console.error(err)
            }
        }
    }

    const [previewFile, setPreviewFile] = useState<DossierFile | null>(null)

    const handleOpenFile = (file: DossierFile) => {
        if (!file.url) {
            alert(`"${file.name}" n'a pas de fichier attaché.`)
            return
        }
        // Double-clic → ouvre la modal de preview universelle
        setPreviewFile(file)
    }

    const handleDownload = (file: DossierFile) => {
        if (!file.url) {
            alert(`"${file.name}" n'a pas de fichier attaché.`)
            return
        }
        // Proxy same-origin → <a download> fonctionne (vs signed URL cross-origin
        // où l'attribut download est ignoré par le navigateur).
        const proxyUrl = `/api/storage/file?path=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}&download=1`
        const a = document.createElement("a")
        a.href = proxyUrl
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    /* === Drag & drop handlers === */
    const handleDragStart = (e: React.DragEvent, item: DossierFile) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", item.id)
        setDraggedItem(item)
    }

    const handleDragEnd = () => {
        setDraggedItem(null)
        setDragOverTarget(null)
    }

    const handleDragOverFolder = (e: React.DragEvent, folder: DossierFile) => {
        if (!draggedItem || !canDropOn(draggedItem, folder.id)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        setDragOverTarget(folder.id)
    }

    const handleDragOverCrumb = (e: React.DragEvent, crumbId: string | null) => {
        if (!draggedItem) return
        // Only allow drop on a crumb if it's not the current folder and it's a valid target
        if (crumbId === currentFolderId) return
        if (!canDropOn(draggedItem, crumbId)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        setDragOverTarget(crumbId === null ? "ROOT" : crumbId)
    }

    const handleDragLeave = () => {
        setDragOverTarget(null)
    }

    const handleDropOn = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault()
        if (!draggedItem) return
        if (!canDropOn(draggedItem, targetFolderId)) {
            setDragOverTarget(null)
            setDraggedItem(null)
            return
        }
        const id = draggedItem.id
        internalMove(id, targetFolderId)
        if (onMove) {
            try {
                await onMove({ id, newParentId: targetFolderId })
            } catch (err) {
                console.error(err)
            }
        }
        setDragOverTarget(null)
        setDraggedItem(null)
    }

    /* === Render === */
    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col h-full min-h-[520px]">
            {/* Toolbar */}
            <header className="flex-none px-4 py-2.5 border-b border-outline-variant bg-surface-container flex items-center justify-between gap-3 flex-wrap">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-0.5 font-body-sm text-body-sm min-w-0 flex-1">
                    {breadcrumb.map((crumb, i) => {
                        const isLast = i === breadcrumb.length - 1
                        const isDragTarget = dragOverTarget === (crumb.id === null ? "ROOT" : crumb.id) && !isLast
                        return (
                            <div key={crumb.id ?? "root"} className="flex items-center min-w-0">
                                <button
                                    onClick={() => !isLast && navigateToCrumb(i)}
                                    onDragOver={(e) => handleDragOverCrumb(e, crumb.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDropOn(e, crumb.id)}
                                    disabled={isLast}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded transition-colors truncate max-w-[200px] inline-flex items-center gap-1",
                                        isLast
                                            ? "font-semibold text-on-surface cursor-default"
                                            : "text-accent hover:bg-surface-container-low cursor-pointer",
                                        isDragTarget && "ring-2 ring-accent ring-offset-1 bg-accent/10"
                                    )}
                                >
                                    {i === 0 && (
                                        <span className="material-symbols-outlined text-[15px]">drive_folder_upload</span>
                                    )}
                                    {crumb.name}
                                </button>
                                {!isLast && (
                                    <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
                                )}
                            </div>
                        )
                    })}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex items-center bg-surface-container-low rounded p-0.5 border border-outline-variant">
                        <button
                            onClick={() => setViewMode("grid")}
                            title="Vue galerie"
                            aria-pressed={viewMode === "grid"}
                            className={cn(
                                "p-1.5 rounded transition-all",
                                viewMode === "grid" ? "bg-white shadow-sm text-accent" : "text-outline hover:text-on-surface"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">grid_view</span>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            title="Vue liste"
                            aria-pressed={viewMode === "list"}
                            className={cn(
                                "p-1.5 rounded transition-all",
                                viewMode === "list" ? "bg-white shadow-sm text-accent" : "text-outline hover:text-on-surface"
                            )}
                        >
                            <span className="material-symbols-outlined text-[16px]">view_list</span>
                        </button>
                    </div>

                    <button
                        onClick={openCreateFolder}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 font-body-sm text-[12px] font-medium text-on-surface border border-outline-variant rounded hover:bg-surface-container-low transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
                        Nouveau dossier
                    </button>
                    <button
                        onClick={openUploadFile}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 font-body-sm text-[12px] font-medium text-white bg-accent rounded hover:bg-opacity-90 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        Téléverser
                    </button>
                </div>
            </header>

            {/* Content — scroll interne, remplit l'espace disponible */}
            <div
                className={cn(
                    "flex-1 overflow-y-auto scrollbar-thin p-density-loose relative",
                    currentFiles.length === 0 && "flex flex-col"
                )}
                onDragEnter={(e) => {
                    // Détecte uniquement les fichiers OS externes (pas les drags internes)
                    if (e.dataTransfer.types.includes("Files")) {
                        externalDragCounter.current++
                        setExternalDragActive(true)
                    }
                }}
                onDragLeave={() => {
                    if (externalDragCounter.current > 0) {
                        externalDragCounter.current--
                        if (externalDragCounter.current === 0) setExternalDragActive(false)
                    }
                }}
                onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("Files")) {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = "copy"
                    } else if (draggedItem && draggedItem.parentId !== currentFolderId) {
                        e.preventDefault()
                    }
                }}
                onDrop={(e) => {
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        e.preventDefault()
                        externalDragCounter.current = 0
                        setExternalDragActive(false)
                        void uploadFiles(e.dataTransfer.files)
                        return
                    }
                    if (draggedItem && draggedItem.parentId !== currentFolderId) {
                        handleDropOn(e, currentFolderId)
                    }
                }}
            >
                {/* Overlay drag-drop externe */}
                {externalDragActive && (
                    <div className="pointer-events-none absolute inset-2 z-30 border-2 border-dashed border-accent rounded-xl bg-accent/8 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 animate-in fade-in duration-150">
                        <span className="material-symbols-outlined text-[56px] text-accent">
                            cloud_upload
                        </span>
                        <p className="font-h2 text-h2 text-primary">Lâche pour téléverser</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Les fichiers seront ajoutés à {breadcrumb[breadcrumb.length - 1].name}
                        </p>
                    </div>
                )}
                {currentFiles.length === 0 ? (
                    <EmptyState onNewFolder={openCreateFolder} onUpload={openUploadFile} />
                ) : viewMode === "grid" ? (
                    <GridView
                        folders={folderItems}
                        files={fileItems}
                        uploads={uploads}
                        draggedItemId={draggedItem?.id ?? null}
                        dragOverTarget={dragOverTarget}
                        canDropOn={canDropOn}
                        draggedItem={draggedItem}
                        onNavigate={navigateInto}
                        onEdit={openEdit}
                        onMove={openMove}
                        onDelete={handleDelete}
                        onOpenFile={handleOpenFile}
                        onDownload={handleDownload}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOverFolder={handleDragOverFolder}
                        onDragLeave={handleDragLeave}
                        onDropOnFolder={handleDropOn}
                    />
                ) : (
                    <ListView
                        folders={folderItems}
                        files={fileItems}
                        uploads={uploads}
                        draggedItemId={draggedItem?.id ?? null}
                        dragOverTarget={dragOverTarget}
                        canDropOn={canDropOn}
                        draggedItem={draggedItem}
                        onNavigate={navigateInto}
                        onEdit={openEdit}
                        onMove={openMove}
                        onDelete={handleDelete}
                        onOpenFile={handleOpenFile}
                        onDownload={handleDownload}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOverFolder={handleDragOverFolder}
                        onDragLeave={handleDragLeave}
                        onDropOnFolder={handleDropOn}
                    />
                )}
            </div>

            {/* Dialog Create / Upload */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md bg-surface-container-lowest">
                    <DialogHeader>
                        <DialogTitle className="font-h2 text-h2 text-primary">
                            {createType === "folder" ? "Nouveau sous-dossier" : "Téléverser un document"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-density-medium py-2">
                        {createType === "folder" ? (
                            <>
                                <div>
                                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5 block">
                                        Nom du dossier
                                    </label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Ex : Pièces produites, Conclusions…"
                                        onKeyDown={(e) => e.key === "Enter" && submitCreate()}
                                        autoFocus
                                    />
                                </div>
                                <ColorPicker value={newColor} onChange={setNewColor} />
                            </>
                        ) : (
                            <div>
                                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5 block">
                                    Sélectionner un ou plusieurs fichiers
                                </label>
                                <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                        const fl = e.target.files
                                        if (!fl || fl.length === 0) return
                                        // Si plusieurs : upload direct, sinon on garde le single-file workflow
                                        if (fl.length > 1) {
                                            setCreateOpen(false)
                                            void uploadFiles(fl)
                                        } else {
                                            setSelectedFile(fl[0])
                                        }
                                    }}
                                    className="cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-body-sm file:font-semibold file:bg-accent/10 file:text-primary hover:file:bg-accent/20"
                                />
                                <p className="font-body-sm text-[11px] text-outline mt-2 inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">info</span>
                                    Astuce&nbsp;: tu peux aussi glisser-déposer directement les fichiers sur la GED.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                        <Button
                            onClick={submitCreate}
                            disabled={
                                (createType === "folder" && !newName.trim()) ||
                                (createType === "file" && !selectedFile)
                            }
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
                            {createType === "folder" ? "Créer" : "Téléverser"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-md bg-surface-container-lowest">
                    <DialogHeader>
                        <DialogTitle className="font-h2 text-h2 text-primary">
                            {editTarget?.type === "FOLDER" ? "Modifier le dossier" : "Renommer le fichier"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-density-medium py-2">
                        <div>
                            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1.5 block">
                                Nom
                            </label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && submitEdit()}
                                autoFocus
                            />
                        </div>
                        {editTarget?.type === "FOLDER" && <ColorPicker value={editColor} onChange={setEditColor} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
                        <Button
                            onClick={submitEdit}
                            disabled={!editName.trim()}
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Move */}
            <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
                <DialogContent className="max-w-md bg-surface-container-lowest">
                    <DialogHeader>
                        <DialogTitle className="font-h2 text-h2 text-primary">
                            Déplacer «&nbsp;{moveTarget?.name}&nbsp;»
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
                            Choisir le dossier de destination :
                        </p>
                        <div className="border border-outline-variant rounded max-h-72 overflow-y-auto scrollbar-thin">
                            <FolderTreeItem
                                file={null}
                                level={0}
                                allFiles={localFiles}
                                excludeId={moveTarget?.id ?? null}
                                isDescendantOf={isDescendantOf}
                                selectedId={moveDestination}
                                onSelect={setMoveDestination}
                                rootLabel={rootLabel}
                                isCurrentParent={moveTarget?.parentId === null}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMoveOpen(false)}>Annuler</Button>
                        <Button
                            onClick={submitMove}
                            disabled={moveDestination === (moveTarget?.parentId ?? null)}
                            className="bg-accent hover:bg-accent/90 text-white"
                        >
                            Déplacer ici
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de prévisualisation universelle */}
            {previewFile && (
                <FilePreviewModal
                    storagePath={previewFile.url ?? null}
                    fileName={previewFile.name}
                    mimeType={previewFile.mimeType}
                    size={previewFile.size}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </section>
    )
}

/* ============================================================
   ColorPicker
   ============================================================ */

function ColorPicker({ value, onChange }: { value: FolderColorKey; onChange: (v: FolderColorKey) => void }) {
    return (
        <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2 block">
                Couleur du dossier
            </label>
            <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => {
                    const isActive = value === c.key
                    return (
                        <button
                            key={c.key}
                            type="button"
                            title={c.label}
                            onClick={() => onChange(c.key)}
                            className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                                c.bg,
                                isActive ? "ring-2 ring-offset-2 ring-accent scale-110" : "hover:scale-105"
                            )}
                        >
                            <span
                                className={cn("material-symbols-outlined text-[18px]", c.text)}
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                folder
                            </span>
                        </button>
                    )
                })}
            </div>
            <p className="font-body-sm text-[11px] text-outline mt-1.5">
                Couleur choisie : <span className="font-medium text-on-surface">{getFolderColor(value).label}</span>
            </p>
        </div>
    )
}

/* ============================================================
   FolderTreeItem (récursif, pour la modale Move)
   ============================================================ */

interface FolderTreeItemProps {
    file: DossierFile | null // null = racine
    level: number
    allFiles: DossierFile[]
    excludeId: string | null // l'id de l'item qu'on déplace (à exclure + ses descendants)
    isDescendantOf: (descId: string, ancId: string) => boolean
    selectedId: string | null
    onSelect: (id: string | null) => void
    rootLabel: string
    isCurrentParent: boolean
}

function FolderTreeItem({
    file,
    level,
    allFiles,
    excludeId,
    isDescendantOf,
    selectedId,
    onSelect,
    rootLabel,
    isCurrentParent,
}: FolderTreeItemProps) {
    const isRoot = file === null
    const id = isRoot ? null : file!.id
    const children = allFiles.filter(
        (f) => f.type === "FOLDER" && f.parentId === id && f.id !== excludeId && (!excludeId || !isDescendantOf(f.id, excludeId))
    )
    const isExcluded = !isRoot && excludeId === file!.id
    const col = isRoot ? null : getFolderColor(file!.couleur)
    const isSelected = selectedId === id
    const isAlreadyParent = isCurrentParent && isRoot

    return (
        <div>
            <button
                onClick={() => !isExcluded && !isAlreadyParent && onSelect(id)}
                disabled={isExcluded || isAlreadyParent}
                style={{ paddingLeft: `${level * 16 + 12}px` }}
                className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 font-body-sm text-body-sm text-left transition-colors",
                    isSelected && "bg-accent/15 text-primary font-medium",
                    !isSelected && !isExcluded && !isAlreadyParent && "hover:bg-surface-container-low text-on-surface",
                    (isExcluded || isAlreadyParent) && "opacity-40 cursor-not-allowed text-on-surface-variant"
                )}
            >
                <span
                    className={cn(
                        "material-symbols-outlined text-[18px]",
                        isRoot ? "text-outline" : col!.icon
                    )}
                    style={{ fontVariationSettings: isRoot ? undefined : "'FILL' 1" }}
                >
                    {isRoot ? "drive_folder_upload" : "folder"}
                </span>
                <span className="truncate flex-1">{isRoot ? rootLabel : file!.name}</span>
                {isAlreadyParent && (
                    <span className="font-body-sm text-[10px] text-outline italic flex-shrink-0">déjà ici</span>
                )}
            </button>
            {children.map((c) => (
                <FolderTreeItem
                    key={c.id}
                    file={c}
                    level={level + 1}
                    allFiles={allFiles}
                    excludeId={excludeId}
                    isDescendantOf={isDescendantOf}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    rootLabel={rootLabel}
                    isCurrentParent={false}
                />
            ))}
        </div>
    )
}

/* ============================================================
   GridView
   ============================================================ */

interface ListProps {
    folders: DossierFile[]
    files: DossierFile[]
    /** Map des uploads en cours, keyed par id du fichier. */
    uploads: Record<string, { progress: number; error?: string }>
    draggedItemId: string | null
    dragOverTarget: string | "ROOT" | null
    canDropOn: (item: DossierFile | null, targetFolderId: string | null) => boolean
    draggedItem: DossierFile | null
    onNavigate: (folder: DossierFile) => void
    onEdit: (target: DossierFile) => void
    onMove: (target: DossierFile) => void
    onDelete: (target: DossierFile) => void
    onOpenFile: (file: DossierFile) => void
    onDownload: (file: DossierFile) => void
    onDragStart: (e: React.DragEvent, item: DossierFile) => void
    onDragEnd: () => void
    onDragOverFolder: (e: React.DragEvent, folder: DossierFile) => void
    onDragLeave: () => void
    onDropOnFolder: (e: React.DragEvent, folderId: string | null) => void
}

function GridView(props: ListProps) {
    const { folders, files, uploads, draggedItemId, dragOverTarget, draggedItem, canDropOn,
        onNavigate, onEdit, onMove, onDelete, onOpenFile, onDownload,
        onDragStart, onDragEnd, onDragOverFolder, onDragLeave, onDropOnFolder } = props

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {folders.map((item) => {
                const col = getFolderColor(item.couleur)
                const isDragging = draggedItemId === item.id
                const isDragOver = dragOverTarget === item.id
                const canAccept = draggedItem && canDropOn(draggedItem, item.id)
                return (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => onDragOverFolder(e, item)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => onDropOnFolder(e, item.id)}
                        onClick={() => onNavigate(item)}
                        title={item.name}
                        className={cn(
                            "group relative flex flex-col items-center gap-2.5 p-4 rounded-xl cursor-pointer border shadow-[0px_1px_2px_rgba(31,26,20,0.04)]",
                            "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
                            col.bg,
                            isDragging && "opacity-40",
                            isDragOver && canAccept ? "border-accent ring-2 ring-accent" : "border-outline-variant/40"
                        )}
                    >
                        <FolderSVG color={col} />
                        <span
                            className="font-body-sm text-body-sm font-semibold text-on-surface text-center line-clamp-2 leading-snug w-full px-1 pointer-events-none"
                            style={{ wordBreak: "break-word" }}
                        >
                            {item.name}
                        </span>
                        <FolderActions item={item} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
                    </div>
                )
            })}
            {files.map((item) => {
                const { icon, color } = getFileIcon(item.name)
                const isDragging = draggedItemId === item.id
                const upload = uploads[item.id]
                const isUploading = !!upload && !upload.error
                const hasUploadError = !!upload?.error
                return (
                    <div
                        key={item.id}
                        draggable={!isUploading && !hasUploadError}
                        onDragStart={(e) => !isUploading && onDragStart(e, item)}
                        onDragEnd={onDragEnd}
                        onDoubleClick={() => !isUploading && !hasUploadError && onOpenFile(item)}
                        title={
                            isUploading
                                ? `Téléversement en cours… ${Math.round(upload.progress)}%`
                                : hasUploadError
                                ? `Échec : ${upload?.error}`
                                : `${item.name} (double-clic pour ouvrir)`
                        }
                        className={cn(
                            "group relative flex flex-col items-center gap-2.5 p-4 rounded-xl border shadow-[0px_1px_2px_rgba(31,26,20,0.04)] transition-all duration-200",
                            !isUploading && !hasUploadError &&
                                "cursor-grab active:cursor-grabbing bg-surface-container-low/40 hover:bg-surface-container-low hover:shadow-md hover:-translate-y-0.5 border-outline-variant/40",
                            isUploading &&
                                "cursor-progress bg-accent/5 border-accent/40",
                            hasUploadError &&
                                "cursor-default bg-error-container/40 border-error/40",
                            isDragging && "opacity-40"
                        )}
                    >
                        <span
                            className={cn(
                                "material-symbols-outlined text-[64px] drop-shadow-sm transition-transform duration-300 pointer-events-none",
                                color,
                                !isUploading && !hasUploadError && "group-hover:scale-[1.05]",
                                isUploading && "opacity-50",
                                hasUploadError && "text-error opacity-60"
                            )}
                            style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
                        >
                            {hasUploadError ? "error" : icon}
                        </span>
                        <span
                            className={cn(
                                "font-body-sm text-body-sm font-medium text-on-surface text-center line-clamp-2 leading-snug px-1 w-full pointer-events-none",
                                (isUploading || hasUploadError) && "opacity-70"
                            )}
                            style={{ wordBreak: "break-word" }}
                        >
                            {item.name}
                        </span>
                        {isUploading ? (
                            <div className="w-full px-1 pointer-events-none">
                                <div className="h-1 bg-accent/15 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent rounded-full transition-all duration-200"
                                        style={{ width: `${Math.max(5, upload.progress)}%` }}
                                    />
                                </div>
                                <p className="text-center font-mono-num text-[10px] text-accent mt-1">
                                    {Math.round(upload.progress)}% · téléversement…
                                </p>
                            </div>
                        ) : hasUploadError ? (
                            <p className="font-body-sm text-[10px] text-error text-center px-1 pointer-events-none line-clamp-2">
                                {upload.error}
                            </p>
                        ) : (
                            <span className="font-mono-num text-[11px] text-outline bg-surface-container px-2 py-0.5 rounded-full pointer-events-none">
                                {formatSize(item.size)}
                            </span>
                        )}
                        {!isUploading && !hasUploadError && (
                            <FileActions
                                item={item}
                                onOpen={() => onOpenFile(item)}
                                onEdit={() => onEdit(item)}
                                onMove={() => onMove(item)}
                                onDownload={() => onDownload(item)}
                                onDelete={() => onDelete(item)}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ============================================================
   ListView
   ============================================================ */

function ListView(props: ListProps) {
    const { folders, files, uploads, draggedItemId, dragOverTarget, draggedItem, canDropOn,
        onNavigate, onEdit, onMove, onDelete, onOpenFile, onDownload,
        onDragStart, onDragEnd, onDragOverFolder, onDragLeave, onDropOnFolder } = props

    return (
        <div className="border border-outline-variant rounded-md overflow-hidden bg-surface-container-lowest">
            <div className="grid grid-cols-[auto_1fr_140px_100px_60px] items-center px-3 py-2.5 bg-surface-container border-b border-outline-variant font-label-caps text-label-caps uppercase text-on-surface-variant select-none sticky top-0 z-10">
                <div className="w-8" />
                <div>Nom</div>
                <div>Modifié</div>
                <div className="text-right">Taille</div>
                <div />
            </div>

            {folders.map((item) => {
                const col = getFolderColor(item.couleur)
                const isDragging = draggedItemId === item.id
                const isDragOver = dragOverTarget === item.id
                const canAccept = draggedItem && canDropOn(draggedItem, item.id)
                return (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => onDragOverFolder(e, item)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => onDropOnFolder(e, item.id)}
                        onClick={() => onNavigate(item)}
                        className={cn(
                            "group grid grid-cols-[auto_1fr_140px_100px_60px] items-center px-3 py-2.5 hover:bg-accent/5 cursor-pointer transition-colors border-b border-outline-variant/40 last:border-b-0",
                            isDragging && "opacity-40",
                            isDragOver && canAccept && "bg-accent/15 ring-1 ring-accent ring-inset"
                        )}
                    >
                        <div className="w-8 flex items-center justify-center">
                            <span
                                className={cn("material-symbols-outlined text-[24px]", col.icon)}
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                folder
                            </span>
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface font-medium truncate pr-3">{item.name}</div>
                        <div className="font-body-sm text-[11px] text-outline truncate">{formatDate(item.updatedAt)}</div>
                        <div className="font-body-sm text-[11px] text-outline text-right">—</div>
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <FolderActions item={item} onEdit={onEdit} onMove={onMove} onDelete={onDelete} variant="list" />
                        </div>
                    </div>
                )
            })}

            {folders.length > 0 && files.length > 0 && (
                <div className="px-3 py-1 bg-surface-container-low/50 border-b border-outline-variant/30">
                    <span className="font-label-caps text-[10px] uppercase tracking-wider text-outline font-semibold">
                        Fichiers
                    </span>
                </div>
            )}

            {files.map((item) => {
                const { icon, color } = getFileIcon(item.name)
                const isDragging = draggedItemId === item.id
                const upload = uploads[item.id]
                const isUploading = !!upload && !upload.error
                const hasUploadError = !!upload?.error
                return (
                    <div
                        key={item.id}
                        draggable={!isUploading && !hasUploadError}
                        onDragStart={(e) => !isUploading && onDragStart(e, item)}
                        onDragEnd={onDragEnd}
                        onDoubleClick={() => !isUploading && !hasUploadError && onOpenFile(item)}
                        className={cn(
                            "group grid grid-cols-[auto_1fr_140px_100px_60px] items-center px-3 py-2 transition-colors border-b border-outline-variant/40 last:border-b-0",
                            !isUploading && !hasUploadError &&
                                "hover:bg-surface-container-low cursor-grab active:cursor-grabbing",
                            isUploading && "bg-accent/5 cursor-progress",
                            hasUploadError && "bg-error-container/40",
                            isDragging && "opacity-40"
                        )}
                    >
                        <div className="w-8 flex items-center justify-center">
                            <span
                                className={cn(
                                    "material-symbols-outlined text-[22px]",
                                    color,
                                    isUploading && "opacity-50",
                                    hasUploadError && "text-error opacity-60"
                                )}
                                style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
                            >
                                {hasUploadError ? "error" : icon}
                            </span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!isUploading && !hasUploadError) onOpenFile(item)
                            }}
                            disabled={isUploading || hasUploadError}
                            className={cn(
                                "font-body-sm text-body-sm truncate pr-3 text-left",
                                isUploading || hasUploadError
                                    ? "text-on-surface-variant cursor-default"
                                    : "text-on-surface hover:text-accent"
                            )}
                        >
                            {item.name}
                        </button>
                        {isUploading ? (
                            <div className="col-span-3 flex items-center gap-2 pr-2">
                                <div className="flex-1 h-1 bg-accent/15 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent rounded-full transition-all duration-200"
                                        style={{ width: `${Math.max(5, upload.progress)}%` }}
                                    />
                                </div>
                                <span className="font-mono-num text-[11px] text-accent w-12 text-right">
                                    {Math.round(upload.progress)}%
                                </span>
                            </div>
                        ) : hasUploadError ? (
                            <div className="col-span-3 font-body-sm text-[11px] text-error truncate pr-2">
                                {upload.error}
                            </div>
                        ) : (
                            <>
                                <div className="font-body-sm text-[11px] text-outline truncate">{formatDate(item.updatedAt)}</div>
                                <div className="font-mono-num text-[11px] text-outline text-right">{formatSize(item.size)}</div>
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FileActions
                                        item={item}
                                        onOpen={() => onOpenFile(item)}
                                        onEdit={() => onEdit(item)}
                                        onMove={() => onMove(item)}
                                        onDownload={() => onDownload(item)}
                                        onDelete={() => onDelete(item)}
                                        variant="list"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ============================================================
   FolderActions / FileActions — Dropdowns dédiés
   ============================================================ */

interface FolderActionsProps {
    item: DossierFile
    onEdit: (target: DossierFile) => void
    onMove: (target: DossierFile) => void
    onDelete: (target: DossierFile) => void
    variant?: "grid" | "list"
}

function FolderActions({ item, onEdit, onMove, onDelete, variant = "grid" }: FolderActionsProps) {
    return (
        <div className={cn(variant === "grid" && "absolute top-1.5 right-1.5")}>
            <DropdownMenu
                trigger={
                    <button
                        title="Actions sur le dossier"
                        className={cn(
                            variant === "grid"
                                ? "w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-on-surface-variant hover:text-primary hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm shadow-sm border border-outline-variant/30"
                                : "w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container text-outline hover:text-on-surface"
                        )}
                    >
                        <span className="material-symbols-outlined text-[16px]">more_vert</span>
                    </button>
                }
            >
                {(close) => (
                    <>
                        <DropdownItem icon="edit" label="Renommer & couleur" onClick={() => { close(); onEdit(item) }} />
                        <DropdownItem icon="drive_file_move" label="Déplacer…" onClick={() => { close(); onMove(item) }} />
                        <DropdownSeparator />
                        <DropdownItem icon="delete" label="Supprimer" onClick={() => { close(); onDelete(item) }} danger />
                    </>
                )}
            </DropdownMenu>
        </div>
    )
}

interface FileActionsProps {
    item: DossierFile
    onOpen: () => void
    onEdit: () => void
    onMove: () => void
    onDownload: () => void
    onDelete: () => void
    variant?: "grid" | "list"
}

function FileActions({ item, onOpen, onEdit, onMove, onDownload, onDelete, variant = "grid" }: FileActionsProps) {
    return (
        <div className={cn(variant === "grid" && "absolute top-1.5 right-1.5")}>
            <DropdownMenu
                trigger={
                    <button
                        title="Actions sur le fichier"
                        className={cn(
                            variant === "grid"
                                ? "w-7 h-7 flex items-center justify-center rounded-full bg-white/90 text-on-surface-variant hover:text-primary hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm shadow-sm border border-outline-variant/30"
                                : "w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container text-outline hover:text-on-surface"
                        )}
                    >
                        <span className="material-symbols-outlined text-[16px]">more_vert</span>
                    </button>
                }
            >
                {(close) => (
                    <>
                        <DropdownItem icon="open_in_new" label="Ouvrir" onClick={() => { close(); onOpen() }} />
                        <DropdownItem icon="edit" label="Renommer" onClick={() => { close(); onEdit() }} />
                        <DropdownItem icon="drive_file_move" label="Déplacer…" onClick={() => { close(); onMove() }} />
                        <DropdownItem icon="download" label="Télécharger" onClick={() => { close(); onDownload() }} />
                        <DropdownSeparator />
                        <DropdownItem icon="delete" label="Supprimer" onClick={() => { close(); onDelete() }} danger />
                    </>
                )}
            </DropdownMenu>
        </div>
    )
}

/* ============================================================
   EmptyState
   ============================================================ */

function EmptyState({ onNewFolder, onUpload }: { onNewFolder: () => void; onUpload: () => void }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-outline-variant/60 rounded-xl bg-surface-container-low/40 px-6 py-12 min-h-[280px]">
            <span className="material-symbols-outlined text-[64px] text-outline-variant block mb-3">folder_open</span>
            <p className="font-body-md text-body-md text-on-surface font-medium mb-1">Dossier vide</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
                Ajoutez des documents ou créez un sous-dossier.
            </p>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <button
                    onClick={onNewFolder}
                    className="font-body-sm text-body-sm text-primary border border-outline-variant px-4 py-2 rounded hover:bg-surface-container-low transition-colors font-medium inline-flex items-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
                    Nouveau dossier
                </button>
                <button
                    onClick={onUpload}
                    className="font-body-sm text-body-sm text-white bg-accent px-4 py-2 rounded hover:bg-opacity-90 transition-colors font-medium shadow-sm inline-flex items-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    Téléverser un fichier
                </button>
            </div>
        </div>
    )
}
