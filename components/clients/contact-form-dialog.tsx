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

const contactSchema = z.object({
    nom: z.string().min(1, "Nom requis"),
    prenom: z.string().optional(),
    fonction: z.string().min(1, "Fonction requise"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    telephone: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

interface ContactFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    clientId: string
    contact?: any
}

export function ContactFormDialog({
    open,
    onOpenChange,
    onSuccess,
    clientId,
    contact,
}: ContactFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!contact

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: contact || {
            fonction: "CONTACT_ADMIN",
        },
    })

    const onSubmit = async (data: ContactFormData) => {
        setLoading(true)
        try {
            const url = isEdit
                ? `/api/contacts/${contact.id}`
                : `/api/clients/${clientId}/contacts`
            const method = isEdit ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error("Failed to save contact")

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving contact:", error)
            alert("Erreur lors de l'enregistrement du contact")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Modifier le contact" : "Nouveau contact"}
                    </DialogTitle>
                    <DialogDescription>
                        Remplissez les informations du contact
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nom *</Label>
                            <Input {...register("nom")} />
                            {errors.nom && (
                                <p className="text-sm text-red-600">{errors.nom.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Prénom</Label>
                            <Input {...register("prenom")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Fonction *</Label>
                        <Select
                            value={watch("fonction")}
                            onValueChange={(value) => setValue("fonction", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DG">Directeur Général</SelectItem>
                                <SelectItem value="RESPONSABLE_JURIDIQUE">Responsable Juridique</SelectItem>
                                <SelectItem value="CONTACT_ADMIN">Contact Administratif</SelectItem>
                                <SelectItem value="AUTRE">Autre</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.fonction && (
                            <p className="text-sm text-red-600">{errors.fonction.message}</p>
                        )}
                    </div>

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
