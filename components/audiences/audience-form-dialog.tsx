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

const audienceSchema = z.object({
    titre: z.string().min(1, "Titre requis"),
    date: z.string().min(1, "Date requise"),
    juridiction: z.string().min(1, "Juridiction requise"),
    clientId: z.string().min(1, "Client requis"),
    dossierId: z.string().min(1, "Dossier requis"),
    avocatEnChargeId: z.string().min(1, "Avocat en charge requis"),
    avocatSignataireId: z.string().optional(),
    statut: z.string().optional(),
    notes: z.string().optional(),
})

type AudienceFormData = z.infer<typeof audienceSchema>

interface AudienceFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    audience?: any
}

export function AudienceFormDialog({
    open,
    onOpenChange,
    onSuccess,
    audience,
}: AudienceFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const [dossiers, setDossiers] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const isEdit = !!audience

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<AudienceFormData>({
        resolver: zodResolver(audienceSchema),
        defaultValues: audience || {
            statut: "A_VENIR",
        },
    })

    const selectedClientId = watch("clientId")

    useEffect(() => {
        if (open) {
            // Fetch clients and users
            Promise.all([
                fetch('/api/clients').then(res => res.json()),
                fetch('/api/dossiers').then(res => res.json()),
            ])
                .then(([clientsData, dossiersData]) => {
                    setClients(clientsData)
                    setDossiers(dossiersData)
                })
                .catch(err => console.error('Error fetching data:', err))

            // Mock user data (in real app, fetch from /api/users)
            setUsers([{ id: 'user-1', name: 'Maître Konan' }])
        }
    }, [open])

    // Filter dossiers by selected client
    const filteredDossiers = selectedClientId
        ? dossiers.filter(d => d.clientId === selectedClientId)
        : dossiers

    const onSubmit = async (data: AudienceFormData) => {
        setLoading(true)
        try {
            const url = isEdit ? `/api/audiences/${audience.id}` : "/api/audiences"
            const method = isEdit ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error("Failed to save audience")

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving audience:", error)
            alert("Erreur lors de l'enregistrement de l'audience")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Modifier l'audience" : "Nouvelle audience"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input {...register("titre")} placeholder="Ex: Plaidoirie sur le fond" />
                        {errors.titre && (
                            <p className="text-sm text-red-600">{errors.titre.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input type="datetime-local" {...register("date")} />
                            {errors.date && (
                                <p className="text-sm text-red-600">{errors.date.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Juridiction *</Label>
                            <Input {...register("juridiction")} placeholder="Ex: TPI Plateau" />
                            {errors.juridiction && (
                                <p className="text-sm text-red-600">{errors.juridiction.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client *</Label>
                            <Select
                                value={watch("clientId")}
                                onValueChange={(value) => {
                                    setValue("clientId", value)
                                    setValue("dossierId", "") // Reset dossier when client changes
                                }}
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
                        <div className="space-y-2">
                            <Label>Dossier *</Label>
                            <Select
                                value={watch("dossierId")}
                                onValueChange={(value) => setValue("dossierId", value)}
                                disabled={!selectedClientId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un dossier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredDossiers.map((dossier) => (
                                        <SelectItem key={dossier.id} value={dossier.id}>
                                            {dossier.numero}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.dossierId && (
                                <p className="text-sm text-red-600">{errors.dossierId.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Avocat en charge *</Label>
                            <Select
                                value={watch("avocatEnChargeId")}
                                onValueChange={(value) => setValue("avocatEnChargeId", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.avocatEnChargeId && (
                                <p className="text-sm text-red-600">{errors.avocatEnChargeId.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Avocat signataire</Label>
                            <Select
                                value={watch("avocatSignataireId")}
                                onValueChange={(value) => setValue("avocatSignataireId", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner (optionnel)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                                <SelectItem value="A_VENIR">À venir</SelectItem>
                                <SelectItem value="TERMINEE">Terminée</SelectItem>
                                <SelectItem value="ANNULEE">Annulée</SelectItem>
                                <SelectItem value="REPORTEE">Reportée</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input {...register("notes")} placeholder="Notes internes" />
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
