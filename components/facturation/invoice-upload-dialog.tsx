"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, CheckCircle } from "lucide-react"

interface InvoiceUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    invoiceId: string
    onSuccess?: () => void
}

export function InvoiceUploadDialog({
    open,
    onOpenChange,
    invoiceId,
    onSuccess,
}: InvoiceUploadDialogProps) {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setUploaded(false)
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`/api/invoices/${invoiceId}/upload`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) throw new Error('Upload failed')

            setUploaded(true)
            setTimeout(() => {
                onSuccess?.()
                onOpenChange(false)
                setFile(null)
                setUploaded(false)
            }, 1500)
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Erreur lors du téléversement du fichier')
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Téléverser une facture</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {!uploaded ? (
                        <>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer flex flex-col items-center"
                                >
                                    <Upload className="h-12 w-12 text-slate-400 mb-3" />
                                    <p className="text-sm font-medium text-slate-700">
                                        Cliquez pour sélectionner un fichier
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        PDF, DOC, DOCX, JPG, PNG (max 10MB)
                                    </p>
                                </label>
                            </div>

                            {file && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900">{file.name}</p>
                                        <p className="text-xs text-blue-600">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="rounded-full bg-green-100 p-3 mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <p className="text-lg font-semibold text-green-900">Fichier téléversé !</p>
                            <p className="text-sm text-slate-500 mt-1">La facture a été enregistrée</p>
                        </div>
                    )}
                </div>

                {!uploaded && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? "Téléversement..." : "Téléverser"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
