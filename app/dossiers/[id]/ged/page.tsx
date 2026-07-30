"use client"

import { useDossier } from "@/components/dossiers/dossier-context"
import { FileExplorer } from "@/components/dossiers/file-explorer"
import { postEntity, patchEntity, deleteEntity, showApiError } from "@/lib/api/patch"
import type { DossierFile } from "@/lib/mock/dossiers"

/**
 * Upload PUT vers Supabase Storage via XHR pour avoir une vraie progression.
 * Fetch ne supporte pas upload progress côté navigateur — d'où XHR.
 */
function putWithProgress(
    url: string,
    file: File,
    onProgress: (pct: number) => void
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", url)
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                // 0–90 % pour le PUT, on garde 10 % pour le INSERT DB ensuite
                onProgress((e.loaded / e.total) * 90)
            }
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload Storage : HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload"))
        xhr.send(file)
    })
}

export default function DossierGedPage() {
    const { dossier } = useDossier()

    return (
        <div className="h-full">
            <FileExplorer
                files={dossier.files}
                rootLabel="GED"
                onCreateFolder={async ({ name, couleur, parentId }) => {
                    await postEntity(`/api/dossiers/${dossier.id}/files`, {
                        name,
                        type: "FOLDER",
                        couleur,
                        parentId,
                    }).catch(showApiError("Création dossier"))
                }}
                onUploadFile={async ({ file, parentId, onProgress }) => {
                    // 1) Signed upload URL via le serveur
                    onProgress(2)
                    const sign = await postEntity<{ signedUrl: string; path: string }>(
                        "/api/storage/upload-url",
                        { category: "dossiers", fileName: file.name }
                    )
                    // 2) PUT direct sur Supabase Storage avec progress XHR (réel)
                    await putWithProgress(sign.signedUrl, file, onProgress)
                    onProgress(92)
                    // 3) Enregistre la référence en DB (table DossierFile) — retourne le fichier créé
                    const created = await postEntity<DossierFile>(
                        `/api/dossiers/${dossier.id}/files`,
                        {
                            name: file.name,
                            type: "FILE",
                            mimeType: file.type || "application/octet-stream",
                            size: file.size,
                            url: sign.path,
                            parentId,
                        }
                    )
                    onProgress(100)
                    return created
                }}
                onRename={async ({ id, name, couleur }) => {
                    await patchEntity(`/api/dossier-files/${id}`, {
                        name,
                        couleur,
                    }).catch(showApiError("Renommage"))
                }}
                onMove={async ({ id, newParentId }) => {
                    await patchEntity(`/api/dossier-files/${id}`, {
                        parentId: newParentId,
                    }).catch(showApiError("Déplacement"))
                }}
                onDelete={async (id) => {
                    await deleteEntity(`/api/dossier-files/${id}`).catch(
                        showApiError("Suppression")
                    )
                }}
            />
        </div>
    )
}
