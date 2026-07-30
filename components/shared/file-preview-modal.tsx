"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEscapeClose } from "@/lib/hooks/use-escape-close"
import { cn } from "@/lib/utils"

interface Props {
    /** Chemin Supabase Storage (ex: "dossiers/MEMBRE/timestamp-fichier.pdf") */
    storagePath: string | null
    /** Nom affichable du fichier */
    fileName: string
    /** MIME type pour choisir le bon viewer */
    mimeType?: string | null
    /** Taille en octets (affichée dans le header) */
    size?: number | null
    /** Optionnel : déclenche le ShareDialog parent */
    onShare?: () => void
    onClose: () => void
}

type Category = "pdf" | "image" | "video" | "audio" | "text" | "office" | "other"

function categorize(mime: string | null | undefined, name: string): Category {
    const m = (mime ?? "").toLowerCase()
    const ext = name.split(".").pop()?.toLowerCase() ?? ""
    if (m.includes("pdf") || ext === "pdf") return "pdf"
    if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext))
        return "image"
    if (m.startsWith("video/") || ["mp4", "webm", "mov", "avi"].includes(ext)) return "video"
    if (m.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio"
    if (
        m.startsWith("text/") ||
        m.includes("json") ||
        m.includes("xml") ||
        ["txt", "md", "csv", "json", "xml", "log", "yaml", "yml", "ts", "tsx", "js", "jsx", "css", "html"].includes(ext)
    )
        return "text"
    if (
        m.includes("word") ||
        m.includes("excel") ||
        m.includes("powerpoint") ||
        m.includes("officedocument") ||
        m.includes("opendocument") ||
        ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods"].includes(ext)
    )
        return "office"
    return "other"
}

function formatBytes(b: number | null | undefined): string {
    if (!b) return ""
    if (b < 1024) return `${b} o`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`
    return `${(b / (1024 * 1024)).toFixed(1)} Mo`
}

const CATEGORY_META: Record<Category, { icon: string; label: string }> = {
    pdf: { icon: "picture_as_pdf", label: "PDF" },
    image: { icon: "image", label: "Image" },
    video: { icon: "movie", label: "Vidéo" },
    audio: { icon: "audiotrack", label: "Audio" },
    text: { icon: "description", label: "Texte" },
    office: { icon: "description", label: "Document Office" },
    other: { icon: "draft", label: "Fichier" },
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 5
const ZOOM_STEP = 1.2

function clamp(v: number, min: number, max: number): number {
    return Math.min(Math.max(v, min), max)
}

export function FilePreviewModal({
    storagePath,
    fileName,
    mimeType,
    size,
    onShare,
    onClose,
}: Props) {
    useEscapeClose(onClose)
    const [signedUrl, setSignedUrl] = useState<string | null>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Image viewer state
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

    const category = categorize(mimeType, fileName)
    const meta = CATEGORY_META[category]

    // URL same-origin via proxy serveur (évite CORS + fait fonctionner <a download>)
    const proxyUrl = storagePath
        ? `/api/storage/file?path=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(fileName)}`
        : null
    const resolvedUrl = signedUrl ?? proxyUrl

    // Reset image controls quand on change de fichier
    useEffect(() => {
        setZoom(1)
        setRotation(0)
        setPan({ x: 0, y: 0 })
    }, [storagePath])

    // Récupère la signed URL (utile pour Office viewer qui doit pointer vers une URL publique)
    useEffect(() => {
        if (!storagePath) {
            setError("Aucun fichier attaché")
            setLoading(false)
            return
        }
        let alive = true
        const ctrl = new AbortController()
        ;(async () => {
            try {
                const r = await fetch(
                    `/api/storage/download-url?path=${encodeURIComponent(storagePath)}&ttl=3600`,
                    { credentials: "include", signal: ctrl.signal }
                )
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                const { signedUrl: url } = (await r.json()) as { signedUrl: string }
                if (!alive) return
                setSignedUrl(url)
            } catch (e) {
                if (alive && (e as Error).name !== "AbortError") {
                    setError(e instanceof Error ? e.message : "Erreur de chargement")
                }
            } finally {
                if (alive) setLoading(false)
            }
        })()
        return () => {
            alive = false
            ctrl.abort()
        }
    }, [storagePath])

    // Fetch séparé du contenu texte via proxy same-origin
    useEffect(() => {
        if (category !== "text" || !resolvedUrl) return
        let alive = true
        const ctrl = new AbortController()
        fetch(resolvedUrl, { credentials: "include", signal: ctrl.signal })
            .then((r) => (r.ok ? r.text() : null))
            .then((txt) => {
                if (alive && txt !== null) setTextContent(txt)
            })
            .catch((e) => {
                if (alive && (e as Error).name !== "AbortError") {
                    setTextContent("Impossible de charger le contenu texte.")
                }
            })
        return () => {
            alive = false
            ctrl.abort()
        }
    }, [category, resolvedUrl])

    const handleDownload = useCallback(() => {
        if (!resolvedUrl) return
        const a = document.createElement("a")
        a.href = resolvedUrl.startsWith("data:") ? resolvedUrl : `${resolvedUrl}&download=1`
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }, [resolvedUrl, fileName])

    const resetView = useCallback(() => {
        setZoom(1)
        setRotation(0)
        setPan({ x: 0, y: 0 })
    }, [])

    const zoomIn = useCallback(() => setZoom((z) => clamp(z * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)), [])
    const zoomOut = useCallback(() => setZoom((z) => clamp(z / ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)), [])
    const rotate = useCallback(() => setRotation((r) => (r + 90) % 360), [])

    // Raccourcis clavier (Dropbox-style)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Pas de raccourci si l'utilisateur tape dans un input (cas du texte sélectionné)
            const tag = (e.target as HTMLElement | null)?.tagName
            if (tag === "INPUT" || tag === "TEXTAREA") return

            if (e.key === "+" || e.key === "=") {
                if (category === "image") {
                    e.preventDefault()
                    zoomIn()
                }
            } else if (e.key === "-" || e.key === "_") {
                if (category === "image") {
                    e.preventDefault()
                    zoomOut()
                }
            } else if (e.key === "0") {
                if (category === "image") {
                    e.preventDefault()
                    resetView()
                }
            } else if (e.key === "r" || e.key === "R") {
                if (category === "image") {
                    e.preventDefault()
                    rotate()
                }
            } else if ((e.key === "d" || e.key === "D") && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                handleDownload()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [category, zoomIn, zoomOut, rotate, resetView, handleDownload])

    // Pan : drag à la souris quand zoomé
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (category !== "image" || zoom <= 1) return
        e.preventDefault()
        dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    }
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current) return
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
    }
    const endDrag = () => {
        dragRef.current = null
    }

    // Zoom à la molette (Ctrl + wheel — comportement standard)
    const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (category !== "image" || !e.ctrlKey) return
        e.preventDefault()
        if (e.deltaY < 0) zoomIn()
        else zoomOut()
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 animate-in fade-in duration-150"
        >
            {/* Backdrop sépia profond avec blur léger — DA */}
            <div
                className="fixed inset-0 bg-[rgba(31,26,20,0.78)] backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                className={cn(
                    "relative w-full h-full bg-surface flex flex-col overflow-hidden",
                    "sm:w-[95vw] sm:max-w-7xl sm:h-[92vh] sm:rounded-xl",
                    "shadow-[0_20px_60px_-15px_rgba(31,26,20,0.5)]",
                    "animate-in fade-in zoom-in-95 duration-200"
                )}
            >
                {/* Header */}
                <header className="flex-none flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-outline-variant bg-surface-container">
                    <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center flex-none">
                        <span className="material-symbols-outlined text-accent text-[20px]">
                            {meta.icon}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2
                            id="preview-title"
                            className="font-body-md text-body-md font-semibold text-on-surface truncate"
                            title={fileName}
                        >
                            {fileName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded font-label-caps text-[9px] uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
                                {meta.label}
                            </span>
                            {size != null && (
                                <span className="font-mono-num text-[11px] text-outline">
                                    {formatBytes(size)}
                                </span>
                            )}
                            {mimeType && (
                                <span className="hidden md:inline font-mono-num text-[10px] text-outline-variant truncate">
                                    · {mimeType}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Toolbar image */}
                    {category === "image" && !loading && !error && (
                        <div className="hidden sm:flex items-center gap-0.5 mr-1 border border-outline-variant rounded-md bg-surface p-0.5">
                            <ToolbarBtn icon="remove" title="Dézoomer (−)" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} />
                            <button
                                type="button"
                                onClick={resetView}
                                title="Réinitialiser (0)"
                                className="px-2 py-1 rounded hover:bg-surface-container-low text-on-surface font-mono-num text-[11px] min-w-[44px] transition-colors"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <ToolbarBtn icon="add" title="Zoomer (+)" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} />
                            <div className="w-px h-5 bg-outline-variant mx-0.5" />
                            <ToolbarBtn icon="rotate_right" title="Pivoter (R)" onClick={rotate} />
                        </div>
                    )}

                    {/* Actions */}
                    {onShare && (
                        <ToolbarBtn icon="share" title="Partager" onClick={onShare} />
                    )}
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!proxyUrl}
                        title="Télécharger (D)"
                        className="px-2.5 sm:px-3 py-1.5 rounded-md border border-outline-variant text-on-surface font-body-sm text-body-sm hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-1.5 transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span className="hidden sm:inline">Télécharger</span>
                    </button>
                    <ToolbarBtn icon="close" title="Fermer (Échap)" onClick={onClose} />
                </header>

                {/* Contenu */}
                <div
                    className={cn(
                        "flex-1 min-h-0 overflow-hidden relative",
                        // Fond crème/sépia pâle pour faire ressortir le document
                        "bg-[var(--md-sys-color-surface-container,#f5ede0)]"
                    )}
                >
                    {loading ? (
                        <SkeletonLoader category={category} />
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant px-6">
                            <span className="material-symbols-outlined text-[48px] text-error">
                                error_outline
                            </span>
                            <p className="font-body-md text-body-md text-on-surface text-center max-w-md">
                                {error}
                            </p>
                            {proxyUrl && (
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="mt-2 px-4 py-2 rounded-md bg-primary text-on-primary font-body-sm text-body-sm hover:opacity-90 inline-flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Télécharger pour ouvrir localement
                                </button>
                            )}
                        </div>
                    ) : !resolvedUrl ? null : category === "pdf" ? (
                        <iframe
                            src={resolvedUrl}
                            title={fileName}
                            className="w-full h-full bg-white"
                        />
                    ) : category === "image" ? (
                        <div
                            className={cn(
                                "h-full w-full overflow-hidden flex items-center justify-center select-none",
                                zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
                            )}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={endDrag}
                            onMouseLeave={endDrag}
                            onWheel={onWheel}
                            onDoubleClick={() =>
                                zoom === 1 ? setZoom(2) : resetView()
                            }
                        >
                            <img
                                src={resolvedUrl}
                                alt={fileName}
                                onError={() => setError("Image illisible ou inaccessible")}
                                draggable={false}
                                style={{
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                                    transition: dragRef.current ? "none" : "transform 0.18s ease-out",
                                }}
                                className="max-w-full max-h-full object-contain pointer-events-none"
                            />
                        </div>
                    ) : category === "video" ? (
                        <div className="h-full flex items-center justify-center p-4 bg-black">
                            <video
                                controls
                                autoPlay
                                src={resolvedUrl}
                                onError={() => setError("Vidéo illisible")}
                                className="max-w-full max-h-full rounded shadow-2xl"
                            >
                                Ton navigateur ne supporte pas la vidéo.
                            </video>
                        </div>
                    ) : category === "audio" ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
                            <div className="w-32 h-32 rounded-full bg-accent/10 flex items-center justify-center">
                                <span
                                    className="material-symbols-outlined text-accent text-[64px]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    audiotrack
                                </span>
                            </div>
                            <p className="font-h2 text-h2 text-on-surface text-center max-w-md truncate">
                                {fileName}
                            </p>
                            <audio
                                controls
                                autoPlay
                                src={resolvedUrl}
                                onError={() => setError("Audio illisible")}
                                className="w-full max-w-md"
                            >
                                Ton navigateur ne supporte pas l'audio.
                            </audio>
                        </div>
                    ) : category === "text" ? (
                        <div className="h-full overflow-auto bg-surface">
                            <pre className="p-6 font-mono-num text-[12.5px] leading-relaxed text-on-surface whitespace-pre-wrap break-words">
                                {textContent ?? "Chargement du contenu…"}
                            </pre>
                        </div>
                    ) : category === "office" && signedUrl ? (
                        <div className="h-full flex flex-col">
                            <iframe
                                src={`https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                                title={fileName}
                                className="flex-1 w-full bg-white"
                            />
                            <div className="flex-none px-4 py-2 bg-surface-container border-t border-outline-variant flex items-center justify-between gap-3">
                                <p className="font-body-sm text-[11px] text-on-surface-variant inline-flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px] text-outline">
                                        info
                                    </span>
                                    Aperçu via Google Docs · si rien ne s'affiche, télécharge le fichier.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="flex-none px-3 py-1 rounded-md bg-primary text-on-primary font-body-sm text-[12px] hover:opacity-90 inline-flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[14px]">
                                        download
                                    </span>
                                    Télécharger
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant p-8 text-center">
                            <span className="material-symbols-outlined text-[48px]">
                                file_present
                            </span>
                            <p className="font-body-md text-body-md text-on-surface">
                                Aperçu non disponible pour ce type de fichier.
                            </p>
                            <p className="font-body-sm text-body-sm text-outline max-w-xs">
                                Télécharge le fichier pour l'ouvrir avec l'application appropriée.
                            </p>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="mt-2 px-4 py-2 rounded-md bg-primary text-on-primary font-body-sm text-body-sm hover:opacity-90 inline-flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    download
                                </span>
                                Télécharger
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer raccourcis — masqué sur mobile, look Dropbox/Notion */}
                <footer className="hidden sm:flex flex-none px-4 py-1.5 border-t border-outline-variant bg-surface-container-low items-center justify-between font-body-sm text-[10px] text-outline">
                    <div className="flex items-center gap-3">
                        <ShortcutHint label="Fermer" k="Échap" />
                        {category === "image" && (
                            <>
                                <ShortcutHint label="Zoom" k="+" k2="−" />
                                <ShortcutHint label="Pivoter" k="R" />
                                <ShortcutHint label="Reset" k="0" />
                            </>
                        )}
                        <ShortcutHint label="Télécharger" k="D" />
                    </div>
                    <span className="text-outline-variant truncate ml-3">
                        KadriLex · Aperçu sécurisé
                    </span>
                </footer>
            </div>
        </div>
    )
}

/* ============================================================
   Sous-composants UI
   ============================================================ */

function ToolbarBtn({
    icon,
    title,
    onClick,
    disabled,
}: {
    icon: string
    title: string
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className="w-8 h-8 flex items-center justify-center rounded text-outline hover:text-on-surface hover:bg-surface-container-low active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </button>
    )
}

function ShortcutHint({ label, k, k2 }: { label: string; k: string; k2?: string }) {
    return (
        <span className="inline-flex items-center gap-1">
            <Kbd>{k}</Kbd>
            {k2 && (
                <>
                    <span>/</span>
                    <Kbd>{k2}</Kbd>
                </>
            )}
            <span>{label}</span>
        </span>
    )
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-surface-variant font-mono-num text-[9px] leading-none min-w-[16px] inline-flex items-center justify-center">
            {children}
        </kbd>
    )
}

/* ============================================================
   Skeleton loader — varie selon le type de fichier
   ============================================================ */

function SkeletonLoader({ category }: { category: Category }) {
    if (category === "pdf" || category === "office" || category === "text") {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-2xl aspect-[1/1.2] bg-white border border-outline-variant rounded-lg shadow-md p-8 animate-pulse flex flex-col gap-3">
                    <div className="h-3 bg-surface-container-high w-1/3 rounded mb-4" />
                    <div className="space-y-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-2 bg-surface-container-high rounded"
                                style={{ width: `${Math.floor(Math.random() * 30) + 60}%` }}
                            />
                        ))}
                    </div>
                </div>
                <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
                    Chargement de l'aperçu…
                </p>
            </div>
        )
    }
    if (category === "image") {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="w-full max-w-2xl aspect-[4/3] bg-surface-container-high rounded-lg animate-pulse flex items-center justify-center">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant">
                        image
                    </span>
                </div>
            </div>
        )
    }
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] animate-spin">
                progress_activity
            </span>
            <p className="font-body-sm text-body-sm">Chargement…</p>
        </div>
    )
}
