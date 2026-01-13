"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Folder, File, Plus, Upload, MoreVertical, Trash2, Edit2, FolderPlus } from "lucide-react"

interface FileExplorerProps {
    dossierId: string
}

export function FileExplorer({ dossierId }: FileExplorerProps) {
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [newItemName, setNewItemName] = useState("")
    const [newItemType, setNewItemType] = useState<"folder" | "file">("folder")

    const fetchFiles = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/dossiers/${dossierId}/files`)
            if (!response.ok) throw new Error('Failed to fetch files')
            const data = await response.json()
            setFiles(data)
        } catch (error) {
            console.error('Error fetching files:', error)
        } finally {
            setLoading(false)
        }
    }

    const createItem = async () => {
        try {
            const response = await fetch(`/api/dossiers/${dossierId}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newItemName,
                    type: newItemType,
                }),
            })
            if (!response.ok) throw new Error('Failed to create item')
            setCreateDialogOpen(false)
            setNewItemName("")
            fetchFiles()
        } catch (error) {
            console.error('Error creating item:', error)
            alert('Erreur lors de la création')
        }
    }

    const deleteItem = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return
        try {
            const response = await fetch(`/api/dossier-files/${id}`, {
                method: 'DELETE',
            })
            if (!response.ok) throw new Error('Failed to delete item')
            fetchFiles()
        } catch (error) {
            console.error('Error deleting item:', error)
            alert('Erreur lors de la suppression')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Documents du dossier</h3>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setNewItemType("folder")
                            setCreateDialogOpen(true)
                        }}
                    >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Nouveau dossier
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            setNewItemType("file")
                            setCreateDialogOpen(true)
                        }}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Téléverser
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                    <Folder className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-500">Aucun document</p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        Ajouter un document
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg divide-y">
                    {files.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {item.type === "folder" ? (
                                    <Folder className="h-5 w-5 text-blue-500" />
                                ) : (
                                    <File className="h-5 w-5 text-slate-400" />
                                )}
                                <div>
                                    <p className="font-medium text-sm">{item.name}</p>
                                    {item.size && (
                                        <p className="text-xs text-slate-500">
                                            {(item.size / 1024).toFixed(2)} KB
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteItem(item.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {newItemType === "folder" ? "Nouveau dossier" : "Téléverser un fichier"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Nom</label>
                            <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder={newItemType === "folder" ? "Nom du dossier" : "Nom du fichier"}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={createItem} disabled={!newItemName}>
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
