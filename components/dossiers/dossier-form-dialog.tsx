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

const dossierSchema = z.object({
    clientId: z.string().min(1, "Client requis"),
    type: z.string().min(1, "Type requis"),
    statut: z.string().optional(),
    juridiction: z.string().optional(),
    description: z.string().optional(),
})

type DossierFormData = z.infer<typeof dossierSchema>

interface DossierFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    dossier?: any
}

export function DossierFormDialog({
    open,
    onOpenChange,
    onSuccess,
    dossier,
}: DossierFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const isEdit = !!dossier

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<DossierFormData>({
        resolver: zodResolver(dossierSchema),
        defaultValues: dossier || {
            type: "CIVIL",
            statut: "EN_COURS",
        },
    })

    useEffect(() => {
        if (open) {
            fetch('/api/clients')
                .then(res => res.json())
                .then(data => setClients(data))
                .catch(err => console.error('Error fetching clients:', err))
        }
    }, [open])

    const onSubmit = async (data: DossierFormData) => {
        setLoading(true)
        try {
            const url = isEdit ? `/api/dossiers/${dossier.id}` : "/api/dossiers"
            const method = isEdit ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error("Failed to save dossier")

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving dossier:", error)
            alert("Erreur lors de l'enregistrement du dossier")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Modifier le dossier" : "Nouveau dossier"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Client *</Label>
                        <Select
                            value={watch("clientId")}
                            onValueChange={(value) => setValue("clientId", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un client" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.type === "PERSONNE_PHYSIQUE"
                                            ? `${client.nom} ${client.prenom}`
                                            : client.raisonSociale}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.clientId && (
                            <p className="text-sm text-red-600">{errors.clientId.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type *</Label>
                            <Select
                                value={watch("type")}
                                onValueChange={(value) => setValue("type", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CIVIL">Civil</SelectItem>
                                    <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                                    <SelectItem value="PENAL">Pénal</SelectItem>
                                    <SelectItem value="ADMINISTRATIF">Administratif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select
                                value={watch("statut")}
                                onValueChange={(value) => setValue("statut", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EN_COURS">En cours</SelectItem>
                                    <SelectItem value="TERMINE">Terminé</SelectItem>
                                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                                    <SelectItem value="CLOTURE">Clôturé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Juridiction</Label>
                        <Input {...register("juridiction")} />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input {...register("description")} />
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
