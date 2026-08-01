"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button
      variant="outline"
      className="h-8 px-3 text-[13px] font-medium border-outline-variant text-on-surface hover:bg-surface-variant shadow-sm"
      onClick={() => window.print()}
    >
      <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimer
    </Button>
  );
}
