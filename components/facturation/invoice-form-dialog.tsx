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

const invoiceSchema = z.object({
    clientId: z.string().min(1, "Client requis"),
    dossierId: z.string().optional(),
    audienceId: z.string().optional(),
    date: z.string().min(1, "Date requise"),
    dateEcheance: z.string().min(1, "Date d'échéance requise"),
    montantHT: z.string().min(1, "Montant HT requis"),
    montantTTC: z.string().min(1, "Montant TTC requis"),
    statut: z.string().optional(),
    moyenPaiement: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface InvoiceFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    invoice?: any
}

export function InvoiceFormDialog({
    open,
    onOpenChange,
    onSuccess,
    invoice,
}: InvoiceFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const [dossiers, setDossiers] = useState<any[]>([])
    const [audiences, setAudiences] = useState<any[]>([])
    const isEdit = !!invoice

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: invoice || {
            statut: "IMPAYEE",
            date: new Date().toISOString().split('T')[0],
        },
    })

    const selectedClientId = watch("clientId")
    const selectedDossierId = watch("dossierId")
    const montantHT = watch("montantHT")

    useEffect(() => {
        if (open) {
            Promise.all([
                fetch('/api/clients').then(res => res.json()),
                fetch('/api/dossiers').then(res => res.json()),
                fetch('/api/audiences').then(res => res.json()),
            ])
                .then(([clientsData, dossiersData, audiencesData]) => {
                    setClients(clientsData)
                    setDossiers(dossiersData)
                    setAudiences(audiencesData)
                })
                .catch(err => console.error('Error fetching data:', err))
        }
    }, [open])

    // Auto-calculate TTC (HT + 18% TVA)
    useEffect(() => {
        if (montantHT) {
            const ht = parseFloat(montantHT)
            if (!isNaN(ht)) {
                const ttc = ht * 1.18
                setValue("montantTTC", ttc.toFixed(2))
            }
        }
    }, [montantHT, setValue])

    const filteredDossiers = selectedClientId
        ? dossiers.filter(d => d.clientId === selectedClientId)
        : []

    const filteredAudiences = selectedDossierId
        ? audiences.filter(a => a.dossierId === selectedDossierId)
        : []

    const onSubmit = async (data: InvoiceFormData) => {
        setLoading(true)
        try {
            const url = isEdit ? `/api/invoices/${invoice.id}` : "/api/invoices"
            const method = isEdit ? "PATCH" : "POST"

            const payload = {
                ...data,
                montantHT: parseFloat(data.montantHT),
                montantTTC: parseFloat(data.montantTTC),
                montantPaye: 0,
            }

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) throw new Error("Failed to save invoice")

            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving invoice:", error)
            alert("Erreur lors de l'enregistrement de la facture")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Modifier la facture" : "Saisir une facture"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Client *</Label>
                        <Select
                            value={watch("clientId")}
                            onValueChange={(value) => {
                                setValue("clientId", value)
                                setValue("dossierId", "")
                                setValue("audienceId", "")
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Dossier (optionnel)</Label>
                            <Select
                                value={watch("dossierId")}
                                onValueChange={(value) => {
                                    setValue("dossierId", value)
                                    setValue("audienceId", "")
                                }}
                                disabled={!selectedClientId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredDossiers.map((dossier) => (
                                        <SelectItem key={dossier.id} value={dossier.id}>
                                            {dossier.numero}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Audience (optionnel)</Label>
                            <Select
                                value={watch("audienceId")}
                                onValueChange={(value) => setValue("audienceId", value)}
                                disabled={!selectedDossierId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredAudiences.map((audience) => (
                                        <SelectItem key={audience.id} value={audience.id}>
                                            {audience.titre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date *</Label>
                            <Input type="date" {...register("date")} />
                            {errors.date && (
                                <p className="text-sm text-red-600">{errors.date.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Date d'échéance *</Label>
                            <Input type="date" {...register("dateEcheance")} />
                            {errors.dateEcheance && (
                                <p className="text-sm text-red-600">{errors.dateEcheance.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Montant HT (FCFA) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register("montantHT")}
                                placeholder="0.00"
                            />
                            {errors.montantHT && (
                                <p className="text-sm text-red-600">{errors.montantHT.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Montant TTC (FCFA) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register("montantTTC")}
                                placeholder="0.00"
                                readOnly
                                className="bg-slate-50"
                            />
                            <p className="text-xs text-slate-500">Calculé automatiquement (HT + 18%)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                    <SelectItem value="IMPAYEE">Impayée</SelectItem>
                                    <SelectItem value="PAYEE">Payée</SelectItem>
                                    <SelectItem value="PARTIELLE">Partielle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Moyen de paiement</Label>
                            <Select
                                value={watch("moyenPaiement")}
                                onValueChange={(value) => setValue("moyenPaiement", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIREMENT">Virement</SelectItem>
                                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                                    <SelectItem value="ESPECES">Espèces</SelectItem>
                                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
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
