"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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

const clientSchema = z.object({
    type: z.enum(["PERSONNE_PHYSIQUE", "PERSONNE_MORALE"]),
    raisonSociale: z.string().optional(),
    nom: z.string().optional(),
    prenom: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    telephone: z.string().optional(),
    adresse: z.string().optional(),
    ville: z.string().optional(),
    pays: z.string().default("Côte d'Ivoire"),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    client?: any
}

export function ClientFormDialog({
    open,
    onOpenChange,
    onSuccess,
    client,
}: ClientFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!client

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ClientFormData>({
        resolver: zodResolver(clientSchema),
        defaultValues: client || {
            type: "PERSONNE_MORALE",
            pays: "Côte d'Ivoire",
        },
    })

    const clientType = watch("type")

    const onSubmit = async (data: ClientFormData) => {
        setLoading(true)
        try {
            const url = isEdit ? `/api/clients/${client.id}` : "/api/clients"
            const method = isEdit ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error("Failed to save client")

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving client:", error)
            alert("Erreur lors de l'enregistrement du client")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Modifier le client" : "Nouveau client"}
                    </DialogTitle>
                    <DialogDescription>
                        Remplissez les informations du client
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Type de client</Label>
                        <Select
                            value={clientType}
                            onValueChange={(value) =>
                                setValue("type", value as any)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PERSONNE_MORALE">
                                    Personne Morale (Entreprise)
                                </SelectItem>
                                <SelectItem value="PERSONNE_PHYSIQUE">
                                    Personne Physique (Individu)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {clientType === "PERSONNE_MORALE" ? (
                        <div className="space-y-2">
                            <Label>Raison Sociale</Label>
                            <Input {...register("raisonSociale")} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom</Label>
                                <Input {...register("nom")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Prénom</Label>
                                <Input {...register("prenom")} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" {...register("email")} />
                            {errors.email && (
                                <p className="text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Téléphone</Label>
                            <Input {...register("telephone")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Adresse</Label>
                        <Input {...register("adresse")} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Ville</Label>
                            <Input {...register("ville")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Pays</Label>
                            <Input {...register("pays")} />
                        </div>
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
