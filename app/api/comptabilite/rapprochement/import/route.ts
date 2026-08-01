import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server-permissions";

/**
 * Parse une ligne CSV en respectant les champs entre guillemets (peuvent
 * contenir le délimiteur). Gère l'échappement "" -> ".
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

/** Détecte "," ou ";" comme délimiteur — les exports bancaires FR utilisent souvent ";". */
function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/** Accepte "1 234,56", "1234.56", "-85 000", avec ou sans symbole monétaire. */
function parseMontant(raw: string): number | null {
  let s = raw.trim().replace(/[^\d,.\-]/g, "");
  if (!s || s === "-") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Math.round(parseFloat(s));
  return Number.isFinite(n) ? n : null;
}

/** Accepte ISO (2026-07-29), DD/MM/YYYY, DD-MM-YYYY. */
function parseDateFlexible(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(req: Request) {
  try {
    await requirePermission("finance.write");
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier CSV fourni." }, { status: 400 });
    }

    // Retire un éventuel BOM UTF-8
    const text = (await file.text()).replace(/^﻿/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "Fichier vide ou sans données (attendu : Date, Libellé, Montant)." }, { status: 400 });
    }

    const delimiter = detectDelimiter(lines[0]);
    const transactions: { id: string; date: string; libelle: string; montant: number }[] = [];
    let skipped = 0;

    // Ligne 0 = en-têtes, on part de 1
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i], delimiter);
      if (parts.length < 3) {
        skipped++;
        continue;
      }
      const date = parseDateFlexible(parts[0]);
      const libelle = parts[1].trim();
      const montant = parseMontant(parts[2]);
      if (!date || !libelle || montant === null) {
        skipped++;
        continue;
      }
      transactions.push({ id: `tx_${i}`, date, libelle, montant });
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne valide trouvée. Format attendu par colonne : Date, Libellé, Montant." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, transactions, skipped });
  } catch (error) {
    console.error("Erreur lors de l'import CSV:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'import." }, { status: 500 });
  }
}
