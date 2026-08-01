"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CompteFormDialog } from "./compte-form-dialog"

export function ComptesActions() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button
                className="h-8 px-3 text-[13px] font-medium bg-primary text-on-primary hover:bg-primary-container shadow-sm"
                onClick={() => setOpen(true)}
            >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nouveau
            </Button>
            {open && <CompteFormDialog onClose={() => setOpen(false)} />}
        </>
    )
}
