/**
 * Demande un nouveau Consumer Key OVH avec les permissions complètes.
 *
 * Usage: npx tsx scripts/ovh-request-consumer-key.ts
 *
 * Le script affiche une URL de validation. Le titulaire du compte OVH
 * (oskadri67@gmail.com) doit l'ouvrir, se connecter, et autoriser.
 * Une fois validé, le Consumer Key affiché par le script devient actif
 * et il faut le coller dans .env.ovh.local en remplacement de l'ancien.
 */

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
const APP_KEY = env.OVH_APPLICATION_KEY;
const ENDPOINT = env.OVH_ENDPOINT || "ovh-eu";

const BASE_URLS: Record<string, string> = {
  "ovh-eu": "https://eu.api.ovh.com/1.0",
  "ovh-ca": "https://ca.api.ovh.com/1.0",
};
const BASE = BASE_URLS[ENDPOINT];

async function main() {
  // On demande des permissions larges pour pouvoir gérer le compte
  const body = {
    accessRules: [
      { method: "GET", path: "/*" },
      { method: "POST", path: "/*" },
      { method: "PUT", path: "/*" },
      { method: "DELETE", path: "/*" },
    ],
    // redirection optionnelle après validation
    redirection: "https://www.ovh.com/manager/",
  };

  const res = await fetch(`${BASE}/auth/credential`, {
    method: "POST",
    headers: {
      "X-Ovh-Application": APP_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("❌ Échec :", res.status, txt);
    process.exit(1);
  }

  const data = (await res.json()) as {
    consumerKey: string;
    state: string;
    validationUrl: string;
  };

  console.log("\n✅ Demande créée\n");
  console.log("─".repeat(70));
  console.log("👉 ÉTAPE 1 : ton client ouvre cette URL et valide :\n");
  console.log("   " + data.validationUrl);
  console.log("\n─".repeat(70));
  console.log("👉 ÉTAPE 2 : une fois validé, remplace OVH_CONSUMER_KEY dans");
  console.log("   .env.ovh.local par cette nouvelle valeur :\n");
  console.log("   OVH_CONSUMER_KEY=" + data.consumerKey);
  console.log("\n─".repeat(70));
  console.log("👉 ÉTAPE 3 : relance l'inventaire :");
  console.log("\n   npx tsx scripts/ovh-inventory.ts\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
