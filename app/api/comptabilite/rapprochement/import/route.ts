import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier CSV fourni." }, { status: 400 });
    }

    const text = await file.text();
    // Parse CSV (basic parsing for demo/prototype)
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    const transactions = [];
    
    // Assuming CSV format: Date, Libelle, Montant
    // Example: 2026-07-29, Virement Client A, 500000
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length >= 3) {
        transactions.push({
          id: `tx_${i}`,
          date: parts[0].trim(),
          libelle: parts[1].trim(),
          montant: parseInt(parts[2].trim(), 10)
        });
      }
    }

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error("Erreur lors de l'import CSV:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
