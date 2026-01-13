"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const flashCrSchema = z.object({
    audienceId: z.string().min(1, "Audience requise"),
    contenu: z.string().min(1, "Contenu requis"),
    destinataires: z.string().min(1, "Au moins un destinataire requis"),
    statutEnvoi: z.string().optional(),
})

type FlashCrFormData = z.infer<typeof flashCrSchema>

interface FlashCrFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    flashCr?: any
    prefilledAudienceId?: string
}

export function FlashCrFormDialog({
    open,
    onOpenChange,
    onSuccess,
    flashCr,
    prefilledAudienceId,
}: FlashCrFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [audiences, setAudiences] = useState<any[]>([])
    const isEdit = !!flashCr

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FlashCrFormData>({
        resolver: zodResolver(flashCrSchema),
        defaultValues: flashCr || {
            audienceId: prefilledAudienceId || "",
            statutEnvoi: "DRAFT",
        },
    })

    useEffect(() => {
        if (open) {
            fetch('/api/audiences')
                .then(res => res.json())
                .then(data => setAudiences(data))
                .catch(err => console.error('Error fetching audiences:', err))
        }
    }, [open])

    const onSubmit = async (data: FlashCrFormData) => {
        setLoading(true)
        try {
            const url = isEdit ? `/api/flash-cr/${flashCr.id}` : "/api/flash-cr"
            const method = isEdit ? "PATCH" : "POST"

            // Convert comma-separated emails to array
            const destinataires = data.destinataires.split(',').map(email => email.trim())

            // Get clientId and dossierId from selected audience
            const selectedAudience = audiences.find(a => a.id === data.audienceId)

            const payload = {
                ...data,
                destinataires,
                clientId: selectedAudience?.clientId,
                dossierId: selectedAudience?.dossierId,
            }

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) throw new Error("Failed to save FlashCR")

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving FlashCR:", error)
            alert("Erreur lors de l'enregistrement du Flash CR")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Modifier le Flash CR" : "Rédiger un Flash CR"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Audience *</Label>
                        <Select
                            value={watch("audienceId")}
                            onValueChange={(value) => setValue("audienceId", value)}
                            disabled={!!prefilledAudienceId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une audience" />
                            </SelectTrigger>
                            <SelectContent>
                                {audiences.map((audience) => (
                                    <SelectItem key={audience.id} value={audience.id}>
                                        {audience.titre} - {new Date(audience.date).toLocaleDateString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.audienceId && (
                            <p className="text-sm text-red-600">{errors.audienceId.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Contenu du compte-rendu *</Label>
                        <textarea
                            {...register("contenu")}
                            className="w-full min-h-[200px] p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Rédigez le compte-rendu de l'audience..."
                        />
                        {errors.contenu && (
                            <p className="text-sm text-red-600">{errors.contenu.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Destinataires (emails séparés par des virgules) *</Label>
                        <Input
                            {...register("destinataires")}
                            placeholder="email1@example.com, email2@example.com"
                        />
                        {errors.destinataires && (
                            <p className="text-sm text-red-600">{errors.destinataires.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Statut d'envoi</Label>
                        <Select
                            value={watch("statutEnvoi")}
                            onValueChange={(value) => setValue("statutEnvoi", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DRAFT">Brouillon</SelectItem>
                                <SelectItem value="SENT">Envoyé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Enregistrement..." : isEdit ? "Modifier" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
