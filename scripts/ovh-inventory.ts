/**
 * Inventaire OVH - liste tous les services du compte via l'API
 *
 * Usage: npx tsx scripts/ovh-inventory.ts
 *
 * Lit les credentials depuis .env.ovh.local
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// --- Charger .env.ovh.local manuellement (on ne veut pas polluer process.env global) ---
function loadEnv(file: string): Record<string, string> {
  const content = readFileSync(join(process.cwd(), file), "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(".env.ovh.local");

const ENDPOINT = env.OVH_ENDPOINT || "ovh-eu";
const APP_KEY = env.OVH_APPLICATION_KEY;
const APP_SECRET = env.OVH_APPLICATION_SECRET;
const CONSUMER_KEY = env.OVH_CONSUMER_KEY;

if (!APP_KEY || !APP_SECRET || !CONSUMER_KEY) {
  console.error("❌ Credentials OVH manquants dans .env.ovh.local");
  process.exit(1);
}

const BASE_URLS: Record<string, string> = {
  "ovh-eu": "https://eu.api.ovh.com/1.0",
  "ovh-ca": "https://ca.api.ovh.com/1.0",
  "ovh-us": "https://api.us.ovhcloud.com/1.0",
};
const BASE = BASE_URLS[ENDPOINT] || BASE_URLS["ovh-eu"];

// --- Signature OVH : SHA1(AS+"+"+CK+"+"+METHOD+"+"+URL+"+"+BODY+"+"+TSTAMP) ---
async function ovhCall<T = unknown>(method: string, path: string, body = ""): Promise<T> {
  const url = `${BASE}${path}`;

  // Récupérer le timestamp serveur OVH (recommandé)
  const tsRes = await fetch(`${BASE}/auth/time`);
  const timestamp = await tsRes.text();

  const toSign = `${APP_SECRET}+${CONSUMER_KEY}+${method}+${url}+${body}+${timestamp}`;
  const signature = "$1$" + createHash("sha1").update(toSign).digest("hex");

  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": APP_KEY!,
      "X-Ovh-Consumer": CONSUMER_KEY!,
      "X-Ovh-Timestamp": timestamp,
      "X-Ovh-Signature": signature,
      "Content-Type": "application/json",
    },
    body: body || undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- Helpers d'affichage ---
function section(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log(`  ${title}`);
  console.log("═".repeat(70));
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    console.log(`  ⚠️  ${label} : ${e.message.split("\n")[0]}`);
    return null;
  }
}

// --- Inventaire ---
async function main() {
  console.log("🔍 Inventaire OVH en cours...\n");

  // 1. Compte
  section("COMPTE");
  const me = await safe("compte", () =>
    ovhCall<any>("GET", "/me"),
  );
  if (me) {
    console.log(`  Nom         : ${me.firstname} ${me.name}`);
    console.log(`  Email       : ${me.email}`);
    console.log(`  Nichandle   : ${me.nichandle}`);
    console.log(`  Pays        : ${me.country}`);
    console.log(`  Type        : ${me.legalform}`);
    console.log(`  Société     : ${me.organisation || "-"}`);
  }

  // 2. VPS
  section("VPS");
  const vpsList = await safe("vps", () => ovhCall<string[]>("GET", "/vps"));
  if (vpsList && vpsList.length > 0) {
    for (const name of vpsList) {
      const vps = await safe(name, () => ovhCall<any>("GET", `/vps/${name}`));
      if (!vps) continue;
      const ips = await safe(`${name} ips`, () =>
        ovhCall<string[]>("GET", `/vps/${name}/ips`),
      );
      console.log(`\n  📦 ${name}`);
      console.log(`     État        : ${vps.state}`);
      console.log(`     Offre       : ${vps.model?.name || "-"} (${vps.model?.version || "-"})`);
      console.log(`     vCPU        : ${vps.model?.vcore || "?"}`);
      console.log(`     RAM         : ${vps.model?.memory || "?"} Mo`);
      console.log(`     Disque      : ${vps.model?.disk || "?"} Go`);
      console.log(`     Datacenter  : ${vps.zone || "-"}`);
      console.log(`     OS          : ${vps.netbootMode || "-"} / ${vps.distribution?.name || "à vérifier"}`);
      console.log(`     IPs         : ${ips?.join(", ") || "-"}`);
      console.log(`     Création    : ${vps.dateCreation || "-"}`);
    }
  } else {
    console.log("  (aucun VPS)");
  }

  // 3. Serveurs dédiés
  section("SERVEURS DÉDIÉS");
  const dedicated = await safe("dedicated", () =>
    ovhCall<string[]>("GET", "/dedicated/server"),
  );
  if (dedicated && dedicated.length > 0) {
    for (const name of dedicated) {
      console.log(`  🖥️  ${name}`);
    }
  } else {
    console.log("  (aucun serveur dédié)");
  }

  // 4. Domaines
  section("DOMAINES");
  const domains = await safe("domain", () =>
    ovhCall<string[]>("GET", "/domain"),
  );
  if (domains && domains.length > 0) {
    for (const d of domains) {
      console.log(`  🌐 ${d}`);
    }
  } else {
    console.log("  (aucun domaine)");
  }

  // 5. Hébergement web
  section("HÉBERGEMENT WEB");
  const hosting = await safe("hosting", () =>
    ovhCall<string[]>("GET", "/hosting/web"),
  );
  if (hosting && hosting.length > 0) {
    for (const h of hosting) console.log(`  📁 ${h}`);
  } else {
    console.log("  (aucun hébergement mutualisé)");
  }

  // 6. Public Cloud
  section("PUBLIC CLOUD");
  const cloud = await safe("cloud", () =>
    ovhCall<string[]>("GET", "/cloud/project"),
  );
  if (cloud && cloud.length > 0) {
    for (const c of cloud) console.log(`  ☁️  ${c}`);
  } else {
    console.log("  (aucun projet Public Cloud)");
  }

  // 7. Email domains
  section("EMAILS PRO / MX PLAN");
  const emails = await safe("email", () =>
    ovhCall<string[]>("GET", "/email/domain"),
  );
  if (emails && emails.length > 0) {
    for (const e of emails) console.log(`  ✉️  ${e}`);
  } else {
    console.log("  (aucun service email géré)");
  }

  // 8. Factures récentes
  section("DERNIÈRES FACTURES (5)");
  const bills = await safe("bills", () =>
    ovhCall<string[]>("GET", "/me/bill?dateFrom=2025-01-01"),
  );
  if (bills && bills.length > 0) {
    const last5 = bills.slice(-5).reverse();
    for (const id of last5) {
      const bill = await safe(id, () => ovhCall<any>("GET", `/me/bill/${id}`));
      if (bill) {
        console.log(
          `  💰 ${bill.date?.split("T")[0]} - ${bill.priceWithTax?.text || "?"} - ${bill.orderId || id}`,
        );
      }
    }
  } else {
    console.log("  (aucune facture)");
  }

  console.log("\n✅ Inventaire terminé\n");
}

main().catch((e) => {
  console.error("\n❌ Erreur :", e.message);
  process.exit(1);
});
