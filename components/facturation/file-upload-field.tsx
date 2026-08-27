"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface AttachmentInfo {
    /** Nom du fichier d'origine (affiché à l'utilisateur) */
    name: string
    /** Taille en octets */
    size: number
    /** URL de prévisualisation (object URL en mock, signed URL en prod) */
    url: string
    /** MIME type */
    type: string
}

interface FileUploadFieldProps {
    value: AttachmentInfo | null
    onChange: (next: AttachmentInfo | null) => void
    label?: string
    hint?: string
    /** Liste de types MIME acceptés — par défaut PDF + images + Office */
    accept?: string
    /** Taille max (octets) — par défaut 10 Mo */
    maxSize?: number
    /** Catégorie Supabase Storage pour organiser : factures / depenses / paie / documents */
    category?: "factures" | "depenses" | "paie" | "documents" | "dossiers"
}

const DEFAULT_ACCEPT =
    "application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

const DEFAULT_MAX = 10 * 1024 * 1024 // 10 Mo

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function iconForMime(mime: string): string {
    if (mime.includes("pdf")) return "picture_as_pdf"
    if (mime.startsWith("image/")) return "image"
    if (mime.includes("word") || mime.includes("document")) return "description"
    if (mime.includes("sheet") || mime.includes("excel")) return "table_chart"
    return "attach_file"
}

/**
 * Champ d'upload de pièce jointe — pattern trombone Notion-like.
 * Upload réel via URL signée (POST /api/storage/upload-url puis PUT direct au storage).
 */
export function FileUploadField({
    value,
    onChange,
    label = "Pièce jointe",
    hint = "PDF, image ou document — 10 Mo max (optionnel)",
    accept = DEFAULT_ACCEPT,
    maxSize = DEFAULT_MAX,
    category = "documents",
}: FileUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [uploading, setUploading] = useState(false)

    const handleFile = async (file: File) => {
        setError(null)
        if (file.size > maxSize) {
            setError(`Fichier trop volumineux (max ${formatBytes(maxSize)})`)
            return
        }
        setUploading(true)
        try {
            // 1) Récupère une signed URL d'upload via le serveur
            const r = await fetch("/api/storage/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ category, fileName: file.name }),
            })
            if (!r.ok) {
                const e = await r.json().catch(() => ({}))
                throw new Error(e.error ?? `HTTP ${r.status}`)
            }
            const { signedUrl, path } = (await r.json()) as {
                signedUrl: string
                path: string
            }
            // 2) PUT direct sur la signed URL (bypass serveur Next)
            const put = await fetch(signedUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            })
            if (!put.ok) {
                throw new Error(`Upload failed: HTTP ${put.status}`)
            }
            // 3) On stocke le `path` (pas la signed URL qui expire) — on demandera
            //    une nouvelle signed URL pour télécharger plus tard.
            onChange({
                name: file.name,
                size: file.size,
                url: path,
                type: file.type || "application/octet-stream",
            })
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Erreur lors de l'upload"
            )
        } finally {
            setUploading(false)
        }
    }

    const handleClear = () => {
        if (value?.url) {
            try {
                URL.revokeObjectURL(value.url)
            } catch {
                /* noop */
            }
        }
        onChange(null)
        setError(null)
        if (inputRef.current) inputRef.current.value = ""
    }

    return (
        <label className="block">
            <span className="font-body-xs text-[11px] text-on-surface-variant block mb-0.5">
                {label}
            </span>

            {value ? (
                <div className="flex items-center gap-2 p-2 bg-surface-container-low border border-outline-variant rounded">
                    <span
                        className="material-symbols-outlined text-[20px] text-primary-container flex-shrink-0"
                        title={value.type}
                    >
                        {iconForMime(value.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p
                            className="font-body-sm text-body-sm text-on-surface font-medium truncate"
                            title={value.name}
                        >
                            {value.name}
                        </p>
                        <p className="font-mono-num text-[10px] text-outline">
                            {formatBytes(value.size)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                const r = await fetch(
                                    `/api/storage/download-url?path=${encodeURIComponent(value.url)}`,
                                    { credentials: "include" }
                                )
                                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                                const { signedUrl } = await r.json()
                                window.open(signedUrl, "_blank")
                            } catch (e) {
                                alert("Échec ouverture : " + (e instanceof Error ? e.message : "Erreur"))
                            }
                        }}
                        className="p-1 rounded text-outline hover:text-primary-container hover:bg-surface-container transition-colors"
                        title="Aperçu"
                    >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 rounded text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                        title="Retirer"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragActive(true)
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setDragActive(false)
                        const f = e.dataTransfer.files[0]
                        if (f) handleFile(f)
                    }}
                    className={cn(
                        "flex items-center gap-2 p-2 border border-dashed rounded transition-colors cursor-pointer",
                        dragActive
                            ? "border-accent bg-accent/5"
                            : "border-outline-variant hover:bg-surface-container-low/50"
                    )}
                    onClick={() => inputRef.current?.click()}
                >
                    <span className="material-symbols-outlined text-[18px] text-outline">
                        {uploading ? "progress_activity" : "attach_file"}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex-1">
                        {uploading ? "Upload en cours…" : "Joindre un fichier"}
                        {!uploading && (
                            <span className="text-outline italic ml-1">(glisser-déposer ou cliquer)</span>
                        )}
                    </span>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                }}
            />

            {hint && !error && (
                <span className="font-body-xs text-[10px] text-outline italic block mt-0.5">
                    {hint}
                </span>
            )}
            {error && (
                <span className="font-body-xs text-[10px] text-error block mt-0.5">{error}</span>
            )}
        </label>
    )
}
