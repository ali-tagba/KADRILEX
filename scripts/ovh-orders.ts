/**
 * Vérifie les commandes et factures OVH (utile si un service n'apparaît pas encore)
 *
 * Usage: npx tsx scripts/ovh-orders.ts
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(file: string): Record<string, string> {
  const content = readFileSync(join(process.cwd(), file), "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(".env.ovh.local");
const APP_KEY = env.OVH_APPLICATION_KEY!;
const APP_SECRET = env.OVH_APPLICATION_SECRET!;
const CONSUMER_KEY = env.OVH_CONSUMER_KEY!;
const BASE = "https://eu.api.ovh.com/1.0";

async function ovh<T = any>(method: string, path: string, body = ""): Promise<T> {
  const url = `${BASE}${path}`;
  const ts = await fetch(`${BASE}/auth/time`).then((r) => r.text());
  const sig = "$1$" + createHash("sha1")
    .update(`${APP_SECRET}+${CONSUMER_KEY}+${method}+${url}+${body}+${ts}`)
    .digest("hex");
  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": APP_KEY,
      "X-Ovh-Consumer": CONSUMER_KEY,
      "X-Ovh-Timestamp": ts,
      "X-Ovh-Signature": sig,
      "Content-Type": "application/json",
    },
    body: body || undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    console.log(`  ⚠️  ${label} : ${e.message.split("\n")[0]}`);
    return null;
  }
}

async function main() {
  console.log("\n═══ COMMANDES OVH ═══\n");

  // Toutes les commandes
  const orderIds = await safe("orders", () => ovh<number[]>("GET", "/me/order"));
  if (orderIds && orderIds.length > 0) {
    console.log(`Total : ${orderIds.length} commande(s)\n`);
    // On regarde les 10 dernières
    const last = orderIds.slice(-10).reverse();
    for (const id of last) {
      const order = await safe(`order ${id}`, () => ovh<any>("GET", `/me/order/${id}`));
      if (!order) continue;
      const status = await safe(`status ${id}`, () =>
        ovh<string>("GET", `/me/order/${id}/status`),
      );
      console.log(`  📋 Commande #${id}`);
      console.log(`     Date     : ${order.date?.split("T")[0]}`);
      console.log(`     Montant  : ${order.priceWithTax?.text || "?"}`);
      console.log(`     Statut   : ${status || "?"}`);
      console.log(`     URL      : ${order.url || "-"}`);

      // Détails des produits commandés
      const details = await safe(`details ${id}`, () =>
        ovh<number[]>("GET", `/me/order/${id}/details`),
      );
      if (details) {
        for (const dId of details) {
          const d = await safe(`detail ${dId}`, () =>
            ovh<any>("GET", `/me/order/${id}/details/${dId}`),
          );
          if (d) {
            console.log(`     └─ ${d.description} (${d.detailType || "?"}) - ${d.domain || "-"}`);
          }
        }
      }
      console.log("");
    }
  } else {
    console.log("  Aucune commande trouvée");
  }

  console.log("\n═══ FACTURES ═══\n");
  const bills = await safe("bills", () => ovh<string[]>("GET", "/me/bill"));
  if (bills && bills.length > 0) {
    console.log(`Total : ${bills.length} facture(s)\n`);
    const last = bills.slice(-5).reverse();
    for (const id of last) {
      const b = await safe(id, () => ovh<any>("GET", `/me/bill/${id}`));
      if (b) {
        console.log(`  💰 ${b.date?.split("T")[0]} - ${b.priceWithTax?.text} - ${id}`);
      }
    }
  } else {
    console.log("  Aucune facture trouvée");
  }

  console.log("\n═══ ABONNEMENTS / SERVICES ═══\n");
  const services = await safe("services", () => ovh<number[]>("GET", "/services"));
  if (services && services.length > 0) {
    console.log(`Total : ${services.length} service(s) actif(s)\n`);
    for (const sId of services) {
      const s = await safe(`service ${sId}`, () => ovh<any>("GET", `/services/${sId}`));
      if (s) {
        console.log(`  🔧 #${sId} - ${s.resource?.name || "?"} (${s.route?.path || "?"})`);
        console.log(`     Statut : ${s.billing?.lifecycle?.current?.state || "?"}`);
        console.log(`     Renouvellement : ${s.billing?.nextBillingDate?.split("T")[0] || "-"}`);
      }
    }
  } else {
    console.log("  Aucun service actif");
  }

  console.log("");
}

main().catch((e) => console.error("\n❌", e.message));
